import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_TIMEZONE = process.env.DB_TIMEZONE || '+05:30';

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Function to set timezone on a connection
async function setTimezone(connection) {
  try {
    await connection.query(`SET time_zone = '${DB_TIMEZONE}'`);
  } catch (error) {
    console.error('Failed to set timezone:', error.message);
  }
}

// Wrap execute to ensure timezone is set
const originalExecute = pool.execute.bind(pool);
pool.execute = async function(...args) {
  const connection = await pool.getConnection();
  await setTimezone(connection);
  try {
    const result = await connection.execute(...args);
    connection.release();
    return result;
  } catch (error) {
    connection.release();
    throw error;
  }
};

export async function testDbConnection() {
  try {
    const connection = await pool.getConnection();
    await setTimezone(connection);
    await connection.ping();
    connection.release();
    console.log(`✅ DB connected: ${process.env.DB_NAME}@${process.env.DB_HOST}:${process.env.DB_PORT || 3306}`);
    console.log(`⏰ Timezone set to: ${DB_TIMEZONE}`);
    return true;
  } catch (error) {
    console.error(`❌ DB connection failed: ${error.code || error.message}`);
    return false;
  }
}

export default pool;
