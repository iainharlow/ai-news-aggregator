import React, { useEffect, useState } from "react";
import axios from "axios";

function ArticleList({ feedUrls }) {
  const [articles, setArticles] = useState([]);
  const [fetchStatus, setFetchStatus] = useState("");

  useEffect(() => {
    if (!feedUrls || feedUrls.length === 0) {
      setArticles([]);
      return;
    }
    fetchArticles();
  }, [feedUrls]);

  const fetchArticles = async () => {
    try {
      const response = await axios.get(`http://localhost:3000/articles`, {
        params: { feedUrls: feedUrls },
      });
      setArticles(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchLatest = async () => {
    if (!feedUrls || feedUrls.length === 0) return;
    setFetchStatus("Checking for new articles...");
    try {
      // Fetch new articles for all selected feeds
      const fetchPromises = feedUrls.map((url) =>
        axios.get(`http://localhost:3000/articles/fetch`, {
          params: { feedUrl: url },
        })
      );
      const fetchResponses = await Promise.all(fetchPromises);

      let totalNew = 0;
      fetchResponses.forEach((res) => {
        if (res.data?.newlyAdded?.length) {
          totalNew += res.data.newlyAdded.length;
        }
      });

      if (totalNew > 0) {
        setFetchStatus(`Added ${totalNew} new articles.`);
      } else {
        setFetchStatus("No new articles found.");
      }

      // Refresh the articles list
      await fetchArticles();
    } catch (err) {
      console.error(err);
      setFetchStatus("Error fetching articles.");
    }
  };

  if (!feedUrls || feedUrls.length === 0) return <p>No feeds selected.</p>;

  return (
    <div>
      <h2>Articles for Selected Feeds</h2>
      <button onClick={handleFetchLatest}>Fetch Latest</button>
      <p>{fetchStatus}</p>
      {articles.map((article) => (
        <div key={article.id} style={{ marginBottom: "1rem" }}>
          <h3>
            <a href={article.link} target="_blank" rel="noopener noreferrer">
              {article.title}
            </a>
          </h3>
          <p>{article.summary}</p>
          <p>
            <em>
              Published on:{" "}
              {article.published_date
                ? new Date(article.published_date).toLocaleString()
                : "Unknown"}
            </em>
          </p>
        </div>
      ))}
    </div>
  );
}

export default ArticleList;