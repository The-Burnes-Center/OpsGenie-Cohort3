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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUtBLHlEQUEyQztBQUMzQyxpREFBbUM7QUFNbkMsMkRBQTZEO0FBQzdELGlEQUFtRDtBQUNuRCxxREFBMkQ7QUFDM0QsNENBQTRDO0FBQzVDLDRDQUFrRDtBQUNsRCwrQ0FBaUQ7QUFFakQsNkZBQXVGO0FBQ3ZGLDZGQUFrRjtBQUNsRiwyRkFBaUk7QUFDakksNkNBQTBEO0FBQzFELDZDQUFxRDtBQUNyRCwyQ0FBdUM7QUFRdkMsTUFBYSxVQUFXLFNBQVEsc0JBQVM7SUFHdkMseUNBQXlDO0lBQ3pDLDBDQUEwQztJQUMxQyxpREFBaUQ7SUFDakQsK0NBQStDO0lBRS9DLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLE1BQU0sR0FBRyxJQUFJLG1CQUFVLENBQUMsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ2xELE1BQU0sT0FBTyxHQUFHLElBQUksdUJBQWEsQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDdkQsTUFBTSxNQUFNLEdBQUcsSUFBSSx5QkFBZ0IsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBRTdGLHNEQUFzRDtRQUN0RCxNQUFNLFlBQVksR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLGNBQWMsRUFBRTtZQUN0RCxTQUFTLEVBQUUsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUM7WUFDL0QsV0FBVyxFQUFFLGtEQUFrRDtTQUNoRSxDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxHQUFH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QUVILE1BQU0seUJBQXlCLEdBQUcsSUFBSSxxREFBcUIsQ0FDekQsMkJBQTJCLEVBQzNCLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxnQ0FBZ0MsQ0FDcEUsQ0FBQztRQUNGLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQzVCLElBQUksRUFBRSxtQkFBbUI7WUFDekIsT0FBTyxFQUFFLENBQUMsOEJBQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ2xDLFdBQVcsRUFBRSx5QkFBeUI7WUFDdEMsVUFBVSxFQUFFLGNBQWM7U0FDM0IsQ0FBQyxDQUFDO1FBRUgsTUFBTSwrQkFBK0IsR0FBRyxJQUFJLHFEQUFxQixDQUFDLGlDQUFpQyxFQUFFLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO1FBQ2hKLFdBQVcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDO1lBQzVCLElBQUksRUFBRSx3QkFBd0I7WUFDOUIsT0FBTyxFQUFFLENBQUMsOEJBQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1lBQ2xDLFdBQVcsRUFBRSwrQkFBK0I7WUFDNUMsVUFBVSxFQUFFLGNBQWM7U0FDM0IsQ0FBQyxDQUFBO1FBRUYsdUJBQXVCO1FBQ3ZCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDOUMsS0FBSyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksRUFBRTtTQUNoRCxDQUFDLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHdCQUF3QixFQUFFO1lBQ2hELEtBQUssRUFBRSxXQUFXLENBQUMsT0FBTyxDQUFDLFdBQVcsSUFBSSxFQUFFO1NBQzdDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQWhRRCxnQ0FnUUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjb2duaXRvIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY29nbml0b1wiO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcclxuaW1wb3J0ICogYXMgc25zIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc25zXCI7XHJcbmltcG9ydCAqIGFzIHNzbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNzbVwiO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XHJcblxyXG5pbXBvcnQgeyBBdXRob3JpemF0aW9uU3RhY2sgfSBmcm9tICcuLi9hdXRob3JpemF0aW9uJ1xyXG5cclxuaW1wb3J0IHsgV2Vic29ja2V0QmFja2VuZEFQSSB9IGZyb20gXCIuL2dhdGV3YXkvd2Vic29ja2V0LWFwaVwiXHJcbmltcG9ydCB7IFJlc3RCYWNrZW5kQVBJIH0gZnJvbSBcIi4vZ2F0ZXdheS9yZXN0LWFwaVwiXHJcbmltcG9ydCB7IExhbWJkYUZ1bmN0aW9uU3RhY2sgfSBmcm9tIFwiLi9mdW5jdGlvbnMvZnVuY3Rpb25zXCJcclxuaW1wb3J0IHsgVGFibGVTdGFjayB9IGZyb20gXCIuL3RhYmxlcy90YWJsZXNcIlxyXG5pbXBvcnQgeyBLZW5kcmFJbmRleFN0YWNrIH0gZnJvbSBcIi4va2VuZHJhL2tlbmRyYVwiXHJcbmltcG9ydCB7IFMzQnVja2V0U3RhY2sgfSBmcm9tIFwiLi9idWNrZXRzL2J1Y2tldHNcIlxyXG5cclxuaW1wb3J0IHsgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCB7IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcclxuaW1wb3J0IHsgV2ViU29ja2V0TGFtYmRhQXV0aG9yaXplciwgSHR0cFVzZXJQb29sQXV0aG9yaXplciwgSHR0cEp3dEF1dGhvcml6ZXIgIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1hdXRob3JpemVycyc7XHJcbmltcG9ydCB7IGF3c19hcGlnYXRld2F5djIgYXMgYXBpZ3d2MiB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xyXG5pbXBvcnQgeyBhd3NfYXBpZ2F0ZXdheSBhcyBhcGlnIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gXCJjb25zdHJ1Y3RzXCI7XHJcblxyXG4vLyBpbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBDaGF0Qm90QXBpUHJvcHMge1xyXG4gIHJlYWRvbmx5IGF1dGhlbnRpY2F0aW9uOiBBdXRob3JpemF0aW9uU3RhY2s7IFxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgQ2hhdEJvdEFwaSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGh0dHBBUEk6IFJlc3RCYWNrZW5kQVBJO1xyXG4gIHB1YmxpYyByZWFkb25seSB3c0FQSTogV2Vic29ja2V0QmFja2VuZEFQSTtcclxuICAvLyBwdWJsaWMgcmVhZG9ubHkgYnlVc2VySWRJbmRleDogc3RyaW5nO1xyXG4gIC8vIHB1YmxpYyByZWFkb25seSBmaWxlc0J1Y2tldDogczMuQnVja2V0O1xyXG4gIC8vIHB1YmxpYyByZWFkb25seSB1c2VyRmVlZGJhY2tCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICAvLyBwdWJsaWMgcmVhZG9ubHkgd3NBUEk6IGFwaWd3djIuV2ViU29ja2V0QXBpO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogQ2hhdEJvdEFwaVByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IHRhYmxlcyA9IG5ldyBUYWJsZVN0YWNrKHRoaXMsIFwiVGFibGVTdGFja1wiKTtcclxuICAgIGNvbnN0IGJ1Y2tldHMgPSBuZXcgUzNCdWNrZXRTdGFjayh0aGlzLCBcIkJ1Y2tldFN0YWNrXCIpO1xyXG4gICAgY29uc3Qga2VuZHJhID0gbmV3IEtlbmRyYUluZGV4U3RhY2sodGhpcywgXCJLZW5kcmFTdGFja1wiLCB7IHMzQnVja2V0OiBidWNrZXRzLmtlbmRyYUJ1Y2tldCB9KTtcclxuXHJcbiAgICAvLyBDcmVhdGUgSUFNIHJvbGVzIGZvciBBUEkgR2F0ZXdheSBDbG91ZFdhdGNoIGxvZ2dpbmdcclxuICAgIGNvbnN0IGxvZ1dyaXRlUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnQXBpR1dMb2dSb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnYXBpZ2F0ZXdheS5hbWF6b25hd3MuY29tJyksXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnUm9sZSBmb3IgQVBJIEdhdGV3YXkgdG8gd3JpdGUgbG9ncyB0byBDbG91ZFdhdGNoJyxcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICAvLyBBZGQgcG9saWN5IGZvciB3cml0aW5nIGxvZ3NcclxuICAgIGNvbnN0IGxvZ1BvbGljeSA9IG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdsb2dzOkNyZWF0ZUxvZ0dyb3VwJyxcclxuICAgICAgICAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLFxyXG4gICAgICAgICdsb2dzOkRlc2NyaWJlTG9nR3JvdXBzJyxcclxuICAgICAgICAnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLFxyXG4gICAgICAgICdsb2dzOlB1dExvZ0V2ZW50cycsXHJcbiAgICAgICAgJ2xvZ3M6R2V0TG9nRXZlbnRzJyxcclxuICAgICAgICAnbG9nczpGaWx0ZXJMb2dFdmVudHMnXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ11cclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBsb2dXcml0ZVJvbGUuYWRkVG9Qb2xpY3kobG9nUG9saWN5KTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHJvbGUgd2l0aCBBV1MgbWFuYWdlZCBwb2xpY3kgZm9yIEFQSSBHYXRld2F5IGFjY291bnQgc2V0dGluZ3NcclxuICAgIGNvbnN0IGNsb3VkV2F0Y2hXcml0ZVJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0FwaUdXQWNjb3VudExvZ1JvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdhcGlnYXRld2F5LmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQW1hem9uQVBJR2F0ZXdheVB1c2hUb0Nsb3VkV2F0Y2hMb2dzJyldLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ1JvbGUgZm9yIEFQSSBHYXRld2F5IGFjY291bnQgc2V0dGluZ3MgdG8gcHVzaCBsb2dzIHRvIENsb3VkV2F0Y2gnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ29uZmlndXJlIEFQSSBHYXRld2F5IGFjY291bnQgc2V0dGluZ3MgdG8gdXNlIENsb3VkV2F0Y2ggbG9nc1xyXG4gICAgY29uc3QgY2xvdWRXYXRjaEFjY291bnQgPSBuZXcgYXBpZy5DZm5BY2NvdW50KHRoaXMsIFwiQWNjb3VudFwiLCB7XHJcbiAgICAgIGNsb3VkV2F0Y2hSb2xlQXJuOiBjbG91ZFdhdGNoV3JpdGVSb2xlLnJvbGVBcm4sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBQYXNzIGxvZ1dyaXRlUm9sZSB0byBBUEkgaW1wbGVtZW50YXRpb25zXHJcbiAgICBjb25zdCByZXN0QmFja2VuZCA9IG5ldyBSZXN0QmFja2VuZEFQSSh0aGlzLCBcIlJlc3RCYWNrZW5kXCIsIHsgbG9nV3JpdGVSb2xlOiBsb2dXcml0ZVJvbGUgfSk7XHJcbiAgICB0aGlzLmh0dHBBUEkgPSByZXN0QmFja2VuZDtcclxuICAgIFxyXG4gICAgY29uc3Qgd2Vic29ja2V0QmFja2VuZCA9IG5ldyBXZWJzb2NrZXRCYWNrZW5kQVBJKHRoaXMsIFwiV2Vic29ja2V0QmFja2VuZFwiLCB7IGxvZ1dyaXRlUm9sZTogbG9nV3JpdGVSb2xlIH0pO1xyXG4gICAgdGhpcy53c0FQSSA9IHdlYnNvY2tldEJhY2tlbmQ7XHJcblxyXG4gICAgLy8gU2V0IHVwIGRlcGVuZGVuY2llcyB0byBlbnN1cmUgQ2xvdWRXYXRjaCBhY2NvdW50IGlzIGNvbmZpZ3VyZWQgYmVmb3JlIEFQSXNcclxuICAgIHJlc3RCYWNrZW5kLm5vZGUuYWRkRGVwZW5kZW5jeShjbG91ZFdhdGNoQWNjb3VudCk7XHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLm5vZGUuYWRkRGVwZW5kZW5jeShjbG91ZFdhdGNoQWNjb3VudCk7XHJcblxyXG4gICAgY29uc3QgbGFtYmRhRnVuY3Rpb25zID0gbmV3IExhbWJkYUZ1bmN0aW9uU3RhY2sodGhpcywgXCJMYW1iZGFGdW5jdGlvbnNcIixcclxuICAgICAge1xyXG4gICAgICAgIHdzQXBpRW5kcG9pbnQ6IHdlYnNvY2tldEJhY2tlbmQud3NBUElTdGFnZS51cmwsXHJcbiAgICAgICAgc2Vzc2lvblRhYmxlOiB0YWJsZXMuaGlzdG9yeVRhYmxlLFxyXG4gICAgICAgIGtlbmRyYUluZGV4OiBrZW5kcmEua2VuZHJhSW5kZXgsXHJcbiAgICAgICAga2VuZHJhU291cmNlOiBrZW5kcmEua2VuZHJhU291cmNlLFxyXG4gICAgICAgIGZlZWRiYWNrVGFibGU6IHRhYmxlcy5mZWVkYmFja1RhYmxlLFxyXG4gICAgICAgIGZlZWRiYWNrQnVja2V0OiBidWNrZXRzLmZlZWRiYWNrQnVja2V0LFxyXG4gICAgICAgIGtub3dsZWRnZUJ1Y2tldDogYnVja2V0cy5rZW5kcmFCdWNrZXQsXHJcbiAgICAgICAgZXZhbFN1bW1hcmllc1RhYmxlIDogdGFibGVzLmV2YWxTdW1tYXJ5VGFibGUsXHJcbiAgICAgICAgZXZhbFJlc3V0bHNUYWJsZSA6IHRhYmxlcy5ldmFsUmVzdWx0c1RhYmxlLFxyXG4gICAgICAgIGV2YWxUZXN0Q2FzZXNCdWNrZXQgOiBidWNrZXRzLmV2YWxUZXN0Q2FzZXNCdWNrZXQsXHJcbiAgICAgICAga3BpTG9nc1RhYmxlOiB0YWJsZXMua3BpTG9nc1RhYmxlLFxyXG4gICAgICAgIGRhaWx5TG9naW5UYWJsZTogdGFibGVzLmRhaWx5TG9naW5UYWJsZSxcclxuICAgICAgfSlcclxuXHJcbiAgICBjb25zdCB3c0F1dGhvcml6ZXIgPSBuZXcgV2ViU29ja2V0TGFtYmRhQXV0aG9yaXplcignV2ViU29ja2V0QXV0aG9yaXplcicsIHByb3BzLmF1dGhlbnRpY2F0aW9uLmxhbWJkYUF1dGhvcml6ZXIsIHtpZGVudGl0eVNvdXJjZTogWydyb3V0ZS5yZXF1ZXN0LnF1ZXJ5c3RyaW5nLkF1dGhvcml6YXRpb24nXX0pO1xyXG5cclxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJ2dldENoYXRib3RSZXNwb25zZScsIHtcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdFJlc3BvbnNlSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcclxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXHJcbiAgICB9KTtcclxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJyRjb25uZWN0Jywge1xyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90Q29ubmVjdGlvbkludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXHJcbiAgICAgIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxyXG4gICAgfSk7XHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCckZGVmYXVsdCcsIHtcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdENvbm5lY3Rpb25JbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxyXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcclxuICAgIH0pO1xyXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnJGRpc2Nvbm5lY3QnLCB7XHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3REaXNjb25uZWN0aW9uSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcclxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXHJcbiAgICB9KTtcclxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJ2dlbmVyYXRlRW1haWwnLCB7XHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2VtYWlsSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcclxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXHJcbiAgICB9KTtcclxuXHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmdyYW50TWFuYWdlQ29ubmVjdGlvbnMobGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbik7XHJcblxyXG4gICAgXHJcbiAgICBjb25zdCBodHRwQXV0aG9yaXplciA9IG5ldyBIdHRwSnd0QXV0aG9yaXplcignSFRUUEF1dGhvcml6ZXInLCBwcm9wcy5hdXRoZW50aWNhdGlvbi51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyVXJsLHtcclxuICAgICAgand0QXVkaWVuY2U6IFtwcm9wcy5hdXRoZW50aWNhdGlvbi51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkXSxcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3Qgc2Vzc2lvbkFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignU2Vzc2lvbkFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnNlc3Npb25GdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3VzZXItc2Vzc2lvblwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogc2Vzc2lvbkFQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3Qga3BpQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdLUElBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5rcGlGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2NoYXRib3QtdXNlXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sXHJcbiAgICAgIGludGVncmF0aW9uOiBrcGlBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEFkZCByb3V0ZXMgZm9yIGRhaWx5IGxvZ2luc1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9kYWlseS1sb2dpbnNcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGtwaUFQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgLy8gU0VTU0lPTl9IQU5ETEVSXHJcbiAgICAvLyBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uLmFkZEVudmlyb25tZW50KFxyXG4gICAgLy8gICBcIm12cF91c2VyX3Nlc3Npb25faGFuZGxlcl9hcGlfZ2F0ZXdheV9lbmRwb2ludFwiLCByZXN0QmFja2VuZC5yZXN0QVBJLmFwaUVuZHBvaW50ICsgXCIvdXNlci1zZXNzaW9uXCIpXHJcbiAgICBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uLmFkZEVudmlyb25tZW50KFxyXG4gICAgICBcIlNFU1NJT05fSEFORExFUlwiLCBsYW1iZGFGdW5jdGlvbnMuc2Vzc2lvbkZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSlcclxuICAgIFxyXG5cclxuICAgIGNvbnN0IGZlZWRiYWNrQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdGZWVkYmFja0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmZlZWRiYWNrRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi91c2VyLWZlZWRiYWNrXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VULCBhcGlnd3YyLkh0dHBNZXRob2QuUE9TVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLkRFTEVURV0sXHJcbiAgICAgIGludGVncmF0aW9uOiBmZWVkYmFja0FQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3QgZmVlZGJhY2tBUElEb3dubG9hZEludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmVlZGJhY2tEb3dubG9hZEFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmZlZWRiYWNrRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi91c2VyLWZlZWRiYWNrL2Rvd25sb2FkLWZlZWRiYWNrXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBmZWVkYmFja0FQSURvd25sb2FkSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBzM0dldEtub3dsZWRnZUFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNHZXRLbm93bGVkZ2VBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5nZXRTM0tub3dsZWRnZUZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvczMta25vd2xlZGdlLWJ1Y2tldC1kYXRhXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBzM0dldEtub3dsZWRnZUFQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3QgczNHZXRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1MzR2V0VGVzdENhc2VzQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZ2V0UzNUZXN0Q2FzZXNGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3MzLXRlc3QtY2FzZXMtYnVja2V0LWRhdGFcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IHMzR2V0VGVzdENhc2VzQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBzM0RlbGV0ZUFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNEZWxldGVBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5kZWxldGVTM0Z1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvZGVsZXRlLXMzLWZpbGVcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IHMzRGVsZXRlQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBzM1VwbG9hZEtub3dsZWRnZUFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNVcGxvYWRLbm93bGVkZ2VBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy51cGxvYWRTM0tub3dsZWRnZUZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvc2lnbmVkLXVybC1rbm93bGVkZ2VcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IHMzVXBsb2FkS25vd2xlZGdlQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBrZW5kcmFTeW5jUHJvZ3Jlc3NBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0tlbmRyYVN5bmNBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5zeW5jS2VuZHJhRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9rZW5kcmEtc3luYy9zdGlsbC1zeW5jaW5nXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGtlbmRyYVN5bmNQcm9ncmVzc0FQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3Qga2VuZHJhU3luY0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignS2VuZHJhU3luY0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnN5bmNLZW5kcmFGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2tlbmRyYS1zeW5jL3N5bmMta2VuZHJhXCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGtlbmRyYVN5bmNBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG4gICAgXHJcbiAgICBjb25zdCBjaGF0SW52b2NhdGlvbnNDb3VudGVyQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdDaGF0SW52b2NhdGlvbnNDb3VudGVyQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvY2hhdC1pbnZvY2F0aW9ucy1jb3VudFwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBjaGF0SW52b2NhdGlvbnNDb3VudGVyQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcblxyXG4gICAgY29uc3QgY29tcHJlaGVuZE1lZGljYWxBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NvbXByZWhlbmRNZWRpY2FsQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2NvbXByZWhlbmQtbWVkaWNhbC1yZWRhY3RcIiwgXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXHJcbiAgICAgIGludGVncmF0aW9uOiBjb21wcmVoZW5kTWVkaWNhbEFQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcblxyXG4gICAgY29uc3QgZXZhbFJlc3VsdHNIYW5kbGVySW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKFxyXG4gICAgICAnRXZhbFJlc3VsdHNIYW5kbGVySW50ZWdyYXRpb24nLFxyXG4gICAgICBsYW1iZGFGdW5jdGlvbnMuaGFuZGxlRXZhbFJlc3VsdHNGdW5jdGlvblxyXG4gICAgKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvZXZhbC1yZXN1bHRzLWhhbmRsZXJcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGV2YWxSZXN1bHRzSGFuZGxlckludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGV2YWxSdW5IYW5kbGVySW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKFxyXG4gICAgICAnRXZhbFJ1bkhhbmRsZXJJbnRlZ3JhdGlvbicsXHJcbiAgICAgIGxhbWJkYUZ1bmN0aW9ucy5zdGVwRnVuY3Rpb25zU3RhY2suc3RhcnRMbG1FdmFsU3RhdGVNYWNoaW5lRnVuY3Rpb25cclxuICAgICk7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2V2YWwtcnVuLWhhbmRsZXJcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGV2YWxSdW5IYW5kbGVySW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSk7IFxyXG5cclxuICAgIGNvbnN0IHMzVXBsb2FkVGVzdENhc2VzQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM1VwbG9hZFRlc3RDYXNlc0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnVwbG9hZFMzVGVzdENhc2VzRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9zaWduZWQtdXJsLXRlc3QtY2FzZXNcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IHMzVXBsb2FkVGVzdENhc2VzQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBPdXRwdXQgQVBJIGVuZHBvaW50c1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJXUy1BUEkgLSBhcGlFbmRwb2ludFwiLCB7XHJcbiAgICAgIHZhbHVlOiB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFwaUVuZHBvaW50IHx8IFwiXCIsXHJcbiAgICB9KTtcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiSFRUUC1BUEkgLSBhcGlFbmRwb2ludFwiLCB7XHJcbiAgICAgIHZhbHVlOiByZXN0QmFja2VuZC5yZXN0QVBJLmFwaUVuZHBvaW50IHx8IFwiXCIsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19