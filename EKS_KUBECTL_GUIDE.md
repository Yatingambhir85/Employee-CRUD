# EKS Kubectl Guide

This guide explains how to connect your local Linux machine to AWS EKS and verify the cluster using `kubectl`.

## Prerequisites

- AWS CLI installed
- `kubectl` installed
- EKS cluster is created
- EKS node group is active
- Your AWS CLI user/role has permission to access EKS

## 1. Check AWS Login

```bash
aws sts get-caller-identity
```

This should show your AWS account and IAM identity.

## 2. Update Kubeconfig

Use your EKS cluster name and region:

```bash
aws eks update-kubeconfig \
  --region us-west-2 \
  --name employee-hub-cluster
```

This configures local `kubectl` to talk to your EKS cluster.

## 3. Check Current Context

```bash
kubectl config current-context
```

You should see an EKS context.

## 4. Check Nodes

```bash
kubectl get nodes
```

Expected:

```text
NAME                            STATUS   ROLES    AGE   VERSION
ip-xxx-xxx-xxx-xxx...           Ready    <none>   ...   ...
```

If nodes are not visible:

- Check node group is active
- Check IAM permissions
- Check kubeconfig region/name

## 5. Check System Pods

```bash
kubectl get pods -n kube-system
```

Important pods should be running, such as:

```text
coredns
kube-proxy
aws-node
```

## 6. Check Application Namespace

```bash
kubectl get ns
kubectl get pods -n employee-hub
kubectl get svc -n employee-hub
```

## 7. Apply EKS Secrets

Real secrets are local only and ignored by Git.

```bash
kubectl apply -f k8s-eks/secrets.yml
```

## 8. Deploy EKS Manifests Manually

Use this only for first-time/manual deployment. After Argo CD is configured, Argo CD handles sync.

```bash
kubectl apply -f k8s-eks
```

## 9. Get App LoadBalancer URL

```bash
kubectl get svc frontend -n employee-hub
```

Open:

```text
http://<frontend-load-balancer-dns>
```

## 10. Useful Debug Commands

```bash
kubectl get pods -n employee-hub
kubectl describe pod <pod-name> -n employee-hub
kubectl logs deployment/backend -n employee-hub
kubectl logs deployment/frontend -n employee-hub
kubectl rollout restart deployment/backend -n employee-hub
kubectl rollout status deployment/backend -n employee-hub
```

## 11. Common Problems

If `kubectl` cannot connect:

```bash
aws eks update-kubeconfig --region us-west-2 --name employee-hub-cluster
kubectl config current-context
```

If backend cannot connect to RDS:

- Check RDS security group allows EKS node security group on port `5432`
- Check `DATABASE_HOST`
- Check `POSTGRES_USER`
- Check `POSTGRES_PASSWORD`
- Check `POSTGRES_DB`
- Check `DATABASE_SSL: "true"`

If frontend is not accessible:

```bash
kubectl get svc frontend -n employee-hub
```

Wait until `EXTERNAL-IP` shows an AWS LoadBalancer DNS name.

