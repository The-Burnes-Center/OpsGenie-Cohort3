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

// Azure OIDC Configuration (uncomment and configure when ready to use Azure AD)
// export const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || 'your-azure-client-id';
// export const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || 'your-azure-client-secret';
// export const AZURE_ISSUER_URL = process.env.AZURE_ISSUER_URL || 'https://login.microsoftonline.com/your-tenant-id/v2.0';
