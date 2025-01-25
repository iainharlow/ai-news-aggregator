const express = require('express');
const router = express.Router();
const axios = require('axios');
const RSSParser = require('rss-parser');

router.get('/', async (req, res) => {
    try {
        const feedURL = 'https://openai.com/blog/rss.xml'; // Use the OpenAI blog RSS feed.
        const parser = new RSSParser();
        const feed = await parser.parseURL(feedURL);

        res.send({ articles: feed.items });
    } catch (error) {
        res.status(500).send({ message: 'Failed to fetch articles', error: error });
    }
});

module.exports = router;