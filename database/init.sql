CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    location VARCHAR(100) DEFAULT 'Remote',
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(80) DEFAULT 'Employee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO employees (name, email, role, department, location, status)
VALUES
    ('Aarav Mehta', 'aarav.mehta@example.com', 'DevOps Engineer', 'Platform', 'Bengaluru', 'Active'),
    ('Priya Nair', 'priya.nair@example.com', 'Frontend Developer', 'Product', 'Hyderabad', 'Active'),
    ('Rohan Shah', 'rohan.shah@example.com', 'QA Analyst', 'Quality', 'Pune', 'On Leave')
ON CONFLICT (email) DO NOTHING;
