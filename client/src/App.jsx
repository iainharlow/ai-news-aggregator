import React, { useState } from "react";
import FeedList from "./components/FeedList";
import ArticleList from "./components/ArticleList";
import './App.css';

function App() {
  const [selectedFeedUrls, setSelectedFeedUrls] = useState([]);

  return (
    <div>
      <h1>AI News Aggregator</h1>
      <FeedList onFeedSelect={(feeds) => setSelectedFeedUrls(feeds)} />
      <ArticleList feedUrls={selectedFeedUrls} />
    </div>
  );
}

export default App;