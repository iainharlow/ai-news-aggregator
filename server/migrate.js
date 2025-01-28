// server/migrate.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'news_aggregator.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      link TEXT UNIQUE,
      full_text TEXT,
      published_date TEXT,
      feed_url TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS summaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      article_id INTEGER,
      summary TEXT,
      FOREIGN KEY (article_id) REFERENCES articles(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS overviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      overview TEXT,
      created_date TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS feeds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_url TEXT UNIQUE
    )
  `);

  // Insert a default feed in dev, ignoring duplicates
  db.run(`
    INSERT INTO feeds (feed_url)
    VALUES ('https://www.wired.com/feed/tag/ai/latest/rss')
    ON CONFLICT(feed_url) DO NOTHING
  `);

  console.log("Migration complete.");
  db.close();
});