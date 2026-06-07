import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { initializeDatabase, pool } from "./db.js";

const app = express();
const port = process.env.PORT || 5000;
const allowedOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";

app.use(helmet());
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

const validStatuses = new Set(["Active", "On Leave", "Inactive"]);
const sessions = new Map();
const passwordPattern = /^.{8,}$/;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }
  return value;
}

const adminEmail = requiredEnv("ADMIN_EMAIL").toLowerCase();
const adminPassword = requiredEnv("ADMIN_PASSWORD");

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 120000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(":");
  if (!salt || !originalHash) return false;

  const candidateHash = hashPassword(password, salt).split(":")[1];
  return crypto.timingSafeEqual(
    Buffer.from(candidateHash, "hex"),
    Buffer.from(originalHash, "hex")
  );
}

function generateTemporaryPassword() {
  return `Emp-${crypto.randomBytes(5).toString("hex")}`;
}

function createSession(user) {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  });
  return token;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

function requireAuth(req, res, next) {
  const [scheme, token] = String(req.headers.authorization || "").split(" ");

  if (scheme !== "Bearer" || !sessions.has(token)) {
    return res.status(401).json({ message: "Please login to continue." });
  }

  req.user = sessions.get(token);
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "Administrator") {
    return res.status(403).json({ message: "Only administrators can manage employee records." });
  }

  next();
}

async function ensureDefaultAdmin() {
  const existingAdmin = await pool.query("SELECT id FROM users WHERE email = $1", [
    adminEmail.toLowerCase()
  ]);
  if (existingAdmin.rowCount > 0) {
    await pool.query(
      `UPDATE users
       SET name = $1,
           password_hash = $2,
           role = 'Administrator'
       WHERE email = $3`,
      ["System Admin", hashPassword(adminPassword), adminEmail.toLowerCase()]
    );
    return;
  }

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, 'Administrator')
     ON CONFLICT (email) DO NOTHING`,
    ["System Admin", adminEmail.toLowerCase(), hashPassword(adminPassword)]
  );
}

function cleanEmployee(input) {
  return {
    name: String(input.name || "").trim(),
    email: String(input.email || "").trim().toLowerCase(),
    role: String(input.role || "").trim(),
    department: String(input.department || "").trim(),
    location: String(input.location || "Remote").trim(),
    status: String(input.status || "Active").trim()
  };
}

function validateEmployee(employee) {
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!employee.name) errors.name = "Name is required.";
  if (!emailPattern.test(employee.email)) errors.email = "Enter a valid email.";
  if (!employee.role) errors.role = "Role is required.";
  if (!employee.department) errors.department = "Department is required.";
  if (!validStatuses.has(employee.status)) {
    errors.status = "Status must be Active, On Leave, or Inactive.";
  }

  return errors;
}

app.get("/api/health", async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ status: "ok", service: "employee-api" });
});

app.post("/api/auth/signup", async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!name || !emailPattern.test(email) || !passwordPattern.test(password)) {
      return res.status(400).json({
        message: "Enter a name, valid email, and password with at least 8 characters."
      });
    }

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [name, email, hashPassword(password), "Employee"]
    );
    const user = result.rows[0];
    const token = createSession(user);

    res.status(201).json({ user: publicUser(user), token });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const result = await pool.query(
      "SELECT id, name, email, password_hash, role FROM users WHERE email = $1",
      [email]
    );

    if (result.rowCount === 0 || !verifyPassword(password, result.rows[0].password_hash)) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const user = result.rows[0];
    const token = createSession(user);
    res.json({ user: publicUser(user), token });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});

app.post("/api/auth/logout", requireAuth, (req, res) => {
  const token = String(req.headers.authorization || "").split(" ")[1];
  sessions.delete(token);
  res.status(204).send();
});

app.get("/api/employees", requireAuth, async (req, res, next) => {
  try {
    const search = String(req.query.search || "").trim();
    const params = [];
    let where = "";

    if (search) {
      params.push(`%${search}%`);
      where = `
        WHERE name ILIKE $1
          OR email ILIKE $1
          OR role ILIKE $1
          OR department ILIKE $1
          OR location ILIKE $1
          OR status ILIKE $1
      `;
    }

    const result = await pool.query(
      `SELECT id, name, email, role, department, location, status, created_at, updated_at
       FROM employees
       ${where}
       ORDER BY id DESC`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/employees/:id", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, department, location, status, created_at, updated_at
       FROM employees
       WHERE id = $1`,
      [req.params.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Employee not found." });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post("/api/employees", requireAuth, requireAdmin, async (req, res, next) => {
  const client = await pool.connect();

  try {
    const employee = cleanEmployee(req.body);
    const errors = validateEmployee(employee);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO employees (name, email, role, department, location, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, department, location, status, created_at, updated_at`,
      [
        employee.name,
        employee.email,
        employee.role,
        employee.department,
        employee.location,
        employee.status
      ]
    );

    const userExists = await client.query("SELECT id FROM users WHERE email = $1", [
      employee.email
    ]);
    let temporaryPassword = null;

    if (userExists.rowCount === 0) {
      temporaryPassword = generateTemporaryPassword();
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, 'Employee')`,
        [employee.name, employee.email, hashPassword(temporaryPassword)]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      employee: result.rows[0],
      credentials: temporaryPassword
        ? {
            email: employee.email,
            temporaryPassword
          }
        : null
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

app.put("/api/employees/:id", requireAuth, requireAdmin, async (req, res, next) => {
  const client = await pool.connect();

  try {
    const employee = cleanEmployee(req.body);
    const errors = validateEmployee(employee);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed.", errors });
    }

    await client.query("BEGIN");

    const currentEmployee = await client.query(
      "SELECT email FROM employees WHERE id = $1",
      [req.params.id]
    );

    if (currentEmployee.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Employee not found." });
    }

    const result = await client.query(
      `UPDATE employees
       SET name = $1,
           email = $2,
           role = $3,
           department = $4,
           location = $5,
           status = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING id, name, email, role, department, location, status, created_at, updated_at`,
      [
        employee.name,
        employee.email,
        employee.role,
        employee.department,
        employee.location,
        employee.status,
        req.params.id
      ]
    );

    await client.query(
      `UPDATE users
       SET name = $1,
           email = $2
       WHERE email = $3
         AND role = 'Employee'`,
      [employee.name, employee.email, currentEmployee.rows[0].email]
    );

    await client.query("COMMIT");

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

app.delete("/api/employees/:id", requireAuth, requireAdmin, async (req, res, next) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      "DELETE FROM employees WHERE id = $1 RETURNING id, email",
      [req.params.id]
    );

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Employee not found." });
    }

    await client.query(
      "DELETE FROM users WHERE email = $1 AND role = 'Employee'",
      [result.rows[0].email]
    );
    await client.query("COMMIT");

    res.status(204).send();
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

app.get("/api/profile", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id,
              u.name,
              u.email,
              u.role AS account_role,
              e.role AS employee_role,
              e.department,
              e.location,
              e.status
       FROM users u
       LEFT JOIN employees e ON e.email = u.email
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Profile not found." });
    }

    res.json({ profile: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.put("/api/profile", requireAuth, async (req, res, next) => {
  const client = await pool.connect();

  try {
    const name = String(req.body.name || "").trim();
    const location = String(req.body.location || "Remote").trim();
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");

    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    await client.query("BEGIN");

    if (newPassword) {
      if (!passwordPattern.test(newPassword)) {
        await client.query("ROLLBACK");
        return res.status(400).json({ message: "New password must be at least 8 characters." });
      }

      const currentUser = await client.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [req.user.id]
      );

      if (
        currentUser.rowCount === 0 ||
        !verifyPassword(currentPassword, currentUser.rows[0].password_hash)
      ) {
        await client.query("ROLLBACK");
        return res.status(401).json({ message: "Current password is incorrect." });
      }

      await client.query(
        "UPDATE users SET password_hash = $1 WHERE id = $2",
        [hashPassword(newPassword), req.user.id]
      );
    }

    const userResult = await client.query(
      `UPDATE users
       SET name = $1
       WHERE id = $2
       RETURNING id, name, email, role`,
      [name, req.user.id]
    );

    await client.query(
      `UPDATE employees
       SET name = $1,
           location = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $3`,
      [name, location, req.user.email]
    );

    await client.query("COMMIT");

    const user = userResult.rows[0];
    for (const [sessionToken, sessionUser] of sessions.entries()) {
      if (sessionUser.id === user.id) {
        sessions.set(sessionToken, publicUser(user));
      }
    }

    res.json({ user: publicUser(user), message: "Profile updated successfully." });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

app.use((error, _req, res, _next) => {
  if (error.code === "23505") {
    return res.status(409).json({
      message: "This email address already exists."
    });
  }

  console.error(error);
  res.status(500).json({ message: "Something went wrong on the server." });
});

initializeDatabase()
  .then(ensureDefaultAdmin)
  .then(() => {
    app.listen(port, () => {
      console.log(`Employee API running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize database", error);
    process.exit(1);
  });
