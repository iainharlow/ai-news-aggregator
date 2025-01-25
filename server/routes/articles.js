const express = require('express');
const router = express.Router();
const axios = require('axios');
const RSSParser = require('rss-parser');

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

      res.send({ articles: feed.items });
  } catch (error) {
      console.error("Error fetching or parsing RSS feed:", error);
        res.status(500).send({
            message: 'Failed to fetch articles',
            error: error.toString(),
        });
  }
});

module.exports = router;