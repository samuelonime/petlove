const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Use environment variables for security
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost', // default to localhost
  user: process.env.DB_USER || 'root',      // default XAMPP user
  password: process.env.DB_PASSWORD || '',  // default empty for XAMPP
  database: process.env.DB_NAME || 'pethub',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Export a promise-based pool for async/await
module.exports = pool.promise();
