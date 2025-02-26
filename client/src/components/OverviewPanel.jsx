// client/src/components/OverviewPanel.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

function OverviewPanel({ onRefreshClick, onRegenerateClick }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

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
    // Fetch new articles without regenerating existing summaries
    setLoading(true);
    setError(null);
    
    try {
      console.log("Calling fetch-new endpoint...");
      const response = await axios.post('http://localhost:3000/articles/fetch-new');
      console.log("Refresh response:", response.data);
      
      // Refresh the overview display
      await fetchOverview();
      
    } catch (err) {
      console.error("Error during refresh:", err);
      if (err.response && err.response.data && err.response.data.message) {
        setError(`${err.response.data.message}`);
      } else {
        setError("Failed to refresh content. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleRegenerateSummaries = async () => {
    // Have the parent component regenerate summaries for selected feeds
    setLoading(true);
    setIsRegenerating(true);
    setError(null);
    
    try {
      console.log("Regenerating summaries...");
      if (onRegenerateClick) {
        const success = await onRegenerateClick();
        if (!success) {
          setError("No feeds selected or error regenerating summaries.");
        } else {
          // Fetch overview again to show it's done
          fetchOverview();
        }
      }
    } catch (err) {
      console.error("Error regenerating summaries:", err);
      setError("Failed to regenerate summaries. Please try again.");
    } finally {
      setLoading(false);
      setIsRegenerating(false);
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
        <div className="overview-actions">
          <button 
            onClick={handleRegenerateSummaries} 
            disabled={loading} 
            className="regenerate-button"
          >
            {loading && isRegenerating ? "Regenerating..." : "Regenerate Summaries"}
          </button>
          <button 
            onClick={handleRefresh} 
            disabled={loading} 
            className="refresh-button"
          >
            {loading && !isRegenerating ? "Generating..." : "Refresh All Content"}
          </button>
        </div>
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
