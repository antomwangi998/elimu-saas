// ============================================================
// Database Configuration — PostgreSQL with pg Pool
// ============================================================
const { Pool } = require('pg');
const logger = require('./logger');

let pool;

const connectDB = async () => {
  const config = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'elimu_saas',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      };

  pool = new Pool(config);

  pool.on('error', (err) => {
    logger.error('Unexpected database error:', err);
  });

  // Test connection
  const client = await pool.connect();
  await client.query('SELECT NOW()');
  client.release();

  return pool;
};

const getPool = () => {
  if (!pool) throw new Error('Database not connected. Call connectDB() first.');
  return pool;
};

// ── Query Helper ──────────────────────────────────────────────
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Query executed in ${duration}ms: ${text.substring(0, 80)}`);
    }
    return res;
  } catch (err) {
    logger.error(`Query error: ${err.message}\nSQL: ${text}`);
    throw err;
  }
};

// ── Transaction Helper ────────────────────────────────────────
const withTransaction = async (callback) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// ── Paginated Query Helper ────────────────────────────────────
const paginatedQuery = async (baseQuery, params, page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  const countQuery = `SELECT COUNT(*) FROM (${baseQuery}) AS count_query`;
  const dataQuery = `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const [countResult, dataResult] = await Promise.all([
    query(countQuery, params),
    query(dataQuery, [...params, limit, offset]),
  ]);

  const total = parseInt(countResult.rows[0].count);
  return {
    data: dataResult.rows,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
    },
  };
};

module.exports = { connectDB, getPool, query, withTransaction, paginatedQuery };
