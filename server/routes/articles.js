const express = require('express');
const router = express.Router();
const axios = require('axios');
const RSSParser = require('rss-parser');
const cheerio = require('cheerio');


router.get('/', async (req, res) => {
    try {
        const feedURL = 'https://www.wired.com/feed/tag/ai/latest/rss';
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
            const articleText = $('article').text();

            res.send({ articleText: articleText });
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