import React, { useState } from 'react';
import axios from 'axios';

function FeedForm({ onFeedAdded }) {
  const [feedUrl, setFeedUrl] = useState("");
  const [feedName, setFeedName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedUrl) return;

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
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
      <input
        type="text"
        value={feedName}
        placeholder="Feed Name (optional)"
        onChange={(e) => setFeedName(e.target.value)}
      />
      <input
        type="text"
        value={feedUrl}
        placeholder="Feed URL"
        onChange={(e) => setFeedUrl(e.target.value)}
        required
      />
      <button type="submit">Add Feed</button>
    </form>
  );
}

export default FeedForm;