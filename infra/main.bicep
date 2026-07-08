// Scorecast infrastructure — everything on free/serverless tiers.
//
//   az group create -n scorecast-rg -l eastus2
//   az deployment group create -g scorecast-rg -f infra/main.bicep
//
// Estimated cost at family-game-night scale: ~$0/month.
//  - Static Web App: Free tier (100 GB bandwidth, custom auth for GitHub/Entra built in)
//  - Cosmos DB serverless: pay-per-request, pennies for thousands of score updates
//  - Web PubSub: Free tier (20 concurrent connections, 20k messages/day)

@description('Base name used for all resources')
param baseName string = 'scorecast'

param location string = resourceGroup().location

@description('Region for the Static Web App (limited region set)')
@allowed(['westus2', 'centralus', 'eastus2', 'westeurope', 'eastasia'])
param swaLocation string = 'eastus2'

var suffix = uniqueString(resourceGroup().id)

resource cosmos 'Microsoft.DocumentDB/databaseAccounts@2024-05-15' = {
  name: '${baseName}-cosmos-${suffix}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    consistencyPolicy: {
      defaultConsistencyLevel: 'Session'
    }
    locations: [
      {
        locationName: location
        failoverPriority: 0
      }
    ]
    capabilities: [
      {
        name: 'EnableServerless'
      }
    ]
  }
}

// The API creates the 'scoreboard' database and 'games' container on first
// use, but declaring them here keeps infra reproducible.
resource database 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-05-15' = {
  parent: cosmos
  name: 'scoreboard'
  properties: {
    resource: {
      id: 'scoreboard'
    }
  }
}

resource container 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-05-15' = {
  parent: database
  name: 'games'
  properties: {
    resource: {
      id: 'games'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
    }
  }
}

resource webPubSub 'Microsoft.SignalRService/webPubSub@2024-03-01' = {
  name: '${baseName}-pubsub-${suffix}'
  location: location
  sku: {
    name: 'Free_F1'
    tier: 'Free'
    capacity: 1
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2024-04-01' = {
  name: '${baseName}-swa-${suffix}'
  location: swaLocation
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    // Deployed from GitHub Actions with the deployment token; no repo link here.
    allowConfigFileUpdates: true
    stagingEnvironmentPolicy: 'Enabled'
  }
}

resource swaSettings 'Microsoft.Web/staticSites/config@2024-04-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    COSMOS_CONNECTION_STRING: cosmos.listConnectionStrings().connectionStrings[0].connectionString
    WEBPUBSUB_CONNECTION_STRING: webPubSub.listKeys().primaryConnectionString
  }
}

output staticWebAppName string = staticWebApp.name
output staticWebAppHostname string = staticWebApp.properties.defaultHostname
