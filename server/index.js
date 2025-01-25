const express = require('express');
const app = express();
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config()

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const articleRouter = require('./routes/articles');
app.use('/articles', articleRouter); // Add the new route

app.get('/', (req, res) => {
    res.send('Server is running');
});


app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});