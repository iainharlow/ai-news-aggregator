// client/src/components/EditFeedForm.jsx

import React, { useState } from 'react';
import axios from 'axios';

function EditFeedForm({ feed, onEdit, onCancel }) {
  const [feedUrl, setFeedUrl] = useState(feed.feed_url);
  const [feedName, setFeedName] = useState(feed.feed_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [clearing, setClearing] = useState(false); // State for clearing feed
  const [clearError, setClearError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedUrl) return;

    setLoading(true);
    setError(null);

    try {
      await axios.put(`http://localhost:3000/feeds/${feed.id}`, {
        feedUrl,
        feedName
      });
      onEdit(); // Notify parent to refresh feeds
    } catch (err) {
      console.error("Error editing feed:", err);
      setError("Failed to edit feed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearFeed = async () => {
    if (!window.confirm("Are you sure you want to delete all articles from this feed? This action cannot be undone.")) return;

    setClearing(true);
    setClearError(null);

    try {
      await axios.delete(`http://localhost:3000/feeds/${feed.id}/clear`);
      onEdit(); // Refresh feeds and articles if necessary
      alert("All articles from this feed have been deleted.");
    } catch (err) {
      console.error("Error clearing feed articles:", err);
      setClearError("Failed to clear feed articles. Please try again.");
    } finally {
      setClearing(false);
    }
  };

  const handleArchive = async () => {
    if (!window.confirm("Are you sure you want to archive this feed?")) return;

    try {
      await axios.delete(`http://localhost:3000/feeds/${feed.id}`);
      onEdit(); // Refresh the feed list
    } catch (err) {
      console.error("Error archiving feed:", err);
      alert("Failed to archive feed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="edit-feed-form">
      <h3>Edit Feed</h3>
      <div className="form-group">
        <label>Feed Name (optional):</label>
        <input
          type="text"
          value={feedName}
          onChange={(e) => setFeedName(e.target.value)}
          disabled={loading || clearing}
        />
      </div>
      <div className="form-group">
        <label>Feed URL:</label>
        <input
          type="text"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          required
          disabled={loading || clearing}
        />
      </div>
      {error && <p className="error-message">{error}</p>}
      <div className="button-group">
        <button type="submit" disabled={loading || clearing}>
          {loading ? "Saving..." : "Save"}
        </button>
        <button type="button" onClick={onCancel} disabled={loading || clearing}>
          Cancel
        </button>
      </div>
      <hr />
      <div className="button-group">
        <button
          type="button"
          onClick={handleArchive}
          disabled={loading || clearing}
          className="archive-button"
        >
          Archive
        </button>
        <button
          type="button"
          onClick={handleClearFeed}
          disabled={loading || clearing}
          className="clear-feed-button"
        >
          {clearing ? "Clearing..." : "Clear Feed"}
        </button>
      </div>
      {clearError && <p className="error-message">{clearError}</p>}
    </form>
  );
}

export default EditFeedForm;