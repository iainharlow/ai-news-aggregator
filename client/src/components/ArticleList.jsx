import React, { useState, useEffect } from 'react';
    import axios from 'axios';

    const ArticleList = () => {
        const [articles, setArticles] = useState([]);
        const [error, setError] = useState(null);

        useEffect(() => {
            const fetchArticles = async () => {
                try {
                    const response = await axios.get('http://localhost:3000/articles');
                    setArticles(response.data.articles);
                } catch (err) {
                    setError(err);
                }
            };

            fetchArticles();
        }, []);

        if (error) {
            return <p>Error: {error.message}</p>;
        }
        if (!articles || articles.length === 0) {
            return <p>Loading articles...</p>;
        }

        return (
            <ul>
                {articles.map((article) => (
                    <li key={article.guid}>
                        <a href={article.link} target="_blank" rel="noopener noreferrer">
                            {article.title}
                        </a>
                    </li>
                ))}
            </ul>
        );
    };

    export default ArticleList;