// server/migrations/add_summary_fields.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Connect to the database
const dbPath = path.resolve(__dirname, '../news_aggregator.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to the database.');
  }
});

// Function to update the summaries table
const updateSummariesTable = () => {
  return new Promise((resolve, reject) => {
    console.log('Starting summaries table update...');
    
    // First rename existing summary column to short_summary
    db.run(`
      PRAGMA foreign_keys=off;
      
      -- Create a new table with desired structure
      CREATE TABLE new_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        article_id INTEGER NOT NULL,
        short_summary TEXT,
        detailed_summary TEXT,
        FOREIGN KEY(article_id) REFERENCES articles(id)
      );
      
      -- Copy data from the old table to the new one
      INSERT INTO new_summaries (id, article_id, short_summary)
      SELECT id, article_id, summary FROM summaries;
      
      -- Drop the old table
      DROP TABLE summaries;
      
      -- Rename the new table to the old table's name
      ALTER TABLE new_summaries RENAME TO summaries;
      
      PRAGMA foreign_keys=on;
    `, function(err) {
      if (err) {
        console.error('Error updating summaries table:', err);
        reject(err);
      } else {
        console.log('Successfully updated summaries table!');
        resolve();
      }
    });
  });
};

// Create overview table if it doesn't exist
const createOverviewTable = () => {
  return new Promise((resolve, reject) => {
    console.log('Creating overviews table if not exists...');
    
    db.run(`
      CREATE TABLE IF NOT EXISTS overviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        week_start TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `, function(err) {
      if (err) {
        console.error('Error creating overviews table:', err);
        reject(err);
      } else {
        console.log('Successfully created overviews table!');
        resolve();
      }
    });
  });
};

// Execute migration steps sequentially
const migrate = async () => {
  try {
    await updateSummariesTable();
    await createOverviewTable();
    console.log('Migration completed successfully!');
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

// Run the migration
migrate();