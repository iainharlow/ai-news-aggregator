// server/migrations/add_deleted_to_feeds.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Adjust the path if your database is located elsewhere
const dbPath = path.resolve(__dirname, '../news_aggregator.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to the database.');
  }
});

// Function to add the 'deleted' column
const addDeletedColumn = () => {
  db.run(
    `
    ALTER TABLE feeds
    ADD COLUMN deleted INTEGER DEFAULT 0
    `,
    (err) => {
      if (err) {
        if (err.message.includes('duplicate column name')) {
          console.log("'deleted' column already exists.");
        } else {
          console.error('Error adding deleted column:', err.message);
        }
      } else {
        console.log("'deleted' column added successfully.");
      }

      db.close((closeErr) => {
        if (closeErr) {
          console.error('Error closing the database:', closeErr.message);
        } else {
          console.log('Database connection closed.');
        }
      });
    }
  );
};

// Execute the migration
addDeletedColumn();