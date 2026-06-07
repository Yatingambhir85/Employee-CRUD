# Employee Hub

🚀 A simple three-tier Employee CRUD application built for local deployment and DevOps practice.

## ✨ Features

- 🔐 Login and sign up
- 👑 Admin-only employee create, update, and delete
- 👤 Employee self-service profile update
- 🔑 Temporary password popup when admin creates an employee
- 🌗 Dark/light theme
- 🐳 Docker Compose setup
- 🗄️ PostgreSQL database
- ⚙️ Node.js + Express API
- ⚛️ React + Vite frontend

## 🧱 Architecture

```text
Frontend  ->  Backend API  ->  PostgreSQL
React         Node/Express      Database
```

## ✅ Prerequisites

- Docker
- Docker Compose
- Git

## 🚀 Run With Docker

Clone the project, then from the project root:

```bash
cp .env.example .env
```

Edit `.env` and set your own values:

```env
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=employee_db
DATABASE_URL=postgres://your_db_user:your_db_password@postgres:5432/employee_db
CLIENT_ORIGIN=http://localhost:8080
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-strong-admin-password
```

Start the app:

```bash
docker compose up --build
```

Open:

```text
http://localhost:8080
```

## 👥 User Roles

**Admin**

- Add, edit, and delete employees
- Gets a temporary password when creating a new employee
- Controls employee email, role, department, and status

**Employee**

- View/search employee directory
- Update own name, location, and password
- Cannot edit other employee records

## 🔐 Admin Login

The admin account is created from your local `.env` file:

```env
ADMIN_EMAIL=...
ADMIN_PASSWORD=...
```

Do not commit `.env` to GitHub.

## 🛠️ Useful Commands

Stop containers:

```bash
docker compose down
```

Reset database data:

```bash
docker compose down -v
```

Check API health:

```bash
curl http://localhost:5000/api/health
```

## 💻 Local Development

Start only PostgreSQL:

```bash
docker compose up -d postgres
```

Backend:

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

## 📡 API Endpoints

```text
GET    /api/health
POST   /api/auth/signup
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/logout
GET    /api/profile
PUT    /api/profile
GET    /api/employees
POST   /api/employees
PUT    /api/employees/:id
DELETE /api/employees/:id
```

Protected endpoints require:

```text
Authorization: Bearer <token>
```

## 📁 Project Structure

```text
employee-crud/
├── backend/
├── frontend/
├── database/
├── docker-compose.yml
├── .env.example
└── README.md
```

## 🔒 GitHub Safety

- ✅ Commit `.env.example`
- ❌ Do not commit `.env`
- ❌ Do not commit real passwords or secrets
- ✅ Use environment variables for cloud deployment

---

Developed by Yatin Gambhir
