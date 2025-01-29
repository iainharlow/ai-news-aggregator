// client/src/components/EditFeedForm.jsx

import React, { useState } from 'react';
import axios from 'axios';

function EditFeedForm({ feed, onEdit, onCancel }) {
  const [feedUrl, setFeedUrl] = useState(feed.feed_url);
  const [feedName, setFeedName] = useState(feed.feed_name || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem", border: "1px solid #ccc", padding: "1rem" }}>
      <h3>Edit Feed</h3>
      <div style={{ marginBottom: "0.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.2rem" }}>Feed Name (optional):</label>
        <input
          type="text"
          value={feedName}
          onChange={(e) => setFeedName(e.target.value)}
          disabled={loading}
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </div>
      <div style={{ marginBottom: "0.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.2rem" }}>Feed URL:</label>
        <input
          type="text"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          required
          disabled={loading}
          style={{ width: "100%", padding: "0.5rem" }}
        />
      </div>
      <button type="submit" disabled={loading} style={{ padding: "0.5rem 1rem" }}>
        {loading ? "Saving..." : "Save"}
      </button>
      <button type="button" onClick={onCancel} disabled={loading} style={{ padding: "0.5rem 1rem", marginLeft: "0.5rem" }}>
        Cancel
      </button>
      {error && <p style={{ color: "red", marginTop: "0.5rem" }}>{error}</p>}
    </form>
  );
}

export default EditFeedForm;