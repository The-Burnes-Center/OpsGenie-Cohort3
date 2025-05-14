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
    }
}
exports.LambdaFunctionStack = LambdaFunctionStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZnVuY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLDJDQUE2QjtBQUU3Qiw2QkFBNkI7QUFDN0IsK0RBQWlEO0FBQ2pELHlEQUEyQztBQUszQyxvRUFBcUU7QUFtQnJFLE1BQWEsbUJBQW9CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFrQmhELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBK0I7UUFDdkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLHlCQUF5QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsd0JBQXdCLEVBQUU7WUFDckYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLHVDQUF1QztZQUM1RSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLGlDQUFpQztZQUN2RyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUscURBQXFEO1lBQ2hHLFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRyxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVM7YUFDaEQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsRUFBRTtZQUM3RSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsdUNBQXVDO1lBQzVFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMs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QztZQUNyRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLGdDQUFnQyxDQUFDO1lBQzNDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUNqQixDQUFDLENBQUMsQ0FBQztRQUVKLElBQUksQ0FBQyw4QkFBOEIsR0FBRyw4QkFBOEIsQ0FBQztRQUVyRSxNQUFNLHlCQUF5QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsMkJBQTJCLEVBQUU7WUFDeEYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVztZQUNuQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUN2RSxPQUFPLEVBQUUsZ0NBQWdDO1lBQ3pDLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHlCQUF5QixHQUFHLHlCQUF5QixDQUFDO1FBRTNELHlCQUF5QixDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDaEUsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyw4QkFBOEIsQ0FBQztZQUN6QyxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUMsRUFBRSx5Q0FBeUM7U0FDNUQsQ0FBQyxDQUFDLENBQUM7SUFJTixDQUFDO0NBQ0Y7QUExVkQsa0RBMFZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG4vLyBJbXBvcnQgTGFtYmRhIEwyIGNvbnN0cnVjdFxyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBrZW5kcmEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWtlbmRyYSc7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtczNcIjtcclxuaW1wb3J0ICogYXMgY2xvdWR3YXRjaCBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2xvdWR3YXRjaCc7XHJcbmltcG9ydCB7IFN0ZXBGdW5jdGlvbnNTdGFjayB9IGZyb20gJy4vc3RlcC1mdW5jdGlvbnMvc3RlcC1mdW5jdGlvbnMnO1xyXG5cclxuXHJcbmludGVyZmFjZSBMYW1iZGFGdW5jdGlvblN0YWNrUHJvcHMgeyAgXHJcbiAgcmVhZG9ubHkgd3NBcGlFbmRwb2ludCA6IHN0cmluZzsgIFxyXG4gIHJlYWRvbmx5IHNlc3Npb25UYWJsZSA6IFRhYmxlO1xyXG4gIHJlYWRvbmx5IGtlbmRyYUluZGV4IDoga2VuZHJhLkNmbkluZGV4O1xyXG4gIHJlYWRvbmx5IGtlbmRyYVNvdXJjZSA6IGtlbmRyYS5DZm5EYXRhU291cmNlO1xyXG4gIHJlYWRvbmx5IGZlZWRiYWNrVGFibGUgOiBUYWJsZTtcclxuICByZWFkb25seSBmZWVkYmFja0J1Y2tldCA6IHMzLkJ1Y2tldDtcclxuICByZWFkb25seSBrbm93bGVkZ2VCdWNrZXQgOiBzMy5CdWNrZXQ7XHJcbiAgcmVhZG9ubHkgZXZhbFN1bW1hcmllc1RhYmxlIDogVGFibGU7XHJcbiAgcmVhZG9ubHkgZXZhbFJlc3V0bHNUYWJsZSA6IFRhYmxlO1xyXG4gIHJlYWRvbmx5IGV2YWxUZXN0Q2FzZXNCdWNrZXQgOiBzMy5CdWNrZXQ7XHJcbiAgcmVhZG9ubHkga3BpTG9nc1RhYmxlOiBUYWJsZTtcclxuICByZWFkb25seSBkYWlseUxvZ2luVGFibGU6IFRhYmxlO1xyXG4gIC8vcmVhZG9ubHkga3BpVGFibGUgOiBUYWJsZTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIExhbWJkYUZ1bmN0aW9uU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sgeyAgXHJcbiAgcHVibGljIHJlYWRvbmx5IGNoYXRGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvbkZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBmZWVkYmFja0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBkZWxldGVTM0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBnZXRTM0tub3dsZWRnZUZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBnZXRTM1Rlc3RDYXNlc0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSB1cGxvYWRTM0tub3dsZWRnZUZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSB1cGxvYWRTM1Rlc3RDYXNlc0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBzeW5jS2VuZHJhRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBjb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGtwaUZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBoYW5kbGVFdmFsUmVzdWx0c0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBzdGVwRnVuY3Rpb25zU3RhY2sgOiBTdGVwRnVuY3Rpb25zU3RhY2s7XHJcblxyXG5cclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYUZ1bmN0aW9uU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTsgICAgXHJcblxyXG4gICAgY29uc3Qgc2Vzc2lvbkFQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdTZXNzaW9uSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnc2Vzc2lvbi1oYW5kbGVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJEREJfVEFCTEVfTkFNRVwiIDogcHJvcHMuc2Vzc2lvblRhYmxlLnRhYmxlTmFtZVxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGtwaUFQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdLUElIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrcGktaGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiSU5URVJBQ1RJT05fVEFCTEVcIjogcHJvcHMua3BpTG9nc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBcIkRBSUxZX0xPR0lOX1RBQkxFXCI6IHByb3BzLmRhaWx5TG9naW5UYWJsZS50YWJsZU5hbWVcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICBrcGlBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgIHByb3BzLmtwaUxvZ3NUYWJsZS50YWJsZUFybiwgXHJcbiAgICAgICAgcHJvcHMua3BpTG9nc1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiLFxyXG4gICAgICAgIHByb3BzLmRhaWx5TG9naW5UYWJsZS50YWJsZUFybixcclxuICAgICAgICBwcm9wcy5kYWlseUxvZ2luVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCJcclxuICAgICAgXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIHRoaXMua3BpRnVuY3Rpb24gPSBrcGlBUElIYW5kbGVyRnVuY3Rpb247XHJcbiAgICBcclxuICAgIHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW3Byb3BzLnNlc3Npb25UYWJsZS50YWJsZUFybiwgcHJvcHMuc2Vzc2lvblRhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIHRoaXMuc2Vzc2lvbkZ1bmN0aW9uID0gc2Vzc2lvbkFQSUhhbmRsZXJGdW5jdGlvbjtcclxuXHJcblxyXG5cclxuICAgIC8vIERlZmluZSB0aGUgTGFtYmRhIGZ1bmN0aW9uIHJlc291cmNlXHJcbiAgICBjb25zdCB3ZWJzb2NrZXRBUElGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdDaGF0SGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnd2Vic29ja2V0LWNoYXQnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50IDoge1xyXG4gICAgICAgIFwibXZwX3dlYnNvY2tldF9fYXBpX2VuZHBvaW50X3Rlc3RcIiA6IHByb3BzLndzQXBpRW5kcG9pbnQucmVwbGFjZShcIndzc1wiLFwiaHR0cHNcIiksXHJcbiAgICAgICAgXCJJTkRFWF9JRFwiIDogcHJvcHMua2VuZHJhSW5kZXguYXR0cklkLFxyXG4gICAgICAgICdTRVNTSU9OX0hBTkRMRVInIDogc2Vzc2lvbkFQSUhhbmRsZXJGdW5jdGlvbi5mdW5jdGlvbk5hbWUsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMClcclxuICAgIH0pO1xyXG4gICAgd2Vic29ja2V0QVBJRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtcIipcIl1cclxuICAgIH0pKTtcclxuXHJcbiAgICAgICAgXHJcbiAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAna2VuZHJhOlJldHJpZXZlJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5rZW5kcmFJbmRleC5hdHRyQXJuXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIHdlYnNvY2tldEFQSUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdsYW1iZGE6SW52b2tlRnVuY3Rpb24nXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW3RoaXMuc2Vzc2lvbkZ1bmN0aW9uLmZ1bmN0aW9uQXJuXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIHdlYnNvY2tldEFQSUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzpHZXRPYmplY3QnXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWydhcm46YXdzOmlhbTo6ODA3NTk2MTA4OTEwOnJvbGUvSVRPUFNSQUdTdGFjay1DaGF0Ym90QVBJS2VuZHJhSW5kZXhSb2xlMEE1Q0NBMDAtbU93cU5QWno0MnlnLyonXVxyXG4gICAgfSkpO1xyXG4gICAgICAgIFxyXG4gICAgdGhpcy5jaGF0RnVuY3Rpb24gPSB3ZWJzb2NrZXRBUElGdW5jdGlvbjtcclxuXHJcbiAgICBjb25zdCBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdGZWVkYmFja0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2ZlZWRiYWNrLWhhbmRsZXInKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkZFRURCQUNLX1RBQkxFXCIgOiBwcm9wcy5mZWVkYmFja1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBcIkZFRURCQUNLX1MzX0RPV05MT0FEXCIgOiBwcm9wcy5mZWVkYmFja0J1Y2tldC5idWNrZXROYW1lXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGZlZWRiYWNrQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5mZWVkYmFja1RhYmxlLnRhYmxlQXJuLCBwcm9wcy5mZWVkYmFja1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXVxyXG4gICAgfSkpO1xyXG5cclxuICAgIGZlZWRiYWNrQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzoqJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5mZWVkYmFja0J1Y2tldC5idWNrZXRBcm4scHJvcHMuZmVlZGJhY2tCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB0aGlzLmZlZWRiYWNrRnVuY3Rpb24gPSBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbjtcclxuICAgIFxyXG4gICAgY29uc3QgZGVsZXRlUzNBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnRGVsZXRlUzNGaWxlc0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L2RlbGV0ZS1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiQlVDS0VUXCIgOiBwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0TmFtZSwgICAgICAgIFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG5cclxuICAgIGRlbGV0ZVMzQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzoqJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuLHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxyXG4gICAgfSkpO1xyXG4gICAgdGhpcy5kZWxldGVTM0Z1bmN0aW9uID0gZGVsZXRlUzNBUElIYW5kbGVyRnVuY3Rpb247XHJcblxyXG4gICAgY29uc3QgZ2V0UzNLbm93bGVkZ2VBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnR2V0UzNLbm93bGVkZ2VGaWxlc0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L2dldC1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICBnZXRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybixwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMuZ2V0UzNLbm93bGVkZ2VGdW5jdGlvbiA9IGdldFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG5cclxuICAgIGNvbnN0IGdldFMzVGVzdENhc2VzQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0dldFMzVGVzdENhc2VzRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbC9TMy1nZXQtdGVzdC1jYXNlcycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcblxyXG4gICAgZ2V0UzNUZXN0Q2FzZXNBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3MzOionXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuLHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMuZ2V0UzNUZXN0Q2FzZXNGdW5jdGlvbiA9IGdldFMzVGVzdENhc2VzQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG5cclxuXHJcbiAgICBjb25zdCBrZW5kcmFTeW5jQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ1N5bmNLZW5kcmFIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC9rZW5kcmEtc3luYycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiS0VORFJBXCIgOiBwcm9wcy5rZW5kcmFJbmRleC5hdHRySWQsICAgICAgXHJcbiAgICAgICAgXCJTT1VSQ0VcIiA6IHByb3BzLmtlbmRyYVNvdXJjZS5hdHRySWQgIFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG5cclxuICAgIGtlbmRyYVN5bmNBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2tlbmRyYToqJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5rZW5kcmFJbmRleC5hdHRyQXJuLCBwcm9wcy5rZW5kcmFTb3VyY2UuYXR0ckFybl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMuc3luY0tlbmRyYUZ1bmN0aW9uID0ga2VuZHJhU3luY0FQSUhhbmRsZXJGdW5jdGlvbjtcclxuXHJcbiAgICBjb25zdCB1cGxvYWRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdVcGxvYWRTM0tub3dsZWRnZUZpbGVzSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAna25vd2xlZGdlLW1hbmFnZW1lbnQvdXBsb2FkLXMzJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiQlVDS0VUXCIgOiBwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0TmFtZSwgICAgICAgIFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG5cclxuICAgIHVwbG9hZFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzoqJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuLHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxyXG4gICAgfSkpO1xyXG4gICAgdGhpcy51cGxvYWRTM0tub3dsZWRnZUZ1bmN0aW9uID0gdXBsb2FkUzNLbm93bGVkZ2VBUElIYW5kbGVyRnVuY3Rpb247XHJcblxyXG4gICAgY29uc3QgdXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdVcGxvYWRTM1Rlc3RDYXNlc0ZpbGVzSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWwvUzMtdXBsb2FkJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiQlVDS0VUXCIgOiBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICB1cGxvYWRTM1Rlc3RDYXNlc0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzoqJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybixwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXHJcbiAgICB9KSk7XHJcbiAgICB0aGlzLnVwbG9hZFMzVGVzdENhc2VzRnVuY3Rpb24gPSB1cGxvYWRTM1Rlc3RDYXNlc0Z1bmN0aW9uO1xyXG5cclxuXHJcbiAgICBjb25zdCBldmFsUmVzdWx0c0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdFdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsL2V2YWwtcmVzdWx0cy1oYW5kbGVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJFVkFMVUFUSU9OX1JFU1VMVFNfVEFCTEVcIiA6IHByb3BzLmV2YWxSZXN1dGxzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgIFwiRVZBTFVBVElPTl9TVU1NQVJJRVNfVEFCTEVcIiA6IHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS50YWJsZU5hbWVcclxuICAgICAgfVxyXG4gICAgfSk7XHJcbiAgICBldmFsUmVzdWx0c0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoeyBcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmV2YWxSZXN1dGxzVGFibGUudGFibGVBcm4sIHByb3BzLmV2YWxSZXN1dGxzVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCIsIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS50YWJsZUFybiwgcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXVxyXG4gICAgfSkpO1xyXG4gICAgdGhpcy5oYW5kbGVFdmFsUmVzdWx0c0Z1bmN0aW9uID0gZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb247XHJcbiAgICBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShldmFsUmVzdWx0c0FQSUhhbmRsZXJGdW5jdGlvbik7XHJcbiAgICBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGV2YWxSZXN1bHRzQVBJSGFuZGxlckZ1bmN0aW9uKTtcclxuXHJcbiAgICB0aGlzLnN0ZXBGdW5jdGlvbnNTdGFjayA9IG5ldyBTdGVwRnVuY3Rpb25zU3RhY2soc2NvcGUsICdTdGVwRnVuY3Rpb25zU3RhY2snLCB7XHJcbiAgICAgIGtub3dsZWRnZUJhc2U6IHByb3BzLmtlbmRyYUluZGV4LFxyXG4gICAgICBldmFsU3VtbWFyaWVzVGFibGU6IHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZSxcclxuICAgICAgZXZhbFJlc3V0bHNUYWJsZTogcHJvcHMuZXZhbFJlc3V0bHNUYWJsZSxcclxuICAgICAgZXZhbFRlc3RDYXNlc0J1Y2tldDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0NoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnY2hhdC1pbnZvY2F0aW9ucy1jb3VudGVyJykpLFxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIENIQVRfRlVOQ1RJT05fTkFNRTogdGhpcy5jaGF0RnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICB9LCAgICBcclxuICAgIH0pO1xyXG5cclxuICAgIGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFsnY2xvdWR3YXRjaDpHZXRNZXRyaWNTdGF0aXN0aWNzJ10sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgdGhpcy5jaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24gPSBjaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb247XHJcblxyXG4gICAgY29uc3QgY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdjb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMixcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdjb21wcmVoZW5kLW1lZGljYWwnKSksXHJcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksICAgXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmNvbXByZWhlbmRNZWRpY2FsRnVuY3Rpb24gPSBjb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uO1xyXG5cclxuICAgIGNvbXByZWhlbmRNZWRpY2FsRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2NvbXByZWhlbmQ6RGV0ZWN0UGlpRW50aXRpZXMnXSxcclxuICAgICAgcmVzb3VyY2VzOiBbJyonXSwgLy8gQWRqdXN0IGlmIHNwZWNpZmljIHJlc291cmNlcyBhcmUgdXNlZC5cclxuICAgIH0pKTtcclxuICAgIFxyXG5cclxuXHJcbiAgfVxyXG59XHJcbiJdfQ==