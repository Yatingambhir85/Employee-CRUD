import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
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
