import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FeedForm from './FeedForm';
import EditFeedForm from './EditFeedForm';

function FeedList({ onFeedSelect }) {
  const [feeds, setFeeds] = useState([]);
  const [selectedFeeds, setSelectedFeeds] = useState([]);
  const [error, setError] = useState(null);
  const [editingFeedId, setEditingFeedId] = useState(null); // Track which feed is being edited

  const fetchFeeds = async () => {
    try {
      const response = await axios.get('http://localhost:3000/feeds');
      setFeeds(response.data.feeds);
    } catch (err) {
      setError(err);
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
        return [...prevSelected, url];
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
    if (!window.confirm("Are you sure you want to delete this feed?")) return;

    try {
      await axios.delete(`http://localhost:3000/feeds/${feedId}`);
      fetchFeeds(); // Refresh the list after deletion
    } catch (err) {
      console.error("Error deleting feed:", err);
      alert("Failed to delete feed. Please try again.");
    }
  };

  const handleEditComplete = () => {
    setEditingFeedId(null);
    fetchFeeds(); // Refresh the list after editing
  };

  const handleEditCancel = () => {
    setEditingFeedId(null);
  };

  if (error) {
    return <p>Error: {error.message}</p>;
  }
  if (!feeds) {
    return <p>Loading feeds...</p>;
  }

  return (
    <div>
      <h2>Feeds</h2>
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
                    />
                    {displayName}
                  </label>
                  <button onClick={() => handleEdit(feed.id)} style={{ marginLeft: "0.5rem" }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(feed.id)} style={{ marginLeft: "0.5rem" }}>
                    Delete
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <FeedForm onFeedAdded={handleFeedAdded} />
    </div>
  );
}

export default FeedList;