#!/bin/bash

totalSteps="8"  # Update the total number of steps
namespace="rts"

echo ">>> [1/$totalSteps] Clearing all existing Helm releases in the namespace $namespace"

# Remove all Helm releases in the namespace
helm ls -a --namespace $namespace | awk 'NR > 1 { print $1 }' | xargs -r -L1 helm delete --namespace $namespace

echo ">>> [2/$totalSteps] Cleaning up ingress resources in namespace $namespace"

# Delete all Ingress resources in the namespace
kubectl get ingress --namespace $namespace -o name | xargs -r kubectl delete --namespace $namespace

echo ">>> [3/$totalSteps] Setting up NGINX Ingress Controller"

# Define Helm repository and chart details
REPO_NAME="nginx-stable"
REPO_URL="https://helm.nginx.com/stable"
RELEASE_NAME="nginx-ingress"

# Check if the Helm repository is already added
REPO_EXISTS=$(helm repo list | grep "$REPO_NAME")

# Add the Helm repository if it's not already present
if [ -z "$REPO_EXISTS" ]; then
  echo "Adding Helm repository $REPO_NAME"
  helm repo add "$REPO_NAME" "$REPO_URL"
  # Update Helm repositories after adding
  helm repo update
fi

# Create namespace if it does not exist
kubectl get namespace "$namespace" >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "Creating namespace $namespace"
  kubectl create namespace "$namespace"
fi

# Clear any existing NGINX resources
echo "Deleting existing NGINX resources in namespace $namespace"
helm uninstall "$RELEASE_NAME" --namespace "$namespace" >/dev/null 2>&1

# Install the NGINX Ingress Controller
echo "Installing NGINX Ingress Controller"
helm install "$RELEASE_NAME" "$REPO_NAME/$RELEASE_NAME" --namespace "$namespace" --set rbac.create=true

echo ">>> [4/$totalSteps] Setting up local image registry"

# Ensure the registry is installed
helm install my-registry charts/registry --namespace $namespace --create-namespace

echo ">>> [5/$totalSteps] Building game server image"

# Build the game server image
buildah bud -t gameserver .

echo ">>> [6/$totalSteps] Pushing game server image to local image registry"

# Push the image to the local registry
buildah push --tls-verify=false gameserver localhost:30000/gameserver

echo ">>> [7/$totalSteps] Setting up local game server from Helm chart and ingress"

# Install the game server using Helm
helm install gameserver charts/gameserver --namespace $namespace

echo ">>> [8/$totalSteps] Script execution completed."
