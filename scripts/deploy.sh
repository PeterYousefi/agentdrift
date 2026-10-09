#!/usr/bin/env bash
set -euo pipefail
: "${ALLOW_AZURE_DEPLOY:?Set ALLOW_AZURE_DEPLOY only after reviewing and approving docs/azure-deployment.md}"
[[ "$ALLOW_AZURE_DEPLOY" == true ]] || exit 1
rg_name=agentdrift-demo-rg
region=${AZURE_REGION:-canadacentral}
web_name=${FRONTEND_NAME:-agentdrift-personal-demo}
image=${AGENTDRIFT_IMAGE:-ghcr.io/peteryousefi/agentdrift:latest}
# Validate public pull access before any provisioning.
docker manifest inspect "$image" >/dev/null
if [[ "${UPDATE_EXISTING_ONLY:-false}" == true ]]; then
  # Fail closed if either approved application is absent; never provision on this path.
  az webapp show -g "$rg_name" -n "$web_name" --output none
  az containerapp show -g "$rg_name" -n agentdrift-api --output none
  az containerapp update -g "$rg_name" -n agentdrift-api --image "$image" --output none
else
az deployment sub create --location "$region" --name agentdrift-subscription-budget \
  --template-file infra/azure/subscription-budget.bicep --output none
az group create --name "$rg_name" --location "$region" --output none
# Budget included in both deployments; no paid registry or model service.
az deployment group create --resource-group "$rg_name" --name agentdrift-foundation \
  --template-file infra/azure/main.bicep --parameters deployApi=false frontendName="$web_name" --output none
az deployment group create --resource-group "$rg_name" --name agentdrift-runtime \
  --template-file infra/azure/main.bicep --parameters deployApi=true image="$image" frontendName="$web_name" --output none
fi
api_host=$(az containerapp show -g "$rg_name" -n agentdrift-api --query properties.configuration.ingress.fqdn -o tsv)
web_host=$(az webapp show -g "$rg_name" -n "$web_name" --query defaultHostName -o tsv)
(
  cd lovable
  VITE_DEMO_MODE=false VITE_API_BASE_URL="https://$api_host/api/v1" npm run build
)
cp lovable/.output/public/_shell.html lovable/.output/public/index.html
cp infra/azure/web.config lovable/.output/public/web.config
python3 scripts/package_frontend.py
az webapp deploy -g "$rg_name" -n "$web_name" --type zip --src-path /tmp/agentdrift-frontend.zip --clean true --restart true --output none
curl --fail --retry 12 --retry-delay 10 "https://$api_host/health"
curl --fail --retry 12 --retry-delay 10 "https://$api_host/ready"
(cd lovable && E2E_BASE_URL="https://$web_host" npx playwright test)
printf '\nFrontend: https://%s\nAPI: https://%s/health\n' "$web_host" "$api_host"
