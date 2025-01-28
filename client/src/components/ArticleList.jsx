import React, { useEffect, useState } from "react";
import axios from "axios";

function ArticleList({ feedUrl }) {
  const [articles, setArticles] = useState([]);

  // Fetch existing articles
  useEffect(() => {
    if (!feedUrl) return;
    axios.get(`http://localhost:3000/articles?feedUrl=${encodeURIComponent(feedUrl)}`)
      .then(res => setArticles(res.data))
      .catch(err => console.error(err));
  }, [feedUrl]);

  // Fetch new articles, then refresh
  const handleFetchLatest = async () => {
    if (!feedUrl) return;
    try {
      await axios.get(`http://localhost:3000/articles/fetch?feedUrl=${encodeURIComponent(feedUrl)}`);
      const res = await axios.get(`http://localhost:3000/articles?feedUrl=${encodeURIComponent(feedUrl)}`);
      setArticles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  if (!feedUrl) return <p>No feed selected.</p>;

  return (
    <div>
      <h2>Articles for {feedUrl}</h2>
      <button onClick={handleFetchLatest}>Fetch Latest</button>
      {articles.map(article => (
        <div key={article.id}>
          <h3>{article.title}</h3>
          <p>{article.summary}</p>
        </div>
      ))}
    </div>
  );
}

export default ArticleList;