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
- kubectl, Minikube, and Argo CD for Kubernetes deployment
- Docker Hub account for CI/CD image pushes

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

## ☸️ Kubernetes + Argo CD

This project has separate Kubernetes folders:

```text
k8s-kind/  -> Local Kind deployment with in-cluster PostgreSQL
k8s-eks/   -> AWS EKS deployment with external RDS PostgreSQL
```

Argo CD apps:

```text
argocd/employee-hub-app.yaml      -> local Kind, path: k8s-kind
argocd/employee-hub-eks-app.yaml  -> AWS EKS, path: k8s-eks
```

### 1. Build and push Docker Hub images

Login to Docker Hub, then build and push both images:

```bash
docker login

docker build -t your-dockerhub-username/employee-backend:latest ./backend
docker build -t your-dockerhub-username/employee-frontend:latest ./frontend

docker push your-dockerhub-username/employee-backend:latest
docker push your-dockerhub-username/employee-frontend:latest
```

Update the Kubernetes manifests with your Docker Hub username:

```bash
sed -i 's|DOCKERHUB_USERNAME|your-dockerhub-username|g' k8s-kind/backend-deployment.yaml
sed -i 's|DOCKERHUB_USERNAME|your-dockerhub-username|g' k8s-kind/frontend-deployment.yaml
sed -i 's|DOCKERHUB_USERNAME|your-dockerhub-username|g' k8s-eks/backend-deployment.yaml
sed -i 's|DOCKERHUB_USERNAME|your-dockerhub-username|g' k8s-eks/frontend-deployment.yaml
```

### 2. Create the app secret

Do not commit real secrets.

The files `k8s-kind/secret.example` and `k8s-eks/secret.example` are safe templates for Kubernetes secrets. They are intentionally not named `.yaml`, so these commands will not apply placeholder values by mistake:

```bash
kubectl apply -f k8s-kind
kubectl apply -f k8s-eks
```

For local Kind:

```bash
kubectl create namespace employee-hub

cp k8s-kind/secret.example k8s-kind/secret.yaml
```

Edit `k8s-kind/secret.yaml` with your values, then apply it:

```bash
kubectl apply -f k8s-kind/secret.yaml
```

For EKS, create a separate local secret file:

```bash
cp k8s-eks/secret.example k8s-eks/secret.yaml
```

Edit `k8s-eks/secret.yaml` with your RDS values, then apply it:

```bash
kubectl apply -f k8s-eks/secret.yaml
```

Both `secret.yaml` files are ignored by Git.

For local Kind, keep:

```yaml
CLIENT_ORIGIN: http://localhost:8080
```

For EKS/cloud, change it to your real frontend URL:

```yaml
CLIENT_ORIGIN: https://your-domain.com
```

For EKS/RDS, also update:

```yaml
DATABASE_HOST: your-rds-endpoint.rds.amazonaws.com
DATABASE_URL: postgres://user:password@your-rds-endpoint.rds.amazonaws.com:5432/employee_db
DATABASE_SSL: "true"
```

### 3. Deploy with kubectl

```bash
kubectl apply -f k8s-kind
kubectl get pods -n employee-hub
kubectl port-forward svc/frontend -n employee-hub 8080:80
```

Open:

```text
http://localhost:8080
```

### 4. Deploy with Argo CD

Install Argo CD in your cluster, then update the Argo CD app with your GitHub repo URL:

```bash
sed -i 's|https://github.com/YOUR_GITHUB_USERNAME/employee-crud.git|https://github.com/your-github-username/employee-crud.git|g' argocd/employee-hub-app.yaml
sed -i 's|https://github.com/YOUR_GITHUB_USERNAME/employee-crud.git|https://github.com/your-github-username/employee-crud.git|g' argocd/employee-hub-eks-app.yaml
```

Apply the local Kind Argo CD app:

```bash
kubectl apply -f argocd/employee-hub-app.yaml
```

For EKS, apply the EKS Argo CD app instead:

```bash
kubectl apply -f argocd/employee-hub-eks-app.yaml
```

Argo CD will sync the Kubernetes manifests from GitHub.

## 🔁 GitHub Actions CI/CD

The workflow in `.github/workflows/dockerhub-gitops.yml` runs when code is pushed to `main`.

It will:

- Build backend and frontend Docker images
- Push both images to Docker Hub
- Update image tags in Kubernetes deployment files
- Commit the updated deployment files back to GitHub
- Let Argo CD sync the latest manifests into Kubernetes

Create these GitHub repository secrets:

```text
DOCKERHUB_USERNAME
DOCKERHUB_TOKEN
```

Image tags use the Git commit SHA:

```text
your-dockerhub-username/employee-backend:<commit-sha>
your-dockerhub-username/employee-frontend:<commit-sha>
```

Argo CD watches:

```text
k8s-kind/ for local Kind
k8s-eks/ for AWS EKS
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
├── k8s-kind/
├── k8s-eks/
├── argocd/
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
