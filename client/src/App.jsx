import React, { useState } from "react";
import FeedList from "./components/FeedList";
import ArticleList from "./components/ArticleList";

function App() {
  // Keep track of which feed URL is currently selected
  const [selectedFeedUrl, setSelectedFeedUrl] = useState(null);

  return (
    <div>
      <h1>AI News Aggregator</h1>
      {/* FeedList will fetch its own feed data from the server 
          and call onFeedSelect(feedUrl) when a feed is clicked. */}
      <FeedList onFeedSelect={(feedUrl) => setSelectedFeedUrl(feedUrl)} />

      {/* Pass the selected feed URL to ArticleList so it knows which 
          feed's articles to fetch and display. */}
      <ArticleList feedUrl={selectedFeedUrl} />
    </div>
  );
}

export default App;