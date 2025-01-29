import React, { useEffect, useState } from "react";
import axios from "axios";

function ArticleList({ feedUrl }) {
  const [articles, setArticles] = useState([]);
  const [fetchStatus, setFetchStatus] = useState("");

  useEffect(() => {
    if (!feedUrl) return;
    fetchArticles();
  }, [feedUrl]);

  const fetchArticles = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/articles?feedUrl=${encodeURIComponent(feedUrl)}`);
      setArticles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFetchLatest = async () => {
    if (!feedUrl) return;
    setFetchStatus("Checking for new articles...");
    try {
      const fetchRes = await axios.get(`http://localhost:3000/articles/fetch?feedUrl=${encodeURIComponent(feedUrl)}`);
      if (fetchRes.data?.newlyAdded?.length) {
        setFetchStatus(`Added ${fetchRes.data.newlyAdded.length} new articles.`);
      } else {
        setFetchStatus("No new articles found.");
      }
      await fetchArticles();
    } catch (err) {
      console.error(err);
      setFetchStatus("Error fetching articles.");
    }
  };

  if (!feedUrl) return <p>No feed selected.</p>;

  return (
    <div>
      <h2>Articles for {feedUrl}</h2>
      <button onClick={handleFetchLatest}>Fetch Latest</button>
      <p>{fetchStatus}</p>
      {articles.map(article => (
        <div key={article.id} style={{ marginBottom: "1rem" }}>
          <h3>
            <a href={article.link} target="_blank" rel="noopener noreferrer">
              {article.title}
            </a>
          </h3>
          <p>{article.summary}</p>
        </div>
      ))}
    </div>
  );
}

export default ArticleList;