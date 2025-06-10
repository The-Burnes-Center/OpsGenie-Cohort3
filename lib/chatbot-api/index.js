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
exports.ChatBotApi = void 0;
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cdk = __importStar(require("aws-cdk-lib"));
const websocket_api_1 = require("./gateway/websocket-api");
const rest_api_1 = require("./gateway/rest-api");
const functions_1 = require("./functions/functions");
const tables_1 = require("./tables/tables");
const backup_stack_1 = require("./backup/backup-stack");
const cloudwatch_alarms_1 = require("./monitoring/cloudwatch-alarms");
const kendra_1 = require("./kendra/kendra");
const buckets_1 = require("./buckets/buckets");
const aws_apigatewayv2_integrations_1 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_apigatewayv2_integrations_2 = require("aws-cdk-lib/aws-apigatewayv2-integrations");
const aws_apigatewayv2_authorizers_1 = require("aws-cdk-lib/aws-apigatewayv2-authorizers");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_cdk_lib_2 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
class ChatBotApi extends constructs_1.Construct {
    // public readonly byUserIdIndex: string;
    // public readonly filesBucket: s3.Bucket;
    // public readonly userFeedbackBucket: s3.Bucket;
    // public readonly wsAPI: apigwv2.WebSocketApi;
    constructor(scope, id, props) {
        super(scope, id);
        const tables = new tables_1.TableStack(this, "TableStack");
        const buckets = new buckets_1.S3BucketStack(this, "BucketStack");
        const kendra = new kendra_1.KendraIndexStack(this, "KendraStack", { s3Bucket: buckets.kendraBucket });
        // Create backup stack for FedRAMP compliance
        const backupStack = new backup_stack_1.BackupStack(this, "BackupStack", {
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
        const cloudWatchAccount = new aws_cdk_lib_2.aws_apigateway.CfnAccount(this, "Account", {
            cloudWatchRoleArn: cloudWatchWriteRole.roleArn,
        });
        // Pass logWriteRole to API implementations
        const restBackend = new rest_api_1.RestBackendAPI(this, "RestBackend", { logWriteRole: logWriteRole });
        this.httpAPI = restBackend;
        const websocketBackend = new websocket_api_1.WebsocketBackendAPI(this, "WebsocketBackend", { logWriteRole: logWriteRole });
        this.wsAPI = websocketBackend;
        // Set up dependencies to ensure CloudWatch account is configured before APIs
        restBackend.node.addDependency(cloudWatchAccount);
        websocketBackend.node.addDependency(cloudWatchAccount);
        const lambdaFunctions = new functions_1.LambdaFunctionStack(this, "LambdaFunctions", {
            wsApiEndpoint: websocketBackend.wsAPIStage.url,
            sessionTable: tables.historyTable,
            kendraIndex: kendra.kendraIndex,
            kendraSource: kendra.kendraSource,
            feedbackTable: tables.feedbackTable,
            feedbackBucket: buckets.feedbackBucket,
            knowledgeBucket: buckets.kendraBucket,
            evalSummariesTable: tables.evalSummaryTable,
            evalResutlsTable: tables.evalResultsTable,
            evalTestCasesBucket: buckets.evalTestCasesBucket,
            kpiLogsTable: tables.kpiLogsTable,
            dailyLoginTable: tables.dailyLoginTable,
        });
        const wsAuthorizer = new aws_apigatewayv2_authorizers_1.WebSocketLambdaAuthorizer('WebSocketAuthorizer', props.authentication.lambdaAuthorizer, { identitySource: ['route.request.querystring.Authorization'] });
        websocketBackend.wsAPI.addRoute('getChatbotResponse', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotResponseIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$connect', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotConnectionIntegration', lambdaFunctions.chatFunction),
            authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$default', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotConnectionIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('$disconnect', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('chatbotDisconnectionIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.addRoute('generateEmail', {
            integration: new aws_apigatewayv2_integrations_1.WebSocketLambdaIntegration('emailIntegration', lambdaFunctions.chatFunction),
            // authorizer: wsAuthorizer
        });
        websocketBackend.wsAPI.grantManageConnections(lambdaFunctions.chatFunction);
        const httpAuthorizer = new aws_apigatewayv2_authorizers_1.HttpJwtAuthorizer('HTTPAuthorizer', props.authentication.userPool.userPoolProviderUrl, {
            jwtAudience: [props.authentication.userPoolClient.userPoolClientId],
        });
        const sessionAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('SessionAPIIntegration', lambdaFunctions.sessionFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-session",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.DELETE],
            integration: sessionAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kpiAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KPIAPIIntegration', lambdaFunctions.kpiFunction);
        restBackend.restAPI.addRoutes({
            path: "/chatbot-use",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.DELETE],
            integration: kpiAPIIntegration,
            authorizer: httpAuthorizer,
        });
        // Add routes for daily logins
        restBackend.restAPI.addRoutes({
            path: "/daily-logins",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: kpiAPIIntegration,
            authorizer: httpAuthorizer,
        });
        // SESSION_HANDLER
        // lambdaFunctions.chatFunction.addEnvironment(
        //   "mvp_user_session_handler_api_gateway_endpoint", restBackend.restAPI.apiEndpoint + "/user-session")
        lambdaFunctions.chatFunction.addEnvironment("SESSION_HANDLER", lambdaFunctions.sessionFunction.functionName);
        const feedbackAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('FeedbackAPIIntegration', lambdaFunctions.feedbackFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-feedback",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST, aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.DELETE],
            integration: feedbackAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const feedbackAPIDownloadIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('FeedbackDownloadAPIIntegration', lambdaFunctions.feedbackFunction);
        restBackend.restAPI.addRoutes({
            path: "/user-feedback/download-feedback",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: feedbackAPIDownloadIntegration,
            authorizer: httpAuthorizer,
        });
        const s3GetKnowledgeAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3GetKnowledgeAPIIntegration', lambdaFunctions.getS3KnowledgeFunction);
        restBackend.restAPI.addRoutes({
            path: "/s3-knowledge-bucket-data",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3GetKnowledgeAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3GetTestCasesAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3GetTestCasesAPIIntegration', lambdaFunctions.getS3TestCasesFunction);
        restBackend.restAPI.addRoutes({
            path: "/s3-test-cases-bucket-data",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3GetTestCasesAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3DeleteAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3DeleteAPIIntegration', lambdaFunctions.deleteS3Function);
        restBackend.restAPI.addRoutes({
            path: "/delete-s3-file",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3DeleteAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3UploadKnowledgeAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3UploadKnowledgeAPIIntegration', lambdaFunctions.uploadS3KnowledgeFunction);
        restBackend.restAPI.addRoutes({
            path: "/signed-url-knowledge",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3UploadKnowledgeAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kendraSyncProgressAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KendraSyncAPIIntegration', lambdaFunctions.syncKendraFunction);
        restBackend.restAPI.addRoutes({
            path: "/kendra-sync/still-syncing",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: kendraSyncProgressAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const kendraSyncAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('KendraSyncAPIIntegration', lambdaFunctions.syncKendraFunction);
        restBackend.restAPI.addRoutes({
            path: "/kendra-sync/sync-kendra",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: kendraSyncAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const chatInvocationsCounterAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('ChatInvocationsCounterAPIIntegration', lambdaFunctions.chatInvocationsCounterFunction);
        restBackend.restAPI.addRoutes({
            path: "/chat-invocations-count",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.GET],
            integration: chatInvocationsCounterAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const comprehendMedicalAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('ComprehendMedicalAPIIntegration', lambdaFunctions.comprehendMedicalFunction);
        restBackend.restAPI.addRoutes({
            path: "/comprehend-medical-redact",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: comprehendMedicalAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const evalResultsHandlerIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('EvalResultsHandlerIntegration', lambdaFunctions.handleEvalResultsFunction);
        restBackend.restAPI.addRoutes({
            path: "/eval-results-handler",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: evalResultsHandlerIntegration,
            authorizer: httpAuthorizer,
        });
        const evalRunHandlerIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('EvalRunHandlerIntegration', lambdaFunctions.stepFunctionsStack.startLlmEvalStateMachineFunction);
        restBackend.restAPI.addRoutes({
            path: "/eval-run-handler",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: evalRunHandlerIntegration,
            authorizer: httpAuthorizer,
        });
        const s3UploadTestCasesAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3UploadTestCasesAPIIntegration', lambdaFunctions.uploadS3TestCasesFunction);
        restBackend.restAPI.addRoutes({
            path: "/signed-url-test-cases",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3UploadTestCasesAPIIntegration,
            authorizer: httpAuthorizer,
        });
        // Create CloudWatch alarms for FedRAMP compliance
        const monitoringStack = new cloudwatch_alarms_1.CloudWatchAlarmsStack(this, "MonitoringStack", {
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
exports.ChatBotApi = ChatBotApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUtBLHlEQUEyQztBQUMzQyxpREFBbUM7QUFNbkMsMkRBQTZEO0FBQzdELGlEQUFtRDtBQUNuRCxxREFBMkQ7QUFDM0QsNENBQTRDO0FBQzVDLHdEQUFtRDtBQUNuRCxzRUFBc0U7QUFDdEUsNENBQWtEO0FBQ2xELCtDQUFpRDtBQUVqRCw2RkFBdUY7QUFDdkYsNkZBQWtGO0FBQ2xGLDJGQUFpSTtBQUNqSSw2Q0FBMEQ7QUFDMUQsNkNBQXFEO0FBQ3JELDJDQUF1QztBQVF2QyxNQUFhLFVBQVcsU0FBUSxzQkFBUztJQUd2Qyx5Q0FBeUM7SUFDekMsMENBQTBDO0lBQzFDLGlEQUFpRDtJQUNqRCwrQ0FBK0M7SUFFL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sTUFBTSxHQUFHLElBQUksbUJBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEQsTUFBTSxPQUFPLEdBQUcsSUFBSSx1QkFBYSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RCxNQUFNLE1BQU0sR0FBRyxJQUFJLHlCQUFnQixDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFN0YsNkNBQTZDO1FBQzdDLE1BQU0sV0FBVyxHQUFHLElBQUksMEJBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQ3ZELE1BQU0sRUFBRTtnQkFDTixNQUFNLENBQUMsWUFBWTtnQkFDbkIsTUFBTSxDQUFDLGFBQWE7Z0JBQ3BCLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQ3ZCLE1BQU0sQ0FBQyxnQkFBZ0I7Z0JBQ3ZCLE1BQU0s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Y2RrLWxpYi9hd3MtY29nbml0b1wiO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcclxuaW1wb3J0ICogYXMgc25zIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc25zXCI7XHJcbmltcG9ydCAqIGFzIHNzbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNzbVwiO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XHJcblxyXG5pbXBvcnQgeyBBdXRob3JpemF0aW9uU3RhY2sgfSBmcm9tICcuLi9hdXRob3JpemF0aW9uJ1xyXG5cclxuaW1wb3J0IHsgV2Vic29ja2V0QmFja2VuZEFQSSB9IGZyb20gXCIuL2dhdGV3YXkvd2Vic29ja2V0LWFwaVwiXHJcbmltcG9ydCB7IFJlc3RCYWNrZW5kQVBJIH0gZnJvbSBcIi4vZ2F0ZXdheS9yZXN0LWFwaVwiXHJcbmltcG9ydCB7IExhbWJkYUZ1bmN0aW9uU3RhY2sgfSBmcm9tIFwiLi9mdW5jdGlvbnMvZnVuY3Rpb25zXCJcclxuaW1wb3J0IHsgVGFibGVTdGFjayB9IGZyb20gXCIuL3RhYmxlcy90YWJsZXNcIlxyXG5pbXBvcnQgeyBCYWNrdXBTdGFjayB9IGZyb20gXCIuL2JhY2t1cC9iYWNrdXAtc3RhY2tcIlxyXG5pbXBvcnQgeyBDbG91ZFdhdGNoQWxhcm1zU3RhY2sgfSBmcm9tIFwiLi9tb25pdG9yaW5nL2Nsb3Vkd2F0Y2gtYWxhcm1zXCJcclxuaW1wb3J0IHsgS2VuZHJhSW5kZXhTdGFjayB9IGZyb20gXCIuL2tlbmRyYS9rZW5kcmFcIlxyXG5pbXBvcnQgeyBTM0J1Y2tldFN0YWNrIH0gZnJvbSBcIi4vYnVja2V0cy9idWNrZXRzXCJcclxuXHJcbmltcG9ydCB7IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xyXG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCB7IFdlYlNvY2tldExhbWJkYUF1dGhvcml6ZXIsIEh0dHBVc2VyUG9vbEF1dGhvcml6ZXIsIEh0dHBKd3RBdXRob3JpemVyICB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnMnO1xyXG5pbXBvcnQgeyBhd3NfYXBpZ2F0ZXdheXYyIGFzIGFwaWd3djIgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcclxuaW1wb3J0IHsgYXdzX2FwaWdhdGV3YXkgYXMgYXBpZyB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xyXG5cclxuLy8gaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQ2hhdEJvdEFwaVByb3BzIHtcclxuICByZWFkb25seSBhdXRoZW50aWNhdGlvbjogQXV0aG9yaXphdGlvblN0YWNrOyBcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIENoYXRCb3RBcGkgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBodHRwQVBJOiBSZXN0QmFja2VuZEFQSTtcclxuICBwdWJsaWMgcmVhZG9ubHkgd3NBUEk6IFdlYnNvY2tldEJhY2tlbmRBUEk7XHJcbiAgLy8gcHVibGljIHJlYWRvbmx5IGJ5VXNlcklkSW5kZXg6IHN0cmluZztcclxuICAvLyBwdWJsaWMgcmVhZG9ubHkgZmlsZXNCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICAvLyBwdWJsaWMgcmVhZG9ubHkgdXNlckZlZWRiYWNrQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgLy8gcHVibGljIHJlYWRvbmx5IHdzQVBJOiBhcGlnd3YyLldlYlNvY2tldEFwaTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IENoYXRCb3RBcGlQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCB0YWJsZXMgPSBuZXcgVGFibGVTdGFjayh0aGlzLCBcIlRhYmxlU3RhY2tcIik7XHJcbiAgICBjb25zdCBidWNrZXRzID0gbmV3IFMzQnVja2V0U3RhY2sodGhpcywgXCJCdWNrZXRTdGFja1wiKTtcclxuICAgIGNvbnN0IGtlbmRyYSA9IG5ldyBLZW5kcmFJbmRleFN0YWNrKHRoaXMsIFwiS2VuZHJhU3RhY2tcIiwgeyBzM0J1Y2tldDogYnVja2V0cy5rZW5kcmFCdWNrZXQgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGJhY2t1cCBzdGFjayBmb3IgRmVkUkFNUCBjb21wbGlhbmNlXHJcbiAgICBjb25zdCBiYWNrdXBTdGFjayA9IG5ldyBCYWNrdXBTdGFjayh0aGlzLCBcIkJhY2t1cFN0YWNrXCIsIHtcclxuICAgICAgdGFibGVzOiBbXHJcbiAgICAgICAgdGFibGVzLmhpc3RvcnlUYWJsZSxcclxuICAgICAgICB0YWJsZXMuZmVlZGJhY2tUYWJsZSxcclxuICAgICAgICB0YWJsZXMuZXZhbFJlc3VsdHNUYWJsZSxcclxuICAgICAgICB0YWJsZXMuZXZhbFN1bW1hcnlUYWJsZSxcclxuICAgICAgICB0YWJsZXMua3BpTG9nc1RhYmxlLFxyXG4gICAgICAgIHRhYmxlcy5kYWlseUxvZ2luVGFibGVcclxuICAgICAgXVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIElBTSByb2xlcyBmb3IgQVBJIEdhdGV3YXkgQ2xvdWRXYXRjaCBsb2dnaW5nXHJcbiAgICBjb25zdCBsb2dXcml0ZVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FwaUdXTG9nUm9sZScsIHtcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2FwaWdhdGV3YXkuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JvbGUgZm9yIEFQSSBHYXRld2F5IHRvIHdyaXRlIGxvZ3MgdG8gQ2xvdWRXYXRjaCcsXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gQWRkIHBvbGljeSBmb3Igd3JpdGluZyBsb2dzXHJcbiAgICBjb25zdCBsb2dQb2xpY3kgPSBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dHcm91cCcsXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nU3RyZWFtJyxcclxuICAgICAgICAnbG9nczpEZXNjcmliZUxvZ0dyb3VwcycsXHJcbiAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dTdHJlYW1zJyxcclxuICAgICAgICAnbG9nczpQdXRMb2dFdmVudHMnLFxyXG4gICAgICAgICdsb2dzOkdldExvZ0V2ZW50cycsXHJcbiAgICAgICAgJ2xvZ3M6RmlsdGVyTG9nRXZlbnRzJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgbG9nV3JpdGVSb2xlLmFkZFRvUG9saWN5KGxvZ1BvbGljeSk7XHJcbiAgICBcclxuICAgIC8vIENyZWF0ZSByb2xlIHdpdGggQVdTIG1hbmFnZWQgcG9saWN5IGZvciBBUEkgR2F0ZXdheSBhY2NvdW50IHNldHRpbmdzXHJcbiAgICBjb25zdCBjbG91ZFdhdGNoV3JpdGVSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBcGlHV0FjY291bnRMb2dSb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYXBpZ2F0ZXdheS5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIG1hbmFnZWRQb2xpY2llczogW2lhbS5NYW5hZ2VkUG9saWN5LmZyb21Bd3NNYW5hZ2VkUG9saWN5TmFtZSgnc2VydmljZS1yb2xlL0FtYXpvbkFQSUdhdGV3YXlQdXNoVG9DbG91ZFdhdGNoTG9ncycpXSxcclxuICAgICAgZGVzY3JpcHRpb246ICdSb2xlIGZvciBBUEkgR2F0ZXdheSBhY2NvdW50IHNldHRpbmdzIHRvIHB1c2ggbG9ncyB0byBDbG91ZFdhdGNoJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSBBUEkgR2F0ZXdheSBhY2NvdW50IHNldHRpbmdzIHRvIHVzZSBDbG91ZFdhdGNoIGxvZ3NcclxuICAgIGNvbnN0IGNsb3VkV2F0Y2hBY2NvdW50ID0gbmV3IGFwaWcuQ2ZuQWNjb3VudCh0aGlzLCBcIkFjY291bnRcIiwge1xyXG4gICAgICBjbG91ZFdhdGNoUm9sZUFybjogY2xvdWRXYXRjaFdyaXRlUm9sZS5yb2xlQXJuLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gUGFzcyBsb2dXcml0ZVJvbGUgdG8gQVBJIGltcGxlbWVudGF0aW9uc1xyXG4gICAgY29uc3QgcmVzdEJhY2tlbmQgPSBuZXcgUmVzdEJhY2tlbmRBUEkodGhpcywgXCJSZXN0QmFja2VuZFwiLCB7IGxvZ1dyaXRlUm9sZTogbG9nV3JpdGVSb2xlIH0pO1xyXG4gICAgdGhpcy5odHRwQVBJID0gcmVzdEJhY2tlbmQ7XHJcbiAgICBcclxuICAgIGNvbnN0IHdlYnNvY2tldEJhY2tlbmQgPSBuZXcgV2Vic29ja2V0QmFja2VuZEFQSSh0aGlzLCBcIldlYnNvY2tldEJhY2tlbmRcIiwgeyBsb2dXcml0ZVJvbGU6IGxvZ1dyaXRlUm9sZSB9KTtcclxuICAgIHRoaXMud3NBUEkgPSB3ZWJzb2NrZXRCYWNrZW5kO1xyXG5cclxuICAgIC8vIFNldCB1cCBkZXBlbmRlbmNpZXMgdG8gZW5zdXJlIENsb3VkV2F0Y2ggYWNjb3VudCBpcyBjb25maWd1cmVkIGJlZm9yZSBBUElzXHJcbiAgICByZXN0QmFja2VuZC5ub2RlLmFkZERlcGVuZGVuY3koY2xvdWRXYXRjaEFjY291bnQpO1xyXG4gICAgd2Vic29ja2V0QmFja2VuZC5ub2RlLmFkZERlcGVuZGVuY3koY2xvdWRXYXRjaEFjY291bnQpO1xyXG5cclxuICAgIGNvbnN0IGxhbWJkYUZ1bmN0aW9ucyA9IG5ldyBMYW1iZGFGdW5jdGlvblN0YWNrKHRoaXMsIFwiTGFtYmRhRnVuY3Rpb25zXCIsXHJcbiAgICAgIHtcclxuICAgICAgICB3c0FwaUVuZHBvaW50OiB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJU3RhZ2UudXJsLFxyXG4gICAgICAgIHNlc3Npb25UYWJsZTogdGFibGVzLmhpc3RvcnlUYWJsZSxcclxuICAgICAgICBrZW5kcmFJbmRleDoga2VuZHJhLmtlbmRyYUluZGV4LFxyXG4gICAgICAgIGtlbmRyYVNvdXJjZToga2VuZHJhLmtlbmRyYVNvdXJjZSxcclxuICAgICAgICBmZWVkYmFja1RhYmxlOiB0YWJsZXMuZmVlZGJhY2tUYWJsZSxcclxuICAgICAgICBmZWVkYmFja0J1Y2tldDogYnVja2V0cy5mZWVkYmFja0J1Y2tldCxcclxuICAgICAgICBrbm93bGVkZ2VCdWNrZXQ6IGJ1Y2tldHMua2VuZHJhQnVja2V0LFxyXG4gICAgICAgIGV2YWxTdW1tYXJpZXNUYWJsZSA6IHRhYmxlcy5ldmFsU3VtbWFyeVRhYmxlLFxyXG4gICAgICAgIGV2YWxSZXN1dGxzVGFibGUgOiB0YWJsZXMuZXZhbFJlc3VsdHNUYWJsZSxcclxuICAgICAgICBldmFsVGVzdENhc2VzQnVja2V0IDogYnVja2V0cy5ldmFsVGVzdENhc2VzQnVja2V0LFxyXG4gICAgICAgIGtwaUxvZ3NUYWJsZTogdGFibGVzLmtwaUxvZ3NUYWJsZSxcclxuICAgICAgICBkYWlseUxvZ2luVGFibGU6IHRhYmxlcy5kYWlseUxvZ2luVGFibGUsXHJcbiAgICAgIH0pXHJcblxyXG4gICAgY29uc3Qgd3NBdXRob3JpemVyID0gbmV3IFdlYlNvY2tldExhbWJkYUF1dGhvcml6ZXIoJ1dlYlNvY2tldEF1dGhvcml6ZXInLCBwcm9wcy5hdXRoZW50aWNhdGlvbi5sYW1iZGFBdXRob3JpemVyLCB7aWRlbnRpdHlTb3VyY2U6IFsncm91dGUucmVxdWVzdC5xdWVyeXN0cmluZy5BdXRob3JpemF0aW9uJ119KTtcclxuXHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCdnZXRDaGF0Ym90UmVzcG9uc2UnLCB7XHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3RSZXNwb25zZUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXHJcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxyXG4gICAgfSk7XHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCckY29ubmVjdCcsIHtcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdENvbm5lY3Rpb25JbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcclxuICAgIH0pO1xyXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnJGRlZmF1bHQnLCB7XHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3RDb25uZWN0aW9uSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcclxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXHJcbiAgICB9KTtcclxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJyRkaXNjb25uZWN0Jywge1xyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90RGlzY29ubmVjdGlvbkludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXHJcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxyXG4gICAgfSk7XHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCdnZW5lcmF0ZUVtYWlsJywge1xyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdlbWFpbEludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXHJcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxyXG4gICAgfSk7XHJcblxyXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5ncmFudE1hbmFnZUNvbm5lY3Rpb25zKGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pO1xyXG5cclxuICAgIFxyXG4gICAgY29uc3QgaHR0cEF1dGhvcml6ZXIgPSBuZXcgSHR0cEp3dEF1dGhvcml6ZXIoJ0hUVFBBdXRob3JpemVyJywgcHJvcHMuYXV0aGVudGljYXRpb24udXNlclBvb2wudXNlclBvb2xQcm92aWRlclVybCx7XHJcbiAgICAgIGp3dEF1ZGllbmNlOiBbcHJvcHMuYXV0aGVudGljYXRpb24udXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZF0sXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHNlc3Npb25BUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1Nlc3Npb25BUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5zZXNzaW9uRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi91c2VyLXNlc3Npb25cIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSxcclxuICAgICAgaW50ZWdyYXRpb246IHNlc3Npb25BUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IGtwaUFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignS1BJQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMua3BpRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9jaGF0Ym90LXVzZVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjoga3BpQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBBZGQgcm91dGVzIGZvciBkYWlseSBsb2dpbnNcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvZGFpbHktbG9naW5zXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBrcGlBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIFNFU1NJT05fSEFORExFUlxyXG4gICAgLy8gbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbi5hZGRFbnZpcm9ubWVudChcclxuICAgIC8vICAgXCJtdnBfdXNlcl9zZXNzaW9uX2hhbmRsZXJfYXBpX2dhdGV3YXlfZW5kcG9pbnRcIiwgcmVzdEJhY2tlbmQucmVzdEFQSS5hcGlFbmRwb2ludCArIFwiL3VzZXItc2Vzc2lvblwiKVxyXG4gICAgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbi5hZGRFbnZpcm9ubWVudChcclxuICAgICAgXCJTRVNTSU9OX0hBTkRMRVJcIiwgbGFtYmRhRnVuY3Rpb25zLnNlc3Npb25GdW5jdGlvbi5mdW5jdGlvbk5hbWUpXHJcbiAgICBcclxuXHJcbiAgICBjb25zdCBmZWVkYmFja0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmVlZGJhY2tBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5mZWVkYmFja0Z1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvdXNlci1mZWVkYmFja1wiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogZmVlZGJhY2tBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IGZlZWRiYWNrQVBJRG93bmxvYWRJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0ZlZWRiYWNrRG93bmxvYWRBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5mZWVkYmFja0Z1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvdXNlci1mZWVkYmFjay9kb3dubG9hZC1mZWVkYmFja1wiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogZmVlZGJhY2tBUElEb3dubG9hZEludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3QgczNHZXRLbm93bGVkZ2VBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1MzR2V0S25vd2xlZGdlQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZ2V0UzNLbm93bGVkZ2VGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3MzLWtub3dsZWRnZS1idWNrZXQtZGF0YVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNHZXRLbm93bGVkZ2VBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHMzR2V0VGVzdENhc2VzQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0dldFRlc3RDYXNlc0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmdldFMzVGVzdENhc2VzRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9zMy10ZXN0LWNhc2VzLWJ1Y2tldC1kYXRhXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBzM0dldFRlc3RDYXNlc0FQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3QgczNEZWxldGVBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1MzRGVsZXRlQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZGVsZXRlUzNGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2RlbGV0ZS1zMy1maWxlXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBzM0RlbGV0ZUFQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3QgczNVcGxvYWRLbm93bGVkZ2VBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1MzVXBsb2FkS25vd2xlZGdlQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMudXBsb2FkUzNLbm93bGVkZ2VGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3NpZ25lZC11cmwta25vd2xlZGdlXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBzM1VwbG9hZEtub3dsZWRnZUFQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3Qga2VuZHJhU3luY1Byb2dyZXNzQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdLZW5kcmFTeW5jQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuc3luY0tlbmRyYUZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIva2VuZHJhLXN5bmMvc3RpbGwtc3luY2luZ1wiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBrZW5kcmFTeW5jUHJvZ3Jlc3NBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IGtlbmRyYVN5bmNBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0tlbmRyYVN5bmNBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5zeW5jS2VuZHJhRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9rZW5kcmEtc3luYy9zeW5jLWtlbmRyYVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBrZW5kcmFTeW5jQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuICAgIFxyXG4gICAgY29uc3QgY2hhdEludm9jYXRpb25zQ291bnRlckFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ2hhdEludm9jYXRpb25zQ291bnRlckFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2NoYXQtaW52b2NhdGlvbnMtY291bnRcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogY2hhdEludm9jYXRpb25zQ291bnRlckFQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG5cclxuICAgIGNvbnN0IGNvbXByZWhlbmRNZWRpY2FsQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdDb21wcmVoZW5kTWVkaWNhbEFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNvbXByZWhlbmRNZWRpY2FsRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9jb21wcmVoZW5kLW1lZGljYWwtcmVkYWN0XCIsIFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogY29tcHJlaGVuZE1lZGljYWxBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IGV2YWxSZXN1bHRzSGFuZGxlckludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcclxuICAgICAgJ0V2YWxSZXN1bHRzSGFuZGxlckludGVncmF0aW9uJyxcclxuICAgICAgbGFtYmRhRnVuY3Rpb25zLmhhbmRsZUV2YWxSZXN1bHRzRnVuY3Rpb25cclxuICAgICk7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2V2YWwtcmVzdWx0cy1oYW5kbGVyXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBldmFsUmVzdWx0c0hhbmRsZXJJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBldmFsUnVuSGFuZGxlckludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbihcclxuICAgICAgJ0V2YWxSdW5IYW5kbGVySW50ZWdyYXRpb24nLFxyXG4gICAgICBsYW1iZGFGdW5jdGlvbnMuc3RlcEZ1bmN0aW9uc1N0YWNrLnN0YXJ0TGxtRXZhbFN0YXRlTWFjaGluZUZ1bmN0aW9uXHJcbiAgICApO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9ldmFsLXJ1bi1oYW5kbGVyXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBldmFsUnVuSGFuZGxlckludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pOyBcclxuXHJcbiAgICBjb25zdCBzM1VwbG9hZFRlc3RDYXNlc0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNVcGxvYWRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy51cGxvYWRTM1Rlc3RDYXNlc0Z1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvc2lnbmVkLXVybC10ZXN0LWNhc2VzXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBzM1VwbG9hZFRlc3RDYXNlc0FQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQ3JlYXRlIENsb3VkV2F0Y2ggYWxhcm1zIGZvciBGZWRSQU1QIGNvbXBsaWFuY2VcclxuICAgIGNvbnN0IG1vbml0b3JpbmdTdGFjayA9IG5ldyBDbG91ZFdhdGNoQWxhcm1zU3RhY2sodGhpcywgXCJNb25pdG9yaW5nU3RhY2tcIiwge1xyXG4gICAgICBsYW1iZGFGdW5jdGlvbnM6IFtcclxuICAgICAgICBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uLFxyXG4gICAgICAgIGxhbWJkYUZ1bmN0aW9ucy5zZXNzaW9uRnVuY3Rpb24sXHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb25zLmZlZWRiYWNrRnVuY3Rpb24sXHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb25zLmRlbGV0ZVMzRnVuY3Rpb24sXHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb25zLmdldFMzS25vd2xlZGdlRnVuY3Rpb24sXHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb25zLmdldFMzVGVzdENhc2VzRnVuY3Rpb24sXHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb25zLnVwbG9hZFMzS25vd2xlZGdlRnVuY3Rpb24sXHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb25zLnVwbG9hZFMzVGVzdENhc2VzRnVuY3Rpb24sXHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb25zLnN5bmNLZW5kcmFGdW5jdGlvbixcclxuICAgICAgICBsYW1iZGFGdW5jdGlvbnMuY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uLFxyXG4gICAgICAgIGxhbWJkYUZ1bmN0aW9ucy5jb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uLFxyXG4gICAgICAgIGxhbWJkYUZ1bmN0aW9ucy5rcGlGdW5jdGlvbixcclxuICAgICAgICBsYW1iZGFGdW5jdGlvbnMuaGFuZGxlRXZhbFJlc3VsdHNGdW5jdGlvbixcclxuICAgICAgICBsYW1iZGFGdW5jdGlvbnMuc3RlcEZ1bmN0aW9uc1N0YWNrLnN0YXJ0TGxtRXZhbFN0YXRlTWFjaGluZUZ1bmN0aW9uXHJcbiAgICAgIF0sXHJcbiAgICAgIGR5bmFtb1RhYmxlczogW1xyXG4gICAgICAgIHRhYmxlcy5oaXN0b3J5VGFibGUsXHJcbiAgICAgICAgdGFibGVzLmZlZWRiYWNrVGFibGUsXHJcbiAgICAgICAgdGFibGVzLmV2YWxSZXN1bHRzVGFibGUsXHJcbiAgICAgICAgdGFibGVzLmV2YWxTdW1tYXJ5VGFibGUsXHJcbiAgICAgICAgdGFibGVzLmtwaUxvZ3NUYWJsZSxcclxuICAgICAgICB0YWJsZXMuZGFpbHlMb2dpblRhYmxlXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc3RBcGlJZDogcmVzdEJhY2tlbmQucmVzdEFQSS5odHRwQXBpSWQsXHJcbiAgICAgIHdlYnNvY2tldEFwaUlkOiB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFwaUlkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gT3V0cHV0IEFQSSBlbmRwb2ludHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiV1MtQVBJIC0gYXBpRW5kcG9pbnRcIiwge1xyXG4gICAgICB2YWx1ZTogd2Vic29ja2V0QmFja2VuZC53c0FQSS5hcGlFbmRwb2ludCB8fCBcIlwiLFxyXG4gICAgfSk7XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIkhUVFAtQVBJIC0gYXBpRW5kcG9pbnRcIiwge1xyXG4gICAgICB2YWx1ZTogcmVzdEJhY2tlbmQucmVzdEFQSS5hcGlFbmRwb2ludCB8fCBcIlwiLFxyXG4gICAgfSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==