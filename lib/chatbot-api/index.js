"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatBotApi = void 0;
const cdk = require("aws-cdk-lib");
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
            knowledgeBucket: buckets.kendraBucket
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
        const s3GetAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3GetAPIIntegration', lambdaFunctions.getS3Function);
        restBackend.restAPI.addRoutes({
            path: "/s3-bucket-data",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3GetAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3DeleteAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3DeleteAPIIntegration', lambdaFunctions.deleteS3Function);
        restBackend.restAPI.addRoutes({
            path: "/delete-s3-file",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3DeleteAPIIntegration,
            authorizer: httpAuthorizer,
        });
        const s3UploadAPIIntegration = new aws_apigatewayv2_integrations_2.HttpLambdaIntegration('S3UploadAPIIntegration', lambdaFunctions.uploadS3Function);
        restBackend.restAPI.addRoutes({
            path: "/signed-url",
            methods: [aws_cdk_lib_1.aws_apigatewayv2.HttpMethod.POST],
            integration: s3UploadAPIIntegration,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFNQSxtQ0FBbUM7QUFLbkMsMkRBQTZEO0FBQzdELGlEQUFtRDtBQUNuRCxxREFBMkQ7QUFDM0QsNENBQTRDO0FBQzVDLDRDQUFrRDtBQUNsRCwrQ0FBaUQ7QUFFakQsNkZBQXVGO0FBQ3ZGLDZGQUFrRjtBQUNsRiwyRkFBaUk7QUFDakksNkNBQTBEO0FBQzFELDJDQUF1QztBQVF2QyxNQUFhLFVBQVcsU0FBUSxzQkFBUztJQUd2Qyx5Q0FBeUM7SUFDekMsMENBQTBDO0lBQzFDLGlEQUFpRDtJQUNqRCwrQ0FBK0M7SUFFL0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFzQjtRQUM5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sTUFBTSxHQUFHLElBQUksbUJBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDbEQsTUFBTSxPQUFPLEdBQUcsSUFBSSx1QkFBYSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQztRQUN2RCxNQUFNLE1BQU0sR0FBRyxJQUFJLHlCQUFnQixDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFFN0YsTUFBTSxXQUFXLEdBQUcsSUFBSSx5QkFBYyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDL0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUM7UUFDM0IsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLG1DQUFtQixDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUM5RSxJQUFJLENBQUMsS0FBSyxHQUFHLGdCQUFnQixDQUFDO1FBRTlCLE1BQU0sZUFBZSxHQUFHLElBQUksK0JBQW1CLENBQUMsSUFB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Q2hELENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsd0JBQXdCLEVBQUU7WUFDaEQsS0FBSyxFQUFFLFdBQVcsQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLEVBQUU7U0FDN0MsQ0FBQyxDQUFDO1FBRUgsc0RBQXNEO1FBQ3RELGlEQUFpRDtRQUNqRCxpREFBaUQ7UUFDakQsNERBQTREO1FBQzVELDhDQUE4QztRQUM5Qyx5QkFBeUI7UUFFekI7O1dBRUc7UUFDSCx5REFBeUQ7UUFDekQsTUFBTTtRQUNOLCtCQUErQjtRQUMvQixjQUFjO1FBQ2QsZ0ZBQWdGO1FBQ2hGLE9BQU87UUFDUCxNQUFNO0lBQ1IsQ0FBQztDQUNGO0FBaE9ELGdDQWdPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNvZ25pdG8gZnJvbSBcImF3cy1jZGstbGliL2F3cy1jb2duaXRvXCI7XG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiXCI7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBzbnMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zbnNcIjtcbmltcG9ydCAqIGFzIHNzbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXNzbVwiO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJwYXRoXCI7XG5cbmltcG9ydCB7IEF1dGhvcml6YXRpb25TdGFjayB9IGZyb20gJy4uL2F1dGhvcml6YXRpb24nXG5cbmltcG9ydCB7IFdlYnNvY2tldEJhY2tlbmRBUEkgfSBmcm9tIFwiLi9nYXRld2F5L3dlYnNvY2tldC1hcGlcIlxuaW1wb3J0IHsgUmVzdEJhY2tlbmRBUEkgfSBmcm9tIFwiLi9nYXRld2F5L3Jlc3QtYXBpXCJcbmltcG9ydCB7IExhbWJkYUZ1bmN0aW9uU3RhY2sgfSBmcm9tIFwiLi9mdW5jdGlvbnMvZnVuY3Rpb25zXCJcbmltcG9ydCB7IFRhYmxlU3RhY2sgfSBmcm9tIFwiLi90YWJsZXMvdGFibGVzXCJcbmltcG9ydCB7IEtlbmRyYUluZGV4U3RhY2sgfSBmcm9tIFwiLi9rZW5kcmEva2VuZHJhXCJcbmltcG9ydCB7IFMzQnVja2V0U3RhY2sgfSBmcm9tIFwiLi9idWNrZXRzL2J1Y2tldHNcIlxuXG5pbXBvcnQgeyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCB7IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItaW50ZWdyYXRpb25zJztcbmltcG9ydCB7IFdlYlNvY2tldExhbWJkYUF1dGhvcml6ZXIsIEh0dHBVc2VyUG9vbEF1dGhvcml6ZXIsIEh0dHBKd3RBdXRob3JpemVyICB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5djItYXV0aG9yaXplcnMnO1xuaW1wb3J0IHsgYXdzX2FwaWdhdGV3YXl2MiBhcyBhcGlnd3YyIH0gZnJvbSBcImF3cy1jZGstbGliXCI7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xuXG4vLyBpbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xuXG5leHBvcnQgaW50ZXJmYWNlIENoYXRCb3RBcGlQcm9wcyB7XG4gIHJlYWRvbmx5IGF1dGhlbnRpY2F0aW9uOiBBdXRob3JpemF0aW9uU3RhY2s7IFxufVxuXG5leHBvcnQgY2xhc3MgQ2hhdEJvdEFwaSBleHRlbmRzIENvbnN0cnVjdCB7XG4gIHB1YmxpYyByZWFkb25seSBodHRwQVBJOiBSZXN0QmFja2VuZEFQSTtcbiAgcHVibGljIHJlYWRvbmx5IHdzQVBJOiBXZWJzb2NrZXRCYWNrZW5kQVBJO1xuICAvLyBwdWJsaWMgcmVhZG9ubHkgYnlVc2VySWRJbmRleDogc3RyaW5nO1xuICAvLyBwdWJsaWMgcmVhZG9ubHkgZmlsZXNCdWNrZXQ6IHMzLkJ1Y2tldDtcbiAgLy8gcHVibGljIHJlYWRvbmx5IHVzZXJGZWVkYmFja0J1Y2tldDogczMuQnVja2V0O1xuICAvLyBwdWJsaWMgcmVhZG9ubHkgd3NBUEk6IGFwaWd3djIuV2ViU29ja2V0QXBpO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBDaGF0Qm90QXBpUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQpO1xuXG4gICAgY29uc3QgdGFibGVzID0gbmV3IFRhYmxlU3RhY2sodGhpcywgXCJUYWJsZVN0YWNrXCIpO1xuICAgIGNvbnN0IGJ1Y2tldHMgPSBuZXcgUzNCdWNrZXRTdGFjayh0aGlzLCBcIkJ1Y2tldFN0YWNrXCIpO1xuICAgIGNvbnN0IGtlbmRyYSA9IG5ldyBLZW5kcmFJbmRleFN0YWNrKHRoaXMsIFwiS2VuZHJhU3RhY2tcIiwgeyBzM0J1Y2tldDogYnVja2V0cy5rZW5kcmFCdWNrZXQgfSk7XG5cbiAgICBjb25zdCByZXN0QmFja2VuZCA9IG5ldyBSZXN0QmFja2VuZEFQSSh0aGlzLCBcIlJlc3RCYWNrZW5kXCIsIHt9KVxuICAgIHRoaXMuaHR0cEFQSSA9IHJlc3RCYWNrZW5kO1xuICAgIGNvbnN0IHdlYnNvY2tldEJhY2tlbmQgPSBuZXcgV2Vic29ja2V0QmFja2VuZEFQSSh0aGlzLCBcIldlYnNvY2tldEJhY2tlbmRcIiwge30pXG4gICAgdGhpcy53c0FQSSA9IHdlYnNvY2tldEJhY2tlbmQ7XG5cbiAgICBjb25zdCBsYW1iZGFGdW5jdGlvbnMgPSBuZXcgTGFtYmRhRnVuY3Rpb25TdGFjayh0aGlzLCBcIkxhbWJkYUZ1bmN0aW9uc1wiLFxuICAgICAge1xuICAgICAgICB3c0FwaUVuZHBvaW50OiB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJU3RhZ2UudXJsLFxuICAgICAgICBzZXNzaW9uVGFibGU6IHRhYmxlcy5oaXN0b3J5VGFibGUsXG4gICAgICAgIGtlbmRyYUluZGV4OiBrZW5kcmEua2VuZHJhSW5kZXgsXG4gICAgICAgIGtlbmRyYVNvdXJjZToga2VuZHJhLmtlbmRyYVNvdXJjZSxcbiAgICAgICAgZmVlZGJhY2tUYWJsZTogdGFibGVzLmZlZWRiYWNrVGFibGUsXG4gICAgICAgIGZlZWRiYWNrQnVja2V0OiBidWNrZXRzLmZlZWRiYWNrQnVja2V0LFxuICAgICAgICBrbm93bGVkZ2VCdWNrZXQ6IGJ1Y2tldHMua2VuZHJhQnVja2V0XG4gICAgICB9KVxuXG4gICAgY29uc3Qgd3NBdXRob3JpemVyID0gbmV3IFdlYlNvY2tldExhbWJkYUF1dGhvcml6ZXIoJ1dlYlNvY2tldEF1dGhvcml6ZXInLCBwcm9wcy5hdXRoZW50aWNhdGlvbi5sYW1iZGFBdXRob3JpemVyLCB7aWRlbnRpdHlTb3VyY2U6IFsncm91dGUucmVxdWVzdC5xdWVyeXN0cmluZy5BdXRob3JpemF0aW9uJ119KTtcblxuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJ2dldENoYXRib3RSZXNwb25zZScsIHtcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3RSZXNwb25zZUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcbiAgICB9KTtcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCckY29ubmVjdCcsIHtcbiAgICAgIGludGVncmF0aW9uOiBuZXcgV2ViU29ja2V0TGFtYmRhSW50ZWdyYXRpb24oJ2NoYXRib3RDb25uZWN0aW9uSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uKSxcbiAgICAgIGF1dGhvcml6ZXI6IHdzQXV0aG9yaXplclxuICAgIH0pO1xuICAgIHdlYnNvY2tldEJhY2tlbmQud3NBUEkuYWRkUm91dGUoJyRkZWZhdWx0Jywge1xuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignY2hhdGJvdENvbm5lY3Rpb25JbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXG4gICAgfSk7XG4gICAgd2Vic29ja2V0QmFja2VuZC53c0FQSS5hZGRSb3V0ZSgnJGRpc2Nvbm5lY3QnLCB7XG4gICAgICBpbnRlZ3JhdGlvbjogbmV3IFdlYlNvY2tldExhbWJkYUludGVncmF0aW9uKCdjaGF0Ym90RGlzY29ubmVjdGlvbkludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbiksXG4gICAgICAvLyBhdXRob3JpemVyOiB3c0F1dGhvcml6ZXJcbiAgICB9KTtcbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFkZFJvdXRlKCdnZW5lcmF0ZUVtYWlsJywge1xuICAgICAgaW50ZWdyYXRpb246IG5ldyBXZWJTb2NrZXRMYW1iZGFJbnRlZ3JhdGlvbignZW1haWxJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0RnVuY3Rpb24pLFxuICAgICAgLy8gYXV0aG9yaXplcjogd3NBdXRob3JpemVyXG4gICAgfSk7XG5cbiAgICB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmdyYW50TWFuYWdlQ29ubmVjdGlvbnMobGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbik7XG5cbiAgICBcbiAgICBjb25zdCBodHRwQXV0aG9yaXplciA9IG5ldyBIdHRwSnd0QXV0aG9yaXplcignSFRUUEF1dGhvcml6ZXInLCBwcm9wcy5hdXRoZW50aWNhdGlvbi51c2VyUG9vbC51c2VyUG9vbFByb3ZpZGVyVXJsLHtcbiAgICAgIGp3dEF1ZGllbmNlOiBbcHJvcHMuYXV0aGVudGljYXRpb24udXNlclBvb2xDbGllbnQudXNlclBvb2xDbGllbnRJZF0sXG4gICAgfSlcblxuICAgIGNvbnN0IHNlc3Npb25BUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1Nlc3Npb25BUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5zZXNzaW9uRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3VzZXItc2Vzc2lvblwiLFxuICAgICAgbWV0aG9kczogW2FwaWd3djIuSHR0cE1ldGhvZC5HRVQsIGFwaWd3djIuSHR0cE1ldGhvZC5QT1NULCBhcGlnd3YyLkh0dHBNZXRob2QuREVMRVRFXSxcbiAgICAgIGludGVncmF0aW9uOiBzZXNzaW9uQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgLy8gU0VTU0lPTl9IQU5ETEVSXG4gICAgLy8gbGFtYmRhRnVuY3Rpb25zLmNoYXRGdW5jdGlvbi5hZGRFbnZpcm9ubWVudChcbiAgICAvLyAgIFwibXZwX3VzZXJfc2Vzc2lvbl9oYW5kbGVyX2FwaV9nYXRld2F5X2VuZHBvaW50XCIsIHJlc3RCYWNrZW5kLnJlc3RBUEkuYXBpRW5kcG9pbnQgKyBcIi91c2VyLXNlc3Npb25cIilcbiAgICBsYW1iZGFGdW5jdGlvbnMuY2hhdEZ1bmN0aW9uLmFkZEVudmlyb25tZW50KFxuICAgICAgXCJTRVNTSU9OX0hBTkRMRVJcIiwgbGFtYmRhRnVuY3Rpb25zLnNlc3Npb25GdW5jdGlvbi5mdW5jdGlvbk5hbWUpXG4gICAgXG5cbiAgICBjb25zdCBmZWVkYmFja0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmVlZGJhY2tBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5mZWVkYmFja0Z1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi91c2VyLWZlZWRiYWNrXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVCwgYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1QsIGFwaWd3djIuSHR0cE1ldGhvZC5ERUxFVEVdLFxuICAgICAgaW50ZWdyYXRpb246IGZlZWRiYWNrQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgY29uc3QgZmVlZGJhY2tBUElEb3dubG9hZEludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignRmVlZGJhY2tEb3dubG9hZEFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmZlZWRiYWNrRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3VzZXItZmVlZGJhY2svZG93bmxvYWQtZmVlZGJhY2tcIixcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogZmVlZGJhY2tBUElEb3dubG9hZEludGVncmF0aW9uLFxuICAgICAgYXV0aG9yaXplcjogaHR0cEF1dGhvcml6ZXIsXG4gICAgfSlcblxuICAgIGNvbnN0IHMzR2V0QVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdTM0dldEFQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLmdldFMzRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL3MzLWJ1Y2tldC1kYXRhXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IHMzR2V0QVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgY29uc3QgczNEZWxldGVBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ1MzRGVsZXRlQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuZGVsZXRlUzNGdW5jdGlvbik7XG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogXCIvZGVsZXRlLXMzLWZpbGVcIixcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuUE9TVF0sXG4gICAgICBpbnRlZ3JhdGlvbjogczNEZWxldGVBUElJbnRlZ3JhdGlvbixcbiAgICAgIGF1dGhvcml6ZXI6IGh0dHBBdXRob3JpemVyLFxuICAgIH0pXG5cbiAgICBjb25zdCBzM1VwbG9hZEFQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignUzNVcGxvYWRBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy51cGxvYWRTM0Z1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi9zaWduZWQtdXJsXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLlBPU1RdLFxuICAgICAgaW50ZWdyYXRpb246IHMzVXBsb2FkQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgY29uc3Qga2VuZHJhU3luY1Byb2dyZXNzQVBJSW50ZWdyYXRpb24gPSBuZXcgSHR0cExhbWJkYUludGVncmF0aW9uKCdLZW5kcmFTeW5jQVBJSW50ZWdyYXRpb24nLCBsYW1iZGFGdW5jdGlvbnMuc3luY0tlbmRyYUZ1bmN0aW9uKTtcbiAgICByZXN0QmFja2VuZC5yZXN0QVBJLmFkZFJvdXRlcyh7XG4gICAgICBwYXRoOiBcIi9rZW5kcmEtc3luYy9zdGlsbC1zeW5jaW5nXCIsXG4gICAgICBtZXRob2RzOiBbYXBpZ3d2Mi5IdHRwTWV0aG9kLkdFVF0sXG4gICAgICBpbnRlZ3JhdGlvbjoga2VuZHJhU3luY1Byb2dyZXNzQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG4gICAgY29uc3Qga2VuZHJhU3luY0FQSUludGVncmF0aW9uID0gbmV3IEh0dHBMYW1iZGFJbnRlZ3JhdGlvbignS2VuZHJhU3luY0FQSUludGVncmF0aW9uJywgbGFtYmRhRnVuY3Rpb25zLnN5bmNLZW5kcmFGdW5jdGlvbik7XG4gICAgcmVzdEJhY2tlbmQucmVzdEFQSS5hZGRSb3V0ZXMoe1xuICAgICAgcGF0aDogXCIva2VuZHJhLXN5bmMvc3luYy1rZW5kcmFcIixcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBrZW5kcmFTeW5jQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuICAgIFxuICAgIGNvbnN0IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJBUElJbnRlZ3JhdGlvbiA9IG5ldyBIdHRwTGFtYmRhSW50ZWdyYXRpb24oJ0NoYXRJbnZvY2F0aW9uc0NvdW50ZXJBUElJbnRlZ3JhdGlvbicsIGxhbWJkYUZ1bmN0aW9ucy5jaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24pO1xuICAgIHJlc3RCYWNrZW5kLnJlc3RBUEkuYWRkUm91dGVzKHtcbiAgICAgIHBhdGg6IFwiL2NoYXQtaW52b2NhdGlvbnMtY291bnRcIixcbiAgICAgIG1ldGhvZHM6IFthcGlnd3YyLkh0dHBNZXRob2QuR0VUXSxcbiAgICAgIGludGVncmF0aW9uOiBjaGF0SW52b2NhdGlvbnNDb3VudGVyQVBJSW50ZWdyYXRpb24sXG4gICAgICBhdXRob3JpemVyOiBodHRwQXV0aG9yaXplcixcbiAgICB9KVxuXG5cbiAgICAgIC8vIHRoaXMud3NBUEkgPSB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJO1xuXG5cblxuXG4gICAgLy8gY29uc3QgYXBpID0gbmV3IGFwcHN5bmMuR3JhcGhxbEFwaSh0aGlzLCBcIkNoYXRib3RBcGlcIiwge1xuICAgIC8vICAgbmFtZTogXCJDaGF0Ym90R3JhcGhxbEFwaVwiLFxuICAgIC8vICAgZGVmaW5pdGlvbjogYXBwc3luYy5EZWZpbml0aW9uLmZyb21GaWxlKFxuICAgIC8vICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcInNjaGVtYS9zY2hlbWEuZ3JhcGhxbFwiKVxuICAgIC8vICAgKSxcbiAgICAvLyAgIGF1dGhvcml6YXRpb25Db25maWc6IHtcbiAgICAvLyAgICAgYWRkaXRpb25hbEF1dGhvcml6YXRpb25Nb2RlczogW1xuICAgIC8vICAgICAgIHtcbiAgICAvLyAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLklBTSxcbiAgICAvLyAgICAgICB9LFxuICAgIC8vICAgICAgIHtcbiAgICAvLyAgICAgICAgIGF1dGhvcml6YXRpb25UeXBlOiBhcHBzeW5jLkF1dGhvcml6YXRpb25UeXBlLlVTRVJfUE9PTCxcbiAgICAvLyAgICAgICAgIHVzZXJQb29sQ29uZmlnOiB7XG4gICAgLy8gICAgICAgICAgIHVzZXJQb29sOiBwcm9wcy51c2VyUG9vbCxcbiAgICAvLyAgICAgICAgIH0sXG4gICAgLy8gICAgICAgfSxcbiAgICAvLyAgICAgXSxcbiAgICAvLyAgIH0sXG4gICAgLy8gICBsb2dDb25maWc6IHtcbiAgICAvLyAgICAgZmllbGRMb2dMZXZlbDogYXBwc3luYy5GaWVsZExvZ0xldmVsLkFMTCxcbiAgICAvLyAgICAgcmV0ZW50aW9uOiBSZXRlbnRpb25EYXlzLk9ORV9XRUVLLFxuICAgIC8vICAgICByb2xlOiBsb2dnaW5nUm9sZSxcbiAgICAvLyAgIH0sXG4gICAgLy8gICB4cmF5RW5hYmxlZDogdHJ1ZSxcbiAgICAvLyAgIHZpc2liaWxpdHk6IHByb3BzLmNvbmZpZy5wcml2YXRlV2Vic2l0ZSA/IGFwcHN5bmMuVmlzaWJpbGl0eS5QUklWQVRFIDogYXBwc3luYy5WaXNpYmlsaXR5LkdMT0JBTFxuICAgIC8vIH0pO1xuXG4gICAgLy8gbmV3IEFwaVJlc29sdmVycyh0aGlzLCBcIlJlc3RBcGlcIiwge1xuICAgIC8vICAgLi4ucHJvcHMsXG4gICAgLy8gICBzZXNzaW9uc1RhYmxlOiBjaGF0VGFibGVzLnNlc3Npb25zVGFibGUsXG4gICAgLy8gICBieVVzZXJJZEluZGV4OiBjaGF0VGFibGVzLmJ5VXNlcklkSW5kZXgsXG4gICAgLy8gICBhcGksXG4gICAgLy8gICB1c2VyRmVlZGJhY2tCdWNrZXQ6IGNoYXRCdWNrZXRzLnVzZXJGZWVkYmFja0J1Y2tldCxcbiAgICAvLyB9KTtcblxuICAgIC8vIGNvbnN0IHJlYWx0aW1lQmFja2VuZCA9IG5ldyBSZWFsdGltZUdyYXBocWxBcGlCYWNrZW5kKHRoaXMsIFwiUmVhbHRpbWVcIiwge1xuICAgIC8vICAgLi4ucHJvcHMsXG4gICAgLy8gICBhcGksXG4gICAgLy8gfSk7XG5cbiAgICAvLyByZWFsdGltZUJhY2tlbmQucmVzb2x2ZXJzLm91dGdvaW5nTWVzc2FnZUhhbmRsZXIuYWRkRW52aXJvbm1lbnQoXG4gICAgLy8gICBcIkdSQVBIUUxfRU5EUE9JTlRcIixcbiAgICAvLyAgIGFwaS5ncmFwaHFsVXJsXG4gICAgLy8gKTtcblxuICAgIC8vIGFwaS5ncmFudE11dGF0aW9uKHJlYWx0aW1lQmFja2VuZC5yZXNvbHZlcnMub3V0Z29pbmdNZXNzYWdlSGFuZGxlcik7XG5cbiAgICAvLyAvLyBQcmludHMgb3V0IFVSTFxuICAgIC8vIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiR3JhcGhxbEFQSVVSTFwiLCB7XG4gICAgLy8gICB2YWx1ZTogYXBpLmdyYXBocWxVcmwsXG4gICAgLy8gfSk7XG5cbiAgICAvLyAvLyBQcmludHMgb3V0IHRoZSBBcHBTeW5jIEdyYXBoUUwgQVBJIGtleSB0byB0aGUgdGVybWluYWxcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCBcIldTLUFQSSAtIGFwaUVuZHBvaW50XCIsIHtcbiAgICAgIHZhbHVlOiB3ZWJzb2NrZXRCYWNrZW5kLndzQVBJLmFwaUVuZHBvaW50IHx8IFwiXCIsXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgXCJIVFRQLUFQSSAtIGFwaUVuZHBvaW50XCIsIHtcbiAgICAgIHZhbHVlOiByZXN0QmFja2VuZC5yZXN0QVBJLmFwaUVuZHBvaW50IHx8IFwiXCIsXG4gICAgfSk7XG5cbiAgICAvLyB0aGlzLm1lc3NhZ2VzVG9waWMgPSByZWFsdGltZUJhY2tlbmQubWVzc2FnZXNUb3BpYztcbiAgICAvLyB0aGlzLnNlc3Npb25zVGFibGUgPSBjaGF0VGFibGVzLnNlc3Npb25zVGFibGU7XG4gICAgLy8gdGhpcy5ieVVzZXJJZEluZGV4ID0gY2hhdFRhYmxlcy5ieVVzZXJJZEluZGV4O1xuICAgIC8vIHRoaXMudXNlckZlZWRiYWNrQnVja2V0ID0gY2hhdEJ1Y2tldHMudXNlckZlZWRiYWNrQnVja2V0O1xuICAgIC8vIHRoaXMuZmlsZXNCdWNrZXQgPSBjaGF0QnVja2V0cy5maWxlc0J1Y2tldDtcbiAgICAvLyB0aGlzLmdyYXBocWxBcGkgPSBhcGk7XG5cbiAgICAvKipcbiAgICAgKiBDREsgTkFHIHN1cHByZXNzaW9uXG4gICAgICovXG4gICAgLy8gTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKGxvZ2dpbmdSb2xlLCBbXG4gICAgLy8gICB7XG4gICAgLy8gICAgIGlkOiBcIkF3c1NvbHV0aW9ucy1JQU01XCIsXG4gICAgLy8gICAgIHJlYXNvbjpcbiAgICAvLyAgICAgICBcIkFjY2VzcyB0byBhbGwgbG9nIGdyb3VwcyByZXF1aXJlZCBmb3IgQ2xvdWRXYXRjaCBsb2cgZ3JvdXAgY3JlYXRpb24uXCIsXG4gICAgLy8gICB9LFxuICAgIC8vIF0pO1xuICB9XG59XG4iXX0=