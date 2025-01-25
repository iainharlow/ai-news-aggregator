import React, { useState, useEffect } from 'react';
    import axios from 'axios';

    const ArticleList = () => {
        const [articleText, setArticleText] = useState('');
        const [summary, setSummary] = useState('');
        const [error, setError] = useState(null);

        useEffect(() => {
            const fetchArticle = async () => {
                try {
                    const response = await axios.get('http://localhost:3000/articles');
                    setArticleText(response.data.articleText);
                    setSummary(response.data.summary);
                } catch (err) {
                    setError(err);
                }
            };

            fetchArticle();
        }, []);

         if (error) {
                return <p>Error: {error.message}</p>;
            }
         if (!articleText) {
                return <p>Loading article...</p>;
            }
         return (
            <div>
                <p>{articleText}</p>
                <p>Summary: {summary}</p>
            </div>
         );
      };

    export default ArticleList;