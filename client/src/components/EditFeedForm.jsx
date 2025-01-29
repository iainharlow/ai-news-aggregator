import React, { useState } from 'react';
import axios from 'axios';

function EditFeedForm({ feed, onEdit, onCancel }) {
  const [feedUrl, setFeedUrl] = useState(feed.feed_url);
  const [feedName, setFeedName] = useState(feed.feed_name || '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`http://localhost:3000/feeds/${feed.id}`, {
        feedUrl,
        feedName
      });
      onEdit(); // Notify parent to refresh feeds
    } catch (err) {
      console.error("Error editing feed:", err);
      alert("Failed to edit feed. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem", border: "1px solid #ccc", padding: "1rem" }}>
      <h3>Edit Feed</h3>
      <div>
        <label>Feed Name (optional): </label>
        <input
          type="text"
          value={feedName}
          onChange={(e) => setFeedName(e.target.value)}
        />
      </div>
      <div>
        <label>Feed URL: </label>
        <input
          type="text"
          value={feedUrl}
          onChange={(e) => setFeedUrl(e.target.value)}
          required
        />
      </div>
      <button type="submit">Save</button>
      <button type="button" onClick={onCancel} style={{ marginLeft: "0.5rem" }}>Cancel</button>
    </form>
  );
}

export default EditFeedForm;