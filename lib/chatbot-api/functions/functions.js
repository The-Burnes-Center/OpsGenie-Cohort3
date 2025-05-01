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
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'kpi-handler')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
            //"DDB_TABLE_NAME" : props.sessionTable.tableName
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
            resources: ['arn:aws:dynamodb:us-east-1:807596108910:table/mec-chatbot-logs',
                'arn:aws:dynamodb:us-east-1:807596108910:table/mec-chatbot-logs' + "/index/*"]
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZnVuY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBRW5DLDJDQUE2QjtBQUU3Qiw2QkFBNkI7QUFDN0IsK0RBQWlEO0FBQ2pELHlEQUEyQztBQUszQyxvRUFBcUU7QUFpQnJFLE1BQWEsbUJBQW9CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFrQmhELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBK0I7UUFDdkUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLHlCQUF5QixHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsd0JBQXdCLEVBQUU7WUFDckYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLHVDQUF1QztZQUM1RSxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLGlDQUFpQztZQUN2RyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUscURBQXFEO1lBQ2hHLFdBQVcsRUFBRTtnQkFDWCxnQkFBZ0IsRUFBRyxLQUFLLENBQUMsWUFBWSxDQUFDLFNBQVM7YUFDaEQ7WUFDRCxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILE1BQU0scUJBQXFCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsRUFBRTtZQUM3RSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsdUNBQXVDO1lBQzVFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMs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RyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLDJCQUEyQixFQUFFO1lBQ3hGLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUM7WUFDdkUsT0FBTyxFQUFFLGdDQUFnQztZQUN6QyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1NBQ2xDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx5QkFBeUIsR0FBRyx5QkFBeUIsQ0FBQztRQUUzRCx5QkFBeUIsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ2hFLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFLENBQUMsOEJBQThCLENBQUM7WUFDekMsU0FBUyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUseUNBQXlDO1NBQzVELENBQUMsQ0FBQyxDQUFDO0lBSU4sQ0FBQztDQUNGO0FBclZELGtEQXFWQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuLy8gSW1wb3J0IExhbWJkYSBMMiBjb25zdHJ1Y3RcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMga2VuZHJhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1rZW5kcmEnO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XHJcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xyXG5pbXBvcnQgeyBTdGVwRnVuY3Rpb25zU3RhY2sgfSBmcm9tICcuL3N0ZXAtZnVuY3Rpb25zL3N0ZXAtZnVuY3Rpb25zJztcclxuXHJcblxyXG5pbnRlcmZhY2UgTGFtYmRhRnVuY3Rpb25TdGFja1Byb3BzIHsgIFxyXG4gIHJlYWRvbmx5IHdzQXBpRW5kcG9pbnQgOiBzdHJpbmc7ICBcclxuICByZWFkb25seSBzZXNzaW9uVGFibGUgOiBUYWJsZTtcclxuICByZWFkb25seSBrZW5kcmFJbmRleCA6IGtlbmRyYS5DZm5JbmRleDtcclxuICByZWFkb25seSBrZW5kcmFTb3VyY2UgOiBrZW5kcmEuQ2ZuRGF0YVNvdXJjZTtcclxuICByZWFkb25seSBmZWVkYmFja1RhYmxlIDogVGFibGU7XHJcbiAgcmVhZG9ubHkgZmVlZGJhY2tCdWNrZXQgOiBzMy5CdWNrZXQ7XHJcbiAgcmVhZG9ubHkga25vd2xlZGdlQnVja2V0IDogczMuQnVja2V0O1xyXG4gIHJlYWRvbmx5IGV2YWxTdW1tYXJpZXNUYWJsZSA6IFRhYmxlO1xyXG4gIHJlYWRvbmx5IGV2YWxSZXN1dGxzVGFibGUgOiBUYWJsZTtcclxuICByZWFkb25seSBldmFsVGVzdENhc2VzQnVja2V0IDogczMuQnVja2V0O1xyXG4gIC8vcmVhZG9ubHkga3BpVGFibGUgOiBUYWJsZTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIExhbWJkYUZ1bmN0aW9uU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sgeyAgXHJcbiAgcHVibGljIHJlYWRvbmx5IGNoYXRGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcclxuICBwdWJsaWMgcmVhZG9ubHkgc2Vzc2lvbkZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBmZWVkYmFja0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBkZWxldGVTM0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBnZXRTM0tub3dsZWRnZUZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBnZXRTM1Rlc3RDYXNlc0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSB1cGxvYWRTM0tub3dsZWRnZUZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSB1cGxvYWRTM1Rlc3RDYXNlc0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBzeW5jS2VuZHJhRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBjb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgcHVibGljIHJlYWRvbmx5IGtwaUZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBoYW5kbGVFdmFsUmVzdWx0c0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gIHB1YmxpYyByZWFkb25seSBzdGVwRnVuY3Rpb25zU3RhY2sgOiBTdGVwRnVuY3Rpb25zU3RhY2s7XHJcblxyXG5cclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IExhbWJkYUZ1bmN0aW9uU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTsgICAgXHJcblxyXG4gICAgY29uc3Qgc2Vzc2lvbkFQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdTZXNzaW9uSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnc2Vzc2lvbi1oYW5kbGVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJEREJfVEFCTEVfTkFNRVwiIDogcHJvcHMuc2Vzc2lvblRhYmxlLnRhYmxlTmFtZVxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGtwaUFQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdLUElIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrcGktaGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAvL1wiRERCX1RBQkxFX05BTUVcIiA6IHByb3BzLnNlc3Npb25UYWJsZS50YWJsZU5hbWVcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICBrcGlBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWydhcm46YXdzOmR5bmFtb2RiOnVzLWVhc3QtMTo4MDc1OTYxMDg5MTA6dGFibGUvbWVjLWNoYXRib3QtbG9ncycsXHJcbiAgICAgICAgJ2Fybjphd3M6ZHluYW1vZGI6dXMtZWFzdC0xOjgwNzU5NjEwODkxMDp0YWJsZS9tZWMtY2hhdGJvdC1sb2dzJyArIFwiL2luZGV4LypcIl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB0aGlzLmtwaUZ1bmN0aW9uID0ga3BpQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG4gICAgXHJcbiAgICBzZXNzaW9uQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5zZXNzaW9uVGFibGUudGFibGVBcm4sIHByb3BzLnNlc3Npb25UYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB0aGlzLnNlc3Npb25GdW5jdGlvbiA9IHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb247XHJcblxyXG5cclxuXHJcbiAgICAvLyBEZWZpbmUgdGhlIExhbWJkYSBmdW5jdGlvbiByZXNvdXJjZVxyXG4gICAgY29uc3Qgd2Vic29ja2V0QVBJRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnQ2hhdEhhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3dlYnNvY2tldC1jaGF0JykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudCA6IHtcclxuICAgICAgICBcIm12cF93ZWJzb2NrZXRfX2FwaV9lbmRwb2ludF90ZXN0XCIgOiBwcm9wcy53c0FwaUVuZHBvaW50LnJlcGxhY2UoXCJ3c3NcIixcImh0dHBzXCIpLFxyXG4gICAgICAgIFwiSU5ERVhfSURcIiA6IHByb3BzLmtlbmRyYUluZGV4LmF0dHJJZCxcclxuICAgICAgICAnU0VTU0lPTl9IQU5ETEVSJyA6IHNlc3Npb25BUElIYW5kbGVyRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMDApXHJcbiAgICB9KTtcclxuICAgIHdlYnNvY2tldEFQSUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcclxuICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXHJcbiAgICB9KSk7XHJcblxyXG4gICAgICAgIFxyXG4gICAgd2Vic29ja2V0QVBJRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2tlbmRyYTpSZXRyaWV2ZSdcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua2VuZHJhSW5kZXguYXR0ckFybl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFt0aGlzLnNlc3Npb25GdW5jdGlvbi5mdW5jdGlvbkFybl1cclxuICAgIH0pKTtcclxuXHJcbiAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6R2V0T2JqZWN0J1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFsnYXJuOmF3czppYW06OjgwNzU5NjEwODkxMDpyb2xlL0lUT1BTUkFHU3RhY2stQ2hhdGJvdEFQSUtlbmRyYUluZGV4Um9sZTBBNUNDQTAwLW1Pd3FOUFp6NDJ5Zy8qJ11cclxuICAgIH0pKTtcclxuICAgICAgICBcclxuICAgIHRoaXMuY2hhdEZ1bmN0aW9uID0gd2Vic29ja2V0QVBJRnVuY3Rpb247XHJcblxyXG4gICAgY29uc3QgZmVlZGJhY2tBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnRmVlZGJhY2tIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdmZWVkYmFjay1oYW5kbGVyJykpLCAvLyBQb2ludHMgdG8gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJGRUVEQkFDS19UQUJMRVwiIDogcHJvcHMuZmVlZGJhY2tUYWJsZS50YWJsZU5hbWUsXHJcbiAgICAgICAgXCJGRUVEQkFDS19TM19ET1dOTE9BRFwiIDogcHJvcHMuZmVlZGJhY2tCdWNrZXQuYnVja2V0TmFtZVxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG4gICAgXHJcbiAgICBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcclxuICAgICAgICAnZHluYW1vZGI6U2NhbidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZmVlZGJhY2tUYWJsZS50YWJsZUFybiwgcHJvcHMuZmVlZGJhY2tUYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIl1cclxuICAgIH0pKTtcclxuXHJcbiAgICBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZmVlZGJhY2tCdWNrZXQuYnVja2V0QXJuLHByb3BzLmZlZWRiYWNrQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXHJcbiAgICB9KSk7XHJcblxyXG4gICAgdGhpcy5mZWVkYmFja0Z1bmN0aW9uID0gZmVlZGJhY2tBUElIYW5kbGVyRnVuY3Rpb247XHJcbiAgICBcclxuICAgIGNvbnN0IGRlbGV0ZVMzQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0RlbGV0ZVMzRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC9kZWxldGUtczMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICBkZWxldGVTM0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybixwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMuZGVsZXRlUzNGdW5jdGlvbiA9IGRlbGV0ZVMzQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG5cclxuICAgIGNvbnN0IGdldFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0dldFMzS25vd2xlZGdlRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18yMF9YLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC9nZXQtczMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcblxyXG4gICAgZ2V0UzNLbm93bGVkZ2VBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ3MzOionXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4scHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXHJcbiAgICB9KSk7XHJcbiAgICB0aGlzLmdldFMzS25vd2xlZGdlRnVuY3Rpb24gPSBnZXRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbjtcclxuXHJcbiAgICBjb25zdCBnZXRTM1Rlc3RDYXNlc0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdHZXRTM1Rlc3RDYXNlc0ZpbGVzSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWwvUzMtZ2V0LXRlc3QtY2FzZXMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIC8vIFBvaW50cyB0byB0aGUgJ2hlbGxvJyBmaWxlIGluIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0TmFtZSwgICAgICAgIFxyXG4gICAgICB9LFxyXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgIH0pO1xyXG5cclxuICAgIGdldFMzVGVzdENhc2VzQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzoqJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybixwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybitcIi8qXCJdXHJcbiAgICB9KSk7XHJcbiAgICB0aGlzLmdldFMzVGVzdENhc2VzRnVuY3Rpb24gPSBnZXRTM1Rlc3RDYXNlc0FQSUhhbmRsZXJGdW5jdGlvbjtcclxuXHJcblxyXG4gICAgY29uc3Qga2VuZHJhU3luY0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdTeW5jS2VuZHJhSGFuZGxlckZ1bmN0aW9uJywge1xyXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAna25vd2xlZGdlLW1hbmFnZW1lbnQva2VuZHJhLXN5bmMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIktFTkRSQVwiIDogcHJvcHMua2VuZHJhSW5kZXguYXR0cklkLCAgICAgIFxyXG4gICAgICAgIFwiU09VUkNFXCIgOiBwcm9wcy5rZW5kcmFTb3VyY2UuYXR0cklkICBcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICBrZW5kcmFTeW5jQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdrZW5kcmE6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua2VuZHJhSW5kZXguYXR0ckFybiwgcHJvcHMua2VuZHJhU291cmNlLmF0dHJBcm5dXHJcbiAgICB9KSk7XHJcbiAgICB0aGlzLnN5bmNLZW5kcmFGdW5jdGlvbiA9IGtlbmRyYVN5bmNBUElIYW5kbGVyRnVuY3Rpb247XHJcblxyXG4gICAgY29uc3QgdXBsb2FkUzNLbm93bGVkZ2VBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnVXBsb2FkUzNLbm93bGVkZ2VGaWxlc0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L3VwbG9hZC1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldE5hbWUsICAgICAgICBcclxuICAgICAgfSxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICB9KTtcclxuXHJcbiAgICB1cGxvYWRTM0tub3dsZWRnZUFQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybixwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMudXBsb2FkUzNLbm93bGVkZ2VGdW5jdGlvbiA9IHVwbG9hZFMzS25vd2xlZGdlQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG5cclxuICAgIGNvbnN0IHVwbG9hZFMzVGVzdENhc2VzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnVXBsb2FkUzNUZXN0Q2FzZXNGaWxlc0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsL1MzLXVwbG9hZCcpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBcIkJVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXHJcbiAgICAgIH0sXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgfSk7XHJcblxyXG4gICAgdXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6KidcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4scHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxyXG4gICAgfSkpO1xyXG4gICAgdGhpcy51cGxvYWRTM1Rlc3RDYXNlc0Z1bmN0aW9uID0gdXBsb2FkUzNUZXN0Q2FzZXNGdW5jdGlvbjtcclxuXHJcblxyXG4gICAgY29uc3QgZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcclxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbC9ldmFsLXJlc3VsdHMtaGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XHJcbiAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxyXG4gICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgIFwiRVZBTFVBVElPTl9SRVNVTFRTX1RBQkxFXCIgOiBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICBcIkVWQUxVQVRJT05fU1VNTUFSSUVTX1RBQkxFXCIgOiBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUudGFibGVOYW1lXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHsgXHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nLFxyXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICdkeW5hbW9kYjpTY2FuJ1xyXG4gICAgICBdLFxyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlQXJuLCBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiLCBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUudGFibGVBcm4sIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIl1cclxuICAgIH0pKTtcclxuICAgIHRoaXMuaGFuZGxlRXZhbFJlc3VsdHNGdW5jdGlvbiA9IGV2YWxSZXN1bHRzQVBJSGFuZGxlckZ1bmN0aW9uO1xyXG4gICAgcHJvcHMuZXZhbFJlc3V0bHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZXZhbFJlc3VsdHNBUElIYW5kbGVyRnVuY3Rpb24pO1xyXG4gICAgcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShldmFsUmVzdWx0c0FQSUhhbmRsZXJGdW5jdGlvbik7XHJcblxyXG4gICAgdGhpcy5zdGVwRnVuY3Rpb25zU3RhY2sgPSBuZXcgU3RlcEZ1bmN0aW9uc1N0YWNrKHNjb3BlLCAnU3RlcEZ1bmN0aW9uc1N0YWNrJywge1xyXG4gICAgICBrbm93bGVkZ2VCYXNlOiBwcm9wcy5rZW5kcmFJbmRleCxcclxuICAgICAgZXZhbFN1bW1hcmllc1RhYmxlOiBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUsXHJcbiAgICAgIGV2YWxSZXN1dGxzVGFibGU6IHByb3BzLmV2YWxSZXN1dGxzVGFibGUsXHJcbiAgICAgIGV2YWxUZXN0Q2FzZXNCdWNrZXQ6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXRcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdDaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxyXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2NoYXQtaW52b2NhdGlvbnMtY291bnRlcicpKSxcclxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsXHJcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKSxcclxuICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICBDSEFUX0ZVTkNUSU9OX05BTUU6IHRoaXMuY2hhdEZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcclxuICAgICAgfSwgICAgXHJcbiAgICB9KTtcclxuXHJcbiAgICBjaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6R2V0TWV0cmljU3RhdGlzdGljcyddLFxyXG4gICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgfSkpO1xyXG5cclxuICAgIHRoaXMuY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uID0gY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uO1xyXG5cclxuICAgIGNvbnN0IGNvbXByZWhlbmRNZWRpY2FsRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHNjb3BlLCAnY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbicsIHtcclxuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXHJcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnY29tcHJlaGVuZC1tZWRpY2FsJykpLFxyXG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJyxcclxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAgIFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5jb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uID0gY29tcHJlaGVuZE1lZGljYWxGdW5jdGlvbjtcclxuXHJcbiAgICBjb21wcmVoZW5kTWVkaWNhbEZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgYWN0aW9uczogWydjb21wcmVoZW5kOkRldGVjdFBpaUVudGl0aWVzJ10sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sIC8vIEFkanVzdCBpZiBzcGVjaWZpYyByZXNvdXJjZXMgYXJlIHVzZWQuXHJcbiAgICB9KSk7XHJcbiAgICBcclxuXHJcblxyXG4gIH1cclxufVxyXG4iXX0=