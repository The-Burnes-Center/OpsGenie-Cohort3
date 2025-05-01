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
        const restBackend = new rest_api_1.RestBackendAPI(this, "RestBackend", {});
        this.httpAPI = restBackend;
        const websocketBackend = new websocket_api_1.WebsocketBackendAPI(this, "WebsocketBackend", {});
        this.wsAPI = websocketBackend;
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
        // this.wsAPI = websocketBackend.wsAPI;
        // const api = new appsync.GraphqlApi(this, "ChatbotApi", {
        //   name: "ChatbotGraphqlApi",
        //   definition: appsync.Definition.fromFile(
        //     path.join(__dirname, "schema/schema.graphql")
        //   ),
        //   authorizationConfig: {
        //     additionalAuthorizationModes: [
        //       {
        //         authorizationType: appsync.AuthorizationType.IAM,
        //       },
        //       {
        //         authorizationType: appsync.AuthorizationType.USER_POOL,
        //         userPoolConfig: {
        //           userPool: props.userPool,
        //         },
        //       },
        //     ],
        //   },
        //   logConfig: {
        //     fieldLogLevel: appsync.FieldLogLevel.ALL,
        //     retention: RetentionDays.ONE_WEEK,
        //     role: loggingRole,
        //   },
        //   xrayEnabled: true,
        //   visibility: props.config.privateWebsite ? appsync.Visibility.PRIVATE : appsync.Visibility.GLOBAL
        // });
        // new ApiResolvers(this, "RestApi", {
        //   ...props,
        //   sessionsTable: chatTables.sessionsTable,
        //   byUserIdIndex: chatTables.byUserIdIndex,
        //   api,
        //   userFeedbackBucket: chatBuckets.userFeedbackBucket,
        // });
        // const realtimeBackend = new RealtimeGraphqlApiBackend(this, "Realtime", {
        //   ...props,
        //   api,
        // });
        // realtimeBackend.resolvers.outgoingMessageHandler.addEnvironment(
        //   "GRAPHQL_ENDPOINT",
        //   api.graphqlUrl
        // );
        // api.grantMutation(realtimeBackend.resolvers.outgoingMessageHandler);
        // // Prints out URL
        // new cdk.CfnOutput(this, "GraphqlAPIURL", {
        //   value: api.graphqlUrl,
        // });
        // // Prints out the AppSync GraphQL API key to the terminal
        new cdk.CfnOutput(this, "WS-API - apiEndpoint", {
            value: websocketBackend.wsAPI.apiEndpoint || "",
        });
        new cdk.CfnOutput(this, "HTTP-API - apiEndpoint", {
            value: restBackend.restAPI.apiEndpoint || "",
        });
        // this.messagesTopic = realtimeBackend.messagesTopic;
        // this.sessionsTable = chatTables.sessionsTable;
        // this.byUserIdIndex = chatTables.byUserIdIndex;
        // this.userFeedbackBucket = chatBuckets.userFeedbackBucket;
        // this.filesBucket = chatBuckets.filesBucket;
        // this.graphqlApi = api;
        /**
         * CDK NAG suppression
         */
        // NagSuppressions.addResourceSuppressions(loggingRole, [
        //   {
        //     id: "AwsSolutions-IAM5",
        //     reason:
        //       "Access to all log groups required for CloudWatch log group creation.",
        //   },
        // ]);
    }
}
exports.ChatBotApi = ChatBotApi;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQU1BLGlEQUFtQztBQUtuQywyREFBNkQ7QUFDN0QsaURBQW1EO0FBQ25ELHFEQUEyRDtBQUMzRCw0Q0FBNEM7QUFDNUMsNENBQWtEO0FBQ2xELCtDQUFpRDtBQUVqRCw2RkFBdUY7QUFDdkYsNkZBQWtGO0FBQ2xGLDJGQUFpSTtBQUNqSSw2Q0FBMEQ7QUFDMUQsMkNBQXVDO0FBUXZDLE1BQWEsVUFBVyxTQUFRLHNCQUFTO0lBR3ZDLHlDQUF5QztJQUN6QywwQ0FBMEM7SUFDMUMsaURBQWlEO0lBQ2pELCtDQUErQztJQUUvQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxNQUFNLEdBQUcsSUFBSSxtQkFBVSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUNsRCxNQUFNLE9BQU8sR0FBRyxJQUFJLHVCQUFhLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLElBQUkseUJBQWdCLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQztRQUU3RixNQUFNLFdBQVcsR0FBRyxJQUFJLHlCQUFjLENBQUMsSUFBSSxFQUFFLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvRCxJQUFJLENBQUMsT0FBTyxHQUFHLFdBQVcsQ0FBQztRQUMzQixNQUFNLGdCQUFnQixHQUFHLElBQUksbUNBQW1CLENBQUMsSUFBSSxFQUFFLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzlFLElBQUksQ0FBQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUM7UUFFOUIsTUFBTSxlQUFlLEdB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QyxXQUFXLElBQUksRUFBRTtTQUM3QyxDQUFDLENBQUM7UUFFSCxzREFBc0Q7UUFDdEQsaURBQWlEO1FBQ2pELGlEQUFpRDtRQUNqRCw0REFBNEQ7UUFDNUQsOENBQThDO1FBQzlDLHlCQUF5QjtRQUV6Qjs7V0FFRztRQUNILHlEQUF5RDtRQUN6RCxNQUFNO1FBQ04sK0JBQStCO1FBQy9CLGNBQWM7UUFDZCxnRkFBZ0Y7UUFDaEYsT0FBTztRQUNQLE1BQU07SUFDUixDQUFDO0NBQ0Y7QUExUkQsZ0NBMFJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1keW5hbW9kYlwiO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XHJcbmltcG9ydCAqIGFzIHNucyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNuc1wiO1xyXG5pbXBvcnQgKiBhcyBzc20gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zc21cIjtcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XHJcbmltcG9ydCAqIGFzIGNkayBmcm9tIFwiYXdzLWNkay1saWJcIjtcclxuaW1wb3J0ICogYXMgcGF0aCBmcm9tIFwicGF0aFwiO1xyXG5cclxuaW1wb3J0IHsgQXV0aG9yaXphdGlvblN0YWNrIH0gZnJvbSAnLi4vYXV0aG9yaXphdGlvbidcclxuXHJcbmltcG9ydCB7IFdlYnNvY2tldEJhY2tlbmRBUEkgfSBmcm9tIFwiLi9nYXRld2F5L3dlYnNvY2tldC1hcGlcIlxyXG5pbXBvcnQgeyBSZXN0QmFja2VuZEFQSSB9IGZyb20gXCIuL2dhdGV3YXkvcmVzdC1hcGlcIlxyXG5pbXBvcnQgeyBMYW1iZGFGdW5jdGlvblN0YWNrIH0gZnJvbSBcIi4vZnVuY3Rpb25zL2Z1bmN0aW9uc1wiXHJcbmltcG9ydCB7IFRhYmxlU3RhY2sgfSBmcm9tIFwiLi90YWJsZXMvdGFibGVzXCJcclxuaW1wb3J0IHsgS2VuZHJhSW5kZXhTdGFjayB9IGZyb20gXCIuL2tlbmRyYS9rZW5kcmFcIlxyXG5pbXBvcnQgeyBTM0J1Y2tldFN0YWNrIH0gZnJvbSBcIi4vYnVja2V0cy9idWNrZXRzXCJcclxuXHJcbmltcG9ydCB7IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXl2Mi1pbnRlZ3JhdGlvbnMnO1xyXG5pbXBvcnQgeyBIdHRwTGFtYmRhSW50ZWdyYXRpb24gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheXYyLWludGVncmF0aW9ucyc7XHJcbmltcG9ydCB7IFdlYlNvY2tldExhbWJkYUF1dGhvcml6ZXIsIEh0dHBVc2VyUG9vbEF1dGhvcml6ZXIsIEh0dHBKd3RBdXRob3JpemVyICB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnMnO1xyXG5pbXBvcnQgeyBhd3NfYXBpZ2F0ZXdheXYyIGFzIGFwaWd3djIgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcclxuXHJcbi8vIGltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIENoYXRCb3RBcGlQcm9wcyB7XHJcbiAgcmVhZG9ubHkgYXV0aGVudGljYXRpb246IEF1dGhvcml6YXRpb25TdGFjazsgXHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBDaGF0Qm90QXBpIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgaHR0cEFQSTogUmVzdEJhY2tlbmRBUEk7XHJcbiAgcHVibGljIHJlYWRvbmx5IHdzQVBJOiBXZWJzb2NrZXRCYWNrZW5kQVBJO1xyXG4gIC8vIHB1YmxpYyByZWFkb25seSBieVVzZXJJZEluZGV4OiBzdHJpbmc7XHJcbiAgLy8gcHVibGljIHJlYWRvbmx5IGZpbGVzQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgLy8gcHVibGljIHJlYWRvbmx5IHVzZXJGZWVkYmFja0J1Y2tldDogczMuQnVja2V0O1xyXG4gIC8vIHB1YmxpYyByZWFkb25seSB3c0FQSTogYXBpZ3d2Mi5XZWJTb2NrZXRBcGk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDaGF0Qm90QXBpUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgdGFibGVzID0gbmV3IFRhYmxlU3RhY2sodGhpcywgXCJUYWJsZVN0YWNrXCIpO1xyXG4gICAgY29uc3QgYnVja2V0cyA9IG5ldyBTM0J1Y2tldFN0YWNrKHRoaXMsIFwiQnVja2V0U3RhY2tcIik7XHJcbiAgICBjb25zdCBrZW5kcmEgPSBuZXcgS2VuZHJhSW5kZXhTdGFjayh0aGlzLCBcIktlbmRyYVN0YWNrXCIsIHsgczNCdWNrZXQ6IGJ1Y2tldHMua2VuZHJhQnVja2V0IH0pO1xyXG5cclxuICAgIGNvbnN0IHJlc3RCYWNrZW5kID0gbmV3IFJlc3RCYWNrZW5kQVBJKHRoaXMsIFwiUmVzdEJhY2tlbmRcIiwge30pXHJcbiAgICB0aGlzLmh0dHBBUEkgPSByZXN0QmFja2VuZDtcclxuICAgIGNvbnN0IHdlYnNvY2tldEJhY2tlbmQgPSBuZXcgV2Vic29ja2V0QmFja2VuZEFQSSh0aGlzLCBcIldlYnNvY2tldEJhY2tlbmRcIiwge30pXHJcbiAgICB0aGlzLndzQVBJID0gd2Vic29ja2V0QmFja2VuZDtcclxuXHJcbiAgICBjb25zdCBsYW1iZGFGdW5jdGlvbnMgPSBuZXcgTGFtYmRhRnVuY3Rpb25TdGFjayh0aGlzLCBcIkxhbWJkYUZ1bmN0aW9uc1wiLFxyXG4gICAgICB7XHJcbiAgICAgICAgd3NBcGlFbmRwb2ludDogd2Vic29ja2V0QmFja2VuZC53c0FQSVN0YWdlLnVybCxcclxuICAgICAgICBzZXNzaW9uVGFibGU6IHRhYmxlcy5oaXN0b3J5VGFibGUsXHJcbiAgICAgICAga2VuZHJhSW5kZXg6IGtlbmRyYS5rZW5kcmFJbmRleCxcclxuICAgICAgICBrZW5kcmFTb3VyY2U6IGtlbmRyYS5rZW5kcmFTb3VyY2UsXHJcbiAgICAgICAgZmVlZGJhY2tUYWJsZTogdGFibGVzLmZlZWRiYWNrVGFibGUsXHJcbiAgICAgICAgZmVlZGJhY2tCdWNrZXQ6IGJ1Y2tldHMuZmVlZGJhY2tCdWNrZXQsXHJcbiAgICAgICAga25vd2xlZGdlQnVja2V0OiBidWNrZXRzLmtlbmRyYUJ1Y2tldCxcclxuICAgICAgICBldmFsU3VtbWFyaWVzVGFibGUgOiB0YWJsZXMuZXZhbFN1bW1hcnlUYWJsZSxcclxuICAgICAgICBldmFsUmVzdXRsc1RhYmxlIDogdGFibGVzLmV2YWxSZXN1bHRzVGFibGUsXHJcbiAgICAgICAgZXZhbFRlc3RDYXNlc0J1Y2tldCA6IGJ1Y2tldHMuZXZhbFRlc3RDYXNlc0J1Y2tldCxcclxuXHJcbiAgICAgIH0pXHJcblxyXG4gICAgY29uc3Qgd3NBdXRob3JpemVyID0gbmV3IFdlYlNvY2tldExhbWJkYUF1dGhvcml6ZXIoJ1dlYlNvY2tldEF1dGhvcml6ZXInLCBwcm9wcy5hdXRoZW50aWNhdGlvbi5sYW1iZGFBdXRob3JpemVyLCB7aWRlbnRpdHlTb3VyY2U6IFsncm91dGUucmVxdWVzdC5xdWVyeXN0cmluZy5BdXRob3JpemF0aW9uJ119KTtcclxuXHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCdnZXRDaGF0Ym90UmVzcG9uc2UnLCB7XHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3RSZXNwb25zZUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXHJcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxyXG4gICAgfSk7XHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCckY29ubmVjdCcsIHtcclxuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdENvbm5lY3Rpb25JbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxyXG4gICAgICBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcclxuICAgIH0pO1xyXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnJGRlZmF1bHQnLCB7XHJcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3RDb25uZWN0aW9uSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcclxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXHJcbiAgICB9KTtcclxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJyRkaXNjb25uZWN0Jywge1xyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90RGlzY29ubmVjdGlvbkludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXHJcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxyXG4gICAgfSk7XHJcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCdnZW5lcmF0ZUVtYWlsJywge1xyXG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdlbWFpbEludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXHJcbiAgICAgIC8vIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxyXG4gICAgfSk7XHJcblxyXG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5ncmFudE1hbmFnZUNvbm5lY3Rpb25zKGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pO1xyXG5cclxuICAgIFxyXG4gICAgY29uc3QgaHR0cEF1dGhvcml6ZXIgPSBuZXcgSHR0cEp3dEF1dGhvcml6ZXIoJ0hUVFBBdXRob3JpemVyJywgcHJvcHMuYXV0aGVudGljYXRpb24udXNlclBvb2wudXNlclBvb2xQcm92aWRlclVybCx7XHJcbiAgICAgIGp3dEF1ZGllbmNlOiBbcHJvcHMuYXV0aGVudGljYXRpb24udXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZF0sXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHNlc3Npb25BUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1Nlc3Npb25BUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5zZXNzaW9uRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi91c2VyLXNlc3Npb25cIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSxcclxuICAgICAgaW50ZWdyYXRpb246IHNlc3Npb25BUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IGtwaUFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignS1BJQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMua3BpRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9jaGF0Ym90LXVzZVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjoga3BpQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBTRVNTSU9OX0hBTkRMRVJcclxuICAgIC8vIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoXHJcbiAgICAvLyAgIFwibXZwX3VzZXJfc2Vzc2lvbl9oYW5kbGVyX2FwaV9nYXRld2F5X2VuZHBvaW50XCIsIHJlc3RCYWNrZW5kLnJlc3RBUEkuYXBpRW5kcG9pbnQgKyBcIi91c2VyLXNlc3Npb25cIilcclxuICAgIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24uYWRkRW52aXJvbm1lbnQoXHJcbiAgICAgIFwiU0VTU0lPTl9IQU5ETEVSXCIsIGxhbWJkYUZ1bmN0aW9ucy5zZXNzaW9uRnVuY3Rpb24uZnVuY3Rpb25OYW1lKVxyXG4gICAgXHJcblxyXG4gICAgY29uc3QgZmVlZGJhY2tBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0ZlZWRiYWNrQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZmVlZGJhY2tGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3VzZXItZmVlZGJhY2tcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSxcclxuICAgICAgaW50ZWdyYXRpb246IGZlZWRiYWNrQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBmZWVkYmFja0FQSURvd25sb2FkSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdGZWVkYmFja0Rvd25sb2FkQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZmVlZGJhY2tGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3VzZXItZmVlZGJhY2svZG93bmxvYWQtZmVlZGJhY2tcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGZlZWRiYWNrQVBJRG93bmxvYWRJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHMzR2V0S25vd2xlZGdlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0dldEtub3dsZWRnZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmdldFMzS25vd2xlZGdlRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9zMy1rbm93bGVkZ2UtYnVja2V0LWRhdGFcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IHMzR2V0S25vd2xlZGdlQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBzM0dldFRlc3RDYXNlc0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNHZXRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5nZXRTM1Rlc3RDYXNlc0Z1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvczMtdGVzdC1jYXNlcy1idWNrZXQtZGF0YVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNHZXRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHMzRGVsZXRlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0RlbGV0ZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmRlbGV0ZVMzRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9kZWxldGUtczMtZmlsZVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNEZWxldGVBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IHMzVXBsb2FkS25vd2xlZGdlQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM1VwbG9hZEtub3dsZWRnZUFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnVwbG9hZFMzS25vd2xlZGdlRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9zaWduZWQtdXJsLWtub3dsZWRnZVwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNVcGxvYWRLbm93bGVkZ2VBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgIGNvbnN0IGtlbmRyYVN5bmNQcm9ncmVzc0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignS2VuZHJhU3luY0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnN5bmNLZW5kcmFGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL2tlbmRyYS1zeW5jL3N0aWxsLXN5bmNpbmdcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjoga2VuZHJhU3luY1Byb2dyZXNzQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBrZW5kcmFTeW5jQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdLZW5kcmFTeW5jQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuc3luY0tlbmRyYUZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIva2VuZHJhLXN5bmMvc3luYy1rZW5kcmFcIixcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVRdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjoga2VuZHJhU3luY0FQSUludGVncmF0aW9uLFxyXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcclxuICAgIH0pXHJcbiAgICBcclxuICAgIGNvbnN0IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NoYXRJbnZvY2F0aW9uc0NvdW50ZXJBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24pO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9jaGF0LWludm9jYXRpb25zLWNvdW50XCIsXHJcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuXHJcbiAgICBjb25zdCBjb21wcmVoZW5kTWVkaWNhbEFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignQ29tcHJlaGVuZE1lZGljYWxBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvY29tcHJlaGVuZC1tZWRpY2FsLXJlZGFjdFwiLCBcclxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5QT1NUXSxcclxuICAgICAgaW50ZWdyYXRpb246IGNvbXByZWhlbmRNZWRpY2FsQVBJSW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSlcclxuXHJcbiAgICBjb25zdCBldmFsUmVzdWx0c0hhbmRsZXJJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXHJcbiAgICAgICdFdmFsUmVzdWx0c0hhbmRsZXJJbnRlZ3JhdGlvbicsXHJcbiAgICAgIGxhbWJkYUZ1bmN0aW9ucy5oYW5kbGVFdmFsUmVzdWx0c0Z1bmN0aW9uXHJcbiAgICApO1xyXG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xyXG4gICAgICBwYXRoOiBcIi9ldmFsLXJlc3VsdHMtaGFuZGxlclwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogZXZhbFJlc3VsdHNIYW5kbGVySW50ZWdyYXRpb24sXHJcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZXZhbFJ1bkhhbmRsZXJJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oXHJcbiAgICAgICdFdmFsUnVuSGFuZGxlckludGVncmF0aW9uJyxcclxuICAgICAgbGFtYmRhRnVuY3Rpb25zLnN0ZXBGdW5jdGlvbnNTdGFjay5zdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvblxyXG4gICAgKTtcclxuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcclxuICAgICAgcGF0aDogXCIvZXZhbC1ydW4taGFuZGxlclwiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogZXZhbFJ1bkhhbmRsZXJJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KTsgXHJcblxyXG4gICAgY29uc3QgczNVcGxvYWRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1MzVXBsb2FkVGVzdENhc2VzQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMudXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbik7XHJcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XHJcbiAgICAgIHBhdGg6IFwiL3NpZ25lZC11cmwtdGVzdC1jYXNlc1wiLFxyXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxyXG4gICAgICBpbnRlZ3JhdGlvbjogczNVcGxvYWRUZXN0Q2FzZXNBUElJbnRlZ3JhdGlvbixcclxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXHJcbiAgICB9KVxyXG5cclxuICAgICAgLy8gdGhpcy53c0FQSSA9IHdlYnNvY2tldEJhY2tlbmQud3NBUEk7XHJcblxyXG5cclxuXHJcblxyXG4gICAgLy8gY29uc3QgYXBpID0gbmV3IGFwcHN5bmMuR3JhcGhxbEFwaSh0aGlzLCBcIkNoYXRib3RBcGlcIiwge1xyXG4gICAgLy8gICBuYW1lOiBcIkNoYXRib3RHcmFwaHFsQXBpXCIsXHJcbiAgICAvLyAgIGRlZmluaXRpb246IGFwcHN5bmMuRGVmaW5pdGlvbi5mcm9tRmlsZShcclxuICAgIC8vICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcInNjaGVtYS9zY2hlbWEuZ3JhcGhxbFwiKVxyXG4gICAgLy8gICApLFxyXG4gICAgLy8gICBhdXRob3JpemF0aW9uQ29uZmlnOiB7XHJcbiAgICAvLyAgICAgYWRkaXRpb25hbEF1dGhvcml6YXRpb25Nb2RlczogW1xyXG4gICAgLy8gICAgICAge1xyXG4gICAgLy8gICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5JQU0sXHJcbiAgICAvLyAgICAgICB9LFxyXG4gICAgLy8gICAgICAge1xyXG4gICAgLy8gICAgICAgICBhdXRob3JpemF0aW9uVHlwZTogYXBwc3luYy5BdXRob3JpemF0aW9uVHlwZS5VU0VSX1BPT0wsXHJcbiAgICAvLyAgICAgICAgIHVzZXJQb29sQ29uZmlnOiB7XHJcbiAgICAvLyAgICAgICAgICAgdXNlclBvb2w6IHByb3BzLnVzZXJQb29sLFxyXG4gICAgLy8gICAgICAgICB9LFxyXG4gICAgLy8gICAgICAgfSxcclxuICAgIC8vICAgICBdLFxyXG4gICAgLy8gICB9LFxyXG4gICAgLy8gICBsb2dDb25maWc6IHtcclxuICAgIC8vICAgICBmaWVsZExvZ0xldmVsOiBhcHBzeW5jLkZpZWxkTG9nTGV2ZWwuQUxMLFxyXG4gICAgLy8gICAgIHJldGVudGlvbjogUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcclxuICAgIC8vICAgICByb2xlOiBsb2dnaW5nUm9sZSxcclxuICAgIC8vICAgfSxcclxuICAgIC8vICAgeHJheUVuYWJsZWQ6IHRydWUsXHJcbiAgICAvLyAgIHZpc2liaWxpdHk6IHByb3BzLmNvbmZpZy5wcml2YXRlV2Vic2l0ZSA/IGFwcHN5bmMuVmlzaWJpbGl0eS5QUklWQVRFIDogYXBwc3luYy5WaXNpYmlsaXR5LkdMT0JBTFxyXG4gICAgLy8gfSk7XHJcblxyXG4gICAgLy8gbmV3IEFwaVJlc29sdmVycyh0aGlzLCBcIlJlc3RBcGlcIiwge1xyXG4gICAgLy8gICAuLi5wcm9wcyxcclxuICAgIC8vICAgc2Vzc2lvbnNUYWJsZTogY2hhdFRhYmxlcy5zZXNzaW9uc1RhYmxlLFxyXG4gICAgLy8gICBieVVzZXJJZEluZGV4OiBjaGF0VGFibGVzLmJ5VXNlcklkSW5kZXgsXHJcbiAgICAvLyAgIGFwaSxcclxuICAgIC8vICAgdXNlckZlZWRiYWNrQnVja2V0OiBjaGF0QnVja2V0cy51c2VyRmVlZGJhY2tCdWNrZXQsXHJcbiAgICAvLyB9KTtcclxuXHJcbiAgICAvLyBjb25zdCByZWFsdGltZUJhY2tlbmQgPSBuZXcgUmVhbHRpbWVHcmFwaHFsQXBpQmFja2VuZCh0aGlzLCBcIlJlYWx0aW1lXCIsIHtcclxuICAgIC8vICAgLi4ucHJvcHMsXHJcbiAgICAvLyAgIGFwaSxcclxuICAgIC8vIH0pO1xyXG5cclxuICAgIC8vIHJlYWx0aW1lQmFja2VuZC5yZXNvbHZlcnMub3V0Z29pbmdNZXNzYWdlSGFuZGxlci5hZGRFbnZpcm9ubWVudChcclxuICAgIC8vICAgXCJHUkFQSFFMX0VORFBPSU5UXCIsXHJcbiAgICAvLyAgIGFwaS5ncmFwaHFsVXJsXHJcbiAgICAvLyApO1xyXG5cclxuICAgIC8vIGFwaS5ncmFudE11dGF0aW9uKHJlYWx0aW1lQmFja2VuZC5yZXNvbHZlcnMub3V0Z29pbmdNZXNzYWdlSGFuZGxlcik7XHJcblxyXG4gICAgLy8gLy8gUHJpbnRzIG91dCBVUkxcclxuICAgIC8vIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiR3JhcGhxbEFQSVVSTFwiLCB7XHJcbiAgICAvLyAgIHZhbHVlOiBhcGkuZ3JhcGhxbFVybCxcclxuICAgIC8vIH0pO1xyXG5cclxuICAgIC8vIC8vIFByaW50cyBvdXQgdGhlIEFwcFN5bmMgR3JhcGhRTCBBUEkga2V5IHRvIHRoZSB0ZXJtaW5hbFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJXUy1BUEkgLSBhcGlFbmRwb2ludFwiLCB7XHJcbiAgICAgIHZhbHVlOiB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFwaUVuZHBvaW50IHx8IFwiXCIsXHJcbiAgICB9KTtcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiSFRUUC1BUEkgLSBhcGlFbmRwb2ludFwiLCB7XHJcbiAgICAgIHZhbHVlOiByZXN0QmFja2VuZC5yZXN0QVBJLmFwaUVuZHBvaW50IHx8IFwiXCIsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyB0aGlzLm1lc3NhZ2VzVG9waWMgPSByZWFsdGltZUJhY2tlbmQubWVzc2FnZXNUb3BpYztcclxuICAgIC8vIHRoaXMuc2Vzc2lvbnNUYWJsZSA9IGNoYXRUYWJsZXMuc2Vzc2lvbnNUYWJsZTtcclxuICAgIC8vIHRoaXMuYnlVc2VySWRJbmRleCA9IGNoYXRUYWJsZXMuYnlVc2VySWRJbmRleDtcclxuICAgIC8vIHRoaXMudXNlckZlZWRiYWNrQnVja2V0ID0gY2hhdEJ1Y2tldHMudXNlckZlZWRiYWNrQnVja2V0O1xyXG4gICAgLy8gdGhpcy5maWxlc0J1Y2tldCA9IGNoYXRCdWNrZXRzLmZpbGVzQnVja2V0O1xyXG4gICAgLy8gdGhpcy5ncmFwaHFsQXBpID0gYXBpO1xyXG5cclxuICAgIC8qKlxyXG4gICAgICogQ0RLIE5BRyBzdXBwcmVzc2lvblxyXG4gICAgICovXHJcbiAgICAvLyBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMobG9nZ2luZ1JvbGUsIFtcclxuICAgIC8vICAge1xyXG4gICAgLy8gICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXHJcbiAgICAvLyAgICAgcmVhc29uOlxyXG4gICAgLy8gICAgICAgXCJBY2Nlc3MgdG8gYWxsIGxvZyBncm91cHMgcmVxdWlyZWQgZm9yIENsb3VkV2F0Y2ggbG9nIGdyb3VwIGNyZWF0aW9uLlwiLFxyXG4gICAgLy8gICB9LFxyXG4gICAgLy8gXSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==