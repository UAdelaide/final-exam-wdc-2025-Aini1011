var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: ''
    });

    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    await db.execute(`
        INSERT IGNORE INTO Users (username, email, password_hash, role)
        VALUES ('alice123', 'alice@example.com', 'hashed123', 'owner')
      `);

    } catch (err) {
      console.error('Database setup error:', err);
    }
  })();

  app.get('/api/dogs', async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT Dogs.name AS dog_name, Dogs.size, Users.username AS owner_username
        FROM Dogs
        JOIN Users ON Dogs.owner_id = Users.user_id
      `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching dogs:', error);
      res.status(500).json({ error: 'Failed to fetch dogs' });
    }
  });

  app.get('/api/walkrequests/open', async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT
          WalkRequests.request_id,
          Dogs.name AS dog_name,
          WalkRequests.requested_time,
          WalkRequests.duration_minutes,
          WalkRequests.location,
          Users.username AS owner_username
        FROM WalkRequests
        JOIN Dogs ON WalkRequests.dog_id = Dogs.dog_id
        JOIN Users ON Dogs.owner_id = Users.user_id
        WHERE WalkRequests.status = 'open'
      `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching walk requests:', error);
      res.status(500).json({ error: 'Failed to fetch walk requests' });
    }
  });

  app.get('/api/walkers/summary', async (req, res) => {
    try {
      const [rows] = await db.execute(`
        SELECT
          Users.username AS walker_username,
          COUNT(WalkRatings.rating_id) AS total_ratings,
          ROUND(AVG(WalkRatings.rating), 1) AS average_rating,
          COUNT(DISTINCT WalkRequests.request_id) AS completed_walks
        FROM Users
        LEFT JOIN WalkRatings ON Users.user_id = WalkRatings.walker_id
        LEFT JOIN WalkRequests ON Users.user_id = WalkRequests.request_id
        WHERE Users.role = 'walker'
        GROUP BY Users.user_id
      `);
      res.json(rows);
    } catch (error) {
      console.error('Error fetching walkers summary:', error);
      res.status(500).json({ error: 'Failed to fetch walker summary' });
    }
  });
  
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
