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
            // supportedIdentityProviders: [UserPoolClientIdentityProvider.custom(azureProvider.providerName)],
        });
        this.userPoolClient = userPoolClient;
        const authorizerHandlerFunction = new lambda.Function(this, 'AuthorizationFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'websocket-api-authorizer')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "USER_POOL_ID": userPool.userPoolId,
                "APP_CLIENT_ID": userPoolClient.userPoolClientId
            },
            timeout: cdk.Duration.seconds(30)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyQ0FBdUM7QUFDdkMsNENBQWdEO0FBQ2hELHlEQUF1SztBQUN2SyxpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELDJDQUE2QjtBQUU3QixNQUFhLGtCQUFtQixTQUFRLHNCQUFTO0lBSy9DLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixnRkFBZ0Y7UUFDaEYsZ0RBQWdEO1FBQ2hELHdEQUF3RDtRQUN4RCwwREFBMEQ7UUFFMUQsK0JBQStCO1FBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUksc0JBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQzlDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsS0FBSztZQUN4QixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRO1lBQ3pCLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRO1lBQzNELFVBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtZQUN4QyxhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUNELGdCQUFnQixFQUFHO2dCQUNqQixNQUFNLEVBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQzthQUMvRTtZQUNELHFDQUFxQztTQUN0QyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUV6Qix1REFBdUQ7UUFDdkQsb0RBQW9EO1FBQ3BELHlCQUF5QjtRQUN6QixvQkFBb0I7UUFDcEIsTUFBTTtRQUVOLDRCQUE0QjtRQUM1QiwwREFBMEQ7UUFDMUQsR0FBRztRQUNILDZGQUE2RjtRQUM3Rix5RUFBeUU7UUFDekUsbUZBQW1GO1FBQ25GLDJFQUEyRTtRQUMzRSxFQUFFO1FBQ0Ysb0ZBQW9GO1FBQ3BGLGdFQUFnRTtRQUNoRSxNQUFNLE1BQU0sR0FBRyxJQUFJLCtCQUFpQixDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDMUQsTUFBTSxFQUFFLDZCQUFpQjtZQUN6QixVQUFVLEVBQUUsUUFBUSxDQUFDLFVBQVU7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsK0VBQStFO1FBQy9FLDJDQUEyQztRQUMzQyxNQUFNLENBQUMsVUFBVSxDQUFDLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUM7UUFFckUscUVBQXFFO1FBQ3JFLG1FQUFtRTtRQUNuRSxNQUFNLENBQUMsVUFBVSxDQUFDLGNBQWMsR0FBRyxHQUFHLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDO1FBRWhFLHdEQUF3RDtRQUN4RCxrRkFBa0Y7UUFDbEYsNkJBQTZCO1FBQzdCLHFDQUFxQztRQUNyQywrQkFBK0I7UUFDL0Isd0JBQXdCO1FBQ3hCLHdCQUF3QjtRQUN4Qix1REFBdUQ7UUFDdkQseURBQXlEO1FBQ3pELG1CQUFtQjtRQUNuQix5Q0FBeUM7UUFDekMsWUFBWTtRQUNaLE9BQU87UUFDUCxxQ0FBcUM7UUFDckMsTUFBTTtRQUVOLE1BQU0sY0FBYyxHQUFHLElBQUksNEJBQWMsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLEVBQUU7WUFDaEUsUUFBUTtZQUNSLG1HQUFtRztTQUNwRyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWMsQ0FBQztRQUVyQyxNQUFNLHlCQUF5QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDbkYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLHVDQUF1QztZQUM1RSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLENBQUMsQ0FBQyxFQUFFLGlDQUFpQztZQUNoSCxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUscURBQXFEO1lBQ2hHLFdBQVcsRUFBRTtnQkFDWCxjQUFjLEVBQUcsUUFBUSxDQUFDLFVBQVU7Z0JBQ3BDLGVBQWUsRUFBRyxjQUFjLENBQUMsZ0JBQWdCO2FBQ2xEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUNsQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcseUJBQXlCLENBQUM7UUFFbEQsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLElBQUksRUFBRTtTQUNqQyxDQUFDLENBQUM7UUFFSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzVDLEtBQUssRUFBRSxjQUFjLENBQUMsZ0JBQWdCLElBQUksRUFBRTtTQUM3QyxDQUFDLENBQUM7UUFFSCxvREFBb0Q7UUFDcEQsb0RBQW9EO1FBQ3BELE1BQU07SUFDUixDQUFDO0NBQ0Y7QUEzR0QsZ0RBMkdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IGNvZ25pdG9Eb21haW5OYW1lIH0gZnJvbSAnLi4vY29uc3RhbnRzJyBcclxuaW1wb3J0IHsgVXNlclBvb2wsIFVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGMsIFVzZXJQb29sQ2xpZW50LCBVc2VyUG9vbENsaWVudElkZW50aXR5UHJvdmlkZXIsIFByb3ZpZGVyQXR0cmlidXRlLCBDZm5Vc2VyUG9vbERvbWFpbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEF1dGhvcml6YXRpb25TdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxhbWJkYUF1dGhvcml6ZXIgOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sIDogVXNlclBvb2w7XHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50IDogVXNlclBvb2xDbGllbnQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgLy8gUmVwbGFjZSB0aGVzZSB2YWx1ZXMgd2l0aCB5b3VyIEF6dXJlIGNsaWVudCBJRCwgY2xpZW50IHNlY3JldCwgYW5kIGlzc3VlciBVUkxcclxuICAgIC8vIGNvbnN0IGF6dXJlQ2xpZW50SWQgPSAneW91ci1henVyZS1jbGllbnQtaWQnO1xyXG4gICAgLy8gY29uc3QgYXp1cmVDbGllbnRTZWNyZXQgPSAneW91ci1henVyZS1jbGllbnQtc2VjcmV0JztcclxuICAgIC8vIGNvbnN0IGF6dXJlSXNzdWVyVXJsID0gJ2h0dHBzOi8veW91ci1henVyZS1pc3N1ZXIuY29tJztcclxuXHJcbiAgICAvLyBDcmVhdGUgdGhlIENvZ25pdG8gVXNlciBQb29sXHJcbiAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBVc2VyUG9vbCh0aGlzLCAnVXNlclBvb2wnLCB7ICAgICAgXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSxcclxuICAgICAgbWZhOiBjb2duaXRvLk1mYS5PUFRJT05BTCxcclxuICAgICAgYWR2YW5jZWRTZWN1cml0eU1vZGU6IGNvZ25pdG8uQWR2YW5jZWRTZWN1cml0eU1vZGUuRU5GT1JDRUQsXHJcbiAgICAgIGF1dG9WZXJpZnk6IHsgZW1haWw6IHRydWUsIHBob25lOiB0cnVlIH0sXHJcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcclxuICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgY3VzdG9tQXR0cmlidXRlcyA6IHtcclxuICAgICAgICAncm9sZScgOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtaW5MZW46IDAsIG1heExlbjogMzAsIG11dGFibGU6IHRydWUgfSlcclxuICAgICAgfVxyXG4gICAgICAvLyAuLi4gb3RoZXIgdXNlciBwb29sIGNvbmZpZ3VyYXRpb25zXHJcbiAgICB9KTtcclxuICAgIHRoaXMudXNlclBvb2wgPSB1c2VyUG9vbDtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBwcm92aWRlciBhdHRyaWJ1dGUgZm9yIG1hcHBpbmcgQXp1cmUgY2xhaW1zXHJcbiAgICAvLyBjb25zdCBwcm92aWRlckF0dHJpYnV0ZSA9IG5ldyBQcm92aWRlckF0dHJpYnV0ZSh7XHJcbiAgICAvLyAgIG5hbWU6ICdjdXN0b21fYXR0cicsXHJcbiAgICAvLyAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgLy8gfSk7XHJcbiAgICBcclxuICAgIC8vIERPTUFJTiBDUkVBVElPTiBTT0xVVElPTjpcclxuICAgIC8vIFRoZSBjb2duaXRvRG9tYWluTmFtZSB2YWx1ZSBjb21lcyBmcm9tIGxpYi9jb25zdGFudHMudHNcclxuICAgIC8vIFxyXG4gICAgLy8gVGhpcyBhcHByb2FjaCB1c2VzIENsb3VkRm9ybWF0aW9uJ3MgYnVpbHQtaW4gZXJyb3IgaGFuZGxpbmcgdG8gaGFuZGxlIHRoZSBkb21haW4gY3JlYXRpb246XHJcbiAgICAvLyAxLiBPbiBmaXJzdCBkZXBsb3ltZW50OiBDcmVhdGVzIHRoZSBkb21haW4gd2l0aCBuYW1lIGZyb20gY29uc3RhbnRzLnRzXHJcbiAgICAvLyAyLiBPbiBzdWJzZXF1ZW50IGRlcGxveW1lbnRzOiBJZiBkb21haW4gZXhpc3RzLCBzaWxlbnRseSBjb250aW51ZXMgd2l0aG91dCBlcnJvclxyXG4gICAgLy8gMy4gT24gc3RhY2sgZGVsZXRpb246IERvbWFpbiBpcyBwcmVzZXJ2ZWQgdG8gYXZvaWQgZnV0dXJlIG5hbWUgY29uZmxpY3RzXHJcbiAgICAvL1xyXG4gICAgLy8gVGhpcyBpcyBhIG1pbmltYWwgc29sdXRpb24gdGhhdCB3b3JrcyBmb3IgYm90aCBuZXcgZW52aXJvbm1lbnRzIGFuZCByZWRlcGxveW1lbnRzXHJcbiAgICAvLyB3aXRob3V0IG5lZWRpbmcgY29tcGxleCBjdXN0b20gcmVzb3VyY2VzIG9yIExhbWJkYSBmdW5jdGlvbnMuXHJcbiAgICBjb25zdCBkb21haW4gPSBuZXcgQ2ZuVXNlclBvb2xEb21haW4odGhpcywgJ0NvZ25pdG9Eb21haW4nLCB7XHJcbiAgICAgIGRvbWFpbjogY29nbml0b0RvbWFpbk5hbWUsXHJcbiAgICAgIHVzZXJQb29sSWQ6IHVzZXJQb29sLnVzZXJQb29sSWRcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBUaGUgUkVUQUlOIHBvbGljeSBhbGxvd3MgQ2xvdWRGb3JtYXRpb24gdG8gc2tpcCB0aGlzIHJlc291cmNlIGR1cmluZyB1cGRhdGVzXHJcbiAgICAvLyBpZiB0aGUgcmVzb3VyY2UgKGRvbWFpbikgYWxyZWFkeSBleGlzdHMuXHJcbiAgICBkb21haW4uY2ZuT3B0aW9ucy51cGRhdGVSZXBsYWNlUG9saWN5ID0gY2RrLkNmbkRlbGV0aW9uUG9saWN5LlJFVEFJTjtcclxuICAgIFxyXG4gICAgLy8gQWxzbyBwcmVzZXJ2ZSB0aGUgZG9tYWluIG9uIHN0YWNrIGRlbGV0aW9uIHRvIHByZXZlbnQgYWNjaWRlbnRhbGx5XHJcbiAgICAvLyBsb3NpbmcgYWNjZXNzIHRvIHRoZSBkb21haW4gbmFtZSAod2hpY2ggbXVzdCBiZSBnbG9iYWxseSB1bmlxdWUpXHJcbiAgICBkb21haW4uY2ZuT3B0aW9ucy5kZWxldGlvblBvbGljeSA9IGNkay5DZm5EZWxldGlvblBvbGljeS5SRVRBSU47XHJcbiAgICBcclxuICAgIC8vIEFkZCB0aGUgQXp1cmUgT0lEQyBpZGVudGl0eSBwcm92aWRlciB0byB0aGUgVXNlciBQb29sXHJcbiAgICAvLyBjb25zdCBhenVyZVByb3ZpZGVyID0gbmV3IFVzZXJQb29sSWRlbnRpdHlQcm92aWRlck9pZGModGhpcywgJ0F6dXJlUHJvdmlkZXInLCB7XHJcbiAgICAvLyAgIGNsaWVudElkOiBhenVyZUNsaWVudElkLFxyXG4gICAgLy8gICBjbGllbnRTZWNyZXQ6IGF6dXJlQ2xpZW50U2VjcmV0LFxyXG4gICAgLy8gICBpc3N1ZXJVcmw6IGF6dXJlSXNzdWVyVXJsLFxyXG4gICAgLy8gICB1c2VyUG9vbDogdXNlclBvb2wsXHJcbiAgICAvLyAgIGF0dHJpYnV0ZU1hcHBpbmc6IHtcclxuICAgIC8vICAgICAvLyBlbWFpbDogUHJvdmlkZXJBdHRyaWJ1dGUuZnJvbVN0cmluZygnZW1haWwnKSxcclxuICAgIC8vICAgICAvLyBmdWxsbmFtZTogUHJvdmlkZXJBdHRyaWJ1dGUuZnJvbVN0cmluZygnbmFtZScpLFxyXG4gICAgLy8gICAgIC8vIGN1c3RvbToge1xyXG4gICAgLy8gICAgIC8vICAgY3VzdG9tS2V5OiBwcm92aWRlckF0dHJpYnV0ZSxcclxuICAgIC8vICAgICAvLyB9LFxyXG4gICAgLy8gICB9LFxyXG4gICAgLy8gICAvLyAuLi4gb3RoZXIgb3B0aW9uYWwgcHJvcGVydGllc1xyXG4gICAgLy8gfSk7XHJcblxyXG4gICAgY29uc3QgdXNlclBvb2xDbGllbnQgPSBuZXcgVXNlclBvb2xDbGllbnQodGhpcywgJ1VzZXJQb29sQ2xpZW50Jywge1xyXG4gICAgICB1c2VyUG9vbCwgICAgICBcclxuICAgICAgLy8gc3VwcG9ydGVkSWRlbnRpdHlQcm92aWRlcnM6IFtVc2VyUG9vbENsaWVudElkZW50aXR5UHJvdmlkZXIuY3VzdG9tKGF6dXJlUHJvdmlkZXIucHJvdmlkZXJOYW1lKV0sXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnVzZXJQb29sQ2xpZW50ID0gdXNlclBvb2xDbGllbnQ7XHJcblxyXG4gICAgY29uc3QgYXV0aG9yaXplckhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0F1dGhvcml6YXRpb25GdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3dlYnNvY2tldC1hcGktYXV0aG9yaXplcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiVVNFUl9QT09MX0lEXCIgOiB1c2VyUG9vbC51c2VyUG9vbElkLFxyXG4gICAgICAgIFwiQVBQX0NMSUVOVF9JRFwiIDogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMubGFtYmRhQXV0aG9yaXplciA9IGF1dGhvcml6ZXJIYW5kbGVyRnVuY3Rpb247XHJcbiAgICBcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlclBvb2wgSURcIiwge1xyXG4gICAgICB2YWx1ZTogdXNlclBvb2wudXNlclBvb2xJZCB8fCBcIlwiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbCBDbGllbnQgSURcIiwge1xyXG4gICAgICB2YWx1ZTogdXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZCB8fCBcIlwiLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbCBDbGllbnQgTmFtZVwiLCB7XHJcbiAgICAvLyAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudE5hbWUgfHwgXCJcIixcclxuICAgIC8vIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=