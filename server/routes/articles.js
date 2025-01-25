const express = require('express');
const router = express.Router();
const axios = require('axios');
const RSSParser = require('rss-parser');
const db = require('../database');
const cheerio = require('cheerio');
const { ChatOpenAI } = require("@langchain/openai");
const { loadSummarizationChain } = require("langchain/chains");
const { Document } = require("langchain/document");

router.get('/', async (req, res) => {
    try {
        const feedURL = 'http://feeds.bbci.co.uk/news/technology/rss.xml';
        const response = await axios.get(feedURL, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          },
        });
        const parser = new RSSParser();
        const feed = await parser.parseString(response.data);

        if (feed.items.length > 0) {
            const topArticle = feed.items[0];
            const articleResponse = await axios.get(topArticle.link, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
              },
            });
            const $ = cheerio.load(articleResponse.data);
            const full_text = $('article').text();

           db.run(
            `INSERT INTO articles (title, link, full_text, published_date) VALUES (?, ?, ?, ?)
            ON CONFLICT(link) DO UPDATE SET full_text = ?`,
               [topArticle.title, topArticle.link, full_text, topArticle.pubDate, full_text],
            (err) => {
            if (err) {
                console.error("Error saving to database: ", err);
            } else {
            console.log("Article saved succesfully to database");
            }
           }
        );

        const model = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: "gpt-3.5-turbo",
        });
        const chain = loadSummarizationChain(model, { type: "map_reduce" });
        const document = new Document({ pageContent: full_text });
        const summary = await chain.invoke({ input_documents: [document] });

        db.run(
            `INSERT INTO summaries (article_id, summary) VALUES ((SELECT id from articles WHERE link = ?), ?)`,
              [topArticle.link, summary.text],
            (err) => {
            if (err) {
                 console.error("Error saving summary to database: ", err);
            } else {
               console.log("Summary saved succesfully to database");
            }
           }
        );
         const article = await new Promise((resolve, reject) => {
          db.get('SELECT full_text, (SELECT summary from summaries WHERE article_id = articles.id) as summary FROM articles WHERE link = ?', topArticle.link, (err, row) => {
            if (err) {
              reject(err);
            } else {
                resolve(row);
            }
          });
         });

        res.send({ articleText: article.full_text, summary: article.summary });

        } else {
            res.send({ message: 'No articles found in the feed.' });
        }
    } catch (error) {
        console.error("Error fetching or parsing RSS feed:", error);
        res.status(500).send({
            message: 'Failed to fetch articles',
            error: error.toString(),
        });
    }
});

module.exports = router;