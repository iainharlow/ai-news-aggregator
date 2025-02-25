// client/src/App.jsx

import React, { useState, useEffect } from "react";
import FeedTable from "./components/FeedTable";
import ArticleList from "./components/ArticleList";
import OverviewPanel from "./components/OverviewPanel";
import ErrorBoundary from "./components/ErrorBoundary";
import './App.css'; // Import the CSS file

function App() {
  const [selectedFeedUrls, setSelectedFeedUrls] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  // Toggle Dark Mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    localStorage.setItem('darkMode', !darkMode);
  };

  // Initialize Dark Mode based on browser preference or localStorage
  useEffect(() => {
    const storedDarkMode = localStorage.getItem('darkMode');
    if (storedDarkMode !== null) {
      setDarkMode(storedDarkMode === 'true');
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(prefersDark);
    }
  }, []);

  // Apply Dark Mode class to body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }, [darkMode]);

  // Common function for fetching articles that will be passed to both components
  const handleFetchLatest = async () => {
    console.log("App handling fetch latest", selectedFeedUrls);
    if (!selectedFeedUrls || selectedFeedUrls.length === 0) {
      console.log("No feeds selected");
      return false;
    }
    
    try {
      // Use the reference to ArticleList to call its fetchLatest method
      if (articleListRef.current && articleListRef.current.handleFetchLatest) {
        console.log("Calling handleFetchLatest on ArticleList");
        await articleListRef.current.handleFetchLatest();
        return true;
      } else {
        console.log("ArticleList reference or method not available");
        return false;
      }
    } catch (err) {
      console.error("Error fetching latest articles from App:", err);
      return false;
    }
  };
  
  // Create a ref to access the ArticleList component
  const articleListRef = React.useRef();

  return (
    <ErrorBoundary>
      <div>
        <h1>AI News Aggregator</h1>
        
        {/* Overview panel goes at the top */}
        <OverviewPanel onRefreshClick={handleFetchLatest} />
        
        <FeedTable onFeedSelect={(feeds) => {
          console.log("App received selected feeds:", feeds);
          setSelectedFeedUrls(feeds);
        }} />
        
        <ArticleList 
          ref={articleListRef}
          feedUrls={selectedFeedUrls} 
          hideFetchButton={true} /* Hide the fetch button since we moved it to overview panel */
        />

        {/* Dark Mode Toggle Button */}
        <button className="dark-mode-toggle" onClick={toggleDarkMode} title="Toggle Dark Mode">
          {darkMode ? '🌞' : '🌙'}
        </button>
      </div>
    </ErrorBoundary>
  );
}

export default App;