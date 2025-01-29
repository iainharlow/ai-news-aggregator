// server/update_dates.js

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Path to your database
const dbPath = path.resolve(__dirname, 'news_aggregator.db');

// Connect to the database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
    process.exit(1);
  } else {
    console.log('Connected to the database.');
  }
});

// Function to update published_date
const updatePublishedDates = () => {
  db.serialize(() => {
    // Select all articles
    db.all(`SELECT id, published_date FROM articles`, (err, rows) => {
      if (err) {
        console.error('Error fetching articles:', err.message);
        return;
      }

      rows.forEach((row) => {
        const { id, published_date } = row;
        const date = new Date(published_date);

        if (isNaN(date)) {
          console.warn(`Article ID ${id} has invalid date: ${published_date}`);
          return;
        }

        const isoDate = date.toISOString();

        // Update the article's published_date
        db.run(
          `UPDATE articles SET published_date = ? WHERE id = ?`,
          [isoDate, id],
          function (updateErr) {
            if (updateErr) {
              console.error(`Error updating article ID ${id}:`, updateErr.message);
            } else {
              console.log(`Updated article ID ${id}: ${isoDate}`);
            }
          }
        );
      });
    });
  });

  // Close the database after updates
  setTimeout(() => {
    db.close((closeErr) => {
      if (closeErr) {
        console.error('Error closing the database:', closeErr.message);
      } else {
        console.log('Database connection closed.');
      }
    });
  }, 5000); // Adjust timeout if needed
};

// Run the update
updatePublishedDates();