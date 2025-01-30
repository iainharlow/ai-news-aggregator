// migrate.js

const sqlite3 = require('sqlite3').verbose();

// Connect to the SQLite database
const db = new sqlite3.Database('./news_aggregator.db', (err) => {
  if (err) {
    console.error('Could not connect to database', err);
    process.exit(1);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Function to drop existing tables
const dropTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`DROP TABLE IF EXISTS summaries;`, (err) => {
        if (err) {
          console.error('Error dropping summaries table:', err);
          reject(err);
        } else {
          console.log('Dropped summaries table.');
        }
      });

      db.run(`DROP TABLE IF EXISTS articles;`, (err) => {
        if (err) {
          console.error('Error dropping articles table:', err);
          reject(err);
        } else {
          console.log('Dropped articles table.');
        }
      });

      db.run(`DROP TABLE IF EXISTS feeds;`, (err) => {
        if (err) {
          console.error('Error dropping feeds table:', err);
          reject(err);
        } else {
          console.log('Dropped feeds table.');
        }
      });

      db.run(`DROP TABLE IF EXISTS overviews;`, (err) => {
        if (err) {
          console.error('Error dropping overviews table:', err);
          reject(err);
        } else {
          console.log('Dropped overviews table.');
        }
      });

      // Wait a moment before resolving to ensure all drop operations are complete
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  });
};

// Function to create necessary tables
const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create feeds table
      db.run(`
        CREATE TABLE feeds (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          feed_url TEXT UNIQUE NOT NULL,
          feed_name TEXT NOT NULL,
          deleted INTEGER DEFAULT 0
        );
      `, (err) => {
        if (err) {
          console.error('Error creating feeds table:', err);
          reject(err);
        } else {
          console.log('Created feeds table.');
        }
      });

      // Create articles table with author field
      db.run(`
        CREATE TABLE articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          link TEXT UNIQUE NOT NULL,
          full_text TEXT,
          published_date TEXT,
          feed_url TEXT,
          author TEXT, -- Added author field
          FOREIGN KEY(feed_url) REFERENCES feeds(feed_url)
        );
      `, (err) => {
        if (err) {
          console.error('Error creating articles table:', err);
          reject(err);
        } else {
          console.log('Created articles table.');
        }
      });

      // Create summaries table
      db.run(`
        CREATE TABLE summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          article_id INTEGER NOT NULL,
          summary TEXT,
          FOREIGN KEY(article_id) REFERENCES articles(id)
        );
      `, (err) => {
        if (err) {
          console.error('Error creating summaries table:', err);
          reject(err);
        } else {
          console.log('Created summaries table.');
        }
      });

      // Wait a moment before resolving to ensure all create operations are complete
      setTimeout(() => {
        resolve();
      }, 1000);
    });
  });
};

// Function to insert feed records
const insertFeeds = () => {
  return new Promise((resolve, reject) => {
    const feeds = [
      {
        feed_url: "https://www.oneusefulthing.org/feed",
        feed_name: "One Useful Thing (Ethan Mollick)",
        deleted: 0
      },
      {
        feed_url: "https://every.to/context-window/feed.xml",
        feed_name: "Context Window (Every Team)",
        deleted: 0
      },
      {
        feed_url: "https://every.to/chain-of-thought/feed",
        feed_name: "Chain Of Thought (Dan Shipper)",
        deleted: 0
      },
      {
        feed_url: "https://every.to/learning-curve/feed",
        feed_name: "Learning Curve (Rhea Purohit)",
        deleted: 0
      }
    ];

    const stmt = db.prepare(`
      INSERT INTO feeds (feed_url, feed_name, deleted)
      VALUES (?, ?, ?)
    `);

    db.serialize(() => {
      feeds.forEach((feed) => {
        stmt.run([feed.feed_url, feed.feed_name, feed.deleted], (err) => {
          if (err) {
            if (err.message.includes('SQLITE_CONSTRAINT')) {
              console.warn(`Feed already exists: ${feed.feed_name}`);
            } else {
              console.error(`Error inserting feed ${feed.feed_name}:`, err);
            }
          } else {
            console.log(`Inserted feed: ${feed.feed_name}`);
          }
        });
      });

      stmt.finalize((err) => {
        if (err) {
          console.error('Error finalizing statement:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
};

// Execute migration steps sequentially
const migrate = async () => {
  try {
    await dropTables();
    await createTables();
    await insertFeeds();
    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed.');
      }
    });
  }
};

migrate();