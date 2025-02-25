# AI News Aggregator

A web application that aggregates RSS feeds, summarizes articles using AI, and provides intelligent analysis of news content.

## Features

- RSS feed management (add, edit, archive feeds)
- Article fetching and content extraction
- AI-powered article summarization
- Dark mode support
- Pagination for article browsing

## Prerequisites

- Node.js (v14 or later recommended)
- npm (v6 or later)
- OpenAI API key for the summarization feature

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/ai-news-aggregator.git
   cd ai-news-aggregator
   ```

2. Install dependencies for both the client and server:
   ```bash
   npm run install-all
   ```

3. Create a `.env` file in the server directory:
   ```bash
   cd server
   touch .env
   ```

4. Add your OpenAI API key to the `.env` file:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   PORT=3000
   ```

## Running the Application

You can run both the client and server with a single command:

```bash
npm run dev
```

This will start:
- The backend server on http://localhost:3000
- The frontend Vite development server on http://localhost:5173

## Usage

1. Add RSS feeds using the form at the bottom of the feeds list
2. Select feeds to view their articles
3. Click "Fetch Latest" to retrieve new articles
4. View article summaries and click on article titles to read the full content

## Project Structure

- `/client` - React frontend application
- `/server` - Express backend API
- `/server/routes` - API endpoint definitions
- `/server/migrations` - Database migration scripts

## License

[MIT](LICENSE)