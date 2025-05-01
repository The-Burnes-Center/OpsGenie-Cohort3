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
        userPool.addDomain('CognitoDomain', {
            cognitoDomain: {
                domainPrefix: constants_1.cognitoDomainName,
            },
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyQ0FBdUM7QUFDdkMsNENBQWdEO0FBQ2hELHlEQUFtSjtBQUNuSixpRUFBbUQ7QUFDbkQsK0RBQWlEO0FBQ2pELDJDQUE2QjtBQUU3QixNQUFhLGtCQUFtQixTQUFRLHNCQUFTO0lBSy9DLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixnRkFBZ0Y7UUFDaEYsZ0RBQWdEO1FBQ2hELHdEQUF3RDtRQUN4RCwwREFBMEQ7UUFFMUQsK0JBQStCO1FBQy9CLE1BQU0sUUFBUSxHQUFHLElBQUksc0JBQVEsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQzlDLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsS0FBSztZQUN4QixHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRO1lBQ3pCLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRO1lBQzNELFVBQVUsRUFBRSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRTtZQUN4QyxhQUFhLEVBQUU7Z0JBQ2IsS0FBSyxFQUFFLElBQUk7YUFDWjtZQUNELGdCQUFnQixFQUFHO2dCQUNqQixNQUFNLEVBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQzthQUMvRTtZQUNELHFDQUFxQztTQUN0QyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUV6Qix1REFBdUQ7UUFDdkQsb0RBQW9EO1FBQ3BELHlCQUF5QjtRQUN6QixvQkFBb0I7UUFDcEIsTUFBTTtRQUNOLFFBQVEsQ0FBQyxTQUFTLENBQUMsZUFBZSxFQUFFO1lBQ2xDLGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsNkJBQWlCO2FBQ2hDO1NBQ0YsQ0FBQyxDQUFDO1FBR0gsd0RBQXdEO1FBQ3hELGtGQUFrRjtRQUNsRiw2QkFBNkI7UUFDN0IscUNBQXFDO1FBQ3JDLCtCQUErQjtRQUMvQix3QkFBd0I7UUFDeEIsd0JBQXdCO1FBQ3hCLHVEQUF1RDtRQUN2RCx5REFBeUQ7UUFDekQsbUJBQW1CO1FBQ25CLHlDQUF5QztRQUN6QyxZQUFZO1FBQ1osT0FBTztRQUNQLHFDQUFxQztRQUNyQyxNQUFNO1FBRU4sTUFBTSxjQUFjLEdBQUcsSUFBSSw0QkFBYyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUNoRSxRQUFRO1lBQ1IsbUdBQW1HO1NBQ3BHLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDO1FBRXJDLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSx1QkFBdUIsRUFBRTtZQUNuRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsdUNBQXVDO1lBQzVFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDLEVBQUUsaUNBQWlDO1lBQ2hILE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxxREFBcUQ7WUFDaEcsV0FBVyxFQUFFO2dCQUNYLGNBQWMsRUFBRyxRQUFRLENBQUMsVUFBVTtnQkFDcEMsZUFBZSxFQUFHLGNBQWMsQ0FBQyxnQkFBZ0I7YUFDbEQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnQkFBZ0IsR0FBRyx5QkFBeUIsQ0FBQztRQUVsRCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRTtZQUNyQyxLQUFLLEVBQUUsUUFBUSxDQUFDLFVBQVUsSUFBSSxFQUFFO1NBQ2pDLENBQUMsQ0FBQztRQUVILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0JBQW9CLEVBQUU7WUFDNUMsS0FBSyxFQUFFLGNBQWMsQ0FBQyxnQkFBZ0IsSUFBSSxFQUFFO1NBQzdDLENBQUMsQ0FBQztRQUVILG9EQUFvRDtRQUNwRCxvREFBb0Q7UUFDcEQsTUFBTTtJQUlSLENBQUM7Q0FDRjtBQTdGRCxnREE2RkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgY29nbml0b0RvbWFpbk5hbWUgfSBmcm9tICcuLi9jb25zdGFudHMnIFxyXG5pbXBvcnQgeyBVc2VyUG9vbCwgVXNlclBvb2xJZGVudGl0eVByb3ZpZGVyT2lkYyxVc2VyUG9vbENsaWVudCwgVXNlclBvb2xDbGllbnRJZGVudGl0eVByb3ZpZGVyLCBQcm92aWRlckF0dHJpYnV0ZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1jb2duaXRvJztcclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuZXhwb3J0IGNsYXNzIEF1dGhvcml6YXRpb25TdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGxhbWJkYUF1dGhvcml6ZXIgOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sIDogVXNlclBvb2w7XHJcbiAgcHVibGljIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50IDogVXNlclBvb2xDbGllbnQ7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgLy8gUmVwbGFjZSB0aGVzZSB2YWx1ZXMgd2l0aCB5b3VyIEF6dXJlIGNsaWVudCBJRCwgY2xpZW50IHNlY3JldCwgYW5kIGlzc3VlciBVUkxcclxuICAgIC8vIGNvbnN0IGF6dXJlQ2xpZW50SWQgPSAneW91ci1henVyZS1jbGllbnQtaWQnO1xyXG4gICAgLy8gY29uc3QgYXp1cmVDbGllbnRTZWNyZXQgPSAneW91ci1henVyZS1jbGllbnQtc2VjcmV0JztcclxuICAgIC8vIGNvbnN0IGF6dXJlSXNzdWVyVXJsID0gJ2h0dHBzOi8veW91ci1henVyZS1pc3N1ZXIuY29tJztcclxuXHJcbiAgICAvLyBDcmVhdGUgdGhlIENvZ25pdG8gVXNlciBQb29sXHJcbiAgICBjb25zdCB1c2VyUG9vbCA9IG5ldyBVc2VyUG9vbCh0aGlzLCAnVXNlclBvb2wnLCB7ICAgICAgXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIHNlbGZTaWduVXBFbmFibGVkOiBmYWxzZSxcclxuICAgICAgbWZhOiBjb2duaXRvLk1mYS5PUFRJT05BTCxcclxuICAgICAgYWR2YW5jZWRTZWN1cml0eU1vZGU6IGNvZ25pdG8uQWR2YW5jZWRTZWN1cml0eU1vZGUuRU5GT1JDRUQsXHJcbiAgICAgIGF1dG9WZXJpZnk6IHsgZW1haWw6IHRydWUsIHBob25lOiB0cnVlIH0sXHJcbiAgICAgIHNpZ25JbkFsaWFzZXM6IHtcclxuICAgICAgICBlbWFpbDogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgICAgY3VzdG9tQXR0cmlidXRlcyA6IHtcclxuICAgICAgICAncm9sZScgOiBuZXcgY29nbml0by5TdHJpbmdBdHRyaWJ1dGUoeyBtaW5MZW46IDAsIG1heExlbjogMzAsIG11dGFibGU6IHRydWUgfSlcclxuICAgICAgfVxyXG4gICAgICAvLyAuLi4gb3RoZXIgdXNlciBwb29sIGNvbmZpZ3VyYXRpb25zXHJcbiAgICB9KTtcclxuICAgIHRoaXMudXNlclBvb2wgPSB1c2VyUG9vbDtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBwcm92aWRlciBhdHRyaWJ1dGUgZm9yIG1hcHBpbmcgQXp1cmUgY2xhaW1zXHJcbiAgICAvLyBjb25zdCBwcm92aWRlckF0dHJpYnV0ZSA9IG5ldyBQcm92aWRlckF0dHJpYnV0ZSh7XHJcbiAgICAvLyAgIG5hbWU6ICdjdXN0b21fYXR0cicsXHJcbiAgICAvLyAgIHR5cGU6ICdTdHJpbmcnLFxyXG4gICAgLy8gfSk7XHJcbiAgICB1c2VyUG9vbC5hZGREb21haW4oJ0NvZ25pdG9Eb21haW4nLCB7XHJcbiAgICAgIGNvZ25pdG9Eb21haW46IHtcclxuICAgICAgICBkb21haW5QcmVmaXg6IGNvZ25pdG9Eb21haW5OYW1lLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIFxyXG4gICAgLy8gQWRkIHRoZSBBenVyZSBPSURDIGlkZW50aXR5IHByb3ZpZGVyIHRvIHRoZSBVc2VyIFBvb2xcclxuICAgIC8vIGNvbnN0IGF6dXJlUHJvdmlkZXIgPSBuZXcgVXNlclBvb2xJZGVudGl0eVByb3ZpZGVyT2lkYyh0aGlzLCAnQXp1cmVQcm92aWRlcicsIHtcclxuICAgIC8vICAgY2xpZW50SWQ6IGF6dXJlQ2xpZW50SWQsXHJcbiAgICAvLyAgIGNsaWVudFNlY3JldDogYXp1cmVDbGllbnRTZWNyZXQsXHJcbiAgICAvLyAgIGlzc3VlclVybDogYXp1cmVJc3N1ZXJVcmwsXHJcbiAgICAvLyAgIHVzZXJQb29sOiB1c2VyUG9vbCxcclxuICAgIC8vICAgYXR0cmlidXRlTWFwcGluZzoge1xyXG4gICAgLy8gICAgIC8vIGVtYWlsOiBQcm92aWRlckF0dHJpYnV0ZS5mcm9tU3RyaW5nKCdlbWFpbCcpLFxyXG4gICAgLy8gICAgIC8vIGZ1bGxuYW1lOiBQcm92aWRlckF0dHJpYnV0ZS5mcm9tU3RyaW5nKCduYW1lJyksXHJcbiAgICAvLyAgICAgLy8gY3VzdG9tOiB7XHJcbiAgICAvLyAgICAgLy8gICBjdXN0b21LZXk6IHByb3ZpZGVyQXR0cmlidXRlLFxyXG4gICAgLy8gICAgIC8vIH0sXHJcbiAgICAvLyAgIH0sXHJcbiAgICAvLyAgIC8vIC4uLiBvdGhlciBvcHRpb25hbCBwcm9wZXJ0aWVzXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICBjb25zdCB1c2VyUG9vbENsaWVudCA9IG5ldyBVc2VyUG9vbENsaWVudCh0aGlzLCAnVXNlclBvb2xDbGllbnQnLCB7XHJcbiAgICAgIHVzZXJQb29sLCAgICAgIFxyXG4gICAgICAvLyBzdXBwb3J0ZWRJZGVudGl0eVByb3ZpZGVyczogW1VzZXJQb29sQ2xpZW50SWRlbnRpdHlQcm92aWRlci5jdXN0b20oYXp1cmVQcm92aWRlci5wcm92aWRlck5hbWUpXSxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMudXNlclBvb2xDbGllbnQgPSB1c2VyUG9vbENsaWVudDtcclxuXHJcbiAgICBjb25zdCBhdXRob3JpemVySGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQXV0aG9yaXphdGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnd2Vic29ja2V0LWFwaS1hdXRob3JpemVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJVU0VSX1BPT0xfSURcIiA6IHVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgICAgXCJBUFBfQ0xJRU5UX0lEXCIgOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5sYW1iZGFBdXRob3JpemVyID0gYXV0aG9yaXplckhhbmRsZXJGdW5jdGlvbjtcclxuICAgIFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJVc2VyUG9vbCBJRFwiLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbC51c2VyUG9vbElkIHx8IFwiXCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sIENsaWVudCBJRFwiLCB7XHJcbiAgICAgIHZhbHVlOiB1c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkIHx8IFwiXCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIlVzZXJQb29sIENsaWVudCBOYW1lXCIsIHtcclxuICAgIC8vICAgdmFsdWU6IHVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50TmFtZSB8fCBcIlwiLFxyXG4gICAgLy8gfSk7XHJcblxyXG5cclxuICAgIFxyXG4gIH1cclxufVxyXG4iXX0=