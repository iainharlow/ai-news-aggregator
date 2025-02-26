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
const { URL } = require('url');

// Initialize RSS Parser
const parser = new RSSParser();

// Helper function to get selectors based on domain
const getSelectorsForDomain = (hostname) => {
  const selectorsMap = {
    'every.to': 'div.article-content, div.post-content, div.content-wrapper, div.post-body',
    'oneusefulthing.org': 'div.post-content, div.body, article.post, div.substack-post',
    'substack.com': 'div.post-content, div.body, article.post, div.substack-post',
    'thegradient.pub': 'article.post-content, div.entry-content',
    'huggingface.co': 'article, div.entry-content, div.post-content',
    'openai.com': 'article, main, div.post-content',
    'deepmind.com': 'article, main, div.post-content, div.article',
    'amazon.science': 'div.article-body, article, main',
    'ai-news.io': 'div.elementor-widget-container', 
    'jack-clark.net': 'div.entry-content',
    'sebastianraschka.com': 'article.post, div.article-content',
    'aisupremacy.substack.com': 'div.post-content, div.body',
    'thealgorithmicbridge.substack.com': 'div.post-content, div.body',
    'thesequence.substack.com': 'div.post-content, div.body',
    'lastweekin.ai': 'div.entry-content, main, article',
    'interconnects.ai': 'article, div.post-content, div.entry-content',
    'aiweirdness.com': 'div.entry, article, div.post-content'
  };
  return selectorsMap[hostname] || 'article, div.article-content, div.main-content, div.post-content, div.entry-content, section.content, main, div.content';
};

// FETCH NEW ARTICLES FROM THE FEED + SUMMARIZE (LIMIT TO 5 ARTICLES PER FEED)
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

        // Initialize o3-mini for summarization
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "o3-mini",
      temperature: 0.2,
      maxCompletionTokens: 1500
    });

    // Track newly added articles for response
    const newlyAdded = [];

    // Process each item in the RSS feed
    // Limit to processing only the 5 most recent items
    const recentItems = feed.items.slice(0, 5);
    
    for (const item of recentItems) {
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
    
      // Initialize fullText and author
      let fullText = "";
      let author = "";
    
      // Attempt to extract full text from <description>, <content>, or <content:encoded>
      let descriptionContent = "";
      let contentSource = "";
      
      // Use content:encoded if available (typically has the full article content)
      if (item['content:encoded']) {
        contentSource = 'content:encoded';
        descriptionContent = item['content:encoded'];
      } 
      // Fallback to content if content:encoded is not available
      else if (item.content) {
        contentSource = 'content';
        descriptionContent = item.content;
      } 
      // Fallback to description as last resort
      else if (item.description) {
        contentSource = 'description';
        descriptionContent = item.description;
      }

      if (descriptionContent) {
        console.log(`- Extracting from <${contentSource}>...`);
        console.log(`  Raw ${contentSource}: ${descriptionContent.substring(0, 100)}...`);
    
        const $desc = cheerio.load(descriptionContent);
    
        // Remove unwanted elements
        $desc('img, table, figure, hr, .promo, .subscribe, .quill-line, .quill-button').remove();
    
        // Extract text from paragraphs and headings with proper handling
        let paragraphs = [];
        
        // First try to get paragraphs and headings
        $desc('p, h1, h2, h3, h4, h5, h6, blockquote, li').each((index, element) => {
          const text = $desc(element).text().trim();
          if (text) paragraphs.push(text);
        });
        
        // If no paragraphs found, try getting text from all elements
        if (paragraphs.length === 0) {
          $desc('body').find('*').not('script, style, iframe, img, table').each((index, element) => {
            // Only get direct text nodes that are not empty
            $desc(element).contents().each((i, el) => {
              if (el.type === 'text') {
                const text = $desc(el).text().trim();
                if (text) paragraphs.push(text);
              }
            });
          });
        }
        
        // If still nothing, just get the entire text
        if (paragraphs.length === 0) {
          fullText = $desc('body').text().trim();
        } else {
          fullText = paragraphs.join('\n\n').trim();
        }
    
        // Decode HTML entities
        fullText = he.decode(fullText);
    
        // Normalize whitespace
        fullText = fullText.replace(/\s+/g, ' ').trim();
    
        console.log(`  Extracted fullText: "${fullText.substring(0, 100)}..."`);
    
        if (!fullText) {
          console.warn(`  - No meaningful content extracted from description/content.`);
        }
      } else {
        console.warn(`- No <description>, <content>, or <content:encoded> found in <item>.`);
      }
    
      // Extract author from possible fields
      author = item.creator || item['dc:creator'] || "Unknown Author";
      console.log(`  Extracted author: "${author}"`);
    
      // If <description> is insufficient, fetch and parse the full article
      if (!fullText) {
        try {
          console.log(`- Fetching full article content from webpage: ${item.link}`);
          const articleResponse = await axios.get(item.link, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
          const $ = cheerio.load(articleResponse.data);
    
          // Parse the hostname to determine the domain
          const hostname = new URL(item.link).hostname.replace('www.', '');
    
          // Get selectors based on domain
          const selectors = getSelectorsForDomain(hostname);
          console.log(`  Using selectors: "${selectors}"`);
          
          // Try domain-specific selectors first
          let paragraphs = [];
          $(selectors).each((index, element) => {
            const text = $(element).text().trim();
            if (text) paragraphs.push(text);
          });
          
          // If no content found with domain-specific selectors,
          // try to find any paragraphs or text blocks in the page
          if (paragraphs.length === 0) {
            console.log("  - No content found with domain selectors, trying fallback extraction");
            $('article, .article, .post, .entry-content').find('p, h1, h2, h3, h4, h5, h6, blockquote, li').each((index, element) => {
              const text = $(element).text().trim();
              if (text) paragraphs.push(text);
            });
          }
          
          // Last resort: try any paragraphs in the page
          if (paragraphs.length === 0) {
            console.log("  - Still no content, trying any paragraphs in the page");
            $('p').each((index, element) => {
              const text = $(element).text().trim();
              if (text && text.length > 100) paragraphs.push(text); // Only consider substantial paragraphs
            });
          }
          
          // Compile the full text from paragraphs
          if (paragraphs.length > 0) {
            fullText = paragraphs.join('\n\n').trim();
            console.log(`  Extracted fullText from webpage (${paragraphs.length} paragraphs): "${fullText.substring(0, 100)}..."`);
          } else {
            // Final fallback: get all text from main areas 
            fullText = $('body').text().trim().replace(/\s+/g, ' ');
            console.log("  - Using body text as final fallback");
          }
        } catch (err) {
          console.warn("  - Could not fetch full article text:", err.message);
        }
      }
    
      // If still no content or content is too short, skip this article
      if (!fullText || fullText.length < 100) {
        console.warn(`  - Skipping article due to insufficient content: "${item.title}"`);
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
    
      // Insert the article into the DB, including the author
      const articleId = await new Promise((resolve) => {
        db.run(
          `INSERT INTO articles (title, link, full_text, published_date, feed_url, author)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            item.title || "Untitled",
            item.link,
            fullText,
            publishedDate,
            feedUrl,
            author
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
    
      // First check if we're using the new schema or old schema
      const tableInfo = await new Promise((resolve, reject) => {
        db.all(
          "PRAGMA table_info(summaries)",
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          }
        );
      });
      
      // Check if we have short_summary and detailed_summary columns
      const hasNewSchema = tableInfo.some(col => col.name === 'short_summary');
      
      // Generate summaries based on schema
      try {
        console.log(`  - Summarizing article ID ${articleId}...`);
        
        // Generate short summary
        const shortSummaryPrompt = `
          You are an expert article summarizer tasked with creating a concise summary of the article below.
          
          Create a BRIEF summary of 1-2 sentences that captures the key information.
          Focus on the core message and any unique insights.
          Avoid filler phrases like 'this article discusses' or 'the author explains'.
          Maximize information density with specific details.
          
          ARTICLE:
          ${fullText}
        `;
        
        // Send request for short summary
        const shortSummaryResponse = await llm.invoke(shortSummaryPrompt);
        const shortSummary = shortSummaryResponse.content;
        
        if (hasNewSchema) {
          // Use new schema with both summary types
          // Generate detailed summary
          const detailedSummaryPrompt = `
            Extract only meaningful, insightful content from the article below.
            
            Create a detailed summary that captures only the meaningful information.

            Include:
            - Unique or interesting statements and claims
            - Novel insights, perspectives and implications
            - Specific, practical advice for consumers or builders
            - Differences between models; strengths and weaknesses
            - Recent or uncoming releases if they are impactful
            
            Exclude:
            - Common or trite observations (e.g., "AI has potential to disrupt X" / "Companies should plan to include AI")
            - General background information familiar to AI practitioners
            - Filler content and boilerplate descriptions
            
            ONLY return plain text, no markdown. Do not add any filler text, headings or formatting.
            
            ARTICLE:
            ${fullText}
          `;
          
          const detailedSummaryResponse = await llm.invoke(detailedSummaryPrompt);
          const detailedSummary = detailedSummaryResponse.content;
          
          // Insert summaries into the DB
          db.run(
            `INSERT INTO summaries (article_id, short_summary, detailed_summary) VALUES (?, ?, ?)`,
            [articleId, shortSummary, detailedSummary],
            (err) => {
              if (err) {
                console.error("    - Error inserting summaries:", err);
              } else {
                console.log(`    - Inserted summaries for article ID ${articleId}.`);
              }
            }
          );
        } else {
          // Use old schema with only one summary field
          db.run(
            `INSERT INTO summaries (article_id, summary) VALUES (?, ?)`,
            [articleId, shortSummary],
            (err) => {
              if (err) {
                console.error("    - Error inserting summary:", err);
              } else {
                console.log(`    - Inserted summary for article ID ${articleId}.`);
              }
            }
          );
        }
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

// Generate weekly overview of recent articles
router.post('/generate-overview', async (req, res) => {
  try {
    console.log('Generating weekly overview of recent articles...');
    
    // Calculate date for past 7 days
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString();
    
    // Get the Monday of the current week for week_start
    const currentDate = new Date();
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, ...
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday as first day
    
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() - daysSinceMonday);
    monday.setHours(0, 0, 0, 0);
    const mondayStr = monday.toISOString();
    
    // Check if we're using the new schema or old schema
    const tableInfo = await new Promise((resolve, reject) => {
      db.all(
        "PRAGMA table_info(summaries)",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
    
    // Check if we have short_summary and detailed_summary columns
    const hasNewSchema = tableInfo.some(col => col.name === 'short_summary');
    
    // Get recent articles with summaries (using proper schema)
    // Use detailed_summary for richer content in overview
    const summaryField = hasNewSchema ? 'detailed_summary' : 'summary';
    
    console.log('Fetching recent articles from active feeds...');
    const recentArticles = await new Promise((resolve, reject) => {
      db.all(
        `
        SELECT articles.title, articles.author, articles.published_date, 
               articles.link, summaries.${summaryField} as summary_content, feeds.feed_name
        FROM articles
        JOIN summaries ON articles.id = summaries.article_id
        JOIN feeds ON articles.feed_url = feeds.feed_url
        WHERE articles.published_date > ?
        AND feeds.deleted = 0 -- Only consider active feeds
        ORDER BY articles.published_date DESC
        LIMIT 50
        `,
        [oneWeekAgoStr],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            console.log(`Found ${rows.length} recent articles from active feeds`);
            resolve(rows);
          }
        }
      );
    });
    
    if (recentArticles.length === 0) {
      return res.json({ 
        message: 'No recent articles found to generate an overview.',
        overview: null
      });
    }
    
    // Format article data for the prompt 
    // Limit number of articles per feed to ensure diversity
    console.log('Preparing articles for overview generation...');
    
    // Group articles by feed
    const articlesByFeed = {};
    recentArticles.forEach(article => {
      if (!articlesByFeed[article.feed_name]) {
        articlesByFeed[article.feed_name] = [];
      }
      articlesByFeed[article.feed_name].push(article);
    });
    
    // Take max 3 articles from each feed
    let articlesToUse = [];
    Object.values(articlesByFeed).forEach(feedArticles => {
      articlesToUse = [...articlesToUse, ...feedArticles.slice(0, 3)];
    });
    
    // Sort by date and limit to 20 overall
    articlesToUse.sort((a, b) => {
      return new Date(b.published_date) - new Date(a.published_date);
    });
    articlesToUse = articlesToUse.slice(0, 20);
    
    console.log(`Using ${articlesToUse.length} articles from ${Object.keys(articlesByFeed).length} feeds for the overview`);
    
    const articlesForPrompt = articlesToUse.map(article => {
      // Only include first 300 chars of each summary to limit prompt size
      const summaryText = article.summary_content ? 
        (article.summary_content.length > 300 ? 
          article.summary_content.substring(0, 300) + '...' : 
          article.summary_content) : 
        'No summary available';
        
      return `TITLE: ${article.title}
AUTHOR: ${article.author}
SOURCE: ${article.feed_name}
SUMMARY: ${summaryText}
`;
    }).join('\n---\n\n');
    
    console.log('Initializing OpenAI model...');
    // Initialize GPT-4o for weekly overview summarization
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "o3-mini",
      maxCompletionTokens: 1500,
      timeout: 60000 // 60 second timeout
    });
    
    // Generate the overview using o3-mini
    const overviewPrompt = `
      Creating a weekly overview of recent AI developments.
      
      Below are summaries from articles published in the past 7 days in the AI field.
      Create a comprehensive overview of substantive developments, releases, and insights/advice from these articles.
      Avoid fuzzy "web copy" language, be very concrete and focus on specific details and advice.
      
      The audience are the staff of an AI development studio. Their role is primarily to imagine, develop and sell AI-powered applications.
      
      Use absolutely no filler language. Be extremely direct and concrete. Your purpose is to inform, not to entertain. 
      Include relevant and genuinely important developments, especially in major model capabilities or applications in finance, insurance or healthcare.
      Be concise and focus on the most important information.
      
      Avoid weak constructions like "suggesting", "emphasizing the need for" or "offering new directions". Say what has happened, what likely will happen, and how businesses should react.
      Never describe a model or product as offering improved or enhanced capabilities without describing the specific improvements.
      ARTICLES FROM PAST 7 DAYS:
      ${articlesForPrompt}
    `;
    
    console.log('Sending request to OpenAI...');
    try {
      const overviewResponse = await llm.invoke(overviewPrompt);
      const overviewContent = overviewResponse.content;
      console.log('Successfully received OpenAI response');
      
      // Store the overview in the database
      console.log('Storing overview in database...');
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO overviews (week_start, content, created_at) VALUES (?, ?, ?)`,
          [mondayStr, overviewContent, new Date().toISOString()],
          function(err) {
            if (err) {
              console.error('Error storing overview:', err);
              reject(err);
            } else {
              console.log(`Overview created with ID ${this.lastID}`);
              resolve(this.lastID);
            }
          }
        );
      });
      
      return res.json({
        message: 'Weekly overview generated successfully.',
        overview: {
          week_start: mondayStr,
          content: overviewContent,
          created_at: new Date().toISOString(),
          article_count: recentArticles.length
        }
      });
    } catch (openaiError) {
      console.error('Error from OpenAI:', openaiError);
      
      // Handle OpenAI errors gracefully
      return res.status(500).json({
        message: 'Error generating overview with OpenAI. Please try again later.',
        error: openaiError.toString()
      });
    }
  } catch (error) {
    console.error('Error generating overview:', error);
    return res.status(500).json({
      message: 'Failed to generate weekly overview.',
      error: error.toString()
    });
  }
});

// Get the latest weekly overview
router.get('/overview', async (req, res) => {
  try {
    // Get the most recent overview
    const overview = await new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM overviews ORDER BY created_at DESC LIMIT 1`,
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
    
    if (!overview) {
      return res.status(404).json({ message: 'No overviews found.' });
    }
    
    return res.json({ overview });
    
  } catch (error) {
    console.error('Error fetching overview:', error);
    return res.status(500).json({
      message: 'Failed to fetch overview.',
      error: error.toString()
    });
  }
});

// POST /articles/regenerate-summaries - Regenerate summaries for selected feeds without fetching new content
router.post('/regenerate-summaries', async (req, res) => {
  try {
    const { feedUrls } = req.body;
    
    if (!feedUrls || !Array.isArray(feedUrls) || feedUrls.length === 0) {
      return res.status(400).json({ error: "Missing or invalid feedUrls parameter" });
    }

    console.log(`Regenerating summaries for ${feedUrls.length} feeds`);
    
    // Get all articles from the specified feeds
    const articles = await new Promise((resolve, reject) => {
      const placeholders = feedUrls.map(() => '?').join(',');
      db.all(
        `SELECT id, title, full_text, link FROM articles 
         WHERE feed_url IN (${placeholders})
         ORDER BY published_date DESC`,
        feedUrls,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
    
    if (articles.length === 0) {
      return res.json({ message: 'No articles found for the selected feeds.' });
    }
    
    console.log(`Found ${articles.length} articles to regenerate summaries for`);
    
    // Initialize o3-mini for summarization
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "o3-mini",
      temperature: 0.2,
      maxCompletionTokens: 1500
    });
    
    // Check if we're using the new schema or old schema
    const tableInfo = await new Promise((resolve, reject) => {
      db.all(
        "PRAGMA table_info(summaries)",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
    
    // Check if we have short_summary and detailed_summary columns
    const hasNewSchema = tableInfo.some(col => col.name === 'short_summary');
    
    // Process all articles
    let processed = 0;
    let failures = 0;
    
    for (const article of articles) {
      try {
        console.log(`Processing article ID ${article.id}: "${article.title}"`);
        
        // Generate short summary
        const shortSummaryPrompt = `
          You are an expert article summarizer tasked with creating a concise summary of the article below.
          
          Create a BRIEF summary of 1-2 sentences that captures the key information.
          Focus on the core message and any unique insights.
          Avoid filler phrases like 'this article discusses' or 'the author explains'.
          Maximize information density with specific details.
          
          ARTICLE:
          ${article.full_text}
        `;
        
        // Send request for short summary
        const shortSummaryResponse = await llm.invoke(shortSummaryPrompt);
        const shortSummary = shortSummaryResponse.content;
        
        if (hasNewSchema) {
          // Use new schema with both summary types
          // Generate detailed summary
          const detailedSummaryPrompt = `
            Extract only meaningful, insightful content from the article below.
            
            Create a detailed summary that captures only the meaningful information.

            Include:
            - Unique or interesting statements and claims
            - Novel insights, perspectives and implications
            - Specific, practical advice for consumers or builders
            - Differences between models; strengths and weaknesses
            - Recent or uncoming releases if they are impactful
            
            Exclude:
            - Common or trite observations (e.g., "AI has potential to disrupt X" / "Companies should plan to include AI")
            - General background information familiar to AI practitioners
            - Filler content and boilerplate descriptions
            
            ONLY return plain text, no markdown. Do not add any filler text, headings or formatting.
            
            ARTICLE:
            ${article.full_text}
          `;
          
          const detailedSummaryResponse = await llm.invoke(detailedSummaryPrompt);
          const detailedSummary = detailedSummaryResponse.content;
          
          // Check if summary already exists for this article
          const existingSummary = await new Promise((resolve) => {
            db.get(
              `SELECT id FROM summaries WHERE article_id = ?`,
              [article.id],
              (err, row) => {
                if (err || !row) {
                  resolve(false);
                } else {
                  resolve(true);
                }
              }
            );
          });
          
          if (existingSummary) {
            // Update existing summary
            db.run(
              `UPDATE summaries SET short_summary = ?, detailed_summary = ? WHERE article_id = ?`,
              [shortSummary, detailedSummary, article.id],
              (err) => {
                if (err) {
                  console.error(`Error updating summaries for article ID ${article.id}:`, err);
                  failures++;
                } else {
                  console.log(`Updated summaries for article ID ${article.id}`);
                  processed++;
                }
              }
            );
          } else {
            // Insert new summary
            db.run(
              `INSERT INTO summaries (article_id, short_summary, detailed_summary) VALUES (?, ?, ?)`,
              [article.id, shortSummary, detailedSummary],
              (err) => {
                if (err) {
                  console.error(`Error inserting summaries for article ID ${article.id}:`, err);
                  failures++;
                } else {
                  console.log(`Inserted summaries for article ID ${article.id}`);
                  processed++;
                }
              }
            );
          }
        } else {
          // Use old schema with only one summary field
          // Check if summary already exists for this article
          const existingSummary = await new Promise((resolve) => {
            db.get(
              `SELECT id FROM summaries WHERE article_id = ?`,
              [article.id],
              (err, row) => {
                if (err || !row) {
                  resolve(false);
                } else {
                  resolve(true);
                }
              }
            );
          });
          
          if (existingSummary) {
            // Update existing summary
            db.run(
              `UPDATE summaries SET summary = ? WHERE article_id = ?`,
              [shortSummary, article.id],
              (err) => {
                if (err) {
                  console.error(`Error updating summary for article ID ${article.id}:`, err);
                  failures++;
                } else {
                  console.log(`Updated summary for article ID ${article.id}`);
                  processed++;
                }
              }
            );
          } else {
            // Insert new summary
            db.run(
              `INSERT INTO summaries (article_id, summary) VALUES (?, ?)`,
              [article.id, shortSummary],
              (err) => {
                if (err) {
                  console.error(`Error inserting summary for article ID ${article.id}:`, err);
                  failures++;
                } else {
                  console.log(`Inserted summary for article ID ${article.id}`);
                  processed++;
                }
              }
            );
          }
        }
      } catch (err) {
        console.warn(`Error processing article ID ${article.id}:`, err.message);
        failures++;
      }
    }
    
    return res.json({
      message: `Regenerated summaries for ${processed} articles. Failed: ${failures}.`,
      processed,
      failures
    });
  } catch (error) {
    console.error("Error regenerating summaries:", error);
    return res.status(500).json({
      message: "Failed to regenerate summaries.",
      error: error.toString()
    });
  }
});

// Fetch articles from all active feeds
router.post('/fetch-all', async (req, res) => {
  try {
    console.log('Manual trigger: fetching all feeds');
    
    // Get all active feeds
    const feeds = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, feed_url FROM feeds WHERE deleted = 0`,
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    if (feeds.length === 0) {
      return res.json({ message: 'No feeds to process.' });
    }
    
    // Process each feed
    const results = {
      totalFeeds: feeds.length,
      successCount: 0,
      errorCount: 0,
      newArticlesCount: 0,
      details: []
    };
    
    for (const feed of feeds) {
      try {

        
        console.log(`Processing feed: ${feed.feed_url} (limited to 5 most recent articles)`);
        const response = await axios.get(`http://localhost:3000/articles/fetch`, {
          params: { feedUrl: feed.feed_url }
        });
        
        const newlyAdded = response.data.newlyAdded || [];
        results.newArticlesCount += newlyAdded.length;
        results.successCount++;
        
        results.details.push({
          feedUrl: feed.feed_url,
          status: 'success',
          newArticles: newlyAdded.length
        });
        
        console.log(`Successfully processed feed: ${feed.feed_url}, found ${newlyAdded.length} new articles`);
      } catch (err) {
        console.error(`Error processing feed ${feed.feed_url}:`, err.message);
        results.errorCount++;
        results.details.push({
          feedUrl: feed.feed_url,
          status: 'error',
          error: err.message
        });
      }
    }
    
    console.log('Manual fetch-all completed:');
    console.log(`- Processed: ${results.successCount} feeds successfully`);
    console.log(`- Errors: ${results.errorCount} feeds`);
    console.log(`- New articles: ${results.newArticlesCount} added`);
    
    res.json({
      message: `Processed ${results.totalFeeds} feeds. Added ${results.newArticlesCount} new articles.`,
      results
    });
  } catch (error) {
    console.error("Error in fetch-all:", error);
    return res.status(500).json({
      message: "Failed to fetch articles from all feeds.",
      error: error.toString()
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

    // Query to get total count (only from active feeds)
    const total = await new Promise((resolve, reject) => {
      const placeholders = feedUrlsArray.map(() => '?').join(',');
      db.get(
        `SELECT COUNT(*) as count 
         FROM articles 
         JOIN feeds ON articles.feed_url = feeds.feed_url
         WHERE articles.feed_url IN (${placeholders})
         AND feeds.deleted = 0`,
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

    // Check if we're using the new schema or old schema
    const tableInfo = await new Promise((resolve, reject) => {
      db.all(
        "PRAGMA table_info(summaries)",
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
    
    // Check if we have short_summary and detailed_summary columns
    const hasNewSchema = tableInfo.some(col => col.name === 'short_summary');
    
    // Query to get paginated articles with summaries
    const articles = await new Promise((resolve, reject) => {
      const placeholders = feedUrlsArray.map(() => '?').join(',');
      
      const query = hasNewSchema
        ? `
          SELECT articles.*, summaries.short_summary, summaries.detailed_summary
          FROM articles
          LEFT JOIN summaries ON articles.id = summaries.article_id
          JOIN feeds ON articles.feed_url = feeds.feed_url
          WHERE articles.feed_url IN (${placeholders})
          AND feeds.deleted = 0
          ORDER BY articles.published_date DESC
          LIMIT ? OFFSET ?
          `
        : `
          SELECT articles.*, summaries.summary
          FROM articles
          LEFT JOIN summaries ON articles.id = summaries.article_id
          JOIN feeds ON articles.feed_url = feeds.feed_url
          WHERE articles.feed_url IN (${placeholders})
          AND feeds.deleted = 0
          ORDER BY articles.published_date DESC
          LIMIT ? OFFSET ?
          `;
      
      db.all(
        query,
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