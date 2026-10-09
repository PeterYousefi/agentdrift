targetScope = 'subscription'
param alertEmail string = 'peter.yousefi@outlook.com'
resource budget 'Microsoft.Consumption/budgets@2023-11-01' = {
  name: 'agentdrift-subscription-5-alert'
  properties: {
    category: 'Cost'
    amount: 5
    timeGrain: 'Monthly'
    timePeriod: { startDate: '2026-10-01T00:00:00Z', endDate: '2036-10-01T00:00:00Z' }
    notifications: {
      actual: { enabled: true, operator: 'GreaterThanOrEqualTo', threshold: 100, contactEmails: [alertEmail], thresholdType: 'Actual' }
      forecast: { enabled: true, operator: 'GreaterThanOrEqualTo', threshold: 100, contactEmails: [alertEmail], thresholdType: 'Forecasted' }
    }
  }
}
