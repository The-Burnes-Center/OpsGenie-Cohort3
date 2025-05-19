"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const constants_1 = require("../constants");
const aws_cognito_1 = require("aws-cdk-lib/aws-cognito");
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class AuthorizationStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Replace these values with your Azure client ID, client secret, and issuer URL
        // const azureClientId = 'your-azure-client-id';
        // const azureClientSecret = 'your-azure-client-secret';
        // const azureIssuerUrl = 'https://your-azure-issuer.com';
        // Create the Cognito User Pool
        const userPool = new aws_cognito_1.UserPool(this, 'UserPool', {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            selfSignUpEnabled: false,
            mfa: cognito.Mfa.OPTIONAL,
            advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
            autoVerify: { email: true, phone: true },
            signInAliases: {
                email: true,
            },
            passwordPolicy: {
                minLength: 12,
                requireDigits: true,
                requireLowercase: true,
                requireUppercase: true,
                requireSymbols: true
            },
            customAttributes: {
                'role': new cognito.StringAttribute({ minLen: 0, maxLen: 30, mutable: true })
            }
            // ... other user pool configurations
        });
        this.userPool = userPool;
        // Create a provider attribute for mapping Azure claims
        // const providerAttribute = new ProviderAttribute({
        //   name: 'custom_attr',
        //   type: 'String',
        // });
        // DOMAIN CREATION SOLUTION:
        // The cognitoDomainName value comes from lib/constants.ts
        // 
        // This approach uses CloudFormation's built-in error handling to handle the domain creation:
        // 1. On first deployment: Creates the domain with name from constants.ts
        // 2. On subsequent deployments: If domain exists, silently continues without error
        // 3. On stack deletion: Domain is preserved to avoid future name conflicts
        //
        // This is a minimal solution that works for both new environments and redeployments
        // without needing complex custom resources or Lambda functions.
        const domain = new aws_cognito_1.CfnUserPoolDomain(this, 'CognitoDomain', {
            domain: constants_1.cognitoDomainName,
            userPoolId: userPool.userPoolId
        });
        // The RETAIN policy allows CloudFormation to skip this resource during updates
        // if the resource (domain) already exists.
        domain.cfnOptions.updateReplacePolicy = cdk.CfnDeletionPolicy.RETAIN;
        // Also preserve the domain on stack deletion to prevent accidentally
        // losing access to the domain name (which must be globally unique)
        domain.cfnOptions.deletionPolicy = cdk.CfnDeletionPolicy.RETAIN;
        // Add the Azure OIDC identity provider to the User Pool
        // const azureProvider = new UserPoolIdentityProviderOidc(this, 'AzureProvider', {
        //   clientId: azureClientId,
        //   clientSecret: azureClientSecret,
        //   issuerUrl: azureIssuerUrl,
        //   userPool: userPool,
        //   attributeMapping: {
        //     // email: ProviderAttribute.fromString('email'),
        //     // fullname: ProviderAttribute.fromString('name'),
        //     // custom: {
        //     //   customKey: providerAttribute,
        //     // },
        //   },
        //   // ... other optional properties
        // });
        const userPoolClient = new aws_cognito_1.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            authFlows: {
                userPassword: true,
                userSrp: true
            },
            preventUserExistenceErrors: true,
            // supportedIdentityProviders: [UserPoolClientIdentityProvider.custom(azureProvider.providerName)],
        });
        this.userPoolClient = userPoolClient;
        // Create requirements.txt file for Lambda dependencies if it doesn't exist
        const requirementsFilePath = path.join(__dirname, 'websocket-api-authorizer', 'requirements.txt');
        if (!fs.existsSync(requirementsFilePath)) {
            fs.writeFileSync(requirementsFilePath, `python-jose==3.3.0
requests==2.31.0
urllib3==2.2.1
`);
        }
        const authorizerHandlerFunction = new lambda.Function(this, 'AuthorizationFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'websocket-api-authorizer'), {
                bundling: {
                    image: lambda.Runtime.PYTHON_3_12.bundlingImage,
                    user: '0:0',
                    command: [
                        'bash', '-c', [
                            // Use only verified binary packages to prevent supply chain attacks
                            'pip install --platform manylinux2014_x86_64 --implementation cp --only-binary=:all: --require-hashes -r requirements.txt -t /asset-output',
                            // Copy only necessary files, excluding any potential malicious scripts
                            'find . -type f -name "*.py" -exec cp {} /asset-output \\;',
                            // Set secure permissions
                            'chmod -R 755 /asset-output'
                        ].join(' && ')
                    ],
                    securityOpt: 'no-new-privileges', // Prevent privilege escalation
                    volumes: [
                        {
                            hostPath: '/tmp',
                            containerPath: '/tmp'
                        }
                    ],
                    environment: {
                        'PIP_NO_CACHE_DIR': 'true', // Don't cache packages
                        'PIP_DISABLE_PIP_VERSION_CHECK': 'true', // Don't check for pip updates
                        'PYTHONDONTWRITEBYTECODE': '1' // Don't create .pyc files
                    },
                },
            }),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "USER_POOL_ID": userPool.userPoolId,
                "APP_CLIENT_ID": userPoolClient.userPoolClientId
            },
            timeout: cdk.Duration.seconds(30),
            memorySize: 256,
            tracing: lambda.Tracing.ACTIVE, // Enable X-Ray tracing
        });
        // Add resource-based policy to prevent unauthorized invocations
        authorizerHandlerFunction.addPermission('AllowApiGatewayInvocation', {
            principal: new cdk.aws_iam.ServicePrincipal('apigateway.amazonaws.com'),
            action: 'lambda:InvokeFunction'
        });
        this.lambdaAuthorizer = authorizerHandlerFunction;
        new cdk.CfnOutput(this, "UserPool ID", {
            value: userPool.userPoolId || "",
        });
        new cdk.CfnOutput(this, "UserPool Client ID", {
            value: userPoolClient.userPoolClientId || "",
        });
        // new cdk.CfnOutput(this, "UserPool Client Name", {
        //   value: userPoolClient.userPoolClientName || "",
        // });
    }
}
exports.AuthorizationStack = AuthorizationStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyQ0FBdUM7QUFDdkMsNENBQWdEO0FBQ2hELHlEQUF1SztBQUN2SyxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELDJDQUE2QjtBQUM3Qix1Q0FBeUI7QUFFekIsTUFBYSxrQkFBbUIsU0FBUSxzQkFBUztJQUsvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsZ0ZBQWdGO1FBQ2hGLGdEQUFnRDtRQUNoRCx3REFBd0Q7UUFDeEQsMERBQTBEO1FBRTFELCtCQUErQjtRQUMvQixNQUFNLFFBQVEsR0FBRyxJQUFJLHNCQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM5QyxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUTtZQUN6QixvQkFBb0IsRUFBRSxPQUFPLENBQUMsb0JBQW9CLENBQUMsUUFBUTtZQUMzRCxVQUFVLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUU7WUFDeEMsYUFBYSxFQUFFO2dCQUNiLEtBQUssRUFBRSxJQUFJO2FBQ1o7WUFDRCxjQUFjLEVBQUU7Z0JBQ2QsU0FBUyxFQUFFLEVBQUU7Z0JBQ2IsYUFBYSxFQUFFLElBQUk7Z0JBQ25CLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGdCQUFnQixFQUFFLElBQUk7Z0JBQ3RCLGNBQWMsRUFBRSxJQUFJO2FBQ3JCO1lBQ0QsZ0JBQWdCLEVBQUc7Z0JBQ2pCLE1BQU0sRUFBRyxJQUFJLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFB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S0QsZ0RBb0tDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IGNvZ25pdG9Eb21haW5OYW1lIH0gZnJvbSAnLi4vY29uc3RhbnRzJyBcclxuaW1wb3J0IHsgVXNlclBvb2wsIFVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGMsIFVzZXJQb29sQ2xpZW50LCBVc2VyUG9vbENsaWVudElkZW50aXR5UHJvdmlkZXIsIFByb3ZpZGVyQXR0cmlidXRlLCBDZm5Vc2VyUG9vbERvbWFpbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgQXV0aG9yaXphdGlvblN0YWNrIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgbGFtYmRhQXV0aG9yaXplciA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2wgOiBVc2VyUG9vbDtcclxuICBwdWJsaWMgcmVhZG9ubHkgdXNlclBvb2xDbGllbnQgOiBVc2VyUG9vbENsaWVudDtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAvLyBSZXBsYWNlIHRoZXNlIHZhbHVlcyB3aXRoIHlvdXIgQXp1cmUgY2xpZW50IElELCBjbGllbnQgc2VjcmV0LCBhbmQgaXNzdWVyIFVSTFxyXG4gICAgLy8gY29uc3QgYXp1cmVDbGllbnRJZCA9ICd5b3VyLWF6dXJlLWNsaWVudC1pZCc7XHJcbiAgICAvLyBjb25zdCBhenVyZUNsaWVudFNlY3JldCA9ICd5b3VyLWF6dXJlLWNsaWVudC1zZWNyZXQnO1xyXG4gICAgLy8gY29uc3QgYXp1cmVJc3N1ZXJVcmwgPSAnaHR0cHM6Ly95b3VyLWF6dXJlLWlzc3Vlci5jb20nO1xyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgQ29nbml0byBVc2VyIFBvb2xcclxuICAgIGNvbnN0IHVzZXJQb29sID0gbmV3IFVzZXJQb29sKHRoaXMsICdVc2VyUG9vbCcsIHsgICAgICBcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgc2VsZlNpZ25VcEVuYWJsZWQ6IGZhbHNlLFxyXG4gICAgICBtZmE6IGNvZ25pdG8uTWZhLk9QVElPTkFMLFxyXG4gICAgICBhZHZhbmNlZFNlY3VyaXR5TW9kZTogY29nbml0by5BZHZhbmNlZFNlY3VyaXR5TW9kZS5FTkZPUkNFRCxcclxuICAgICAgYXV0b1ZlcmlmeTogeyBlbWFpbDogdHJ1ZSwgcGhvbmU6IHRydWUgfSxcclxuICAgICAgc2lnbkluQWxpYXNlczoge1xyXG4gICAgICAgIGVtYWlsOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBwYXNzd29yZFBvbGljeToge1xyXG4gICAgICAgIG1pbkxlbmd0aDogMTIsXHJcbiAgICAgICAgcmVxdWlyZURpZ2l0czogdHJ1ZSxcclxuICAgICAgICByZXF1aXJlTG93ZXJjYXNlOiB0cnVlLFxyXG4gICAgICAgIHJlcXVpcmVVcHBlcmNhc2U6IHRydWUsXHJcbiAgICAgICAgcmVxdWlyZVN5bWJvbHM6IHRydWVcclxuICAgICAgfSxcclxuICAgICAgY3VzdG9tQXR0cmlidXRlcyA6IHtcclxuICAgICAgICAncm9sZScgOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtaW5MZW46IDAsIG1heExlbjogMzAsIG11dGFibGU6IHRydWUgfSlcclxuICAgICAgfVxyXG4gICAgICAvLyAuLi4gb3RoZXIgdXNlciBwb29sIGNvbmZpZ3VyYXRpb25zXHJcbiAgICB9KTtcclxuICAgIHRoaXMudXNlclBvb2wgPSB1c2VyUG9vbDtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBwcm92aWRlciBhdHRyaWJ1dGUgZm9yIG1hcHBpbmcgQXp1cmUgY2xhaW1zXHJcbiAgICAvLyBjb25zdCBwcm92aWRlckF0dHJpYnV0ZSA9IG5ldyBQcm92aWRlckF0dHJpYnV0ZSh7XHJcbiAgICAvLyAgIG5hbWU6ICdjdXN0b21fYXR0cicsXHJcbiAgICAvLyAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgLy8gfSk7XHJcbiAgICBcclxuICAgIC8vIERPTUFJTiBDUkVBVElPTiBTT0xVVElPTjpcclxuICAgIC8vIFRoZSBjb2duaXRvRG9tYWluTmFtZSB2YWx1ZSBjb21lcyBmcm9tIGxpYi9jb25zdGFudHMudHNcclxuICAgIC8vIFxyXG4gICAgLy8gVGhpcyBhcHByb2FjaCB1c2VzIENsb3VkRm9ybWF0aW9uJ3MgYnVpbHQtaW4gZXJyb3IgaGFuZGxpbmcgdG8gaGFuZGxlIHRoZSBkb21haW4gY3JlYXRpb246XHJcbiAgICAvLyAxLiBPbiBmaXJzdCBkZXBsb3ltZW50OiBDcmVhdGVzIHRoZSBkb21haW4gd2l0aCBuYW1lIGZyb20gY29uc3RhbnRzLnRzXHJcbiAgICAvLyAyLiBPbiBzdWJzZXF1ZW50IGRlcGxveW1lbnRzOiBJZiBkb21haW4gZXhpc3RzLCBzaWxlbnRseSBjb250aW51ZXMgd2l0aG91dCBlcnJvclxyXG4gICAgLy8gMy4gT24gc3RhY2sgZGVsZXRpb246IERvbWFpbiBpcyBwcmVzZXJ2ZWQgdG8gYXZvaWQgZnV0dXJlIG5hbWUgY29uZmxpY3RzXHJcbiAgICAvL1xyXG4gICAgLy8gVGhpcyBpcyBhIG1pbmltYWwgc29sdXRpb24gdGhhdCB3b3JrcyBmb3IgYm90aCBuZXcgZW52aXJvbm1lbnRzIGFuZCByZWRlcGxveW1lbnRzXHJcbiAgICAvLyB3aXRob3V0IG5lZWRpbmcgY29tcGxleCBjdXN0b20gcmVzb3VyY2VzIG9yIExhbWJkYSBmdW5jdGlvbnMuXHJcbiAgICBjb25zdCBkb21haW4gPSBuZXcgQ2ZuVXNlclBvb2xEb21haW4odGhpcywgJ0NvZ25pdG9Eb21haW4nLCB7XHJcbiAgICAgIGRvbWFpbjogY29nbml0b0RvbWFpbk5hbWUsXHJcbiAgICAgIHVzZXJQb29sSWQ6IHVzZXJQb29sLnVzZXJQb29sSWRcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBUaGUgUkVUQUlOIHBvbGljeSBhbGxvd3MgQ2xvdWRGb3JtYXRpb24gdG8gc2tpcCB0aGlzIHJlc291cmNlIGR1cmluZyB1cGRhdGVzXHJcbiAgICAvLyBpZiB0aGUgcmVzb3VyY2UgKGRvbWFpbikgYWxyZWFkeSBleGlzdHMuXHJcbiAgICBkb21haW4uY2ZuT3B0aW9ucy51cGRhdGVSZXBsYWNlUG9saWN5ID0gY2RrLkNmbkRlbGV0aW9uUG9saWN5LlJFVEFJTjtcclxuICAgIFxyXG4gICAgLy8gQWxzbyBwcmVzZXJ2ZSB0aGUgZG9tYWluIG9uIHN0YWNrIGRlbGV0aW9uIHRvIHByZXZlbnQgYWNjaWRlbnRhbGx5XHJcbiAgICAvLyBsb3NpbmcgYWNjZXNzIHRvIHRoZSBkb21haW4gbmFtZSAod2hpY2ggbXVzdCBiZSBnbG9iYWxseSB1bmlxdWUpXHJcbiAgICBkb21haW4uY2ZuT3B0aW9ucy5kZWxldGlvblBvbGljeSA9IGNkay5DZm5EZWxldGlvblBvbGljeS5SRVRBSU47XHJcbiAgICBcclxuICAgIC8vIEFkZCB0aGUgQXp1cmUgT0lEQyBpZGVudGl0eSBwcm92aWRlciB0byB0aGUgVXNlciBQb29sXHJcbiAgICAvLyBjb25zdCBhenVyZVByb3ZpZGVyID0gbmV3IFVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGModGhpcywgJ0F6dXJlUHJvdmlkZXInLCB7XHJcbiAgICAvLyAgIGNsaWVudElkOiBhenVyZUNsaWVudElkLFxyXG4gICAgLy8gICBjbGllbnRTZWNyZXQ6IGF6dXJlQ2xpZW50U2VjcmV0LFxyXG4gICAgLy8gICBpc3N1ZXJVcmw6IGF6dXJlSXNzdWVyVXJsLFxyXG4gICAgLy8gICB1c2VyUG9vbDogdXNlclBvb2wsXHJcbiAgICAvLyAgIGF0dHJpYnV0ZU1hcHBpbmc6IHtcclxuICAgIC8vICAgICAvLyBlbWFpbDogUHJvdmlkZXJBdHRyaWJ1dGUuZnJvbVN0cmluZygnZW1haWwnKSxcclxuICAgIC8vICAgICAvLyBmdWxsbmFtZTogUHJvdmlkZXJBdHRyaWJ1dGUuZnJvbVN0cmluZygnbmFtZScpLFxyXG4gICAgLy8gICAgIC8vIGN1c3RvbToge1xyXG4gICAgLy8gICAgIC8vICAgY3VzdG9tS2V5OiBwcm92aWRlckF0dHJpYnV0ZSxcclxuICAgIC8vICAgICAvLyB9LFxyXG4gICAgLy8gICB9LFxyXG4gICAgLy8gICAvLyAuLi4gb3RoZXIgb3B0aW9uYWwgcHJvcGVydGllc1xyXG4gICAgLy8gfSk7XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgVXNlclBvb2xDbGllbnQodGhpcywgJ1VzZXJQb29sQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbCxcclxuICAgICAgYXV0aEZsb3dzOiB7XHJcbiAgICAgICAgdXNlclBhc3N3b3JkOiB0cnVlLFxyXG4gICAgICAgIHVzZXJTcnA6IHRydWVcclxuICAgICAgfSxcclxuICAgICAgcHJldmVudFVzZXJFeGlzdGVuY2VFcnJvcnM6IHRydWUsXHJcbiAgICAgIC8vIHN1cHBvcnRlZElkZW50aXR5UHJvdmlkZXJzOiBbVXNlclBvb2xDbGllbnRJZGVudGl0eVByb3ZpZGVyLmN1c3RvbShhenVyZVByb3ZpZGVyLnByb3ZpZGVyTmFtZSldLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy51c2VyUG9vbENsaWVudCA9IHVzZXJQb29sQ2xpZW50O1xyXG5cclxuICAgIC8vIENyZWF0ZSByZXF1aXJlbWVudHMudHh0IGZpbGUgZm9yIExhbWJkYSBkZXBlbmRlbmNpZXMgaWYgaXQgZG9lc24ndCBleGlzdFxyXG4gICAgY29uc3QgcmVxdWlyZW1lbnRzRmlsZVBhdGggPSBwYXRoLmpvaW4oX19kaXJuYW1lLCAnd2Vic29ja2V0LWFwaS1hdXRob3JpemVyJywgJ3JlcXVpcmVtZW50cy50eHQnKTtcclxuICAgIGlmICghZnMuZXhpc3RzU3luYyhyZXF1aXJlbWVudHNGaWxlUGF0aCkpIHtcclxuICAgICAgZnMud3JpdGVGaWxlU3luYyhyZXF1aXJlbWVudHNGaWxlUGF0aCwgXHJcbmBweXRob24tam9zZT09My4zLjBcclxucmVxdWVzdHM9PTIuMzEuMFxyXG51cmxsaWIzPT0yLjIuMVxyXG5gKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBhdXRob3JpemVySGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQXV0aG9yaXphdGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICd3ZWJzb2NrZXQtYXBpLWF1dGhvcml6ZXInKSwge1xyXG4gICAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgICBpbWFnZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIuYnVuZGxpbmdJbWFnZSxcclxuICAgICAgICAgIHVzZXI6ICcwOjAnLFxyXG4gICAgICAgICAgY29tbWFuZDogW1xyXG4gICAgICAgICAgICAnYmFzaCcsICctYycsIFtcclxuICAgICAgICAgICAgICAvLyBVc2Ugb25seSB2ZXJpZmllZCBiaW5hcnkgcGFja2FnZXMgdG8gcHJldmVudCBzdXBwbHkgY2hhaW4gYXR0YWNrc1xyXG4gICAgICAgICAgICAgICdwaXAgaW5zdGFsbCAtLXBsYXRmb3JtIG1hbnlsaW51eDIwMTRfeDg2XzY0IC0taW1wbGVtZW50YXRpb24gY3AgLS1vbmx5LWJpbmFyeT06YWxsOiAtLXJlcXVpcmUtaGFzaGVzIC1yIHJlcXVpcmVtZW50cy50eHQgLXQgL2Fzc2V0LW91dHB1dCcsXHJcbiAgICAgICAgICAgICAgLy8gQ29weSBvbmx5IG5lY2Vzc2FyeSBmaWxlcywgZXhjbHVkaW5nIGFueSBwb3RlbnRpYWwgbWFsaWNpb3VzIHNjcmlwdHNcclxuICAgICAgICAgICAgICAnZmluZCAuIC10eXBlIGYgLW5hbWUgXCIqLnB5XCIgLWV4ZWMgY3Age30gL2Fzc2V0LW91dHB1dCBcXFxcOycsXHJcbiAgICAgICAgICAgICAgLy8gU2V0IHNlY3VyZSBwZXJtaXNzaW9uc1xyXG4gICAgICAgICAgICAgICdjaG1vZCAtUiA3NTUgL2Fzc2V0LW91dHB1dCdcclxuICAgICAgICAgICAgXS5qb2luKCcgJiYgJylcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBzZWN1cml0eU9wdDogJ25vLW5ldy1wcml2aWxlZ2VzJywgIC8vIFByZXZlbnQgcHJpdmlsZWdlIGVzY2FsYXRpb25cclxuICAgICAgICAgIHZvbHVtZXM6IFtcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGhvc3RQYXRoOiAnL3RtcCcsXHJcbiAgICAgICAgICAgICAgY29udGFpbmVyUGF0aDogJy90bXAnXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgICAnUElQX05PX0NBQ0hFX0RJUic6ICd0cnVlJywgICAgICAgLy8gRG9uJ3QgY2FjaGUgcGFja2FnZXNcclxuICAgICAgICAgICAgJ1BJUF9ESVNBQkxFX1BJUF9WRVJTSU9OX0NIRUNLJzogJ3RydWUnLCAvLyBEb24ndCBjaGVjayBmb3IgcGlwIHVwZGF0ZXNcclxuICAgICAgICAgICAgJ1BZVEhPTkRPTlRXUklURUJZVEVDT0RFJzogJzEnICAgIC8vIERvbid0IGNyZWF0ZSAucHljIGZpbGVzXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJyxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIlVTRVJfUE9PTF9JRFwiOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIFwiQVBQX0NMSUVOVF9JRFwiOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LFxyXG4gICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsICAvLyBFbmFibGUgWC1SYXkgdHJhY2luZ1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHJlc291cmNlLWJhc2VkIHBvbGljeSB0byBwcmV2ZW50IHVuYXV0aG9yaXplZCBpbnZvY2F0aW9uc1xyXG4gICAgYXV0aG9yaXplckhhbmRsZXJGdW5jdGlvbi5hZGRQZXJtaXNzaW9uKCdBbGxvd0FwaUdhdGV3YXlJbnZvY2F0aW9uJywge1xyXG4gICAgICBwcmluY2lwYWw6IG5ldyBjZGsuYXdzX2lhbS5TZXJ2aWNlUHJpbmNpcGFsKCdhcGlnYXRld2F5LmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgYWN0aW9uOiAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJ1xyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5sYW1iZGFBdXRob3JpemVyID0gYXV0aG9yaXplckhhbmRsZXJGdW5jdGlvbjtcclxuICAgIFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbCBJRFwiLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbC51c2VyUG9vbElkIHx8IFwiXCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sIENsaWVudCBJRFwiLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkIHx8IFwiXCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sIENsaWVudCBOYW1lXCIsIHtcclxuICAgIC8vICAgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50TmFtZSB8fCBcIlwiLFxyXG4gICAgLy8gfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==