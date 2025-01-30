// client/src/components/ArticleList.jsx

import React, { useEffect, useState } from "react";
import axios from "axios";

function ArticleList({ feedUrls }) {
  const [articles, setArticles] = useState([]);
  const [fetchStatus, setFetchStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isFetching, setIsFetching] = useState(false);
  const [limit] = useState(20); // Number of articles per page

  useEffect(() => {
    if (!feedUrls || feedUrls.length === 0) {
      setArticles([]);
      setCurrentPage(1);
      setTotalPages(1);
      return;
    }
    setCurrentPage(1);
    fetchArticles(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedUrls]);

  const fetchArticles = async (page) => {
    setIsFetching(true);
    try {
      const response = await axios.get(`http://localhost:3000/articles`, {
        params: {
          feedUrls: feedUrls,
          page: page,
          limit: limit
        },
      });
      setArticles(response.data.articles || []);
      const calculatedTotalPages = Math.ceil((response.data.total || 0) / limit);
      setTotalPages(calculatedTotalPages || 1);
      console.log(`Fetched articles for page ${page}:`, response.data.articles);
    } catch (err) {
      console.error("Error fetching articles:", err);
    } finally {
      setIsFetching(false);
    }
  };

  const handleFetchLatest = async () => {
    if (!feedUrls || feedUrls.length === 0) return;
    setFetchStatus("Checking for new articles...");
    try {
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
      await fetchArticles(currentPage);
    } catch (err) {
      console.error("Error fetching latest articles:", err);
      setFetchStatus("Error fetching articles.");
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchArticles(nextPage);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const prevPage = currentPage - 1;
      setCurrentPage(prevPage);
      fetchArticles(prevPage);
    }
  };

  if (!feedUrls || feedUrls.length === 0) return <p>No feeds selected.</p>;

  return (
    <div className="article-list">
      <h2>Articles for Selected Feeds</h2>
      <button onClick={handleFetchLatest} disabled={isFetching} className="fetch-latest-button">
        {isFetching ? "Fetching..." : "Fetch Latest"}
      </button>
      <p>{fetchStatus}</p>
      {articles.length === 0 ? (
        <p>No articles available.</p>
      ) : (
        <div>
          {articles.map((article) => (
            <div key={article.id} className="article-item">
              <h3>
                <a href={article.link} target="_blank" rel="noopener noreferrer">
                  {article.title}
                </a>
              </h3>
              <p>{article.summary}</p>
              <p className="article-meta">
                {article.author}, {article.published_date ? new Date(article.published_date).toLocaleDateString() : "Unknown"}
              </p>
            </div>
          ))}
          <div className="pagination">
            <button onClick={handlePrevPage} disabled={currentPage === 1} className="pagination-button">
              Previous
            </button>
            <span className="current-page">Page {currentPage} of {totalPages}</span>
            <button onClick={handleNextPage} disabled={currentPage === totalPages} className="pagination-button">
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ArticleList;