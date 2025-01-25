import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ArticleList = () => {
    const [articleText, setArticleText] = useState('');
    const [summary, setSummary] = useState('');
    const [error, setError] = useState(null);
    const [feedUrl, setFeedUrl] = useState('');

   const fetchArticle = async () => {
        try {
            const response = await axios.get('http://localhost:3000/articles', {params: {feedUrl}});
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


    if (error) {
        return <p>Error: {error.message}</p>;
    }
    if (!articleText) {
        return (
         <form onSubmit={handleSubmit}>
             <label>
                Enter RSS feed URL:
                <input type="text" value={feedUrl} onChange={(e) => setFeedUrl(e.target.value)} />
            </label>
            <button type="submit">Fetch Article</button>
        </form>
        )
    }

    return (
        <div>
            <p>{articleText}</p>
            <p>Summary: {summary}</p>
        </div>
    );
};

export default ArticleList;