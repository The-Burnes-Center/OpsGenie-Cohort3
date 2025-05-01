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
exports.StepFunctionsStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const constructs_1 = require("constructs");
const path = __importStar(require("path"));
// Import Lambda L2 construct
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const aws_ecr_assets_1 = require("aws-cdk-lib/aws-ecr-assets");
const stepfunctions = __importStar(require("aws-cdk-lib/aws-stepfunctions"));
const tasks = __importStar(require("aws-cdk-lib/aws-stepfunctions-tasks"));
class StepFunctionsStack extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const splitEvalTestCasesFunction = new lambda.Function(this, 'SplitEvalTestCasesFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/split-test-cases')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        splitEvalTestCasesFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:ListBucket',
                's3:PutObject'
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.splitEvalTestCasesFunction = splitEvalTestCasesFunction;
        const llmEvalResultsHandlerFunction = new lambda.Function(this, 'LlmEvalResultsHandlerFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/results-to-ddb')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "EVAL_SUMMARIES_TABLE": props.evalSummariesTable.tableName,
                "EVAL_RESULTS_TABLE": props.evalResutlsTable.tableName,
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        llmEvalResultsHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
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
        llmEvalResultsHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        props.evalResutlsTable.grantReadWriteData(llmEvalResultsHandlerFunction);
        props.evalSummariesTable.grantReadWriteData(llmEvalResultsHandlerFunction);
        this.llmEvalResultsHandlerFunction = llmEvalResultsHandlerFunction;
        const generateResponseFunction = new lambda.Function(this, 'GenerateResponseFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/generate-response')),
            handler: 'index.handler',
            environment: {
                "PROMPT": `You are a helpful AI chatbot that will answer questions based on your knowledge. 
                You have access to a search tool that you will use to look up answers to questions.`,
                'KB_ID': props.knowledgeBase.attrId,
            },
            timeout: cdk.Duration.seconds(30)
        });
        generateResponseFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:InvokeModel',
            ],
            resources: ["*"]
        }));
        generateResponseFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'kendra:Retrieve'
            ],
            resources: [props.knowledgeBase.attrArn]
        }));
        this.generateResponseFunction = generateResponseFunction;
        const llmEvalFunction = new lambda.DockerImageFunction(this, 'LlmEvaluationFunction', {
            code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, 'llm-evaluation/eval'), {
                platform: aws_ecr_assets_1.Platform.LINUX_AMD64, // Specify the correct platform
            }),
            environment: {
                "GENERATE_RESPONSE_LAMBDA_NAME": generateResponseFunction.functionName,
                "BEDROCK_MODEL_ID": "anthropic.claude-3-haiku-20240307-v1:0",
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.minutes(15),
            memorySize: 10240
        });
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'ecr:GetAuthorization',
                'ecr:GetDownloadUrlForLayer',
                'ecr:BatchGetImage',
                'ecr:BatchCheckLayerAvailability'
            ],
            resources: ['*']
        }));
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'bedrock:InvokeModelWithResponseStream',
                'bedrock:InvokeModel'
            ],
            resources: ['*']
        }));
        llmEvalFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        generateResponseFunction.grantInvoke(llmEvalFunction);
        this.llmEvalFunction = llmEvalFunction;
        const aggregateEvalResultsFunction = new lambda.Function(this, 'AggregateEvalResultsFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/aggregate-eval-results')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        aggregateEvalResultsFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:GetObject',
                's3:PutObject',
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.aggregateEvalResultsFunction = aggregateEvalResultsFunction;
        const llmEvalCleanupFunction = new lambda.Function(this, 'LlmEvalCleanupFunction', {
            runtime: lambda.Runtime.PYTHON_3_12,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/cleanup')),
            handler: 'lambda_function.lambda_handler',
            environment: {
                "TEST_CASES_BUCKET": props.evalTestCasesBucket.bucketName
            },
            timeout: cdk.Duration.seconds(30)
        });
        llmEvalCleanupFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:ListBucket',
                's3:DeleteObject',
                's3:DeleteObjects'
            ],
            resources: [
                props.evalTestCasesBucket.bucketArn,
                props.evalTestCasesBucket.bucketArn + "/*",
                props.evalTestCasesBucket.arnForObjects('*'),
            ]
        }));
        this.llmEvalCleanupFunction = llmEvalCleanupFunction;
        const splitTestCasesTask = new tasks.LambdaInvoke(this, 'Split Test Cases', {
            lambdaFunction: this.splitEvalTestCasesFunction,
            outputPath: '$.Payload',
        });
        // const evaluateTestCasesTask = new tasks.LambdaInvoke(this, 'Evaluate Test Cases', {
        // lambdaFunction: this.llmEvalFunction,
        // outputPath: '$.Payload',
        // });
        // const evaluateTestCasesTask = new tasks.LambdaInvoke(this, 'Evaluate Test Cases', {
        //     lambdaFunction: this.llmEvalFunction,
        //     payload: stepfunctions.TaskInput.fromObject({
        //         'chunk_key.$': '$',
        //     }),
        //     outputPath: '$.Payload',
        // });
        const evaluateTestCasesTask = new tasks.LambdaInvoke(this, 'Evaluate Test Cases', {
            lambdaFunction: this.llmEvalFunction,
            // payload: stepfunctions.TaskInput.fromObject({
            //     'chunk_key.$': '$',
            //     'evaluation_id.$': '$.evaluation_id',
            // }),
            outputPath: '$.Payload',
        });
        // const processTestCasesMap = new stepfunctions.Map(this, 'Process Test Cases', {
        // itemsPath: '$.chunks',
        // maxConcurrency: 5,
        // resultPath: '$.ProcessedResults'
        // });
        // processTestCasesMap.itemProcessor(evaluateTestCasesTask);
        const processTestCasesMap = new stepfunctions.Map(this, 'Process Test Cases', {
            itemsPath: '$.chunk_keys',
            maxConcurrency: 5,
            resultPath: '$.partial_result_keys',
            itemSelector: {
                'chunk_key.$': '$$.Map.Item.Value.chunk_key',
                'evaluation_id.$': '$$.Map.Item.Value.evaluation_id',
            },
        });
        processTestCasesMap.itemProcessor(evaluateTestCasesTask);
        const aggregateResultsTask = new tasks.LambdaInvoke(this, 'Aggregate Results', {
            lambdaFunction: this.aggregateEvalResultsFunction,
            payload: stepfunctions.TaskInput.fromObject({
                //'partial_results_list.$': '$.ProcessedResults',
                'partial_result_keys.$': '$.partial_result_keys',
                'evaluation_id.$': '$.evaluation_id',
                'evaluation_name.$': '$.evaluation_name',
                'test_cases_key.$': '$.test_cases_key',
            }),
            outputPath: '$.Payload',
        });
        const saveResultsTask = new tasks.LambdaInvoke(this, 'Save Evaluation Results', {
            lambdaFunction: this.llmEvalResultsHandlerFunction,
            payload: stepfunctions.TaskInput.fromObject({
                'evaluation_id.$': '$.evaluation_id',
                'evaluation_name.$': '$.evaluation_name',
                'average_similarity.$': '$.average_similarity',
                'average_relevance.$': '$.average_relevance',
                'average_correctness.$': '$.average_correctness',
                'total_questions.$': '$.total_questions',
                'detailed_results_s3_key.$': '$.detailed_results_s3_key',
                // 'detailed_results.$': '$.detailed_results',
                'test_cases_key.$': '$.test_cases_key',
            }),
            outputPath: '$.Payload',
        });
        const cleanupChunksTask = new tasks.LambdaInvoke(this, 'Cleanup Chunks', {
            lambdaFunction: this.llmEvalCleanupFunction,
            payload: stepfunctions.TaskInput.fromObject({
                'body.$': '$.body',
            }),
            outputPath: '$.Payload',
        });
        const definition = splitTestCasesTask
            .next(processTestCasesMap)
            .next(aggregateResultsTask)
            .next(saveResultsTask)
            .next(cleanupChunksTask);
        const llmEvalStateMachine = new stepfunctions.StateMachine(this, 'EvaluationStateMachine', {
            definitionBody: stepfunctions.DefinitionBody.fromChainable(definition),
            timeout: cdk.Duration.hours(1),
        });
        this.llmEvalStateMachine = llmEvalStateMachine;
        const startLlmEvalStateMachineFunction = new lambda.Function(this, 'StartLlmEvalStateMachineFunction', {
            runtime: lambda.Runtime.NODEJS_20_X,
            code: lambda.Code.fromAsset(path.join(__dirname, 'llm-evaluation/start-llm-eval')),
            handler: 'index.handler',
            environment: {
                "STATE_MACHINE_ARN": this.llmEvalStateMachine.stateMachineArn
            },
            timeout: cdk.Duration.seconds(30)
        });
        startLlmEvalStateMachineFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['states:StartExecution'],
            resources: [this.llmEvalStateMachine.stateMachineArn],
        }));
        this.startLlmEvalStateMachineFunction = startLlmEvalStateMachineFunction;
    }
}
exports.StepFunctionsStack = StepFunctionsStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RlcC1mdW5jdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGVwLWZ1bmN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyQ0FBdUM7QUFDdkMsMkNBQTZCO0FBRTdCLDZCQUE2QjtBQUM3QiwrREFBaUQ7QUFDakQseURBQTJDO0FBSTNDLCtEQUFzRDtBQUV0RCw2RUFBK0Q7QUFDL0QsMkVBQTZEO0FBUzdELE1BQWEsa0JBQW1CLFNBQVEsc0JBQVM7SUFVN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE4QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUN2RixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1lBQ3BGLE9BQU8sRUFBRSxnQ0FBZ0M7WUFDekMsV0FBVyxFQUFFO2dCQUNULG1CQUFtQixFQUFHLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVO2FBQzdEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUNwQyxDQUFDLENBQUM7UUFDSCwwQkFBMEIsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQy9ELE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFO2dCQUNMLGNBQWM7Z0JBQ2QsZUFBZTtnQkFDZixjQUFjO2FBQ2pCO1lBQ0QsU0FBUyxFQUFFO2dCQUNQLEtBQUss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RUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSwrQkFBK0IsQ0FBQyxDQUFDO1lBQ2xGLE9BQU8sRUFBRSxlQUFlO1lBQ3hCLFdBQVcsRUFBRTtnQkFDVCxtQkFBbUIsRUFBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZUFBZTthQUNqRTtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDcEMsQ0FBQyxDQUFDO1FBQ0gsZ0NBQWdDLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNyRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLHVCQUF1QixDQUFDO1lBQ2xDLFNBQVMsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlLENBQUM7U0FDeEQsQ0FBQyxDQUFDLENBQUM7UUFDSixJQUFJLENBQUMsZ0NBQWdDLEdBQUcsZ0NBQWdDLENBQUM7SUFDN0UsQ0FBQztDQUNKO0FBbFRELGdEQWtUQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xyXG5cclxuLy8gSW1wb3J0IExhbWJkYSBMMiBjb25zdHJ1Y3RcclxuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XHJcbmltcG9ydCB7IFRhYmxlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xyXG5pbXBvcnQgKiBhcyBrZW5kcmEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWtlbmRyYSc7XHJcbmltcG9ydCB7IFBsYXRmb3JtIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjci1hc3NldHMnO1xyXG5pbXBvcnQgeyBTdGF0ZU1hY2hpbmUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9ucyc7XHJcbmltcG9ydCAqIGFzIHN0ZXBmdW5jdGlvbnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXN0ZXBmdW5jdGlvbnMnO1xyXG5pbXBvcnQgKiBhcyB0YXNrcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9ucy10YXNrcyc7XHJcblxyXG5pbnRlcmZhY2UgU3RlcEZ1bmN0aW9uc1N0YWNrUHJvcHMge1xyXG4gICAgcmVhZG9ubHkga25vd2xlZGdlQmFzZSA6IGtlbmRyYS5DZm5JbmRleDtcclxuICAgIHJlYWRvbmx5IGV2YWxTdW1tYXJpZXNUYWJsZSA6IFRhYmxlO1xyXG4gICAgcmVhZG9ubHkgZXZhbFJlc3V0bHNUYWJsZSA6IFRhYmxlO1xyXG4gICAgcmVhZG9ubHkgZXZhbFRlc3RDYXNlc0J1Y2tldCA6IHMzLkJ1Y2tldDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFN0ZXBGdW5jdGlvbnNTdGFjayBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgc3RhcnRMbG1FdmFsU3RhdGVNYWNoaW5lRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICAgIHB1YmxpYyByZWFkb25seSBzcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGxsbUV2YWxSZXN1bHRzSGFuZGxlckZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgbGxtRXZhbEZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgYWdncmVnYXRlRXZhbFJlc3VsdHNGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGxsbUV2YWxDbGVhbnVwRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICAgIHB1YmxpYyByZWFkb25seSBsbG1FdmFsU3RhdGVNYWNoaW5lOiBTdGF0ZU1hY2hpbmU7XHJcblxyXG4gICAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFN0ZXBGdW5jdGlvbnNTdGFja1Byb3BzKSB7XHJcbiAgICAgICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICAgICAgY29uc3Qgc3BsaXRFdmFsVGVzdENhc2VzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWx1YXRpb24vc3BsaXQtdGVzdC1jYXNlcycpKSwgXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCBcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgICAgICAgIFwiVEVTVF9DQVNFU19CVUNLRVRcIiA6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0TmFtZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgICAgICB9KTtcclxuICAgICAgICBzcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCdcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiwgXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiArIFwiLypcIiwgXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmFybkZvck9iamVjdHMoJyonKSxcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICB0aGlzLnNwbGl0RXZhbFRlc3RDYXNlc0Z1bmN0aW9uID0gc3BsaXRFdmFsVGVzdENhc2VzRnVuY3Rpb247XHJcblxyXG4gICAgICAgIGNvbnN0IGxsbUV2YWxSZXN1bHRzSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24nLCB7XHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsdWF0aW9uL3Jlc3VsdHMtdG8tZGRiJykpLCBcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgICAgICAgXCJFVkFMX1NVTU1BUklFU19UQUJMRVwiIDogcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgICAgICAgIFwiRVZBTF9SRVNVTFRTX1RBQkxFXCIgOiBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgICAgICAgICAgIFwiVEVTVF9DQVNFU19CVUNLRVRcIiA6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6R2V0SXRlbScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6RGVsZXRlSXRlbScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxyXG4gICAgICAgICAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLmV2YWxSZXN1dGxzVGFibGUudGFibGVBcm4sIHByb3BzLmV2YWxSZXN1dGxzVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCIsIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS50YWJsZUFybiwgcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBsbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4sIFxyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4gKyBcIi8qXCIsIFxyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyksXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgcHJvcHMuZXZhbFJlc3V0bHNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24pO1xyXG4gICAgICAgIHByb3BzLmV2YWxTdW1tYXJpZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEobGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24pO1xyXG4gICAgICAgIHRoaXMubGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24gPSBsbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbjsgXHJcblxyXG4gICAgICAgIGNvbnN0IGdlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWx1YXRpb24vZ2VuZXJhdGUtcmVzcG9uc2UnKSksIFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudCA6IHtcclxuICAgICAgICAgICAgICAgIFwiUFJPTVBUXCIgOiBgWW91IGFyZSBhIGhlbHBmdWwgQUkgY2hhdGJvdCB0aGF0IHdpbGwgYW5zd2VyIHF1ZXN0aW9ucyBiYXNlZCBvbiB5b3VyIGtub3dsZWRnZS4gXHJcbiAgICAgICAgICAgICAgICBZb3UgaGF2ZSBhY2Nlc3MgdG8gYSBzZWFyY2ggdG9vbCB0aGF0IHlvdSB3aWxsIHVzZSB0byBsb29rIHVwIGFuc3dlcnMgdG8gcXVlc3Rpb25zLmAsXHJcbiAgICAgICAgICAgICAgICAnS0JfSUQnIDogcHJvcHMua25vd2xlZGdlQmFzZS5hdHRySWQsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcclxuICAgICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCcsXHJcblxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtcIipcIl1cclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICdrZW5kcmE6UmV0cmlldmUnXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLmtub3dsZWRnZUJhc2UuYXR0ckFybl1cclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgdGhpcy5nZW5lcmF0ZVJlc3BvbnNlRnVuY3Rpb24gPSBnZW5lcmF0ZVJlc3BvbnNlRnVuY3Rpb247XHJcblxyXG4gICAgICAgIGNvbnN0IGxsbUV2YWxGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRG9ja2VySW1hZ2VGdW5jdGlvbih0aGlzLCAnTGxtRXZhbHVhdGlvbkZ1bmN0aW9uJywge1xyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuRG9ja2VySW1hZ2VDb2RlLmZyb21JbWFnZUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9ldmFsJyksIHtcclxuICAgICAgICAgICAgICAgIHBsYXRmb3JtOiBQbGF0Zm9ybS5MSU5VWF9BTUQ2NCwgLy8gU3BlY2lmeSB0aGUgY29ycmVjdCBwbGF0Zm9ybVxyXG4gICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgICAgICAgXCJHRU5FUkFURV9SRVNQT05TRV9MQU1CREFfTkFNRVwiIDogZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcclxuICAgICAgICAgICAgICAgIFwiQkVEUk9DS19NT0RFTF9JRFwiIDogXCJhbnRocm9waWMuY2xhdWRlLTMtaGFpa3UtMjAyNDAzMDctdjE6MFwiLFxyXG4gICAgICAgICAgICAgICAgXCJURVNUX0NBU0VTX0JVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDE1KSxcclxuICAgICAgICAgICAgbWVtb3J5U2l6ZTogMTAyNDBcclxuICAgICAgICB9KTtcclxuICAgICAgICBsbG1FdmFsRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgJ2VjcjpHZXRBdXRob3JpemF0aW9uJyxcclxuICAgICAgICAgICAgICAnZWNyOkdldERvd25sb2FkVXJsRm9yTGF5ZXInLFxyXG4gICAgICAgICAgICAgICdlY3I6QmF0Y2hHZXRJbWFnZScsXHJcbiAgICAgICAgICAgICAgJ2VjcjpCYXRjaENoZWNrTGF5ZXJBdmFpbGFiaWxpdHknXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogWycqJ11cclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgbGxtRXZhbEZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcclxuICAgICAgICAgICAgICAnYmVkcm9jazpJbnZva2VNb2RlbCdcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBsbG1FdmFsRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgICAnczM6R2V0T2JqZWN0JyxcclxuICAgICAgICAgICAgICAgICdzMzpQdXRPYmplY3QnLFxyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuLCBcclxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuICsgXCIvKlwiLCBcclxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYXJuRm9yT2JqZWN0cygnKicpLFxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIGdlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbi5ncmFudEludm9rZShsbG1FdmFsRnVuY3Rpb24pO1xyXG4gICAgICAgIHRoaXMubGxtRXZhbEZ1bmN0aW9uID0gbGxtRXZhbEZ1bmN0aW9uO1xyXG5cclxuICAgICAgICBjb25zdCBhZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQWdncmVnYXRlRXZhbFJlc3VsdHNGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWx1YXRpb24vYWdncmVnYXRlLWV2YWwtcmVzdWx0cycpKSwgXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCBcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgICAgICAgIFwiVEVTVF9DQVNFU19CVUNLRVRcIiA6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0TmFtZSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgYWdncmVnYXRlRXZhbFJlc3VsdHNGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4sIFxyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4gKyBcIi8qXCIsIFxyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyksXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgdGhpcy5hZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uID0gYWdncmVnYXRlRXZhbFJlc3VsdHNGdW5jdGlvbjtcclxuXHJcbiAgICAgICAgY29uc3QgbGxtRXZhbENsZWFudXBGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0xsbUV2YWxDbGVhbnVwRnVuY3Rpb24nLCB7XHJcbiAgICAgICAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLFxyXG4gICAgICAgICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsdWF0aW9uL2NsZWFudXAnKSksIFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICAgICAgICBcIlRFU1RfQ0FTRVNfQlVDS0VUXCIgOiBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldE5hbWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbGxtRXZhbENsZWFudXBGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdzMzpMaXN0QnVja2V0JyxcclxuICAgICAgICAgICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdHMnXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4sIFxyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4gKyBcIi8qXCIsIFxyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyksXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgdGhpcy5sbG1FdmFsQ2xlYW51cEZ1bmN0aW9uID0gbGxtRXZhbENsZWFudXBGdW5jdGlvbjtcclxuXHJcbiAgICAgICAgY29uc3Qgc3BsaXRUZXN0Q2FzZXNUYXNrID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnU3BsaXQgVGVzdCBDYXNlcycsIHtcclxuICAgICAgICAgICAgbGFtYmRhRnVuY3Rpb246IHRoaXMuc3BsaXRFdmFsVGVzdENhc2VzRnVuY3Rpb24sXHJcbiAgICAgICAgICAgIG91dHB1dFBhdGg6ICckLlBheWxvYWQnLFxyXG4gICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vIGNvbnN0IGV2YWx1YXRlVGVzdENhc2VzVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ0V2YWx1YXRlIFRlc3QgQ2FzZXMnLCB7XHJcbiAgICAgICAgLy8gbGFtYmRhRnVuY3Rpb246IHRoaXMubGxtRXZhbEZ1bmN0aW9uLFxyXG4gICAgICAgIC8vIG91dHB1dFBhdGg6ICckLlBheWxvYWQnLFxyXG4gICAgICAgIC8vIH0pO1xyXG5cclxuICAgICAgICAvLyBjb25zdCBldmFsdWF0ZVRlc3RDYXNlc1Rhc2sgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdFdmFsdWF0ZSBUZXN0IENhc2VzJywge1xyXG4gICAgICAgIC8vICAgICBsYW1iZGFGdW5jdGlvbjogdGhpcy5sbG1FdmFsRnVuY3Rpb24sXHJcbiAgICAgICAgLy8gICAgIHBheWxvYWQ6IHN0ZXBmdW5jdGlvbnMuVGFza0lucHV0LmZyb21PYmplY3Qoe1xyXG4gICAgICAgIC8vICAgICAgICAgJ2NodW5rX2tleS4kJzogJyQnLFxyXG4gICAgICAgIC8vICAgICB9KSxcclxuICAgICAgICAvLyAgICAgb3V0cHV0UGF0aDogJyQuUGF5bG9hZCcsXHJcbiAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGV2YWx1YXRlVGVzdENhc2VzVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ0V2YWx1YXRlIFRlc3QgQ2FzZXMnLCB7XHJcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiB0aGlzLmxsbUV2YWxGdW5jdGlvbixcclxuICAgICAgICAgICAgLy8gcGF5bG9hZDogc3RlcGZ1bmN0aW9ucy5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XHJcbiAgICAgICAgICAgIC8vICAgICAnY2h1bmtfa2V5LiQnOiAnJCcsXHJcbiAgICAgICAgICAgIC8vICAgICAnZXZhbHVhdGlvbl9pZC4kJzogJyQuZXZhbHVhdGlvbl9pZCcsXHJcbiAgICAgICAgICAgIC8vIH0pLFxyXG4gICAgICAgICAgICBvdXRwdXRQYXRoOiAnJC5QYXlsb2FkJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gY29uc3QgcHJvY2Vzc1Rlc3RDYXNlc01hcCA9IG5ldyBzdGVwZnVuY3Rpb25zLk1hcCh0aGlzLCAnUHJvY2VzcyBUZXN0IENhc2VzJywge1xyXG4gICAgICAgIC8vIGl0ZW1zUGF0aDogJyQuY2h1bmtzJyxcclxuICAgICAgICAvLyBtYXhDb25jdXJyZW5jeTogNSxcclxuICAgICAgICAvLyByZXN1bHRQYXRoOiAnJC5Qcm9jZXNzZWRSZXN1bHRzJ1xyXG4gICAgICAgIC8vIH0pO1xyXG4gICAgICAgIC8vIHByb2Nlc3NUZXN0Q2FzZXNNYXAuaXRlbVByb2Nlc3NvcihldmFsdWF0ZVRlc3RDYXNlc1Rhc2spO1xyXG5cclxuICAgICAgICBjb25zdCBwcm9jZXNzVGVzdENhc2VzTWFwID0gbmV3IHN0ZXBmdW5jdGlvbnMuTWFwKHRoaXMsICdQcm9jZXNzIFRlc3QgQ2FzZXMnLCB7XHJcbiAgICAgICAgICAgIGl0ZW1zUGF0aDogJyQuY2h1bmtfa2V5cycsXHJcbiAgICAgICAgICAgIG1heENvbmN1cnJlbmN5OiA1LFxyXG4gICAgICAgICAgICByZXN1bHRQYXRoOiAnJC5wYXJ0aWFsX3Jlc3VsdF9rZXlzJyxcclxuICAgICAgICAgICAgaXRlbVNlbGVjdG9yOiB7XHJcbiAgICAgICAgICAgICAgICAnY2h1bmtfa2V5LiQnOiAnJCQuTWFwLkl0ZW0uVmFsdWUuY2h1bmtfa2V5JyxcclxuICAgICAgICAgICAgICAgICdldmFsdWF0aW9uX2lkLiQnOiAnJCQuTWFwLkl0ZW0uVmFsdWUuZXZhbHVhdGlvbl9pZCcsXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcHJvY2Vzc1Rlc3RDYXNlc01hcC5pdGVtUHJvY2Vzc29yKGV2YWx1YXRlVGVzdENhc2VzVGFzayk7XHJcblxyXG4gICAgICAgIGNvbnN0IGFnZ3JlZ2F0ZVJlc3VsdHNUYXNrID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnQWdncmVnYXRlIFJlc3VsdHMnLCB7XHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb246IHRoaXMuYWdncmVnYXRlRXZhbFJlc3VsdHNGdW5jdGlvbixcclxuICAgICAgICBwYXlsb2FkOiBzdGVwZnVuY3Rpb25zLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcclxuICAgICAgICAgICAgLy8ncGFydGlhbF9yZXN1bHRzX2xpc3QuJCc6ICckLlByb2Nlc3NlZFJlc3VsdHMnLFxyXG4gICAgICAgICAgICAncGFydGlhbF9yZXN1bHRfa2V5cy4kJzogJyQucGFydGlhbF9yZXN1bHRfa2V5cycsXHJcbiAgICAgICAgICAgICdldmFsdWF0aW9uX2lkLiQnOiAnJC5ldmFsdWF0aW9uX2lkJyxcclxuICAgICAgICAgICAgJ2V2YWx1YXRpb25fbmFtZS4kJzogJyQuZXZhbHVhdGlvbl9uYW1lJyxcclxuICAgICAgICAgICAgJ3Rlc3RfY2FzZXNfa2V5LiQnOiAnJC50ZXN0X2Nhc2VzX2tleScsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgb3V0cHV0UGF0aDogJyQuUGF5bG9hZCcsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IHNhdmVSZXN1bHRzVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ1NhdmUgRXZhbHVhdGlvbiBSZXN1bHRzJywge1xyXG4gICAgICAgIGxhbWJkYUZ1bmN0aW9uOiB0aGlzLmxsbUV2YWxSZXN1bHRzSGFuZGxlckZ1bmN0aW9uLFxyXG4gICAgICAgIHBheWxvYWQ6IHN0ZXBmdW5jdGlvbnMuVGFza0lucHV0LmZyb21PYmplY3Qoe1xyXG4gICAgICAgICAgICAnZXZhbHVhdGlvbl9pZC4kJzogJyQuZXZhbHVhdGlvbl9pZCcsXHJcbiAgICAgICAgICAgICdldmFsdWF0aW9uX25hbWUuJCc6ICckLmV2YWx1YXRpb25fbmFtZScsXHJcbiAgICAgICAgICAgICdhdmVyYWdlX3NpbWlsYXJpdHkuJCc6ICckLmF2ZXJhZ2Vfc2ltaWxhcml0eScsXHJcbiAgICAgICAgICAgICdhdmVyYWdlX3JlbGV2YW5jZS4kJzogJyQuYXZlcmFnZV9yZWxldmFuY2UnLFxyXG4gICAgICAgICAgICAnYXZlcmFnZV9jb3JyZWN0bmVzcy4kJzogJyQuYXZlcmFnZV9jb3JyZWN0bmVzcycsXHJcbiAgICAgICAgICAgICd0b3RhbF9xdWVzdGlvbnMuJCc6ICckLnRvdGFsX3F1ZXN0aW9ucycsXHJcbiAgICAgICAgICAgICdkZXRhaWxlZF9yZXN1bHRzX3MzX2tleS4kJzogJyQuZGV0YWlsZWRfcmVzdWx0c19zM19rZXknLFxyXG4gICAgICAgICAgICAvLyAnZGV0YWlsZWRfcmVzdWx0cy4kJzogJyQuZGV0YWlsZWRfcmVzdWx0cycsXHJcbiAgICAgICAgICAgICd0ZXN0X2Nhc2VzX2tleS4kJzogJyQudGVzdF9jYXNlc19rZXknLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIG91dHB1dFBhdGg6ICckLlBheWxvYWQnLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBjbGVhbnVwQ2h1bmtzVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ0NsZWFudXAgQ2h1bmtzJywge1xyXG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogdGhpcy5sbG1FdmFsQ2xlYW51cEZ1bmN0aW9uLFxyXG4gICAgICAgICAgICBwYXlsb2FkOiBzdGVwZnVuY3Rpb25zLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcclxuICAgICAgICAgICAgICAgICdib2R5LiQnOiAnJC5ib2R5JyxcclxuICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIG91dHB1dFBhdGg6ICckLlBheWxvYWQnLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICBjb25zdCBkZWZpbml0aW9uID0gc3BsaXRUZXN0Q2FzZXNUYXNrXHJcbiAgICAgICAgLm5leHQocHJvY2Vzc1Rlc3RDYXNlc01hcClcclxuICAgICAgICAubmV4dChhZ2dyZWdhdGVSZXN1bHRzVGFzaylcclxuICAgICAgICAubmV4dChzYXZlUmVzdWx0c1Rhc2spXHJcbiAgICAgICAgLm5leHQoY2xlYW51cENodW5rc1Rhc2spO1xyXG5cclxuICAgICAgICBjb25zdCBsbG1FdmFsU3RhdGVNYWNoaW5lID0gbmV3IHN0ZXBmdW5jdGlvbnMuU3RhdGVNYWNoaW5lKHRoaXMsICdFdmFsdWF0aW9uU3RhdGVNYWNoaW5lJywge1xyXG4gICAgICAgICAgICBkZWZpbml0aW9uQm9keTogc3RlcGZ1bmN0aW9ucy5EZWZpbml0aW9uQm9keS5mcm9tQ2hhaW5hYmxlKGRlZmluaXRpb24pLFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uaG91cnMoMSksXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5sbG1FdmFsU3RhdGVNYWNoaW5lID0gbGxtRXZhbFN0YXRlTWFjaGluZTtcclxuXHJcbiAgICAgICAgY29uc3Qgc3RhcnRMbG1FdmFsU3RhdGVNYWNoaW5lRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdTdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWx1YXRpb24vc3RhcnQtbGxtLWV2YWwnKSksIFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnaW5kZXguaGFuZGxlcicsIFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgICAgICAgXCJTVEFURV9NQUNISU5FX0FSTlwiIDogdGhpcy5sbG1FdmFsU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFyblxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgICAgICB9KTtcclxuICAgICAgICBzdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFsnc3RhdGVzOlN0YXJ0RXhlY3V0aW9uJ10sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW3RoaXMubGxtRXZhbFN0YXRlTWFjaGluZS5zdGF0ZU1hY2hpbmVBcm5dLCBcclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgdGhpcy5zdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvbiA9IHN0YXJ0TGxtRXZhbFN0YXRlTWFjaGluZUZ1bmN0aW9uO1xyXG4gICAgfVxyXG59Il19