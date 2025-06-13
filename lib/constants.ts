export const AUTHENTICATION = true;

// change these as needed
// kendraIndexName - must be unique to your account
export const kendraIndexName = 'opsgenie-kendra-index'
// must be unique globally or the deployment will fail
export const cognitoDomainName = "opsgenie-hhs-chatbot"
// this can be anything that would be understood easily, but you must use the same name
// when setting up a sign-in provider in Cognito
export const OIDCIntegrationName = ""
// this MUST be unique to your account
export const stackName = "TestOpsGenieStack"
