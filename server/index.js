// server/index.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { startScheduler } = require('./scheduler');


// Load .env config
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Require your routers (which each require database.js internally)
const articleRouter = require('./routes/articles');
const feedRouter = require('./routes/feeds');

// Use those routes
app.use('/articles', articleRouter);
app.use('/feeds', feedRouter);

// Simple health check endpoint
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Start the scheduler
startScheduler();

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});