// client/src/App.jsx

import React, { useState, useEffect } from "react";
import FeedList from "./components/FeedList";
import ArticleList from "./components/ArticleList";
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

  return (
    <ErrorBoundary>
      <div>
        <h1>AI News Aggregator</h1>
        <FeedList onFeedSelect={(feeds) => {
          console.log("App received selected feeds:", feeds);
          setSelectedFeedUrls(feeds);
        }} />
        <ArticleList feedUrls={selectedFeedUrls} />

        {/* Dark Mode Toggle Button */}
        <button className="dark-mode-toggle" onClick={toggleDarkMode} title="Toggle Dark Mode">
          {darkMode ? '🌞' : '🌙'}
        </button>
      </div>
    </ErrorBoundary>
  );
}

export default App;