const oracledb = require('oracledb');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

let pool = null;
let thickModeInitialized = false;

function initializeThickMode() {
  if (thickModeInitialized) return;

  const libDir = process.env.ORACLE_CLIENT_LIB_DIR ||
    'C:\\oraclexe\\app\\oracle\\product\\11.2.0\\server\\bin';

  try {
    oracledb.initOracleClient({ libDir });
    thickModeInitialized = true;
    console.log(`Oracle Thick mode enabled (${libDir})`);
  } catch (err) {
    if (!err.message.includes('already been initialized')) {
      throw err;
    }
    thickModeInitialized = true;
  }
}

async function initializePool() {
  if (pool) return pool;

  initializeThickMode();

  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.autoCommit = true;

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 60
  });

  const testConn = await pool.getConnection();
  await testConn.execute('SELECT 1 FROM DUAL');
  await testConn.close();

  console.log(`Oracle connected: ${process.env.ORACLE_USER}@${process.env.ORACLE_CONNECT_STRING}`);
  return pool;
}

async function getConnection() {
  if (!pool) await initializePool();
  return pool.getConnection();
}

async function closePool() {
  if (pool) {
    await pool.close(0);
    pool = null;
    console.log('Oracle connection pool closed');
  }
}

async function executeQuery(sql, binds = {}, options = {}) {
  const connection = await getConnection();
  try {
    return await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      ...options
    });
  } finally {
    try {
      await connection.close();
    } catch (err) {
      console.error('Error closing connection:', err.message);
    }
  }
}

module.exports = {
  oracledb,
  initializePool,
  getConnection,
  closePool,
  executeQuery
};
