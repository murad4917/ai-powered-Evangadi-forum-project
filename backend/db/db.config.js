import 'dotenv/config';
import mysql from 'mysql2/promise';

/**
 * Create a pool of connections to the database.
 * @returns {Promise<Pool>} A pool of connections to the database.
 */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export default db;



/**
 * Execute a SQL query safely.
 * @param {string} sql - The SQL query to execute.
 * @param {any} params - The parameters to pass to the SQL query.
 * @returns {Promise<any>} The result of the SQL query.
 */
export const safeExecute = async (sql, params) => {
  if (typeof sql !== "string" || sql.trim().length === 0) {
    throw new Error("SQL query must be a non-empty string");
  }
  ensureParams(params);
  const [result] = await db.execute(sql, params);
  return result;
};



/**
 * Ensure the parameters are valid.
 * @param {any} params - The parameters to check.
 * @returns {void}
 */
const ensureParams = (params) => {
  if (params === undefined || params === null) {
    throw new Error("SQL parameters are required");
  }
  const isArray = Array.isArray(params);
  const isObject = !isArray && typeof params === "object";
  if (!isArray && !isObject) {
    throw new Error("SQL parameters must be an array or object");
  }
};