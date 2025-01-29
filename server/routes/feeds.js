// server/routes/feeds.js
const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /feeds - list existing (active) feeds
router.get('/', (req, res) => {
  db.all(
    `SELECT id, feed_url, feed_name FROM feeds WHERE deleted = 0 ORDER BY id DESC`,
    (err, rows) => {
      if (err) {
        console.error("Error fetching feeds: ", err);
        return res.status(500).send({ message: 'Failed to fetch feeds' });
      }
      res.send({ feeds: rows });
    }
  );
});

// POST /feeds - add a new feed
router.post('/', (req, res) => {
  const { feedUrl, feedName } = req.body;
  if (!feedUrl) {
    return res.status(400).json({ error: "feedUrl is required" });
  }

  db.run(
    `
    INSERT INTO feeds (feed_url, feed_name, deleted)
    VALUES (?, ?, 0)
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
    }
  );
});

// PUT /feeds/:id - edit an existing feed
router.put('/:id', (req, res) => {
  const feedId = req.params.id;
  const { feedUrl, feedName } = req.body;

  if (!feedUrl) {
    return res.status(400).json({ error: "feedUrl is required" });
  }

  db.run(
    `
    UPDATE feeds
    SET feed_url = ?, feed_name = ?
    WHERE id = ? AND deleted = 0
    `,
    [feedUrl, feedName || null, feedId],
    function (err) {
      if (err) {
        console.error("Error updating feed: ", err);
        return res.status(500).json({ error: "Database update failed" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Feed not found or already deleted." });
      }
      res.json({ message: "Feed updated successfully." });
    }
  );
});

// DELETE /feeds/:id - soft delete an existing feed
router.delete('/:id', (req, res) => {
  const feedId = req.params.id;

  db.run(
    `
    UPDATE feeds
    SET deleted = 1
    WHERE id = ?
    `,
    [feedId],
    function (err) {
      if (err) {
        console.error("Error soft deleting feed: ", err);
        return res.status(500).json({ error: "Database delete failed" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Feed not found." });
      }
      res.json({ message: "Feed archived successfully." });
    }
  );
});

// GET /feeds/archived - list archived (deleted) feeds
router.get('/archived', (req, res) => {
  db.all(
    `SELECT id, feed_url, feed_name FROM feeds WHERE deleted = 1 ORDER BY id DESC`,
    (err, rows) => {
      if (err) {
        console.error("Error fetching archived feeds: ", err);
        return res.status(500).send({ message: 'Failed to fetch archived feeds' });
      }
      res.send({ feeds: rows });
    }
  );
});

// PUT /feeds/:id/reactivate - reactivate an archived feed
router.put('/:id/reactivate', (req, res) => {
  const feedId = req.params.id;

  db.run(
    `
    UPDATE feeds
    SET deleted = 0
    WHERE id = ?
    `,
    [feedId],
    function (err) {
      if (err) {
        console.error("Error reactivating feed: ", err);
        return res.status(500).json({ error: "Database update failed" });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: "Feed not found." });
      }
      res.json({ message: "Feed reactivated successfully." });
    }
  );
});

// DELETE /feeds/:id/clear - Hard delete all articles associated with a feed
router.delete('/:id/clear', async (req, res) => {
    const feedId = req.params.id;
  
    try {
      // Retrieve the feed URL based on feed ID
      const feed = await new Promise((resolve, reject) => {
        db.get(`SELECT feed_url FROM feeds WHERE id = ? AND deleted = 0`, [feedId], (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        });
      });
  
      if (!feed) {
        return res.status(404).json({ message: "Feed not found or already archived." });
      }
  
      const feedUrl = feed.feed_url;
  
      // Delete articles associated with the feed
      await new Promise((resolve, reject) => {
        db.run(`DELETE FROM articles WHERE feed_url = ?`, [feedUrl], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
  
      res.json({ message: "All articles from the feed have been deleted." });
    } catch (err) {
      console.error("Error clearing feed articles:", err);
      res.status(500).json({ error: "Failed to clear feed articles." });
    }
  });

module.exports = router;