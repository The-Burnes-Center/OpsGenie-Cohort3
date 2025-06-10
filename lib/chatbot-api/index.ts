import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sns from "aws-cdk-lib/aws-sns";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as iam from "aws-cdk-lib/aws-iam";
import * as cdk from "aws-cdk-lib";
import * as path from "path";
import * as logs from "aws-cdk-lib/aws-logs";

import { AuthorizationStack } from '../authorization'

import { WebsocketBackendAPI } from "./gateway/websocket-api"
import { RestBackendAPI } from "./gateway/rest-api"
import { LambdaFunctionStack } from "./functions/functions"
import { TableStack } from "./tables/tables"
import { BackupStack } from "./backup/backup-stack"
import { CloudWatchAlarmsStack } from "./monitoring/cloudwatch-alarms"
import { KendraIndexStack } from "./kendra/kendra"
import { S3BucketStack } from "./buckets/buckets"

import { WebSocketLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { WebSocketLambdaAuthorizer, HttpUserPoolAuthorizer, HttpJwtAuthorizer  } from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import { aws_apigatewayv2 as apigwv2 } from "aws-cdk-lib";
import { aws_apigateway as apig } from "aws-cdk-lib";
import { Construct } from "constructs";

// import { NagSuppressions } from "cdk-nag";

export interface ChatBotApiProps {
  readonly authentication: AuthorizationStack; 
}

export class ChatBotApi extends Construct {
  public readonly httpAPI: RestBackendAPI;
  public readonly wsAPI: WebsocketBackendAPI;
  // public readonly byUserIdIndex: string;
  // public readonly filesBucket: s3.Bucket;
  // public readonly userFeedbackBucket: s3.Bucket;
  // public readonly wsAPI: apigwv2.WebSocketApi;

  constructor(scope: Construct, id: string, props: ChatBotApiProps) {
    super(scope, id);

    const tables = new TableStack(this, "TableStack");
    const buckets = new S3BucketStack(this, "BucketStack");
    const kendra = new KendraIndexStack(this, "KendraStack", { s3Bucket: buckets.kendraBucket });

    // Create backup stack for FedRAMP compliance
    const backupStack = new BackupStack(this, "BackupStack", {
      tables: [
        tables.historyTable,
        tables.feedbackTable,
        tables.evalResultsTable,
        tables.evalSummaryTable,
        tables.kpiLogsTable,
        tables.dailyLoginTable
      ]
    });

    // Create IAM roles for API Gateway CloudWatch logging
    const logWriteRole = new iam.Role(this, 'ApiGWLogRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      description: 'Role for API Gateway to write logs to CloudWatch',
    });
    
    // Add policy for writing logs
    const logPolicy = new iam.PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:DescribeLogGroups',
        'logs:DescribeLogStreams',
        'logs:PutLogEvents',
        'logs:GetLogEvents',
        'logs:FilterLogEvents'
      ],
      resources: ['*']
    });
    
    logWriteRole.addToPolicy(logPolicy);
    
    // Create role with AWS managed policy for API Gateway account settings
    const cloudWatchWriteRole = new iam.Role(this, 'ApiGWAccountLogRole', {
      assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonAPIGatewayPushToCloudWatchLogs')],
      description: 'Role for API Gateway account settings to push logs to CloudWatch',
    });

    // Configure API Gateway account settings to use CloudWatch logs
    const cloudWatchAccount = new apig.CfnAccount(this, "Account", {
      cloudWatchRoleArn: cloudWatchWriteRole.roleArn,
    });

    // Pass logWriteRole to API implementations
    const restBackend = new RestBackendAPI(this, "RestBackend", { logWriteRole: logWriteRole });
    this.httpAPI = restBackend;
    
    const websocketBackend = new WebsocketBackendAPI(this, "WebsocketBackend", { logWriteRole: logWriteRole });
    this.wsAPI = websocketBackend;

    // Set up dependencies to ensure CloudWatch account is configured before APIs
    restBackend.node.addDependency(cloudWatchAccount);
    websocketBackend.node.addDependency(cloudWatchAccount);

    const lambdaFunctions = new LambdaFunctionStack(this, "LambdaFunctions",
      {
        wsApiEndpoint: websocketBackend.wsAPIStage.url,
        sessionTable: tables.historyTable,
        kendraIndex: kendra.kendraIndex,
        kendraSource: kendra.kendraSource,
        feedbackTable: tables.feedbackTable,
        feedbackBucket: buckets.feedbackBucket,
        knowledgeBucket: buckets.kendraBucket,
        evalSummariesTable : tables.evalSummaryTable,
        evalResutlsTable : tables.evalResultsTable,
        evalTestCasesBucket : buckets.evalTestCasesBucket,
        kpiLogsTable: tables.kpiLogsTable,
        dailyLoginTable: tables.dailyLoginTable,
      })

    const wsAuthorizer = new WebSocketLambdaAuthorizer('WebSocketAuthorizer', props.authentication.lambdaAuthorizer, {identitySource: ['route.request.querystring.Authorization']});

    websocketBackend.wsAPI.addRoute('getChatbotResponse', {
      integration: new WebSocketLambdaIntegration('chatbotResponseIntegration', lambdaFunctions.chatFunction),
      // authorizer: wsAuthorizer
    });
    websocketBackend.wsAPI.addRoute('$connect', {
      integration: new WebSocketLambdaIntegration('chatbotConnectionIntegration', lambdaFunctions.chatFunction),
      authorizer: wsAuthorizer
    });
    websocketBackend.wsAPI.addRoute('$default', {
      integration: new WebSocketLambdaIntegration('chatbotConnectionIntegration', lambdaFunctions.chatFunction),
      // authorizer: wsAuthorizer
    });
    websocketBackend.wsAPI.addRoute('$disconnect', {
      integration: new WebSocketLambdaIntegration('chatbotDisconnectionIntegration', lambdaFunctions.chatFunction),
      // authorizer: wsAuthorizer
    });
    websocketBackend.wsAPI.addRoute('generateEmail', {
      integration: new WebSocketLambdaIntegration('emailIntegration', lambdaFunctions.chatFunction),
      // authorizer: wsAuthorizer
    });

    websocketBackend.wsAPI.grantManageConnections(lambdaFunctions.chatFunction);

    
    const httpAuthorizer = new HttpJwtAuthorizer('HTTPAuthorizer', props.authentication.userPool.userPoolProviderUrl,{
      jwtAudience: [props.authentication.userPoolClient.userPoolClientId],
    })

    const sessionAPIIntegration = new HttpLambdaIntegration('SessionAPIIntegration', lambdaFunctions.sessionFunction);
    restBackend.restAPI.addRoutes({
      path: "/user-session",
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE],
      integration: sessionAPIIntegration,
      authorizer: httpAuthorizer,
    })

    const kpiAPIIntegration = new HttpLambdaIntegration('KPIAPIIntegration', lambdaFunctions.kpiFunction);
    restBackend.restAPI.addRoutes({
      path: "/chatbot-use",
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE],
      integration: kpiAPIIntegration,
      authorizer: httpAuthorizer,
    })

    // Add routes for daily logins
    restBackend.restAPI.addRoutes({
      path: "/daily-logins",
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST],
      integration: kpiAPIIntegration,
      authorizer: httpAuthorizer,
    })

    // SESSION_HANDLER
    // lambdaFunctions.chatFunction.addEnvironment(
    //   "mvp_user_session_handler_api_gateway_endpoint", restBackend.restAPI.apiEndpoint + "/user-session")
    lambdaFunctions.chatFunction.addEnvironment(
      "SESSION_HANDLER", lambdaFunctions.sessionFunction.functionName)
    

    const feedbackAPIIntegration = new HttpLambdaIntegration('FeedbackAPIIntegration', lambdaFunctions.feedbackFunction);
    restBackend.restAPI.addRoutes({
      path: "/user-feedback",
      methods: [apigwv2.HttpMethod.GET, apigwv2.HttpMethod.POST, apigwv2.HttpMethod.DELETE],
      integration: feedbackAPIIntegration,
      authorizer: httpAuthorizer,
    })

    const feedbackAPIDownloadIntegration = new HttpLambdaIntegration('FeedbackDownloadAPIIntegration', lambdaFunctions.feedbackFunction);
    restBackend.restAPI.addRoutes({
      path: "/user-feedback/download-feedback",
      methods: [apigwv2.HttpMethod.POST],
      integration: feedbackAPIDownloadIntegration,
      authorizer: httpAuthorizer,
    })

    const s3GetKnowledgeAPIIntegration = new HttpLambdaIntegration('S3GetKnowledgeAPIIntegration', lambdaFunctions.getS3KnowledgeFunction);
    restBackend.restAPI.addRoutes({
      path: "/s3-knowledge-bucket-data",
      methods: [apigwv2.HttpMethod.POST],
      integration: s3GetKnowledgeAPIIntegration,
      authorizer: httpAuthorizer,
    })

    const s3GetTestCasesAPIIntegration = new HttpLambdaIntegration('S3GetTestCasesAPIIntegration', lambdaFunctions.getS3TestCasesFunction);
    restBackend.restAPI.addRoutes({
      path: "/s3-test-cases-bucket-data",
      methods: [apigwv2.HttpMethod.POST],
      integration: s3GetTestCasesAPIIntegration,
      authorizer: httpAuthorizer,
    })

    const s3DeleteAPIIntegration = new HttpLambdaIntegration('S3DeleteAPIIntegration', lambdaFunctions.deleteS3Function);
    restBackend.restAPI.addRoutes({
      path: "/delete-s3-file",
      methods: [apigwv2.HttpMethod.POST],
      integration: s3DeleteAPIIntegration,
      authorizer: httpAuthorizer,
    })

    const s3UploadKnowledgeAPIIntegration = new HttpLambdaIntegration('S3UploadKnowledgeAPIIntegration', lambdaFunctions.uploadS3KnowledgeFunction);
    restBackend.restAPI.addRoutes({
      path: "/signed-url-knowledge",
      methods: [apigwv2.HttpMethod.POST],
      integration: s3UploadKnowledgeAPIIntegration,
      authorizer: httpAuthorizer,
    })

    const kendraSyncProgressAPIIntegration = new HttpLambdaIntegration('KendraSyncAPIIntegration', lambdaFunctions.syncKendraFunction);
    restBackend.restAPI.addRoutes({
      path: "/kendra-sync/still-syncing",
      methods: [apigwv2.HttpMethod.GET],
      integration: kendraSyncProgressAPIIntegration,
      authorizer: httpAuthorizer,
    })

    const kendraSyncAPIIntegration = new HttpLambdaIntegration('KendraSyncAPIIntegration', lambdaFunctions.syncKendraFunction);
    restBackend.restAPI.addRoutes({
      path: "/kendra-sync/sync-kendra",
      methods: [apigwv2.HttpMethod.GET],
      integration: kendraSyncAPIIntegration,
      authorizer: httpAuthorizer,
    })
    
    const chatInvocationsCounterAPIIntegration = new HttpLambdaIntegration('ChatInvocationsCounterAPIIntegration', lambdaFunctions.chatInvocationsCounterFunction);
    restBackend.restAPI.addRoutes({
      path: "/chat-invocations-count",
      methods: [apigwv2.HttpMethod.GET],
      integration: chatInvocationsCounterAPIIntegration,
      authorizer: httpAuthorizer,
    })


    const comprehendMedicalAPIIntegration = new HttpLambdaIntegration('ComprehendMedicalAPIIntegration', lambdaFunctions.comprehendMedicalFunction);
    restBackend.restAPI.addRoutes({
      path: "/comprehend-medical-redact", 
      methods: [apigwv2.HttpMethod.POST],
      integration: comprehendMedicalAPIIntegration,
      authorizer: httpAuthorizer,
    })

    const evalResultsHandlerIntegration = new HttpLambdaIntegration(
      'EvalResultsHandlerIntegration',
      lambdaFunctions.handleEvalResultsFunction
    );
    restBackend.restAPI.addRoutes({
      path: "/eval-results-handler",
      methods: [apigwv2.HttpMethod.POST],
      integration: evalResultsHandlerIntegration,
      authorizer: httpAuthorizer,
    });

    const evalRunHandlerIntegration = new HttpLambdaIntegration(
      'EvalRunHandlerIntegration',
      lambdaFunctions.stepFunctionsStack.startLlmEvalStateMachineFunction
    );
    restBackend.restAPI.addRoutes({
      path: "/eval-run-handler",
      methods: [apigwv2.HttpMethod.POST],
      integration: evalRunHandlerIntegration,
      authorizer: httpAuthorizer,
    }); 

    const s3UploadTestCasesAPIIntegration = new HttpLambdaIntegration('S3UploadTestCasesAPIIntegration', lambdaFunctions.uploadS3TestCasesFunction);
    restBackend.restAPI.addRoutes({
      path: "/signed-url-test-cases",
      methods: [apigwv2.HttpMethod.POST],
      integration: s3UploadTestCasesAPIIntegration,
      authorizer: httpAuthorizer,
    })

    // Create CloudWatch alarms for FedRAMP compliance
    const monitoringStack = new CloudWatchAlarmsStack(this, "MonitoringStack", {
      lambdaFunctions: [
        lambdaFunctions.chatFunction,
        lambdaFunctions.sessionFunction,
        lambdaFunctions.feedbackFunction,
        lambdaFunctions.deleteS3Function,
        lambdaFunctions.getS3KnowledgeFunction,
        lambdaFunctions.getS3TestCasesFunction,
        lambdaFunctions.uploadS3KnowledgeFunction,
        lambdaFunctions.uploadS3TestCasesFunction,
        lambdaFunctions.syncKendraFunction,
        lambdaFunctions.chatInvocationsCounterFunction,
        lambdaFunctions.comprehendMedicalFunction,
        lambdaFunctions.kpiFunction,
        lambdaFunctions.handleEvalResultsFunction,
        lambdaFunctions.stepFunctionsStack.startLlmEvalStateMachineFunction
      ],
      dynamoTables: [
        tables.historyTable,
        tables.feedbackTable,
        tables.evalResultsTable,
        tables.evalSummaryTable,
        tables.kpiLogsTable,
        tables.dailyLoginTable
      ],
      restApiId: restBackend.restAPI.httpApiId,
      websocketApiId: websocketBackend.wsAPI.apiId,
    });

    // Output API endpoints
    new cdk.CfnOutput(this, "WS-API - apiEndpoint", {
      value: websocketBackend.wsAPI.apiEndpoint || "",
    });
    new cdk.CfnOutput(this, "HTTP-API - apiEndpoint", {
      value: restBackend.restAPI.apiEndpoint || "",
    });
  }
}
