targetScope = 'resourceGroup'
param location string = resourceGroup().location
param frontendName string = 'agentdrift-personal-demo'
param suffix string = uniqueString(resourceGroup().id)
param image string = 'ghcr.io/peteryousefi/agentdrift:latest'
param alertEmail string = 'peter.yousefi@outlook.com'
@minLength(3)
param storagePrefix string = 'adrift'
param deployApi bool = false

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: '${storagePrefix}${suffix}'
  location: location
  kind: 'StorageV2'
  sku: { name: 'Standard_LRS' }
  properties: {
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
  }
}
resource tableService 'Microsoft.Storage/storageAccounts/tableServices@2023-05-01' = {
  parent: storage
  name: 'default'
}
resource table 'Microsoft.Storage/storageAccounts/tableServices/tables@2023-05-01' = {
  parent: tableService
  name: 'AgentDrift'
}
resource identity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'agentdrift-runtime'
  location: location
}
resource tableRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: storage
  name: guid(storage.id, identity.id, 'tables')
  properties: {
    principalId: identity.properties.principalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '0a9a7e1f-b9d0-4cc4-a60d-0319b160aaa3')
  }
}
// Free IIS static hosting gives a readable azurewebsites.net hostname without a purchased domain.
resource frontendPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: 'agentdrift-frontend-free'
  location: location
  sku: { name: 'F1', tier: 'Free', capacity: 1 }
  properties: { reserved: false }
}
resource frontend 'Microsoft.Web/sites@2023-12-01' = {
  name: frontendName
  location: location
  kind: 'app'
  properties: {
    serverFarmId: frontendPlan.id
    httpsOnly: true
    siteConfig: {
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      appSettings: [{ name: 'SCM_DO_BUILD_DURING_DEPLOYMENT', value: 'false' }]
    }
  }
}
resource environment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: 'agentdrift-environment'
  location: location
  properties: {}
}
resource api 'Microsoft.App/containerApps@2024-03-01' = if (deployApi) {
  name: 'agentdrift-api'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: { '${identity.id}': {} }
  }
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: { external: true, targetPort: 8000, transport: 'auto', allowInsecure: false }
    }
    template: {
      containers: [{
        name: 'api'
        image: image
        resources: { cpu: json('0.25'), memory: '0.5Gi' }
        env: [
          { name: 'ENVIRONMENT', value: 'production' }
          { name: 'AZURE_CLIENT_ID', value: identity.properties.clientId }
          { name: 'AZURE_TABLE_ENDPOINT', value: storage.properties.primaryEndpoints.table }
          { name: 'CORS_ORIGINS', value: 'https://${frontend.properties.defaultHostName}' }
        ]
        probes: [
          { type: 'Liveness', httpGet: { path: '/health', port: 8000 }, initialDelaySeconds: 20, periodSeconds: 30 }
          { type: 'Readiness', httpGet: { path: '/ready', port: 8000 }, initialDelaySeconds: 15, periodSeconds: 10 }
        ]
      }]
      scale: { minReplicas: 0, maxReplicas: 1, rules: [{ name: 'http', http: { metadata: { concurrentRequests: '10' } } }] }
    }
  }
  dependsOn: [tableRole, table]
}
output frontendHostname string = frontend.properties.defaultHostName
output storageEndpoint string = storage.properties.primaryEndpoints.table
output apiHostname string = deployApi ? api!.properties.configuration.ingress.fqdn : ''

resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: 'agentdrift-monthly-5'
  properties: {
    category: 'Cost'
    amount: 5
    timeGrain: 'Monthly'
    timePeriod: { startDate: '2026-10-01T00:00:00Z', endDate: '2036-10-01T00:00:00Z' }
    notifications: {
      early: { enabled: true, operator: 'GreaterThanOrEqualTo', threshold: 20, contactEmails: [alertEmail], thresholdType: 'Actual' }
      warning: { enabled: true, operator: 'GreaterThanOrEqualTo', threshold: 60, contactEmails: [alertEmail], thresholdType: 'Actual' }
      limit: { enabled: true, operator: 'GreaterThanOrEqualTo', threshold: 100, contactEmails: [alertEmail], thresholdType: 'Actual' }
      forecast: { enabled: true, operator: 'GreaterThanOrEqualTo', threshold: 100, contactEmails: [alertEmail], thresholdType: 'Forecasted' }
    }
  }
}
