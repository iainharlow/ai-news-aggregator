const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => {
    try {
        db.all(`SELECT DISTINCT feed_url FROM feeds`, (err, rows) => {
            if (err) {
              console.error("Error fetching feeds from database: ", err);
              res.status(500).send({ message: 'Failed to fetch feeds', error: err.toString() });
            } else {
              res.send({ feeds: rows });
            }
        });
    } catch (error) {
        console.error("Error fetching feeds:", error);
        res.status(500).send({
            message: 'Failed to fetch feeds',
            error: error.toString(),
        });
    }
});

module.exports = router;