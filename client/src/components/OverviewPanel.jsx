// client/src/components/OverviewPanel.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

function OverviewPanel({ onRefreshClick }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch the latest overview when component mounts
  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('http://localhost:3000/articles/overview');
      setOverview(response.data.overview);
    } catch (err) {
      console.error("Error fetching overview:", err);
      // Only set error if it's a 500 error, not a 404 (which means no overview exists yet)
      if (err.response && err.response.status !== 404) {
        setError("Failed to fetch weekly overview. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    // First have the parent component fetch latest articles
    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Fetch latest articles
      console.log("Fetching latest articles...");
      let fetchSuccess = false;
      if (onRefreshClick) {
        fetchSuccess = await onRefreshClick();
      }
      
      if (!fetchSuccess) {
        setError("No feeds selected or error fetching articles.");
        setLoading(false);
        return;
      }
      
      // Step 2: Generate a new overview with timeout
      console.log("Generating new overview...");
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Overview generation timed out')), 120000); // 2 minute timeout
      });
      
      const overviewPromise = axios.post('http://localhost:3000/articles/generate-overview');
      
      // Race between the actual request and the timeout
      const response = await Promise.race([overviewPromise, timeoutPromise]);
      setOverview(response.data.overview);
      console.log("Overview generated successfully");
    } catch (err) {
      console.error("Error during refresh:", err);
      if (err.message === 'Overview generation timed out') {
        setError("Overview generation is taking too long. Please try again later.");
      } else if (err.response && err.response.data && err.response.data.message) {
        // Use the server's error message if available
        setError(`${err.response.data.message}`);
      } else {
        setError("Failed to generate weekly overview. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Format the date to be more readable
  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="overview-panel">
      <div className="overview-header">
        <h2>Weekly AI News Overview</h2>
        <button 
          onClick={handleRefresh} 
          disabled={loading} 
          className="refresh-button"
        >
          {loading ? "Generating..." : "Refresh All Content"}
        </button>
      </div>
      
      {error && <p className="error-message">{error}</p>}
      
      {loading && <p>Generating overview, please wait...</p>}
      
      {!loading && !overview && !error && (
        <div className="no-overview">
          <p>No weekly overview available. Click "Refresh All Content" to generate one.</p>
        </div>
      )}
      
      {!loading && overview && (
        <div className="overview-content">
          <p className="overview-date">
            <strong>Week of {formatDate(overview.week_start)}</strong>
          </p>
          <div className="overview-text">
            {overview.content.split('\n\n').map((paragraph, index) => {
              // Check if this paragraph is a heading
              if (paragraph.startsWith('# ')) {
                return <h3 key={index}>{paragraph.substring(2)}</h3>;
              } else if (paragraph.startsWith('## ')) {
                return <h4 key={index}>{paragraph.substring(3)}</h4>;
              } else if (paragraph.startsWith('### ')) {
                return <h5 key={index}>{paragraph.substring(4)}</h5>;
              } else {
                return <p key={index}>{paragraph}</p>;
              }
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewPanel;
