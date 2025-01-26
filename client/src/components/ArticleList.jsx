import React, { useState } from 'react';
import axios from 'axios';

const ArticleList = ({ defaultFeedUrl, feedUrl }) => {
    const [articleText, setArticleText] = useState('');
    const [summary, setSummary] = useState('');
    const [error, setError] = useState(null);
    const [currentFeedUrl, setCurrentFeedUrl] = useState(feedUrl || defaultFeedUrl || '');

   const fetchArticle = async () => {
        try {
            const response = await axios.get('http://localhost:3000/articles', {params: {feedUrl: currentFeedUrl}});
            setArticleText(response.data.articleText);
            setSummary(response.data.summary);
        } catch (err) {
            setError(err);
        }
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        fetchArticle();
    };

    const handleFeedUrlChange = (event) => {
        setCurrentFeedUrl(event.target.value);
    }

    return (
        <>
          {error && <p>Error: {error.message}</p>}
          {!articleText && (
              <form onSubmit={handleSubmit}>
                  <label>
                     Enter RSS feed URL:
                     <input type="text" value={currentFeedUrl} onChange={handleFeedUrlChange} />
                 </label>
                 <button type="submit">Fetch Article</button>
             </form>
          )}
          {articleText && (
            <div>
              <p>{articleText}</p>
              <p>Summary: {summary}</p>
            </div>
          )}
        </>
    );
};

export default ArticleList;