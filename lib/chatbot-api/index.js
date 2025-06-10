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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUtBLHlEQUEyQztBQUMzQyxpREFBbUM7QUFNbkMsMkRBQTZEO0FBQzdELGlEQUFtRDtBQUNuRCxxREFBMkQ7QUFDM0QsNENBQTRDO0FBQzVDLHdEQUFtRDtBQUNuRCw0Q0FBa0Q7QUFDbEQsK0NBQWlEO0FBRWpELDZGQUF1RjtBQUN2Riw2RkFBa0Y7QUFDbEYsMkZBQWlJO0FBQ2pJLDZDQUEwRDtBQUMxRCw2Q0FBcUQ7QUFDckQsMkNBQXVDO0FBUXZDLE1BQWEsVUFBVyxTQUFRLHNCQUFTO0lBR3ZDLHlDQUF5QztJQUN6QywwQ0FBMEM7SUFDMUMsaURBQWlEO0lBQ2pELCtDQUErQztJQUUvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxNQUFNLEdBQUcsSUFBSSxtQkFBVSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNsRCxNQUFNLE9BQU8sR0FBRyxJQUFJLHVCQUFhLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUkseUJBQWdCLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUU3Riw2Q0FBNkM7UUFDN0MsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDdkQsTUFBTSxFQUFFO2dCQUNOLE1BQU0sQ0FBQyxZQUFZO2dCQUNuQixNQUFNLENBQUMsYUFBYTtnQkFDcEIsTUFBTSxDQUFDLGdCQUFnQjtnQkFDdkIsTUFBTSxDQUFDLGdCQUFnQjtnQkFDdkIsTUFBTSxDQUFDLFlBQVk7Z0JB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QUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLEVBQUU7U0FDN0MsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBNVFELGdDQTRRQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2duaXRvXCI7XHJcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGJcIjtcclxuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xyXG5pbXBvcnQgKiBhcyBzbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zbnNcIjtcclxuaW1wb3J0ICogYXMgc3NtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc3NtXCI7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWlhbVwiO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxvZ3NcIjtcclxuXHJcbmltcG9ydCB7IEF1dGhvcml6YXRpb25TdGFjayB9IGZyb20gJy4uL2F1dGhvcml6YXRpb24nXHJcblxyXG5pbXBvcnQgeyBXZWJzb2NrZXRCYWNrZW5kQVBJIH0gZnJvbSBcIi4vZ2F0ZXdheS93ZWJzb2NrZXQtYXBpXCJcclxuaW1wb3J0IHsgUmVzdEJhY2tlbmRBUEkgfSBmcm9tIFwiLi9nYXRld2F5L3Jlc3QtYXBpXCJcclxuaW1wb3J0IHsgTGFtYmRhRnVuY3Rpb25TdGFjayB9IGZyb20gXCIuL2Z1bmN0aW9ucy9mdW5jdGlvbnNcIlxyXG5pbXBvcnQgeyBUYWJsZVN0YWNrIH0gZnJvbSBcIi4vdGFibGVzL3RhYmxlc1wiXHJcbmltcG9ydCB7IEJhY2t1cFN0YWNrIH0gZnJvbSBcIi4vYmFja3VwL2JhY2t1cC1zdGFja1wiXHJcbmltcG9ydCB7IEtlbmRyYUluZGV4U3RhY2sgfSBmcm9tIFwiLi9rZW5kcmEva2VuZHJhXCJcclxuaW1wb3J0IHsgUzNCdWNrZXRTdGFjayB9IGZyb20gXCIuL2J1Y2tldHMvYnVja2V0c1wiXHJcblxyXG5pbXBvcnQgeyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcclxuaW1wb3J0IHsgSHR0cExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xyXG5pbXBvcnQgeyBXZWJTb2NrZXRMYW1iZGFBdXRob3JpemVyLCBIdHRwVXNlclBvb2xBdXRob3JpemVyLCBIdHRwSnd0QXV0aG9yaXplciAgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWF1dGhvcml6ZXJzJztcclxuaW1wb3J0IHsgYXdzX2FwaWdhdGV3YXl2MiBhcyBhcGlnd3YyIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XHJcbmltcG9ydCB7IGF3c19hcGlnYXRld2F5IGFzIGFwaWcgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcclxuXHJcbi8vIGltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENoYXRCb3RBcGlQcm9wcyB7XHJcbiAgcmVhZG9ubHkgYXV0aGVudGljYXRpb246IEF1dGhvcml6YXRpb25TdGFjazsgXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDaGF0Qm90QXBpIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgaHR0cEFQSTogUmVzdEJhY2tlbmRBUEk7XHJcbiAgcHVibGljIHJlYWRvbmx5IHdzQVBJOiBXZWJzb2NrZXRCYWNrZW5kQVBJO1xyXG4gIC8vIHB1YmxpYyByZWFkb25seSBieVVzZXJJZEluZGV4OiBzdHJpbmc7XHJcbiAgLy8gcHVibGljIHJlYWRvbmx5IGZpbGVzQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgLy8gcHVibGljIHJlYWRvbmx5IHVzZXJGZWVkYmFja0J1Y2tldDogczMuQnVja2V0O1xyXG4gIC8vIHB1YmxpYyByZWFkb25seSB3c0FQSTogYXBpZ3d2Mi5XZWJTb2NrZXRBcGk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDaGF0Qm90QXBpUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgdGFibGVzID0gbmV3IFRhYmxlU3RhY2sodGhpcywgXCJUYWJsZVN0YWNrXCIpO1xyXG4gICAgY29uc3QgYnVja2V0cyA9IG5ldyBTM0J1Y2tldFN0YWNrKHRoaXMsIFwiQnVja2V0U3RhY2tcIik7XHJcbiAgICBjb25zdCBrZW5kcmEgPSBuZXcgS2VuZHJhSW5kZXhTdGFjayh0aGlzLCBcIktlbmRyYVN0YWNrXCIsIHsgczNCdWNrZXQ6IGJ1Y2tldHMua2VuZHJhQnVja2V0IH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBiYWNrdXAgc3RhY2sgZm9yIEZlZFJBTVAgY29tcGxpYW5jZVxyXG4gICAgY29uc3QgYmFja3VwU3RhY2sgPSBuZXcgQmFja3VwU3RhY2sodGhpcywgXCJCYWNrdXBTdGFja1wiLCB7XHJcbiAgICAgIHRhYmxlczogW1xyXG4gICAgICAgIHRhYmxlcy5oaXN0b3J5VGFibGUsXHJcbiAgICAgICAgdGFibGVzLmZlZWRiYWNrVGFibGUsXHJcbiAgICAgICAgdGFibGVzLmV2YWxSZXN1bHRzVGFibGUsXHJcbiAgICAgICAgdGFibGVzLmV2YWxTdW1tYXJ5VGFibGUsXHJcbiAgICAgICAgdGFibGVzLmtwaUxvZ3NUYWJsZSxcclxuICAgICAgICB0YWJsZXMuZGFpbHlMb2dpblRhYmxlXHJcbiAgICAgIF1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENyZWF0ZSBJQU0gcm9sZXMgZm9yIEFQSSBHYXRld2F5IENsb3VkV2F0Y2ggbG9nZ2luZ1xyXG4gICAgY29uc3QgbG9nV3JpdGVSb2xlID0gbmV3IGlhbS5Sb2xlKHRoaXMsICdBcGlHV0xvZ1JvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdhcGlnYXRld2F5LmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgZGVzY3JpcHRpb246ICdSb2xlIGZvciBBUEkgR2F0ZXdheSB0byB3cml0ZSBsb2dzIHRvIENsb3VkV2F0Y2gnLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIEFkZCBwb2xpY3kgZm9yIHdyaXRpbmcgbG9nc1xyXG4gICAgY29uc3QgbG9nUG9saWN5ID0gbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2xvZ3M6Q3JlYXRlTG9nR3JvdXAnLFxyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ1N0cmVhbScsXHJcbiAgICAgICAgJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnLFxyXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nU3RyZWFtcycsXHJcbiAgICAgICAgJ2xvZ3M6UHV0TG9nRXZlbnRzJyxcclxuICAgICAgICAnbG9nczpHZXRMb2dFdmVudHMnLFxyXG4gICAgICAgICdsb2dzOkZpbHRlckxvZ0V2ZW50cydcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGxvZ1dyaXRlUm9sZS5hZGRUb1BvbGljeShsb2dQb2xpY3kpO1xyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgcm9sZSB3aXRoIEFXUyBtYW5hZ2VkIHBvbGljeSBmb3IgQVBJIEdhdGV3YXkgYWNjb3VudCBzZXR0aW5nc1xyXG4gICAgY29uc3QgY2xvdWRXYXRjaFdyaXRlUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQXBpR1dBY2NvdW50TG9nUm9sZScsIHtcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2FwaWdhdGV3YXkuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBtYW5hZ2VkUG9saWNpZXM6IFtpYW0uTWFuYWdlZFBvbGljeS5mcm9tQXdzTWFuYWdlZFBvbGljeU5hbWUoJ3NlcnZpY2Utcm9sZS9BbWF6b25BUElHYXRld2F5UHVzaFRvQ2xvdWRXYXRjaExvZ3MnKV0sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUm9sZSBmb3IgQVBJIEdhdGV3YXkgYWNjb3VudCBzZXR0aW5ncyB0byBwdXNoIGxvZ3MgdG8gQ2xvdWRXYXRjaCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBDb25maWd1cmUgQVBJIEdhdGV3YXkgYWNjb3VudCBzZXR0aW5ncyB0byB1c2UgQ2xvdWRXYXRjaCBsb2dzXHJcbiAgICBjb25zdCBjbG91ZFdhdGNoQWNjb3VudCA9IG5ldyBhcGlnLkNmbkFjY291bnQodGhpcywgXCJBY2NvdW50XCIsIHtcclxuICAgICAgY2xvdWRXYXRjaFJvbGVBcm46IGNsb3VkV2F0Y2hXcml0ZVJvbGUucm9sZUFybixcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFBhc3MgbG9nV3JpdGVSb2xlIHRvIEFQSSBpbXBsZW1lbnRhdGlvbnNcclxuICAgIGNvbnN0IHJlc3RCYWNrZW5kID0gbmV3IFJlc3RCYWNrZW5kQVBJKHRoaXMsIFwiUmVzdEJhY2tlbmRcIiwgeyBsb2dXcml0ZVJvbGU6IGxvZ1dyaXRlUm9sZSB9KTtcclxuICAgIHRoaXMuaHR0cEFQSSA9IHJlc3RCYWNrZW5kO1xyXG4gICAgXHJcbiAgICBjb25zdCB3ZWJzb2NrZXRCYWNrZW5kID0gbmV3IFdlYnNvY2tldEJhY2tlbmRBUEkodGhpcywgXCJXZWJzb2NrZXRCYWNrZW5kXCIsIHsgbG9nV3JpdGVSb2xlOiBsb2dXcml0ZVJvbGUgfSk7XHJcbiAgICB0aGlzLndzQVBJID0gd2Vic29ja2V0QmFja2VuZDtcclxuXHJcbiAgICAvLyBTZXQgdXAgZGVwZW5kZW5jaWVzIHRvIGVuc3VyZSBDbG91ZFdhdGNoIGFjY291bnQgaXMgY29uZmlndXJlZCBiZWZvcmUgQVBJc1xyXG4gICAgcmVzdEJhY2tlbmQubm9kZS5hZGREZXBlbmRlbmN5KGNsb3VkV2F0Y2hBY2NvdW50KTtcclxuICAgIHdlYnNvY2tldEJhY2tlbmQubm9kZS5hZGREZXBlbmRlbmN5KGNsb3VkV2F0Y2hBY2NvdW50KTtcclxuXHJcbiAgICBjb25zdCBsYW1iZGFGdW5jdGlvbnMgPSBuZXcgTGFtYmRhRnVuY3Rpb25TdGFjayh0aGlzLCBcIkxhbWJkYUZ1bmN0aW9uc1wiLFxyXG4gICAgICB7XHJcbiAgICAgICAgd3NBcGlFbmRwb2ludDogd2Vic29ja2V0QmFja2VuZC53c0FQSVN0YWdlLnVybCxcclxuICAgICAgICBzZXNzaW9uVGFibGU6IHRhYmxlcy5oaXN0b3J5VGFibGUsXHJcbiAgICAgICAga2VuZHJhSW5kZXg6IGtlbmRyYS5rZW5kcmFJbmRleCxcclxuICAgICAgICBrZW5kcmFTb3VyY2U6IGtlbmRyYS5rZW5kcmFTb3VyY2UsXHJcbiAgICAgICAgZmVlZGJhY2tUYWJsZTogdGFibGVzLmZlZWRiYWNrVGFibGUsXHJcbiAgICAgICAgZmVlZGJhY2tCdWNrZXQ6IGJ1Y2tldHMuZmVlZGJhY2tCdWNrZXQsXHJcbiAgICAgICAga25vd2xlZGdlQnVja2V0OiBidWNrZXRzLmtlbmRyYUJ1Y2tldCxcclxuICAgICAgICBldmFsU3VtbWFyaWVzVGFibGUgOiB0YWJsZXMuZXZhbFN1bW1hcnlUYWJsZSxcclxuICAgICAgICBldmFsUmVzdXRsc1RhYmxlIDogdGFibGVzLmV2YWxSZXN1bHRzVGFibGUsXHJcbiAgICAgICAgZXZhbFRlc3RDYXNlc0J1Y2tldCA6IGJ1Y2tldHMuZXZhbFRlc3RDYXNlc0J1Y2tldCxcclxuICAgICAgICBrcGlMb2dzVGFibGU6IHRhYmxlcy5rcGlMb2dzVGFibGUsXHJcbiAgICAgICAgZGFpbHlMb2dpblRhYmxlOiB0YWJsZXMuZGFpbHlMb2dpblRhYmxlLFxyXG4gICAgICB9KVxyXG5cclxuICAgIGNvbnN0IHdzQXV0aG9yaXplciA9IG5ldyBXZWJTb2NrZXRMYW1iZGFBdXRob3JpemVyKCdXZWJTb2NrZXRBdXRob3JpemVyJywgcHJvcHMuYXV0aGVudGljYXRpb24ubGFtYmRhQXV0aG9yaXplciwge2lkZW50aXR5U291cmNlOiBbJ3JvdXRlLnJlcXVlc3QucXVlcnlzdHJpbmcuQXV0aG9yaXphdGlvbiddfSk7XHJcblxyXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnZ2V0Q2hhdGJvdFJlc3BvbnNlJywge1xyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90UmVzcG9uc2VJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxyXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcclxuICAgIH0pO1xyXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnJGNvbm5lY3QnLCB7XHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3RDb25uZWN0aW9uSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcclxuICAgICAgYXV0aG9yaXplcjogd3NBdXRob3JpemVyXHJcbiAgICB9KTtcclxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJyRkZWZhdWx0Jywge1xyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90Q29ubmVjdGlvbkludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXHJcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxyXG4gICAgfSk7XHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCckZGlzY29ubmVjdCcsIHtcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdERpc2Nvbm5lY3Rpb25JbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxyXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcclxuICAgIH0pO1xyXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnZ2VuZXJhdGVFbWFpbCcsIHtcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignZW1haWxJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxyXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcclxuICAgIH0pO1xyXG5cclxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuZ3JhbnRNYW5hZ2VDb25uZWN0aW9ucyhsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKTtcclxuXHJcbiAgICBcclxuICAgIGNvbnN0IGh0dHBBdXRob3JpemVyID0gbmV3IEh0dHBKd3RBdXRob3JpemVyKCdIVFRQQXV0aG9yaXplcicsIHByb3BzLmF1dGhlbnRpY2F0aW9uLnVzZXJQb29sLnVzZXJQb29sUHJvdmlkZXJVcmwse1xyXG4gICAgICBqd3RBdWRpZW5jZTogW3Byb3BzLmF1dGhlbnRpY2F0aW9uLnVzZXJQb29sQ2xpZW50LnVzZXJQb29sQ2xpZW50SWRdLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBzZXNzaW9uQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTZXNzaW9uQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuc2Vzc2lvbkZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvdXNlci1zZXNzaW9uXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sXHJcbiAgICAgIGludGVncmF0aW9uOiBzZXNzaW9uQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBrcGlBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0tQSUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmtwaUZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvY2hhdGJvdC11c2VcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSxcclxuICAgICAgaW50ZWdyYXRpb246IGtwaUFQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQWRkIHJvdXRlcyBmb3IgZGFpbHkgbG9naW5zXHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2RhaWx5LWxvZ2luc1wiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjoga3BpQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBTRVNTSU9OX0hBTkRMRVJcclxuICAgIC8vIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoXHJcbiAgICAvLyAgIFwibXZwX3VzZXJfc2Vzc2lvbl9oYW5kbGVyX2FwaV9nYXRld2F5X2VuZHBvaW50XCIsIHJlc3RCYWNrZW5kLnJlc3RBUEkuYXBpRW5kcG9pbnQgKyBcIi91c2VyLXNlc3Npb25cIilcclxuICAgIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoXHJcbiAgICAgIFwiU0VTU0lPTl9IQU5ETEVSXCIsIGxhbWJkYUZ1bmN0aW9ucy5zZXNzaW9uRnVuY3Rpb24uZnVuY3Rpb25OYW1lKVxyXG4gICAgXHJcblxyXG4gICAgY29uc3QgZmVlZGJhY2tBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0ZlZWRiYWNrQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZmVlZGJhY2tGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3VzZXItZmVlZGJhY2tcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSxcclxuICAgICAgaW50ZWdyYXRpb246IGZlZWRiYWNrQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBmZWVkYmFja0FQSURvd25sb2FkSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdGZWVkYmFja0Rvd25sb2FkQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZmVlZGJhY2tGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3VzZXItZmVlZGJhY2svZG93bmxvYWQtZmVlZGJhY2tcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGZlZWRiYWNrQVBJRG93bmxvYWRJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHMzR2V0S25vd2xlZGdlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0dldEtub3dsZWRnZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmdldFMzS25vd2xlZGdlRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9zMy1rbm93bGVkZ2UtYnVja2V0LWRhdGFcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IHMzR2V0S25vd2xlZGdlQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBzM0dldFRlc3RDYXNlc0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNHZXRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5nZXRTM1Rlc3RDYXNlc0Z1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvczMtdGVzdC1jYXNlcy1idWNrZXQtZGF0YVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNHZXRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHMzRGVsZXRlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0RlbGV0ZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmRlbGV0ZVMzRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9kZWxldGUtczMtZmlsZVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNEZWxldGVBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHMzVXBsb2FkS25vd2xlZGdlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM1VwbG9hZEtub3dsZWRnZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnVwbG9hZFMzS25vd2xlZGdlRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9zaWduZWQtdXJsLWtub3dsZWRnZVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNVcGxvYWRLbm93bGVkZ2VBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IGtlbmRyYVN5bmNQcm9ncmVzc0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignS2VuZHJhU3luY0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnN5bmNLZW5kcmFGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2tlbmRyYS1zeW5jL3N0aWxsLXN5bmNpbmdcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjoga2VuZHJhU3luY1Byb2dyZXNzQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBrZW5kcmFTeW5jQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdLZW5kcmFTeW5jQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuc3luY0tlbmRyYUZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIva2VuZHJhLXN5bmMvc3luYy1rZW5kcmFcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjoga2VuZHJhU3luY0FQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcbiAgICBcclxuICAgIGNvbnN0IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NoYXRJbnZvY2F0aW9uc0NvdW50ZXJBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9jaGF0LWludm9jYXRpb25zLWNvdW50XCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuXHJcbiAgICBjb25zdCBjb21wcmVoZW5kTWVkaWNhbEFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ29tcHJlaGVuZE1lZGljYWxBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvY29tcHJlaGVuZC1tZWRpY2FsLXJlZGFjdFwiLCBcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGNvbXByZWhlbmRNZWRpY2FsQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBldmFsUmVzdWx0c0hhbmRsZXJJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXHJcbiAgICAgICdFdmFsUmVzdWx0c0hhbmRsZXJJbnRlZ3JhdGlvbicsXHJcbiAgICAgIGxhbWJkYUZ1bmN0aW9ucy5oYW5kbGVFdmFsUmVzdWx0c0Z1bmN0aW9uXHJcbiAgICApO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9ldmFsLXJlc3VsdHMtaGFuZGxlclwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogZXZhbFJlc3VsdHNIYW5kbGVySW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZXZhbFJ1bkhhbmRsZXJJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXHJcbiAgICAgICdFdmFsUnVuSGFuZGxlckludGVncmF0aW9uJyxcclxuICAgICAgbGFtYmRhRnVuY3Rpb25zLnN0ZXBGdW5jdGlvbnNTdGFjay5zdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvblxyXG4gICAgKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvZXZhbC1ydW4taGFuZGxlclwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogZXZhbFJ1bkhhbmRsZXJJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KTsgXHJcblxyXG4gICAgY29uc3QgczNVcGxvYWRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1MzVXBsb2FkVGVzdENhc2VzQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMudXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3NpZ25lZC11cmwtdGVzdC1jYXNlc1wiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNVcGxvYWRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIE91dHB1dCBBUEkgZW5kcG9pbnRzXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIldTLUFQSSAtIGFwaUVuZHBvaW50XCIsIHtcclxuICAgICAgdmFsdWU6IHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYXBpRW5kcG9pbnQgfHwgXCJcIixcclxuICAgIH0pO1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJIVFRQLUFQSSAtIGFwaUVuZHBvaW50XCIsIHtcclxuICAgICAgdmFsdWU6IHJlc3RCYWNrZW5kLnJlc3RBUEkuYXBpRW5kcG9pbnQgfHwgXCJcIixcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=