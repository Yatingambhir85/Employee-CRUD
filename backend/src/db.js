import pg from "pg";

const { Pool } = pg;

const useSsl = process.env.DATABASE_SSL === "true";
const hasDatabaseParts =
  process.env.DATABASE_HOST &&
  process.env.POSTGRES_USER &&
  process.env.POSTGRES_PASSWORD &&
  process.env.POSTGRES_DB;

if (!hasDatabaseParts && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL or database connection parts are required.");
}

const connectionOptions = hasDatabaseParts
  ? {
      host: process.env.DATABASE_HOST,
      port: Number(process.env.DATABASE_PORT || 5432),
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB
    }
  : {
      connectionString: process.env.DATABASE_URL
    };

export const pool = new Pool({
  ...connectionOptions,
  ssl: useSsl ? { rejectUnauthorized: false } : false
});

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      role VARCHAR(100) NOT NULL DEFAULT 'Employee',
      department VARCHAR(100) NOT NULL DEFAULT 'General',
      location VARCHAR(100) DEFAULT 'Remote',
      status VARCHAR(20) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(160) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role VARCHAR(80) DEFAULT 'Employee',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    ALTER TABLE employees
      ADD COLUMN IF NOT EXISTS role VARCHAR(100) NOT NULL DEFAULT 'Employee',
      ADD COLUMN IF NOT EXISTS department VARCHAR(100) NOT NULL DEFAULT 'General',
      ADD COLUMN IF NOT EXISTS location VARCHAR(100) DEFAULT 'Remote',
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active',
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  `);

  await pool.query(`
    INSERT INTO employees (name, email, role, department, location, status)
    SELECT * FROM (VALUES
      ('Aarav Mehta', 'aarav.mehta@example.com', 'DevOps Engineer', 'Platform', 'Bengaluru', 'Active'),
      ('Priya Nair', 'priya.nair@example.com', 'Frontend Developer', 'Product', 'Hyderabad', 'Active'),
      ('Rohan Shah', 'rohan.shah@example.com', 'QA Analyst', 'Quality', 'Pune', 'On Leave')
    ) AS seed(name, email, role, department, location, status)
    WHERE NOT EXISTS (SELECT 1 FROM employees)
    ON CONFLICT (email) DO NOTHING;
  `);
}
