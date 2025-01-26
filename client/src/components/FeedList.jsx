import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FeedList = ({onFeedSelect}) => {
    const [feeds, setFeeds] = useState([]);
    const [error, setError] = useState(null);


    useEffect(() => {
        const fetchFeeds = async () => {
            try {
                const response = await axios.get('http://localhost:3000/feeds');
                setFeeds(response.data.feeds);
            } catch (err) {
                setError(err);
            }
        };

        fetchFeeds();
    }, []);


     if (error) {
        return <p>Error: {error.message}</p>;
    }
     if (!feeds) {
        return <p>Loading feeds...</p>;
    }
    return (
      <ul>
        {feeds.map((feed) => (
            <li key={feed.feed_url}>
                <button onClick={() => onFeedSelect(feed.feed_url)}>{feed.feed_url}</button>
            </li>
        ))}
    </ul>
    )
};

export default FeedList;