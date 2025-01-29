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
    if (this.changes === 0) {
      return res.json({ message: "Feed already exists or conflict occurred." });
    }
    res.json({ message: "Feed added successfully", feedId: this.lastID });
  });
});

// PUT /feeds/:id - edit an existing feed
router.put('/:id', (req, res) => {
  const feedId = req.params.id;
  const { feedUrl, feedName } = req.body;

  if (!feedUrl) {
    return res.status(400).json({ error: "feedUrl is required" });
  }

  db.run(`
    UPDATE feeds
    SET feed_url = ?, feed_name = ?
    WHERE id = ?
  `,
  [feedUrl, feedName || null, feedId],
  function (err) {
    if (err) {
      console.error("Error updating feed: ", err);
      return res.status(500).json({ error: "Database update failed" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Feed not found." });
    }
    res.json({ message: "Feed updated successfully." });
  });
});

// DELETE /feeds/:id - delete an existing feed
router.delete('/:id', (req, res) => {
  const feedId = req.params.id;

  db.run(`
    DELETE FROM feeds
    WHERE id = ?
  `,
  [feedId],
  function (err) {
    if (err) {
      console.error("Error deleting feed: ", err);
      return res.status(500).json({ error: "Database delete failed" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Feed not found." });
    }
    res.json({ message: "Feed deleted successfully." });
  });
});

module.exports = router;