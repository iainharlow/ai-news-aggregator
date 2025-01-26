import './App.css'
import ArticleList from "./components/ArticleList";
import FeedList from "./components/FeedList";
import React, { useState } from 'react';
function App() {
    const [selectedFeed, setSelectedFeed] = useState(null);

     const handleFeedSelect = (feedUrl) => {
        setSelectedFeed(feedUrl);
    };


  return (
    <>
    <h1>AI News Aggregator</h1>
    <FeedList onFeedSelect={handleFeedSelect} />
      <ArticleList feedUrl={selectedFeed} defaultFeedUrl="https://www.wired.com/feed/tag/ai/latest/rss"/>
    </>
  )
}

export default App
