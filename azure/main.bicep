@description('Short name prefix used for all Azure resources. Lowercase alphanumerics only.')
param namePrefix string

@description('Azure region for deployment.')
param location string = resourceGroup().location

@description('Container image (including tag) to deploy, e.g. "staffserver:latest". ACR login server is automatically prefixed.')
param containerImage string

@description('Port exposed by the container image.')
param containerPort int = 8080

@description('Database connection string for the application.')
@secure()
param databaseUrl string

@description('JWT secret used for signing access tokens.')
@secure()
param jwtSecret string

@description('Node environment to run the API in.')
param nodeEnv string = 'production'

@description('SKU for the Azure Container Registry.')
@allowed(['Basic', 'Standard', 'Premium'])
param acrSku string = 'Standard'

@description('SKU for the Linux App Service plan hosting the container.')
param appServiceSku string = 'P1v3'

var normalizedPrefix = toLower(namePrefix)
var acrName = '${normalizedPrefix}acr'
var planName = '${normalizedPrefix}-plan'
var webAppName = '${normalizedPrefix}-api'
var identityName = '${normalizedPrefix}-mi'
var appInsightsName = '${normalizedPrefix}-appi'

resource acr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: acrSku
  }
  properties: {
    adminUserEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2018-11-30' = {
  name: identityName
  location: location
}

resource acrPullAssignment 'Microsoft.Authorization/roleAssignments@2020-04-01-preview' = {
  name: guid(acr.id, managedIdentity.id, 'acrpull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4ed3-4680-a7ca-43fe172d538d')
    principalId: managedIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
  }
}

resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: planName
  location: location
  kind: 'linux'
  sku: {
    name: appServiceSku
  }
  properties: {
    reserved: true
  }
}

resource webApp 'Microsoft.Web/sites@2022-09-01' = {
  name: webAppName
  location: location
  kind: 'app,linux,container'
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${managedIdentity.id}': {}
    }
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    clientAffinityEnabled: false
    publicNetworkAccess: 'Enabled'
    ftpsState: 'Disabled'
    siteConfig: {
      linuxFxVersion: 'DOCKER|${acr.properties.loginServer}/${containerImage}'
      appCommandLine: 'node dist/index.js'
      acrUseManagedIdentityCreds: true
      acrUserManagedIdentityID: managedIdentity.id
      healthCheckPath: '/api/_int/live'
      alwaysOn: true
      httpLoggingEnabled: true
      detailedErrorLoggingEnabled: true
      minimumTlsVersion: '1.2'
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: string(containerPort)
        }
        {
          name: 'PORT'
          value: string(containerPort)
        }
        {
          name: 'DATABASE_URL'
          value: databaseUrl
        }
        {
          name: 'JWT_SECRET'
          value: jwtSecret
        }
        {
          name: 'NODE_ENV'
          value: nodeEnv
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: appInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'ASPNETCORE_FORWARDEDHEADERS_ENABLED'
          value: 'true'
        }
      ]
    }
  }
  dependsOn: [
    acrPullAssignment
  ]
}

output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output appServicePlanId string = appServicePlan.id
output acrLoginServer string = acr.properties.loginServer
