import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FeedForm from './FeedForm';

function FeedList({ onFeedSelect }) {
  const [feeds, setFeeds] = useState([]);
  const [selectedFeeds, setSelectedFeeds] = useState([]);
  const [error, setError] = useState(null);

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
          return (
            <li key={feed.id}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedFeeds.includes(feed.feed_url)}
                  onChange={() => handleFeedChange(feed.feed_url)}
                />
                {displayName}
              </label>
            </li>
          );
        })}
      </ul>
      <FeedForm onFeedAdded={handleFeedAdded} />
    </div>
  );
}

export default FeedList;