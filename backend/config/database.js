const mysql = require('mysql2');
const dotenv = require('dotenv');

dotenv.config();

// Railway detection
const isRailway = process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.MYSQLHOST;

const pool = mysql.createPool({
  host: isRailway ? process.env.MYSQLHOST : process.env.DB_HOST,
  port: isRailway ? process.env.MYSQLPORT : 3306,
  user: isRailway ? process.env.MYSQLUSER : process.env.DB_USER,
  password: isRailway ? process.env.MYSQLPASSWORD : process.env.DB_PASSWORD,
  database: isRailway ? process.env.MYSQLDATABASE : process.env.DB_NAME, // Note: DB_NAME is 'pethub_db'
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

module.exports = pool.promise();
