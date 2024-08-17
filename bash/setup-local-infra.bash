totalSteps="6"

echo ">>> [1/$totalSteps] clearing all existing images and helm release"
buildah rmi --all
helm ls -a --all-namespaces | awk 'NR > 1 { print  "-n "$2, $1}' | xargs -L1 helm delete

echo ">>> [2/$totalSteps] Setup local image registry in progress"
helm install my-registry charts/registry

echo ">>> [3/$totalSteps] Building gameserver image"
buildah bud -t gameserver .


echo ">>> [4/$totalSteps] Pushing game server image to local image registry"
buildah push --tls-verify=false gameserver localhost:30000/gameserver:latest

echo ">>> [5/$totalSteps] Setup local game server from helm chart"
helm install gameserver charts/gameserver


echo ">>> [6/$totalSteps] Setup NGINX Ingress"
helm install nginx-ingress charts/nginx-ingress