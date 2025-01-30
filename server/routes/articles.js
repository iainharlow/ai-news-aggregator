// server/routes/articles.js

const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const RSSParser = require('rss-parser');
const he = require('he'); // Library for decoding HTML entities
const db = require('../database'); // Your database module
const { ChatOpenAI } = require("@langchain/openai");
const { loadSummarizationChain } = require("langchain/chains");
const { Document } = require("langchain/document");

// Initialize RSS Parser
const parser = new RSSParser();

// FETCH NEW ARTICLES FROM THE FEED + SUMMARIZE
router.get('/fetch', async (req, res) => {
  try {
    const feedUrl = req.query.feedUrl;
    if (!feedUrl) {
      return res.status(400).json({ error: "Missing feedUrl parameter" });
    }

    console.log(`Fetching articles from feed: ${feedUrl}`);

    // Fetch and parse the RSS feed
    const rssResponse = await axios.get(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const feed = await parser.parseString(rssResponse.data);

    if (!feed.items || feed.items.length === 0) {
      return res.json({ message: 'No articles found in this feed.' });
    }

    // Initialize the summarization chain
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-3.5-turbo"
    });
    const chain = loadSummarizationChain(llm, { type: "map_reduce" });

    // Track newly added articles for response
    const newlyAdded = [];

    // Process each item in the RSS feed
    for (const item of feed.items) {
      console.log(`\nProcessing article: "${item.title}"`);

      // Log the entire item object
      console.log(`Full item object: ${JSON.stringify(item, null, 2)}`);

      // Check if article with this link already exists
      const exists = await new Promise((resolve) => {
        db.get(
          `SELECT id FROM articles WHERE link = ?`,
          [item.link],
          (err, row) => {
            if (err) {
              console.error("DB error checking article existence:", err);
              resolve(false);
            } else {
              resolve(!!row); // true if row exists
            }
          }
        );
      });

      if (exists) {
        // Article already in DB, skip
        console.log(`- Article already exists in DB. Skipping.`);
        continue;
      }

      // Initialize fullText
      let fullText = "";

      // Attempt to extract full text from <item>'s <description> or <content>
      let descriptionContent = item['content:encoded'] || item.description || item.content || "";

      if (descriptionContent) {
        console.log(`- Extracting from <description> or <content>...`);
        console.log(`  Raw description/content: ${descriptionContent.substring(0, 100)}...`);
      
        const $desc = cheerio.load(descriptionContent);
      
        // Remove unwanted elements
        $desc('img, table, figure, hr, .promo, .subscribe, .quill-line, .quill-button').remove();
      
        // Extract text from paragraphs and headings
        fullText = $desc('p, h2, h3').text().trim();
      
        // Decode HTML entities
        fullText = he.decode(fullText);
      
        // Normalize whitespace
        fullText = fullText.replace(/\s+/g, ' ').trim();
      
        console.log(`  Extracted fullText: "${fullText.substring(0, 100)}..."`);
      
        if (!fullText) {
          console.warn(`  - No meaningful content extracted from description/content.`);
        }
      } else {
        console.warn(`- No <description> or <content> found in <item>.`);
      }

      // If <description> is insufficient, fetch and parse the full article
      if (!fullText) {
        try {
          console.log(`- Fetching full article content from webpage: ${item.link}`);
          const articleResponse = await axios.get(item.link, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const $ = cheerio.load(articleResponse.data);

          // Attempt to extract full text using specific selectors
          fullText = $('div.article-content, div.main-content, div.article-body, div.post-content, section.content').text().trim() || "";

          if (fullText) {
            console.log(`  Extracted fullText from webpage: "${fullText.substring(0, 100)}..."`);
          } else {
            console.warn(`  - No content extracted from webpage.`);
          }
        } catch (err) {
          console.warn("  - Could not fetch full article text:", err.message);
        }
      }

      // If still no content, skip summarization and insertion
      if (!fullText) {
        console.warn(`  - Skipping article due to no content: "${item.title}"`);
        continue;
      }

      // Further normalize whitespace if needed
      fullText = fullText.replace(/\s+/g, ' ').trim();

      // Convert pubDate to ISO 8601 format
      let publishedDate = null;
      if (item.pubDate) {
        const date = new Date(item.pubDate);
        if (!isNaN(date)) {
          publishedDate = date.toISOString();
        }
      }

      // Insert the article into the DB
      const articleId = await new Promise((resolve) => {
        db.run(
          `INSERT INTO articles (title, link, full_text, published_date, feed_url)
           VALUES (?, ?, ?, ?, ?)`,
          [
            item.title || "Untitled",
            item.link,
            fullText,
            publishedDate,
            feedUrl
          ],
          function (err) {
            if (err) {
              console.error("  - Error inserting new article:", err);
              resolve(null);
            } else {
              console.log(`  - Inserted article ID ${this.lastID}: "${item.title}"`);
              resolve(this.lastID);
            }
          }
        );
      });

      if (!articleId) {
        // If insert failed, skip summarization
        console.warn(`  - Skipping summarization due to insert failure.`);
        continue;
      }

      // Summarize the article text
      try {
        console.log(`  - Summarizing article ID ${articleId}...`);
        const document = new Document({ pageContent: fullText });
        const summaryResult = await chain.invoke({ input_documents: [document] });
        const summaryText = summaryResult.text;

        // Insert summary into the DB
        db.run(
          `INSERT INTO summaries (article_id, summary) VALUES (?, ?)`,
          [articleId, summaryText],
          (err) => {
            if (err) {
              console.error("    - Error inserting summary:", err);
            } else {
              console.log(`    - Inserted summary for article ID ${articleId}.`);
            }
          }
        );
      } catch (err) {
        console.warn("  - Error summarizing article:", err.message);
      }

      newlyAdded.push(item.link);
    }

    // Return a list of newly added articles
    const message = newlyAdded.length
      ? `Fetched and stored ${newlyAdded.length} new articles.`
      : "No new articles found.";

    console.log(`\n${message}`);
    return res.json({ message, newlyAdded });
  } catch (error) {
    console.error("Error fetching or parsing RSS feed:", error);
    return res.status(500).json({
      message: "Failed to fetch articles.",
      error: error.toString(),
    });
  }
});

// GET /articles?feedUrls=url1,url2&limit=20&page=1
router.get('/', async (req, res) => {
  try {
    const { feedUrls, limit = 20, page = 1 } = req.query;

    if (!feedUrls) {
      return res.status(400).json({ error: "Missing feedUrls parameter" });
    }

    // Split feedUrls into an array
    const feedUrlsArray = Array.isArray(feedUrls) ? feedUrls : feedUrls.split(',');

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query to get total count
    const total = await new Promise((resolve, reject) => {
      const placeholders = feedUrlsArray.map(() => '?').join(',');
      db.get(
        `SELECT COUNT(*) as count FROM articles WHERE feed_url IN (${placeholders})`,
        feedUrlsArray,
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row.count);
          }
        }
      );
    });

    // Query to get paginated articles with summaries
    const articles = await new Promise((resolve, reject) => {
      const placeholders = feedUrlsArray.map(() => '?').join(',');
      db.all(
        `
        SELECT articles.*, summaries.summary
        FROM articles
        LEFT JOIN summaries ON articles.id = summaries.article_id
        WHERE articles.feed_url IN (${placeholders})
        ORDER BY articles.published_date DESC
        LIMIT ? OFFSET ?
        `,
        [...feedUrlsArray, parseInt(limit), parseInt(offset)],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });

    return res.json({ articles, total });
  } catch (error) {
    console.error("Error fetching articles:", error);
    return res.status(500).json({ error: "Failed to fetch articles." });
  }
});

module.exports = router;