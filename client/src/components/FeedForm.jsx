import React, { useState } from 'react';
import axios from 'axios';

function FeedForm({ onFeedAdded }) {
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedUrl) return;

    setLoading(true);
    setError(null);

    try {
      const res = await axios.post('http://localhost:3000/feeds', {
        feedUrl,
        feedName
      });
      onFeedAdded();  // Tell parent to refresh feed list
      setFeedUrl("");
      setFeedName("");
      console.log(res.data);
    } catch (err) {
      console.error("Error adding feed:", err);
      setError("Failed to add feed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      <h3>Add New Feed</h3>
      <div>
        <input
          type="text"
          value={feedName}
          placeholder="Feed Name (optional)"
          onChange={(e) => setFeedName(e.target.value)}
          disabled={loading}
        />
      </div>
      <div>
        <input
          type="text"
          value={feedUrl}
          placeholder="Feed URL"
          onChange={(e) => setFeedUrl(e.target.value)}
          required
          disabled={loading}
        />
      </div>
      <button type="submit" disabled={loading}>
        {loading ? "Adding..." : "Add Feed"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
    </form>
  );
}

export default FeedForm;