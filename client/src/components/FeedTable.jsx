// client/src/components/FeedTable.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FeedForm from './FeedForm';
import EditFeedForm from './EditFeedForm';

function FeedTable({ onFeedSelect }) {
  const [feeds, setFeeds] = useState([]);
  const [selectedFeeds, setSelectedFeeds] = useState([]);
  const [error, setError] = useState(null);
  const [editingFeedId, setEditingFeedId] = useState(null); // Track which feed is being edited
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('active'); // 'active' or 'archived'
  const [archivedFeeds, setArchivedFeeds] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState(null);
  const [selectAll, setSelectAll] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // 'name' or 'count'
  const [sortDirection, setSortDirection] = useState('asc'); // 'asc' or 'desc'

  // Handle sorting
  const handleSort = (field) => {
    console.log(`Sorting by ${field}`);
    // If clicking the same field, toggle direction
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it as the sort field with ascending direction
      setSortBy(field);
      setSortDirection('asc');
    }
  };
  
  // Apply sorting to feeds
  const getSortedFeeds = (feedList) => {
    return [...feedList].sort((a, b) => {
      let valueA, valueB;
      
      if (sortBy === 'name') {
        valueA = a.feed_name || a.feed_url || '';
        valueB = b.feed_name || b.feed_url || '';
        return sortDirection === 'asc' ? 
          valueA.localeCompare(valueB) : 
          valueB.localeCompare(valueA);
      } else if (sortBy === 'count') {
        valueA = a.article_count || 0;
        valueB = b.article_count || 0;
        return sortDirection === 'asc' ? 
          valueA - valueB : 
          valueB - valueA;
      }
      return 0;
    });
  };

  // Fetch feeds based on current view mode
  const fetchFeeds = async () => {
    setLoading(true);
    try {
      if (viewMode === 'active') {
        const response = await axios.get('http://localhost:3000/feeds');
        setFeeds(response.data.feeds);
        console.log("Fetched active feeds:", response.data.feeds);
      } else { // archived mode
        const response = await axios.get('http://localhost:3000/feeds/archived');
        setArchivedFeeds(response.data.feeds);
        console.log("Fetched archived feeds:", response.data.feeds);
      }
      // Reset selected feeds and select all state when changing view mode
      setSelectedFeeds([]);
      setSelectAll(false);
    } catch (err) {
      if (viewMode === 'active') {
        setError(err);
      } else {
        setArchiveError(err);
      }
      console.error(`Error fetching ${viewMode} feeds:`, err);
    } finally {
      setLoading(false);
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, [viewMode]);

  const handleFeedChange = (feedUrl) => {
    setSelectedFeeds((prevSelected) => {
      let updatedSelected;
      if (prevSelected.includes(feedUrl)) {
        updatedSelected = prevSelected.filter((url) => url !== feedUrl);
      } else {
        updatedSelected = [...prevSelected, feedUrl];
      }
      console.log("Selected Feeds Updated:", updatedSelected);
      
      // Update selectAll state based on whether all visible feeds are selected
      const currentFeeds = viewMode === 'active' ? feeds : archivedFeeds;
      const allFeedUrls = currentFeeds.map(feed => feed.feed_url);
      const allSelected = allFeedUrls.every(url => updatedSelected.includes(url));
      setSelectAll(allSelected && allFeedUrls.length > 0);
      
      return updatedSelected;
    });
  };
  
  // Handle select/deselect all checkbox
  const handleSelectAllChange = () => {
    const currentFeeds = viewMode === 'active' ? feeds : archivedFeeds;
    
    if (selectAll) {
      // Deselect all feeds
      setSelectedFeeds([]);
    } else {
      // Select all feeds
      const allFeedUrls = currentFeeds.map(feed => feed.feed_url);
      setSelectedFeeds(allFeedUrls);
    }
    
    setSelectAll(!selectAll);
  };

  useEffect(() => {
    try {
      onFeedSelect(selectedFeeds);
      console.log("onFeedSelect called with:", selectedFeeds);
    } catch (err) {
      console.error("Error in onFeedSelect callback:", err);
    }
  }, [selectedFeeds, onFeedSelect]);

  const handleFeedAdded = () => {
    fetchFeeds(); // Refresh the list after adding a new feed
  };

  const handleEdit = (feedId) => {
    setEditingFeedId(feedId);
  };

  const handleArchive = async (feedId) => {
    if (!window.confirm("Are you sure you want to archive this feed?")) return;

    try {
      await axios.delete(`http://localhost:3000/feeds/${feedId}`);
      fetchFeeds(); // Refresh the list after deletion
      // Also remove from selectedFeeds if it was selected
      setSelectedFeeds((prevSelected) =>
        prevSelected.filter((url) => {
          const feed = feeds.find((f) => f.id === feedId);
          return feed ? feed.feed_url !== url : true;
        })
      );
    } catch (err) {
      console.error("Error archiving feed:", err);
      alert("Failed to archive feed. Please try again.");
    }
  };

  const handleClearFeed = async (feedId) => {
    if (!window.confirm("Are you sure you want to delete all articles from this feed? This action cannot be undone.")) return;

    try {
      await axios.delete(`http://localhost:3000/feeds/${feedId}/clear`);
      fetchFeeds(); // Refresh to update article counts
      alert("All articles from this feed have been deleted.");
    } catch (err) {
      console.error("Error clearing feed articles:", err);
      alert("Failed to clear feed articles. Please try again.");
    }
  };

  const handleEditComplete = () => {
    setEditingFeedId(null);
    fetchFeeds(); // Refresh the list after editing
  };

  const handleEditCancel = () => {
    setEditingFeedId(null);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'active' ? 'archived' : 'active');
  };
  
  // Handle bulk archiving of selected feeds
  const handleArchiveSelected = async () => {
    if (selectedFeeds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to archive ${selectedFeeds.length} feed(s)?`)) return;
    
    try {
      // Find the IDs for the selected feed URLs
      const feedsToArchive = feeds.filter(feed => selectedFeeds.includes(feed.feed_url));
      
      // Process each feed
      for (const feed of feedsToArchive) {
        await axios.delete(`http://localhost:3000/feeds/${feed.id}`);
      }
      
      // Refresh the feeds
      fetchFeeds();
      
      // Clear selection
      setSelectedFeeds([]);
      setSelectAll(false);
      
    } catch (err) {
      console.error("Error archiving selected feeds:", err);
      alert("Failed to archive some feeds. Please try again.");
    }
  };
  
  // Handle bulk restoring of selected feeds
  const handleRestoreSelected = async () => {
    if (selectedFeeds.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to restore ${selectedFeeds.length} feed(s)?`)) return;
    
    try {
      // Find the IDs for the selected feed URLs
      const feedsToRestore = archivedFeeds.filter(feed => selectedFeeds.includes(feed.feed_url));
      
      // Process each feed
      for (const feed of feedsToRestore) {
        await axios.put(`http://localhost:3000/feeds/${feed.id}/reactivate`);
      }
      
      // Refresh the feeds
      fetchFeeds();
      
      // Clear selection
      setSelectedFeeds([]);
      setSelectAll(false);
      
    } catch (err) {
      console.error("Error restoring selected feeds:", err);
      alert("Failed to restore some feeds. Please try again.");
    }
  };

  if (viewMode === 'active' && error) {
    return <p>Error: {error.message}</p>;
  }

  if (viewMode === 'active' && loading) {
    return <p>Loading feeds...</p>;
  }
  
  if (viewMode === 'archived' && archiveError) {
    return <p>Error loading archived feeds: {archiveError.message}</p>;
  }
  
  if (viewMode === 'archived' && archiveLoading) {
    return <p>Loading archived feeds...</p>;
  }

  // Sort the feeds
  const sortedFeeds = getSortedFeeds(viewMode === 'active' ? feeds : archivedFeeds);

  return (
    <div className="feed-list">
      <div className="feed-list-header">
        <h2>{viewMode === 'active' ? 'Active Feeds' : 'Archived Feeds'}</h2>
        <div className="feed-controls">
          <button onClick={toggleViewMode} className="toggle-view-button">
            {viewMode === 'active' ? "Show Archived" : "Show Active"}
          </button>
          
          {viewMode === 'active' && (
            <button 
              onClick={handleArchiveSelected} 
              disabled={selectedFeeds.length === 0}
              className="archive-selected-button"
            >
              Archive Selected
            </button>
          )}
          
          {viewMode === 'archived' && (
            <button 
              onClick={handleRestoreSelected} 
              disabled={selectedFeeds.length === 0}
              className="restore-selected-button"
            >
              Restore Selected
            </button>
          )}
        </div>
      </div>
      
      {/* Table Header with Sort Controls */}
      {(viewMode === 'active' && feeds.length > 0) || (viewMode === 'archived' && archivedFeeds.length > 0) ? (
        <div className="feed-table">
          <div className="feed-table-header">
            <div className="select-all-cell">
              <input
                type="checkbox"
                checked={selectAll}
                onChange={handleSelectAllChange}
                className="select-all-checkbox"
              />
            </div>
            <div 
              className={`feed-name-header ${sortBy === 'name' ? 'sorted' : ''}`}
              onClick={() => handleSort('name')}
            >
              Feed Name
              {sortBy === 'name' && (
                <span className="sort-indicator">
                  {sortDirection === 'asc' ? ' \u25b2' : ' \u25bc'}
                </span>
              )}
            </div>
            <div 
              className={`feed-count-header ${sortBy === 'count' ? 'sorted' : ''}`}
              onClick={() => handleSort('count')}
            >
              Articles
              {sortBy === 'count' && (
                <span className="sort-indicator">
                  {sortDirection === 'asc' ? ' \u25b2' : ' \u25bc'}
                </span>
              )}
            </div>
            <div className="feed-actions-header">Actions</div>
          </div>

          {/* Feed List Body */}
          <div className="feed-table-body">
            {sortedFeeds.map((feed) => {
              const displayName = feed.feed_name || feed.feed_url;
              const isEditing = editingFeedId === feed.id;

              return (
                <div key={feed.id} className="feed-table-row">
                  {isEditing ? (
                    <div className="feed-editing">
                      <EditFeedForm
                        feed={feed}
                        onEdit={handleEditComplete}
                        onCancel={handleEditCancel}
                      />
                    </div>
                  ) : (
                    <>
                      <div className="feed-checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedFeeds.includes(feed.feed_url)}
                          onChange={() => handleFeedChange(feed.feed_url)}
                          className="feed-checkbox"
                        />
                      </div>
                      <div className="feed-name-cell">{displayName}</div>
                      <div className="feed-count-cell">{feed.article_count}</div>
                      <div className="feed-actions-cell">
                        <button onClick={() => handleEdit(feed.id)} className="edit-button">Edit</button>
                        {viewMode === 'active' && (
                          <button onClick={() => handleClearFeed(feed.id)} className="clear-button">Clear</button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <p>{viewMode === 'active' ? 'No active feeds.' : 'No archived feeds.'}</p>
      )}
      
      {/* Only show the feed form when viewing active feeds */}
      {viewMode === 'active' && <FeedForm onFeedAdded={handleFeedAdded} />}
    </div>
  );
}

export default FeedTable;