# Employee Hub

A simple three-tier Employee CRUD app for DevOps practice.

```text
React frontend -> Node/Express backend -> PostgreSQL database
```

## What Is Included

- User login and signup
- Admin employee create, update, and delete
- Employee profile update
- Docker Compose local setup
- Kubernetes manifests for Kind and EKS
- Argo CD application manifests

## Project Workflow

1. Configure the app using `.env`.
2. Run locally with Docker Compose.
3. Configure GitHub Actions secrets and variables.
4. Push to `main` so the workflow builds images and updates Kubernetes manifests.
5. Deploy to Kind or EKS.
6. Use Argo CD for GitOps deployment/sync.

## Local Setup

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env`:

```env
POSTGRES_USER=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DB=employee_db
DATABASE_URL=postgres://your_db_user:your_db_password@postgres:5432/employee_db
CLIENT_ORIGIN=http://localhost:8080
ADMIN_EMAIL=admin@your-company.example
ADMIN_PASSWORD=replace-with-a-strong-password
```

Start the app:

```bash
docker compose up --build
```

Open:

```text
http://localhost:8080
```

Useful commands:

```bash
docker compose down
docker compose down -v
curl http://localhost:5000/api/health
```

## Environment Notes

- Keep `.env` local. Do not commit real secrets.
- `DATABASE_URL` connects the backend to PostgreSQL.
- `CLIENT_ORIGIN` should match the frontend URL.
- `ADMIN_EMAIL` and `ADMIN_PASSWORD` create the first admin user.
- For Docker Compose, the database host is `postgres`.
- For EKS/RDS, use your RDS endpoint and set `DATABASE_SSL=true` in the Kubernetes secret.

## Kubernetes Files

```text
k8s-kind/  -> Local Kind deployment with PostgreSQL in the cluster
k8s-eks/   -> AWS EKS deployment, usually with external RDS PostgreSQL
argocd/    -> Argo CD application manifests
```

Secret templates:

```text
k8s-kind/secret.example
k8s-eks/secret.example
```

Copy the correct template to `secret.yaml`, edit values, then apply it manually:

```bash
cp k8s-kind/secret.example k8s-kind/secret.yaml
kubectl apply -f k8s-kind/secret.yaml
```

For EKS:

```bash
cp k8s-eks/secret.example k8s-eks/secret.yaml
kubectl apply -f k8s-eks/secret.yaml
```

## Deployment References

Use these files for detailed setup steps:

| File | Usage |
| --- | --- |
| [EKS_KUBECTL_GUIDE.md](./EKS_KUBECTL_GUIDE.md) | Connect your machine to AWS EKS and verify the cluster with `kubectl`. |
| [ARGO_CD_INSTALL_GUIDE.md](./ARGO_CD_INSTALL_GUIDE.md) | Install Argo CD on EKS and connect it to this GitOps repo. |
| [.github/workflows/dockerhub-gitops.yml](./.github/workflows/dockerhub-gitops.yml) | GitHub Actions workflow that builds Docker images, pushes them to Docker Hub, updates Kubernetes image tags, and commits the manifest changes. |

GitHub workflow URL:

```text
https://github.com/<your-github-username>/<your-repo-name>/actions/workflows/dockerhub-gitops.yml
```

## GitHub Actions Setup

Create these in your GitHub repository settings:

| Type | Name | Value |
| --- | --- | --- |
| Repository variable | `DOCKERHUB_USERNAME` | Your Docker Hub username |
| Repository secret | `DOCKERHUB_TOKEN` | Your Docker Hub access token |

After these are configured, push to `main` or run the workflow manually from the Actions tab.

Argo CD app manifests:

```text
argocd/employee-hub-app.yaml      -> Kind path: k8s-kind
argocd/employee-hub-eks-app.yaml  -> EKS path: k8s-eks
```
