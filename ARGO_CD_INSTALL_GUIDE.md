# Argo CD Install Guide

This guide explains how to install Argo CD on AWS EKS and connect it to this Employee Hub GitOps repository.

## Prerequisites

- EKS cluster is created
- Node group is active
- Local `kubectl` is connected to EKS
- Application manifests are pushed to GitHub
- `k8s-eks/secrets.yml` is applied manually because real secrets are not committed

## 1. Connect To EKS

Update your local kubeconfig:

```bash
aws eks update-kubeconfig \
  --region us-west-2 \
  --name employee-hub-cluster
```

Verify:

```bash
kubectl get nodes
kubectl get pods -A
```

## 2. Install Argo CD

Create namespace:

```bash
kubectl create namespace argocd
```

Install Argo CD:

```bash
kubectl apply -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

Check pods:

```bash
kubectl get pods -n argocd
```

All pods should become `Running`.

## 3. Expose Argo CD UI With LoadBalancer

Patch Argo CD server service:

```bash
kubectl patch svc argocd-server \
  -n argocd \
  -p '{"spec":{"type":"LoadBalancer"}}'
```

Get the URL:

```bash
kubectl get svc argocd-server -n argocd
```

Open:

```text
https://<argocd-load-balancer-dns>
```

Your browser may show a certificate warning because Argo CD uses a self-signed certificate by default.

## 4. Login To Argo CD

Username:

```text
admin
```

Get password:

```bash
kubectl get secret argocd-initial-admin-secret \
  -n argocd \
  -o jsonpath="{.data.password}" | base64 -d
echo
```

## 5. Apply Employee Hub Argo CD App

For EKS, use:

```bash
kubectl apply -f argocd/employee-hub-eks-app.yaml
```

Check:

```bash
kubectl get applications -n argocd
```

Expected:

```text
employee-hub-eks   Synced   Healthy
```

## 6. Important Notes

- Argo CD watches `k8s-eks/` for EKS.
- Do not commit `k8s-eks/secrets.yml`.
- Apply secrets manually before Argo CD sync:

```bash
kubectl apply -f k8s-eks/secrets.yml
```

- GitHub Actions builds images, pushes Docker Hub, updates manifests, and commits image tags.
- Argo CD then syncs the updated manifests into EKS.

## 7. Useful Commands

```bash
kubectl get pods -n argocd
kubectl get svc -n argocd
kubectl get applications -n argocd
kubectl describe application employee-hub-eks -n argocd
kubectl logs deployment/argocd-server -n argocd
```

