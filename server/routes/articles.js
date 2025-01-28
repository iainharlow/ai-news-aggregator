const express = require('express');
const router = express.Router();
const axios = require('axios');
const RSSParser = require('rss-parser');
const cheerio = require('cheerio');
const db = require('../database');

// For summarization
const { ChatOpenAI } = require("@langchain/openai");
const { loadSummarizationChain } = require("langchain/chains");
const { Document } = require("langchain/document");

// ─────────────────────────────────────────────────────────────────────────────
//  1) LIST ALL ARTICLES (with optional ?feedUrl=...)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const { feedUrl } = req.query;

  // Build the base query
  let query = `
    SELECT
      a.id,
      a.title,
      a.link,
      a.full_text,
      a.published_date,
      a.feed_url,
      s.summary
    FROM articles a
    LEFT JOIN summaries s ON s.article_id = a.id
  `;
  // If feedUrl is provided, filter
  const params = [];
  if (feedUrl) {
    query += " WHERE a.feed_url = ?";
    params.push(feedUrl);
  }
  // Sort by newest first, if you like
  query += " ORDER BY a.id DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error("Error retrieving articles from DB:", err);
      return res.status(500).json({ error: "DB error", details: err.toString() });
    }
    // Return an array of articles, each with summary if present
    return res.json(rows);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
//  2) FETCH NEW ARTICLES FROM THE FEED + SUMMARIZE
// ─────────────────────────────────────────────────────────────────────────────
router.get('/fetch', async (req, res) => {
  try {
    const feedUrl = req.query.feedUrl;
    if (!feedUrl) {
      return res.status(400).json({ error: "Missing feedUrl parameter" });
    }

    // Fetch and parse the RSS feed
    const rssResponse = await axios.get(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const parser = new RSSParser();
    const feed = await parser.parseString(rssResponse.data);

    if (!feed.items || feed.items.length === 0) {
      return res.json({ message: 'No articles found in this feed.' });
    }

    // Prepare for summarization
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-3.5-turbo"
    });
    const chain = loadSummarizationChain(llm, { type: "map_reduce" });

    // Track newly added articles for response
    const newlyAdded = [];

    // Process each item in the RSS feed
    for (const item of feed.items) {
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
        continue;
      }

      // Article is new, so fetch the full text
      let fullText = "";
      try {
        const articleResponse = await axios.get(item.link, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const $ = cheerio.load(articleResponse.data);
        // Adjust selector as needed depending on the site structure
        fullText = $('article').text() || "";
      } catch (err) {
        console.warn("Could not fetch full article text:", err.message);
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
            item.pubDate || null,
            feedUrl
          ],
          function (err) {
            if (err) {
              console.error("Error inserting new article:", err);
              resolve(null); // or reject
            } else {
              resolve(this.lastID);
            }
          }
        );
      });

      if (!articleId) {
        // If insert failed, skip summarization
        continue;
      }

      // Summarize the article text
      try {
        const document = new Document({ pageContent: fullText });
        const summaryResult = await chain.invoke({ input_documents: [document] });
        const summaryText = summaryResult.text;

        // Insert summary
        db.run(
          `INSERT INTO summaries (article_id, summary) VALUES (?, ?)`,
          [articleId, summaryText],
          (err) => {
            if (err) {
              console.error("Error inserting summary:", err);
            }
          }
        );
      } catch (err) {
        console.warn("Error summarizing article:", err.message);
      }

      newlyAdded.push(item.link);
    }

    // Return a list of newly added articles
    const message = newlyAdded.length
      ? `Fetched and stored ${newlyAdded.length} new articles.`
      : "No new articles added (all were already in DB).";

    return res.json({ message, newlyAdded });
  } catch (error) {
    console.error("Error fetching or parsing RSS feed:", error);
    return res.status(500).json({
      message: "Failed to fetch articles.",
      error: error.toString(),
    });
  }
});

module.exports = router;