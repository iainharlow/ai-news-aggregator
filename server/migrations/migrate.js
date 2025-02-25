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
        feed_name: "Chain of Thought (Dan Shipper)",
        deleted: 0
      },
      {
        feed_url: "https://every.to/learning-curve/feed",
        feed_name: "Learning Curve (Rhea Purohit)",
        deleted: 0
      },
    
      // Institutional Sources
      {
        feed_url: "https://openai.com/blog/rss",
        feed_name: "OpenAI Blog (OpenAI Team)",
        deleted: 0
      },
      {
        feed_url: "https://deepmind.com/blog/feed/basic",
        feed_name: "DeepMind Blog (DeepMind Team)",
        deleted: 0
      },
      {
        feed_url: "http://googleaiblog.blogspot.com/atom.xml",
        feed_name: "Google AI Blog (Google AI Team)",
        deleted: 0
      },
      {
        feed_url: "https://blogs.microsoft.com/ai/feed",
        feed_name: "Microsoft AI Blog (Microsoft Team)",
        deleted: 0
      },
      {
        feed_url: "https://www.amazon.science/index.rss",
        feed_name: "Amazon Science (Amazon Team)",
        deleted: 0
      },
      {
        feed_url: "https://aws.amazon.com/blogs/machine-learning/feed",
        feed_name: "AWS Machine Learning Blog (AWS Team)",
        deleted: 0
      },
      {
        feed_url: "https://huggingface.co/blog/feed.xml",
        feed_name: "Hugging Face Blog (Hugging Face Team)",
        deleted: 0
      },
      {
        feed_url: "https://stability.ai/blog?format=rss",
        feed_name: "Stability AI Blog (Stability AI Team)",
        deleted: 0
      },
      {
        feed_url: "https://aihub.org/feed?cat=-473",
        feed_name: "AIhub (Community)",
        deleted: 0
      },
    
      // Independent Expert Blogs & Newsletters
      {
        feed_url: "https://jack-clark.net/feed/",
        feed_name: "Import AI (Jack Clark)",
        deleted: 0
      },
      {
        feed_url: "https://thegradient.pub/rss/",
        feed_name: "The Gradient (The Gradient Team)",
        deleted: 0
      },
      {
        feed_url: "https://magazine.sebastianraschka.com/feed",
        feed_name: "Ahead of AI (Sebastian Raschka)",
        deleted: 0
      },
      {
        feed_url: "https://aisupremacy.substack.com/feed",
        feed_name: "AI Supremacy (Michael Spencer)",
        deleted: 0
      },
      {
        feed_url: "https://thealgorithmicbridge.substack.com/feed",
        feed_name: "The Algorithmic Bridge (Alberto Romero)",
        deleted: 0
      },
      {
        feed_url: "https://thesequence.substack.com/feed",
        feed_name: "TheSequence (Jesus Rodriguez)",
        deleted: 0
      },
      {
        feed_url: "https://lastweekin.ai/feed",
        feed_name: "Last Week in AI (Skynet Today Team)",
        deleted: 0
      },
      {
        feed_url: "https://www.interconnects.ai/feed",
        feed_name: "Interconnects (Interconnects.ai Team)",
        deleted: 0
      },
      {
        feed_url: "https://www.aiweirdness.com/rss/",
        feed_name: "AI Weirdness (Janelle Shane)",
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