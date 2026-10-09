#!/usr/bin/env bash
set -euo pipefail
: "${ALLOW_AZURE_DEPLOY:?Set ALLOW_AZURE_DEPLOY only after reviewing and approving docs/azure-deployment.md}"
[[ "$ALLOW_AZURE_DEPLOY" == true ]] || exit 1
rg_name=agentdrift-demo-rg
region=${AZURE_REGION:-canadacentral}
image=${AGENTDRIFT_IMAGE:-ghcr.io/peteryousefi/agentdrift:latest}
# Validate public pull access before any provisioning.
docker manifest inspect "$image" >/dev/null
az deployment sub create --location "$region" --name agentdrift-subscription-budget \
  --template-file infra/azure/subscription-budget.bicep --output none
az group create --name "$rg_name" --location "$region" --output none
# Budget included in both deployments; no paid registry or model service.
az deployment group create --resource-group "$rg_name" --name agentdrift-foundation \
  --template-file infra/azure/main.bicep --parameters deployApi=false --output none
az deployment group create --resource-group "$rg_name" --name agentdrift-runtime \
  --template-file infra/azure/main.bicep --parameters deployApi=true image="$image" --output none
api_host=$(az containerapp show -g "$rg_name" -n agentdrift-api --query properties.configuration.ingress.fqdn -o tsv)
web_host=$(az staticwebapp show -g "$rg_name" -n agentdrift-web --query defaultHostname -o tsv)
(
  cd lovable
  VITE_DEMO_MODE=false VITE_API_BASE_URL="https://$api_host/api/v1" npm run build
)
# The Static Web Apps deployment token stays in process memory, never a tracked file.
swa_token=$(az staticwebapp secrets list -g "$rg_name" -n agentdrift-web --query properties.apiKey -o tsv)
SWA_CLI_DEPLOYMENT_TOKEN="$swa_token" npx --yes @azure/static-web-apps-cli deploy lovable/.output/public --env production
unset swa_token
curl --fail --retry 12 --retry-delay 10 "https://$api_host/health"
curl --fail --retry 12 --retry-delay 10 "https://$api_host/ready"
E2E_BASE_URL="https://$web_host" (cd lovable && npx playwright test)
printf '\nFrontend: https://%s\nAPI: https://%s/health\n' "$web_host" "$api_host"
