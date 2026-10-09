# Deployment review — approved; readable URL configuration

AgentDrift frontend, backend and durable Table Storage are deployed in agentdrift-demo-rg. The requested subscription budget has been created and read back successfully: amount 5, Monthly, enabled actual and forecast thresholds at 100%, recipient peter.yousefi@outlook.com. Bicep compiles; image publishing and CI have passed. Anonymous pull access to ghcr.io/peteryousefi/agentdrift is verified. Existing unrelated Azure resources remain unchanged.

## Estimated monthly price before deployment

USD estimate for 1,000 short demo runs/month, at most 100 active backend hours, under 100 MB retained synthetic evidence, under one million table transactions, and modest static bandwidth:

| Component | Configuration | Estimated monthly cost |
|---|---|---:|
| App Service static frontend | F1 Free plan | $0 |
| Container Apps | Consumption, 0.25 vCPU, 0.5 GiB, min 0/max 1 replica | $0 within unused monthly grants |
| Container image | Public GitHub Container Registry | $0 Azure cost |
| Table Storage | Standard LRS, small metadata only, 24-hour session retention | $0–$1 estimate |
| Azure OpenAI | Not provisioned; deterministic fallback | $0 |
| Logs/monitoring | Structured console logs; no paid ingestion workspace | $0 planned ingestion charges |
| Cost budget emails | $1/$3/$5 actual, $5 forecast | No added paid monitoring service |
| Contingency | Small transactions/egress variation | $1 |
| **Planning total** | **Light demo usage** | **$0–$2** |

100 allocated hours at 0.25 vCPU/0.5 GiB consumes 90,000 vCPU-seconds and 180,000 GiB-seconds, below Container Apps monthly grants of 180,000 and 360,000 respectively. Grants are shared across the subscription. Existing inspected resources do not include Container Apps, but usage and future workloads can consume these grants. This is a usage estimate, not a hard spending cap or a provider quote. Microsoft's retail pricing API returned HTTP 429 during rate lookup; storage allowance is a conservative planning estimate, not a verified subscription-specific price. Public abusive traffic or long-lived browser activity can incur charges and exceed $5 despite rate limits.

Sources: [Container Apps billing](https://learn.microsoft.com/en-us/azure/container-apps/billing), [Static Web Apps plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans), [Table Storage pricing](https://azure.microsoft.com/en-us/pricing/details/storage/tables/), [GHCR access](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

Budgets use the Azure subscription billing currency. Resource-group alerts email peter.yousefi@outlook.com at 20%, 60% and 100% of a monthly 5-unit budget and at a forecast 100%. A separate subscription-wide actual/forecast 5-unit alert also includes unrelated existing resources. Budgets notify after cost data arrives; they do not automatically stop services or guarantee a $5 maximum. Subscription budget configuration has been verified by Azure CLI; resource-group budget settings have also been created and read back. No claim that an email has been sent is made.

## Prepared deployment

Review main.bicep and subscription-budget.bicep. Default region Canada Central; App Service static frontend in Canada Central. Providers Microsoft.App and Microsoft.Web are registered. Deployment may reveal student subscription quota or region restrictions. Azure model deployment is excluded.

After cost approval, run `ALLOW_AZURE_DEPLOY=true bash scripts/deploy.sh` from root. The script checks the public image, deploys the subscription budget, creates only agentdrift-demo-rg, deploys budget/storage/identity/environment/F1 static frontend, deploys the API image, builds existing Lovable with the real API URL, and ZIP-deploys built static assets to IIS with SPA rewrite rules. It checks health/readiness and runs the browser E2E against the public frontend. The script must halt if budgets cannot be created or any live check fails. Verify budget currency, recipients and thresholds before exposing the app.

Production cannot fall back to ephemeral SQLite: ENVIRONMENT=production requires AZURE_TABLE_ENDPOINT. Table access uses managed identity and Storage Table Data Contributor scoped to the storage account. No registry credential or LLM secret is sent to the browser. One replica and one worker preserve the process-lock consistency assumption.

## CI/CD

Validation runs on pushes and PRs. Backend image publishing uses GitHub's workflow token. Azure deployment is manual and disabled unless AZURE_DEPLOYMENT_ENABLED is true and the azure-demo environment has OIDC AZURE_CLIENT_ID, AZURE_TENANT_ID and AZURE_SUBSCRIPTION_ID variables. No federated identity has been created yet. Protect the deployment environment before enabling it. Pin a verified immutable image digest for a reviewed release.

Verified frontend: https://agentdrift-personal-demo.azurewebsites.net. Verified API health/readiness: https://agentdrift-api.icydune-d7187e3c.canadacentral.azurecontainerapps.io/health and /ready. Public Chromium workflow passed with real events, graph, report, approval, audit, refresh and zero page errors. Budgets were read back; model remains unconfigured.

## Readable personal-project address

User approved the low-cost plan and requested a readable personal-demo URL. The frontend now uses Windows App Service F1 (Free) static IIS hosting, targeting `agentdrift-personal-demo.azurewebsites.net`, now verified live. Static Web Apps automatically generates its hostname; F1 permits the traditional named default hostname through ARM without buying a domain. F1 remains $0 and uses shared quota-limited CPU with no paid upgrade. No extra backend or always-on Node server is introduced. Built Lovable assets, index document and IIS SPA rewrite are ZIP-deployed. Exhausted free quotas can reduce availability; deployment will not silently upgrade to a paid plan. The visible interface identifies a personal synthetic engineering demo.

References: [App Service default hostname formats](https://learn.microsoft.com/en-us/azure/app-service/reference-dangling-subdomain-prevention), [Free shared App Service tiers](https://learn.microsoft.com/en-us/azure/app-service/overview-hosting-plans).

Persistence verification: the earlier explicit restart request returned Azure InternalServerError and did not establish durability. During the audited release, the backend image changed from bc36ccc to f7c4a06; the previously saved session and all four evidence IDs were retrieved unchanged after rollout. The release update and readiness succeeded.

## Updating existing resources

For validated releases use `ALLOW_AZURE_DEPLOY=true UPDATE_EXISTING_ONLY=true AGENTDRIFT_IMAGE=ghcr.io/peteryousefi/agentdrift:<tested-image-commit-sha> bash scripts/deploy.sh`. This path verifies both apps exist, updates the backend image, builds and ZIP-deploys the frontend, checks health/readiness and runs public Playwright tests. It does not provision or resize resources. The manual GitHub OIDC workflow requires an explicit immutable image tag and remains gated until OIDC variables are configured. Validation and GHCR image publishing are active.
