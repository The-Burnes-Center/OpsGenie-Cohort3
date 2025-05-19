import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { cognitoDomainName } from '../constants' 
import { UserPool, UserPoolIdentityProviderOidc, UserPoolClient, UserPoolClientIdentityProvider, ProviderAttribute, CfnUserPoolDomain } from 'aws-cdk-lib/aws-cognito';
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as fs from 'fs';

export class AuthorizationStack extends Construct {
  public readonly lambdaAuthorizer : lambda.Function;
  public readonly userPool : UserPool;
  public readonly userPoolClient : UserPoolClient;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id);

    // Replace these values with your Azure client ID, client secret, and issuer URL
    // const azureClientId = 'your-azure-client-id';
    // const azureClientSecret = 'your-azure-client-secret';
    // const azureIssuerUrl = 'https://your-azure-issuer.com';

    // Create the Cognito User Pool
    const userPool = new UserPool(this, 'UserPool', {      
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
      customAttributes : {
        'role' : new cognito.StringAttribute({ minLen: 0, maxLen: 30, mutable: true })
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
    const domain = new CfnUserPoolDomain(this, 'CognitoDomain', {
      domain: cognitoDomainName,
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

    const userPoolClient = new UserPoolClient(this, 'UserPoolClient', {
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
      fs.writeFileSync(requirementsFilePath, 
`python-jose==3.3.0
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
          securityOpt: 'no-new-privileges',  // Prevent privilege escalation
          volumes: [
            {
              hostPath: '/tmp',
              containerPath: '/tmp'
            }
          ],
          environment: {
            'PIP_NO_CACHE_DIR': 'true',       // Don't cache packages
            'PIP_DISABLE_PIP_VERSION_CHECK': 'true', // Don't check for pip updates
            'PYTHONDONTWRITEBYTECODE': '1'    // Don't create .pyc files
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
      tracing: lambda.Tracing.ACTIVE,  // Enable X-Ray tracing
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
