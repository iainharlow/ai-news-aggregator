// server/migrations/check_schema.js
// This is a simple utility to check the current database schema

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

// Function to check database tables and their schemas
const checkSchema = async () => {
  try {
    // Get list of tables
    const tables = await new Promise((resolve, reject) => {
      db.all(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });

    console.log("Database Tables:");
    console.log("----------------");
    
    // For each table, get its schema
    for (const table of tables) {
      console.log(`\nTable: ${table.name}`);
      
      const schema = await new Promise((resolve, reject) => {
        db.all(
          `PRAGMA table_info(${table.name})`,
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve(rows);
            }
          }
        );
      });
      
      console.log("Columns:");
      schema.forEach(col => {
        console.log(`- ${col.name} (${col.type})`);
      });
      
      // If it's the summaries table, count records
      if (table.name === 'summaries') {
        const count = await new Promise((resolve, reject) => {
          db.get(
            `SELECT COUNT(*) as count FROM ${table.name}`,
            (err, row) => {
              if (err) {
                reject(err);
              } else {
                resolve(row.count);
              }
            }
          );
        });
        
        console.log(`Total records: ${count}`);
      }
    }
    
  } catch (error) {
    console.error('Error checking schema:', error);
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('\nDatabase connection closed.');
      }
    });
  }
};

// Run the schema check
checkSchema();
