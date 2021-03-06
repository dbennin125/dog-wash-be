const express = require('express');
const cors = require('cors');
const client = require('./client.js');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/dogs', async(req, res) => {
  const data = await client.query('SELECT * from dogs');

  res.json(data.rows);
});

app.use(require('./middleware/error'));

module.exports = app;
