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

  
app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;
