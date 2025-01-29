// server/routes/feeds.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /feeds - list existing feeds
router.get('/', (req, res) => {
  db.all(`SELECT id, feed_url, feed_name FROM feeds ORDER BY id DESC`, (err, rows) => {
    if (err) {
      console.error("Error fetching feeds: ", err);
      return res.status(500).send({ message: 'Failed to fetch feeds' });
    }
    res.send({ feeds: rows });
  });
});

// POST /feeds - add a new feed
router.post('/', (req, res) => {
  const { feedUrl, feedName } = req.body;
  if (!feedUrl) {
    return res.status(400).json({ error: "feedUrl is required" });
  }

  db.run(`
    INSERT INTO feeds (feed_url, feed_name)
    VALUES (?, ?)
    ON CONFLICT(feed_url) DO NOTHING
  `,
  [feedUrl, feedName || null],
  function (err) {
    if (err) {
      console.error("Error inserting feed: ", err);
      return res.status(500).json({ error: "Database insert failed" });
    }
    // 'this.changes' is > 0 if a new row was inserted, 0 if it already existed
    if (this.changes === 0) {
      return res.json({ message: "Feed already exists or conflict occurred." });
    }
    res.json({ message: "Feed added successfully", feedId: this.lastID });
  });
});

module.exports = router;