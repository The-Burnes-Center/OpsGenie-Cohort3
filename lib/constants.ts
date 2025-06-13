export const AUTHENTICATION = true;

// change these as needed
// kendraIndexName - must be unique to your account
export const kendraIndexName = 'itops-kendra-index'
// must be unique globally or the deployment will fail
export const cognitoDomainName = "itops-hhs-chatbot"
// this can be anything that would be understood easily, but you must use the same name
// when setting up a sign-in provider in Cognito
export const OIDCIntegrationName = "OpsGenie"
// this MUST be unique to your account
export const stackName = "ITOPSRAGStack"
