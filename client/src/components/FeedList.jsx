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
    } catch (err) {
      setError(err);
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
    } catch (err) {
      setArchiveError(err);
    } finally {
      setArchiveLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeds();
  }, []);

  const handleFeedChange = (feedUrl) => {
    setSelectedFeeds((prevSelected) => {
      if (prevSelected.includes(feedUrl)) {
        return prevSelected.filter((url) => url !== feedUrl);
      } else {
        return [...prevSelected, feedUrl];
      }
    });
  };

  useEffect(() => {
    onFeedSelect(selectedFeeds);
  }, [selectedFeeds, onFeedSelect]);

  const handleFeedAdded = () => {
    fetchFeeds(); // Refresh the list after adding a new feed
  };

  const handleEdit = (feedId) => {
    setEditingFeedId(feedId);
  };

  const handleDelete = async (feedId) => {
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
    <div>
      <h2>Feeds</h2>
      <button onClick={toggleArchive} style={{ marginBottom: "1rem" }}>
        {showArchive ? "Hide Archive" : "Show Archive"}
      </button>
      <ul>
        {feeds.map((feed) => {
          const displayName = feed.feed_name || feed.feed_url;
          const isEditing = editingFeedId === feed.id;

          return (
            <li key={feed.id} style={{ marginBottom: "0.5rem" }}>
              {isEditing ? (
                <EditFeedForm
                  feed={feed}
                  onEdit={handleEditComplete}
                  onCancel={handleEditCancel}
                />
              ) : (
                <>
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedFeeds.includes(feed.feed_url)}
                      onChange={() => handleFeedChange(feed.feed_url)}
                      style={{ marginRight: "0.5rem" }}
                    />
                    {displayName}
                  </label>
                  <button onClick={() => handleEdit(feed.id)} style={{ marginLeft: "0.5rem" }}>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(feed.id)}
                    style={{ marginLeft: "0.5rem", backgroundColor: "#dc3545", color: "white" }}
                  >
                    Delete
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
        <div style={{ marginTop: "2rem", borderTop: "1px solid #ccc", paddingTop: "1rem" }}>
          <h3>Archived Feeds</h3>
          {archiveLoading ? (
            <p>Loading archived feeds...</p>
          ) : archiveError ? (
            <p>Error loading archived feeds.</p>
          ) : archivedFeeds.length === 0 ? (
            <p>No archived feeds.</p>
          ) : (
            <ul>
              {archivedFeeds.map((feed) => {
                const displayName = feed.feed_name || feed.feed_url;
                return (
                  <li key={feed.id} style={{ marginBottom: "0.5rem" }}>
                    {displayName}
                    <button
                      onClick={() => handleReactivate(feed.id)}
                      style={{ marginLeft: "0.5rem", backgroundColor: "#28a745", color: "white" }}
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