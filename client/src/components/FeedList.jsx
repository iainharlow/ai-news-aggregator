import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FeedForm from './FeedForm';

function FeedList({ onFeedSelect }) {
  const [feeds, setFeeds] = useState([]);
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

  const handleFeedAdded = () => {
    fetchFeeds(); // refresh the list
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
              <button onClick={() => onFeedSelect(feed.feed_url)}>
                {displayName}
              </button>
            </li>
          );
        })}
      </ul>
      <FeedForm onFeedAdded={handleFeedAdded} />
    </div>
  );
}

export default FeedList;