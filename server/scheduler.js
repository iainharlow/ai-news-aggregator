// server/scheduler.js
const cron = require('node-cron');
const axios = require('axios');
const db = require('./database');

function startScheduler() {
  console.log('Starting article fetch scheduler...');
  
  // Schedule task to run every hour (you can adjust this timing)
  cron.schedule('20 21 * * *', async () => {
    console.log('Running scheduled article fetch:', new Date().toISOString());
    
    try {
      // Get all active feeds
      const feeds = await new Promise((resolve, reject) => {
        db.all(
          `SELECT id, feed_url FROM feeds WHERE deleted = 0`,
          (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
          }
        );
      });
      
      console.log(`Found ${feeds.length} active feeds to process`);
      
      if (feeds.length === 0) {
        console.log('No feeds to process. Skipping fetch.');
        return;
      }
      
      // Process each feed
      let successCount = 0;
      let errorCount = 0;
      let newArticlesCount = 0;
      
      for (const feed of feeds) {
        try {
          console.log(`Processing feed: ${feed.feed_url}`);
          
          // Use the existing fetch endpoint
          const response = await axios.get(`http://localhost:3000/articles/fetch`, {
            params: { feedUrl: feed.feed_url }
          });
          
          // Count new articles
          const newlyAdded = response.data.newlyAdded || [];
          newArticlesCount += newlyAdded.length;
          
          console.log(`Successfully processed feed: ${feed.feed_url}, found ${newlyAdded.length} new articles`);
          successCount++;
        } catch (err) {
          console.error(`Error processing feed ${feed.feed_url}:`, err.message);
          errorCount++;
        }
      }
      
      console.log('Scheduled article fetch completed:');
      console.log(`- Processed: ${successCount} feeds successfully`);
      console.log(`- Errors: ${errorCount} feeds`);
      console.log(`- New articles: ${newArticlesCount} added`);
    } catch (err) {
      console.error('Error in scheduled article fetch:', err);
    }
  });
  
  // You can add more scheduled tasks here in the future
}

module.exports = { startScheduler };