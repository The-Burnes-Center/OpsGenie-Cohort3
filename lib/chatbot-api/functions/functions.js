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
exports.LambdaFunctionStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const path = __importStar(require("path"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
// Import Lambda L2 construct
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const step_functions_1 = require("./step-functions/step-functions");
class LambdaFunctionStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id);
        const sessionAPIHandlerFunction = new lambda.Function(scope, 'SessionHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'session-handler')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "DDB_TABLE_NAME": props.sessionTable.tableName
            },
            timeout: cdk.Duration.seconds(30)
        });
        const kpiAPIHandlerFunction = new lambda.Function(scope, 'KPIHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'kpi-handler')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "INTERACTION_TABLE": props.kpiLogsTable.tableName,
                "DAILY_LOGIN_TABLE": props.dailyLoginTable.tableName
            },
            timeout: cdk.Duration.seconds(30)
        });
        kpiAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [
                props.kpiLogsTable.tableArn,
                props.kpiLogsTable.tableArn + "/index/*",
                props.dailyLoginTable.tableArn,
                props.dailyLoginTable.tableArn + "/index/*"
            ]
        }));
        this.kpiFunction = kpiAPIHandlerFunction;
        sessionAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.sessionTable.tableArn, props.sessionTable.tableArn + "/index/*"]
        }));
        this.sessionFunction = sessionAPIHandlerFunction;
        // Define the Lambda function resource
        const websocketAPIFunction = new lambda.Function(scope, 'ChatHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'websocket-chat')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "mvp_websocket__api_endpoint_test": props.wsApiEndpoint.replace("wss", "https"),
                "INDEX_ID": props.kendraIndex.attrId,
                'SESSION_HANDLER': sessionAPIHandlerFunction.functionName,
            },
            timeout: cdk.Duration.seconds(300)
        });
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:InvokeModel'
            ],
            resources: ["*"]
        }));
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'kendra:Retrieve'
            ],
            resources: [props.kendraIndex.attrArn]
        }));
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'lambda:InvokeFunction'
            ],
            resources: [this.sessionFunction.functionArn]
        }));
        websocketAPIFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject'
            ],
            resources: ['arn:aws:iam::807596108910:role/ITOPSRAGStack-ChatbotAPIKendraIndexRole0A5CCA00-mOwqNPZz42yg/*']
        }));
        this.chatFunction = websocketAPIFunction;
        const feedbackAPIHandlerFunction = new lambda.Function(scope, 'FeedbackHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'feedback-handler')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "FEEDBACK_TABLE": props.feedbackTable.tableName,
                "FEEDBACK_S3_DOWNLOAD": props.feedbackBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        feedbackAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.feedbackTable.tableArn, props.feedbackTable.tableArn + "/index/*"]
        }));
        feedbackAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.feedbackBucket.bucketArn, props.feedbackBucket.bucketArn + "/*"]
        }));
        this.feedbackFunction = feedbackAPIHandlerFunction;
        const deleteS3APIHandlerFunction = new lambda.Function(scope, 'DeleteS3FilesHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/delete-s3')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        deleteS3APIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.deleteS3Function = deleteS3APIHandlerFunction;
        const getS3KnowledgeAPIHandlerFunction = new lambda.Function(scope, 'GetS3KnowledgeFilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/get-s3')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        getS3KnowledgeAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.getS3KnowledgeFunction = getS3KnowledgeAPIHandlerFunction;
        const getS3TestCasesAPIHandlerFunction = new lambda.Function(scope, 'GetS3TestCasesFilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/S3-get-test-cases')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        getS3TestCasesAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.evalTestCasesBucket.bucketArn, props.evalTestCasesBucket.bucketArn + "/*"]
        }));
        this.getS3TestCasesFunction = getS3TestCasesAPIHandlerFunction;
        const kendraSyncAPIHandlerFunction = new lambda.Function(scope, 'SyncKendraHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/kendra-sync')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "KENDRA": props.kendraIndex.attrId,
                "SOURCE": props.kendraSource.attrId
            },
            timeout: cdk.Duration.seconds(30)
        });
        kendraSyncAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'kendra:*'
            ],
            resources: [props.kendraIndex.attrArn, props.kendraSource.attrArn]
        }));
        this.syncKendraFunction = kendraSyncAPIHandlerFunction;
        const uploadS3KnowledgeAPIHandlerFunction = new lambda.Function(scope, 'UploadS3KnowledgeFilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/upload-s3')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        uploadS3KnowledgeAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.uploadS3KnowledgeFunction = uploadS3KnowledgeAPIHandlerFunction;
        const uploadS3TestCasesFunction = new lambda.Function(scope, 'UploadS3TestCasesFilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/S3-upload')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        uploadS3TestCasesFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.evalTestCasesBucket.bucketArn, props.evalTestCasesBucket.bucketArn + "/*"]
        }));
        this.uploadS3TestCasesFunction = uploadS3TestCasesFunction;
        const evalResultsAPIHandlerFunction = new lambda.Function(scope, 'EvalResultsHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-eval/eval-results-handler')), // Points to the lambda directory
            handler: 'lambda_function.lambda_handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "EVALUATION_RESULTS_TABLE": props.evalResutlsTable.tableName,
                "EVALUATION_SUMMARIES_TABLE": props.evalSummariesTable.tableName
            }
        });
        evalResultsAPIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'dynamodb:GetItem',
                'dynamodb:PutItem',
                'dynamodb:UpdateItem',
                'dynamodb:DeleteItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [props.evalResutlsTable.tableArn, props.evalResutlsTable.tableArn + "/index/*", props.evalSummariesTable.tableArn, props.evalSummariesTable.tableArn + "/index/*"]
        }));
        this.handleEvalResultsFunction = evalResultsAPIHandlerFunction;
        props.evalResutlsTable.grantReadWriteData(evalResultsAPIHandlerFunction);
        props.evalSummariesTable.grantReadWriteData(evalResultsAPIHandlerFunction);
        this.stepFunctionsStack = new step_functions_1.StepFunctionsStack(scope, 'StepFunctionsStack', {
            knowledgeBase: props.kendraIndex,
            evalSummariesTable: props.evalSummariesTable,
            evalResutlsTable: props.evalResutlsTable,
            evalTestCasesBucket: props.evalTestCasesBucket
        });
        const chatInvocationsCounterFunction = new lambda.Function(scope, 'ChatInvocationsCounterFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'chat-invocations-counter')),
            handler: 'lambda_function.lambda_handler',
            timeout: cdk.Duration.seconds(30),
            environment: {
                CHAT_FUNCTION_NAME: this.chatFunction.functionName,
            },
        });
        chatInvocationsCounterFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cloudwatch:GetMetricStatistics'],
            resources: ['*'],
        }));
        this.chatInvocationsCounterFunction = chatInvocationsCounterFunction;
        const comprehendMedicalFunction = new lambda.Function(scope, 'comprehendMedicalFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'comprehend-medical')),
            handler: 'lambda_function.lambda_handler',
            timeout: cdk.Duration.seconds(60),
        });
        this.comprehendMedicalFunction = comprehendMedicalFunction;
        comprehendMedicalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['comprehend:DetectPiiEntities'],
            resources: ['*'], // Adjust if specific resources are used.
        }));
        // Create an EventBridge rule to trigger the KPI handler daily
        const dailyLoginRule = new events.Rule(scope, 'DailyLoginRule', {
            schedule: events.Schedule.cron({ minute: '0', hour: '23', day: '*', month: '*', year: '*' }), // Daily at 11 PM UTC
            description: 'Trigger daily login count calculation for KPI dashboard',
        });
        // Add target to the rule pointing to the KPI handler function
        dailyLoginRule.addTarget(new targets.LambdaFunction(kpiAPIHandlerFunction, {
            event: events.RuleTargetInput.fromObject({
                routeKey: "POST /daily-logins"
            })
        }));
    }
}
exports.LambdaFunctionStack = LambdaFunctionStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZnVuY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLDJDQUE2QjtBQUM3QiwrREFBaUQ7QUFDakQsd0VBQTBEO0FBRTFELDZCQUE2QjtBQUM3QiwrREFBaUQ7QUFDakQseURBQTJDO0FBSzNDLG9FQUFxRTtBQW1CckUsTUFBYSxtQkFBb0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQWtCaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSx3QkFBd0IsRUFBRTtZQUNyRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsdUNBQXVDO1lBQzVFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsaUNBQWlDO1lBQ3ZHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxxREFBcUQ7WUFDaEcsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUzthQUNoRDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLG9CQUFvQixFQUFFO1lBQzdFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSx1Q0FBdUM7WUFDNUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJ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QUUsR0FBRyxFQUFFLEtBQUssRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUscUJBQXFCO1lBQ25ILFdBQVcsRUFBRSx5REFBeUQ7U0FDdkUsQ0FBQyxDQUFDO1FBRUgsOERBQThEO1FBQzlELGNBQWMsQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFO1lBQ3pFLEtBQUssRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQztnQkFDdkMsUUFBUSxFQUFFLG9CQUFvQjthQUMvQixDQUFDO1NBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFTixDQUFDO0NBQ0Y7QUF0V0Qsa0RBc1dDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcbmltcG9ydCAqIGFzIGV2ZW50cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzJztcclxuaW1wb3J0ICogYXMgdGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnO1xyXG5cclxuLy8gSW1wb3J0IExhbWJkYSBMMiBjb25zdHJ1Y3RcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMga2VuZHJhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rZW5kcmEnO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XHJcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xyXG5pbXBvcnQgeyBTdGVwRnVuY3Rpb25zU3RhY2sgfSBmcm9tICcuL3N0ZXAtZnVuY3Rpb25zL3N0ZXAtZnVuY3Rpb25zJztcclxuXHJcblxyXG5pbnRlcmZhY2UgTGFtYmRhRnVuY3Rpb25TdGFja1Byb3BzIHsgIFxyXG4gIHJlYWRvbmx5IHdzQXBpRW5kcG9pbnQgOiBzdHJpbmc7ICBcclxuICByZWFkb25seSBzZXNzaW9uVGFibGUgOiBUYWJsZTtcclxuICByZWFkb25seSBrZW5kcmFJbmRleCA6IGtlbmRyYS5DZm5JbmRleDtcclxuICByZWFkb25seSBrZW5kcmFTb3VyY2UgOiBrZW5kcmEuQ2ZuRGF0YVNvdXJjZTtcclxuICByZWFkb25seSBmZWVkYmFja1RhYmxlIDogVGFibGU7XHJcbiAgcmVhZG9ubHkgZmVlZGJhY2tCdWNrZXQgOiBzMy5CdWNrZXQ7XHJcbiAgcmVhZG9ubHkga25vd2xlZGdlQnVja2V0IDogczMuQnVja2V0O1xyXG4gIHJlYWRvbmx5IGV2YWxTdW1tYXJpZXNUYWJsZSA6IFRhYmxlO1xyXG4gIHJlYWRvbmx5IGV2YWxSZXN1dGxzVGFibGUgOiBUYWJsZTtcclxuICByZWFkb25seSBldmFsVGVzdENhc2VzQnVja2V0IDogczMuQnVja2V0O1xyXG4gIHJlYWRvbmx5IGtwaUxvZ3NUYWJsZTogVGFibGU7XHJcbiAgcmVhZG9ubHkgZGFpbHlMb2dpblRhYmxlOiBUYWJsZTtcclxuICAvL3JlYWRvbmx5IGtwaVRhYmxlIDogVGFibGU7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBMYW1iZGFGdW5jdGlvblN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHsgIFxyXG4gIHB1YmxpYyByZWFkb25seSBjaGF0RnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IHNlc3Npb25GdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZmVlZGJhY2tGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZGVsZXRlUzNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ2V0UzNLbm93bGVkZ2VGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgZ2V0UzNUZXN0Q2FzZXNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgdXBsb2FkUzNLbm93bGVkZ2VGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgdXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgc3luY0tlbmRyYUZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBjaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBrcGlGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgaGFuZGxlRXZhbFJlc3VsdHNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgc3RlcEZ1bmN0aW9uc1N0YWNrIDogU3RlcEZ1bmN0aW9uc1N0YWNrO1xyXG5cclxuXHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBMYW1iZGFGdW5jdGlvblN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7ICAgIFxyXG5cclxuICAgIGNvbnN0IHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnU2Vzc2lvbkhhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3Nlc3Npb24taGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiRERCX1RBQkxFX05BTUVcIiA6IHByb3BzLnNlc3Npb25UYWJsZS50YWJsZU5hbWVcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBrcGlBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnS1BJSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAna3BpLWhhbmRsZXInKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIklOVEVSQUNUSU9OX1RBQkxFXCI6IHByb3BzLmtwaUxvZ3NUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgXCJEQUlMWV9MT0dJTl9UQUJMRVwiOiBwcm9wcy5kYWlseUxvZ2luVGFibGUudGFibGVOYW1lXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcblxyXG4gICAga3BpQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICBwcm9wcy5rcGlMb2dzVGFibGUudGFibGVBcm4sIFxyXG4gICAgICAgIHByb3BzLmtwaUxvZ3NUYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIixcclxuICAgICAgICBwcm9wcy5kYWlseUxvZ2luVGFibGUudGFibGVBcm4sXHJcbiAgICAgICAgcHJvcHMuZGFpbHlMb2dpblRhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXHJcbiAgICAgIF1cclxuICAgIH0pKTtcclxuXHJcbiAgICB0aGlzLmtwaUZ1bmN0aW9uID0ga3BpQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG4gICAgXHJcbiAgICBzZXNzaW9uQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5zZXNzaW9uVGFibGUudGFibGVBcm4sIHByb3BzLnNlc3Npb25UYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB0aGlzLnNlc3Npb25GdW5jdGlvbiA9IHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb247XHJcblxyXG5cclxuXHJcbiAgICAvLyBEZWZpbmUgdGhlIExhbWJkYSBmdW5jdGlvbiByZXNvdXJjZVxyXG4gICAgY29uc3Qgd2Vic29ja2V0QVBJRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnQ2hhdEhhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3dlYnNvY2tldC1jaGF0JykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudCA6IHtcclxuICAgICAgICBcIm12cF93ZWJzb2NrZXRfX2FwaV9lbmRwb2ludF90ZXN0XCIgOiBwcm9wcy53c0FwaUVuZHBvaW50LnJlcGxhY2UoXCJ3c3NcIixcImh0dHBzXCIpLFxyXG4gICAgICAgIFwiSU5ERVhfSURcIiA6IHByb3BzLmtlbmRyYUluZGV4LmF0dHJJZCxcclxuICAgICAgICAnU0VTU0lPTl9IQU5ETEVSJyA6IHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApXHJcbiAgICB9KTtcclxuICAgIHdlYnNvY2tldEFQSUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXHJcbiAgICB9KSk7XHJcblxyXG4gICAgICAgIFxyXG4gICAgd2Vic29ja2V0QVBJRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2tlbmRyYTpSZXRyaWV2ZSdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua2VuZHJhSW5kZXguYXR0ckFybl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFt0aGlzLnNlc3Npb25GdW5jdGlvbi5mdW5jdGlvbkFybl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6R2V0T2JqZWN0J1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnYXJuOmF3czppYW06OjgwNzU5NjEwODkxMDpyb2xlL0lUT1BTUkFHU3RhY2stQ2hhdGJvdEFQSUtlbmRyYUluZGV4Um9sZTBBNUNDQTAwLW1Pd3FOUFp6NDJ5Zy8qJ11cclxuICAgIH0pKTtcclxuICAgICAgICBcclxuICAgIHRoaXMuY2hhdEZ1bmN0aW9uID0gd2Vic29ja2V0QVBJRnVuY3Rpb247XHJcblxyXG4gICAgY29uc3QgZmVlZGJhY2tBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnRmVlZGJhY2tIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdmZWVkYmFjay1oYW5kbGVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJGRUVEQkFDS19UQUJMRVwiIDogcHJvcHMuZmVlZGJhY2tUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgXCJGRUVEQkFDS19TM19ET1dOTE9BRFwiIDogcHJvcHMuZmVlZGJhY2tCdWNrZXQuYnVja2V0TmFtZVxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgICAnZHluYW1vZGI6U2NhbidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZmVlZGJhY2tUYWJsZS50YWJsZUFybiwgcHJvcHMuZmVlZGJhY2tUYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIl1cclxuICAgIH0pKTtcclxuXHJcbiAgICBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZmVlZGJhY2tCdWNrZXQuYnVja2V0QXJuLHByb3BzLmZlZWRiYWNrQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXHJcbiAgICB9KSk7XHJcblxyXG4gICAgdGhpcy5mZWVkYmFja0Z1bmN0aW9uID0gZmVlZGJhY2tBUElIYW5kbGVyRnVuY3Rpb247XHJcbiAgICBcclxuICAgIGNvbnN0IGRlbGV0ZVMzQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0RlbGV0ZVMzRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC9kZWxldGUtczMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICBkZWxldGVTM0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybixwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMuZGVsZXRlUzNGdW5jdGlvbiA9IGRlbGV0ZVMzQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG5cclxuICAgIGNvbnN0IGdldFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0dldFMzS25vd2xlZGdlRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC9nZXQtczMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcblxyXG4gICAgZ2V0UzNLbm93bGVkZ2VBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3MzOionXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4scHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXHJcbiAgICB9KSk7XHJcbiAgICB0aGlzLmdldFMzS25vd2xlZGdlRnVuY3Rpb24gPSBnZXRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbjtcclxuXHJcbiAgICBjb25zdCBnZXRTM1Rlc3RDYXNlc0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdHZXRTM1Rlc3RDYXNlc0ZpbGVzSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWwvUzMtZ2V0LXRlc3QtY2FzZXMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0TmFtZSwgICAgICAgIFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG5cclxuICAgIGdldFMzVGVzdENhc2VzQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzoqJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybixwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXHJcbiAgICB9KSk7XHJcbiAgICB0aGlzLmdldFMzVGVzdENhc2VzRnVuY3Rpb24gPSBnZXRTM1Rlc3RDYXNlc0FQSUhhbmRsZXJGdW5jdGlvbjtcclxuXHJcblxyXG4gICAgY29uc3Qga2VuZHJhU3luY0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdTeW5jS2VuZHJhSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAna25vd2xlZGdlLW1hbmFnZW1lbnQva2VuZHJhLXN5bmMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIktFTkRSQVwiIDogcHJvcHMua2VuZHJhSW5kZXguYXR0cklkLCAgICAgIFxyXG4gICAgICAgIFwiU09VUkNFXCIgOiBwcm9wcy5rZW5kcmFTb3VyY2UuYXR0cklkICBcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICBrZW5kcmFTeW5jQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdrZW5kcmE6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua2VuZHJhSW5kZXguYXR0ckFybiwgcHJvcHMua2VuZHJhU291cmNlLmF0dHJBcm5dXHJcbiAgICB9KSk7XHJcbiAgICB0aGlzLnN5bmNLZW5kcmFGdW5jdGlvbiA9IGtlbmRyYVN5bmNBUElIYW5kbGVyRnVuY3Rpb247XHJcblxyXG4gICAgY29uc3QgdXBsb2FkUzNLbm93bGVkZ2VBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnVXBsb2FkUzNLbm93bGVkZ2VGaWxlc0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L3VwbG9hZC1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICB1cGxvYWRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybixwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMudXBsb2FkUzNLbm93bGVkZ2VGdW5jdGlvbiA9IHVwbG9hZFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG5cclxuICAgIGNvbnN0IHVwbG9hZFMzVGVzdENhc2VzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnVXBsb2FkUzNUZXN0Q2FzZXNGaWxlc0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsL1MzLXVwbG9hZCcpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcblxyXG4gICAgdXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4scHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxyXG4gICAgfSkpO1xyXG4gICAgdGhpcy51cGxvYWRTM1Rlc3RDYXNlc0Z1bmN0aW9uID0gdXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbjtcclxuXHJcblxyXG4gICAgY29uc3QgZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbC9ldmFsLXJlc3VsdHMtaGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiRVZBTFVBVElPTl9SRVNVTFRTX1RBQkxFXCIgOiBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBcIkVWQUxVQVRJT05fU1VNTUFSSUVTX1RBQkxFXCIgOiBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUudGFibGVOYW1lXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHsgXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlQXJuLCBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiLCBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUudGFibGVBcm4sIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMuaGFuZGxlRXZhbFJlc3VsdHNGdW5jdGlvbiA9IGV2YWxSZXN1bHRzQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG4gICAgcHJvcHMuZXZhbFJlc3V0bHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb24pO1xyXG4gICAgcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShldmFsUmVzdWx0c0FQSUhhbmRsZXJGdW5jdGlvbik7XHJcblxyXG4gICAgdGhpcy5zdGVwRnVuY3Rpb25zU3RhY2sgPSBuZXcgU3RlcEZ1bmN0aW9uc1N0YWNrKHNjb3BlLCAnU3RlcEZ1bmN0aW9uc1N0YWNrJywge1xyXG4gICAgICBrbm93bGVkZ2VCYXNlOiBwcm9wcy5rZW5kcmFJbmRleCxcclxuICAgICAgZXZhbFN1bW1hcmllc1RhYmxlOiBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUsXHJcbiAgICAgIGV2YWxSZXN1dGxzVGFibGU6IHByb3BzLmV2YWxSZXN1dGxzVGFibGUsXHJcbiAgICAgIGV2YWxUZXN0Q2FzZXNCdWNrZXQ6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXRcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdDaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2NoYXQtaW52b2NhdGlvbnMtY291bnRlcicpKSxcclxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDSEFUX0ZVTkNUSU9OX05BTUU6IHRoaXMuY2hhdEZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcclxuICAgICAgfSwgICAgXHJcbiAgICB9KTtcclxuXHJcbiAgICBjaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6R2V0TWV0cmljU3RhdGlzdGljcyddLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIHRoaXMuY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uID0gY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uO1xyXG5cclxuICAgIGNvbnN0IGNvbXByZWhlbmRNZWRpY2FsRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnY29tcHJlaGVuZC1tZWRpY2FsJykpLFxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAgIFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uID0gY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbjtcclxuXHJcbiAgICBjb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogWydjb21wcmVoZW5kOkRldGVjdFBpaUVudGl0aWVzJ10sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIEFkanVzdCBpZiBzcGVjaWZpYyByZXNvdXJjZXMgYXJlIHVzZWQuXHJcbiAgICB9KSk7XHJcbiAgICBcclxuXHJcbiAgICAvLyBDcmVhdGUgYW4gRXZlbnRCcmlkZ2UgcnVsZSB0byB0cmlnZ2VyIHRoZSBLUEkgaGFuZGxlciBkYWlseVxyXG4gICAgY29uc3QgZGFpbHlMb2dpblJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUoc2NvcGUsICdEYWlseUxvZ2luUnVsZScsIHtcclxuICAgICAgc2NoZWR1bGU6IGV2ZW50cy5TY2hlZHVsZS5jcm9uKHsgbWludXRlOiAnMCcsIGhvdXI6ICcyMycsIGRheTogJyonLCBtb250aDogJyonLCB5ZWFyOiAnKicgfSksIC8vIERhaWx5IGF0IDExIFBNIFVUQ1xyXG4gICAgICBkZXNjcmlwdGlvbjogJ1RyaWdnZXIgZGFpbHkgbG9naW4gY291bnQgY2FsY3VsYXRpb24gZm9yIEtQSSBkYXNoYm9hcmQnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIHRhcmdldCB0byB0aGUgcnVsZSBwb2ludGluZyB0byB0aGUgS1BJIGhhbmRsZXIgZnVuY3Rpb25cclxuICAgIGRhaWx5TG9naW5SdWxlLmFkZFRhcmdldChuZXcgdGFyZ2V0cy5MYW1iZGFGdW5jdGlvbihrcGlBUElIYW5kbGVyRnVuY3Rpb24sIHtcclxuICAgICAgZXZlbnQ6IGV2ZW50cy5SdWxlVGFyZ2V0SW5wdXQuZnJvbU9iamVjdCh7XHJcbiAgICAgICAgcm91dGVLZXk6IFwiUE9TVCAvZGFpbHktbG9naW5zXCJcclxuICAgICAgfSlcclxuICAgIH0pKTtcclxuXHJcbiAgfVxyXG59XHJcbiJdfQ==