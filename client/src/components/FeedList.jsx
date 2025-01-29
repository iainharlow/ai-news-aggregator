// client/src/components/FeedList.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FeedForm from './FeedForm';
import EditFeedForm from './EditFeedForm';

function FeedList({ onFeedSelect }) {
  const [feeds, setFeeds] = useState([]);
  const [selectedFeeds, setSelectedFeeds] = useState([]);
  const [error, setError] = useState(null);
  const [editingFeedId, setEditingFeedId] = useState(null); // Track which feed is being edited
  const [loading, setLoading] = useState(false);
  const [showArchive, setShowArchive] = useState(false); // Control Archive modal visibility
  const [archivedFeeds, setArchivedFeeds] = useState([]);
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState(null);

  // Fetch active feeds
  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/feeds');
      setFeeds(response.data.feeds);
      console.log("Fetched feeds:", response.data.feeds);
    } catch (err) {
      setError(err);
      console.error("Error fetching feeds:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch archived feeds
  const fetchArchivedFeeds = async () => {
    setArchiveLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/feeds/archived');
      setArchivedFeeds(response.data.feeds);
      console.log("Fetched archived feeds:", response.data.feeds);
    } catch (err) {
      setArchiveError(err);
      console.error("Error fetching archived feeds:", err);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleFeedChange = (feedUrl) => {
    setSelectedFeeds((prevSelected) => {
      let updatedSelected;
      if (prevSelected.includes(feedUrl)) {
        updatedSelected = prevSelected.filter((url) => url !== feedUrl);
      } else {
        updatedSelected = [...prevSelected, feedUrl];
      }
      console.log("Selected Feeds Updated:", updatedSelected);
      return updatedSelected;
    });
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
      alert("All articles from this feed have been deleted.");
      // Optionally, you can refresh articles if displayed elsewhere
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

  const handleReactivate = async (feedId) => {
    try {
      await axios.put(`http://localhost:3000/feeds/${feedId}/reactivate`);
      fetchFeeds(); // Refresh active feeds
      fetchArchivedFeeds(); // Refresh archived feeds
    } catch (err) {
      console.error("Error reactivating feed:", err);
      alert("Failed to reactivate feed. Please try again.");
    }
  };

  const toggleArchive = () => {
    setShowArchive(!showArchive);
    if (!showArchive) {
      fetchArchivedFeeds();
    }
  };

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  if (loading) {
    return <p>Loading feeds...</p>;
  }

  return (
    <div className="feed-list">
      <h2>Feeds</h2>
      <button onClick={toggleArchive} className="toggle-archive-button">
        {showArchive ? "Hide Archive" : "Show Archive"}
      </button>
      <ul className="feeds-ul">
        {feeds.map((feed) => {
          const displayName = feed.feed_name || feed.feed_url;
          const isEditing = editingFeedId === feed.id;

          return (
            <li key={feed.id} className="feed-item">
              {isEditing ? (
                <EditFeedForm
                  feed={feed}
                  onEdit={handleEditComplete}
                  onCancel={handleEditCancel}
                />
              ) : (
                <>
                  <label className="feed-label">
                    <input
                      type="checkbox"
                      checked={selectedFeeds.includes(feed.feed_url)}
                      onChange={() => handleFeedChange(feed.feed_url)}
                      className="feed-checkbox"
                    />
                    {displayName}
                  </label>
                  <button onClick={() => handleEdit(feed.id)} className="edit-button">
                    Edit
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <FeedForm onFeedAdded={handleFeedAdded} />

      {/* Archive Section */}
      {showArchive && (
        <div className="archive-section">
          <h3>Archived Feeds</h3>
          {archiveLoading ? (
            <p>Loading archived feeds...</p>
          ) : archiveError ? (
            <p>Error loading archived feeds.</p>
          ) : archivedFeeds.length === 0 ? (
            <p>No archived feeds.</p>
          ) : (
            <ul className="archived-feeds-ul">
              {archivedFeeds.map((feed) => {
                const displayName = feed.feed_name || feed.feed_url;
                return (
                  <li key={feed.id} className="archived-feed-item">
                    {displayName}
                    <button
                      onClick={() => handleReactivate(feed.id)}
                      className="reactivate-button"
                    >
                      Reactivate
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default FeedList;