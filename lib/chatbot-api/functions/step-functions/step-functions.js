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
                "PROMPT": `You are a strict source-grounded AI assistant for IT-Operations at EOHHS/MassHealth. You MUST only provide information that is explicitly present in the retrieved documents. 

CRITICAL GROUNDING RULES:
- Only answer using information explicitly stated in the provided Context
- NEVER expand acronyms, abbreviations, or codes unless the expansion is explicitly provided in the Context
- NEVER infer meanings, relationships, or definitions from your training data
- If Context doesn't contain sufficient information, respond: "I don't have enough information in the retrieved documents to answer that question"
- For acronyms like "MBY", "EOHHS", etc. - only use them exactly as written in source documents, do not define them unless definitions are explicitly provided

If no relevant information is found in Context, say: "No relevant information found in the documentation."`,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RlcC1mdW5jdGlvbnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdGVwLWZ1bmN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQywyQ0FBdUM7QUFDdkMsMkNBQTZCO0FBRTdCLDZCQUE2QjtBQUM3QiwrREFBaUQ7QUFDakQseURBQTJDO0FBSTNDLCtEQUFzRDtBQUV0RCw2RUFBK0Q7QUFDL0QsMkVBQTZEO0FBUzdELE1BQWEsa0JBQW1CLFNBQVEsc0JBQVM7SUFVN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE4QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSw0QkFBNEIsRUFBRTtZQUN2RixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXO1lBQ25DLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxpQ0FBaUMsQ0FBQyxDQUFDO1lBQ3BGLE9BQU8sRUFBRSxnQ0FBZ0M7WUFDekMsV0FBVyxFQUFFO2dCQUNULG1CQUFtQixFQUFHLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVO2FBQzdEO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUNwQyxDQUFDLENBQUM7UUFDSCwwQkFBMEIsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQy9ELE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFO2dCQUNMLGNBQWM7Z0JBQ2QsZUFBZTtnQkFDZixjQUFjO2FBQ2pCO1lBQ0QsU0FBUyxFQUFFO2dCQUNQLEtBQUss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bkMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLCtCQUErQixDQUFDLENBQUM7WUFDbEYsT0FBTyxFQUFFLGVBQWU7WUFDeEIsV0FBVyxFQUFFO2dCQUNULG1CQUFtQixFQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxlQUFlO2FBQ2pFO1lBQ0QsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUNwQyxDQUFDLENBQUM7UUFDSCxnQ0FBZ0MsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQ3JFLE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFLENBQUMsdUJBQXVCLENBQUM7WUFDbEMsU0FBUyxFQUFFLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGVBQWUsQ0FBQztTQUN4RCxDQUFDLENBQUMsQ0FBQztRQUNKLElBQUksQ0FBQyxnQ0FBZ0MsR0FBRyxnQ0FBZ0MsQ0FBQztJQUM3RSxDQUFDO0NBQ0o7QUExVEQsZ0RBMFRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XHJcblxyXG4vLyBJbXBvcnQgTGFtYmRhIEwyIGNvbnN0cnVjdFxyXG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0IHsgVGFibGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XHJcbmltcG9ydCAqIGFzIGtlbmRyYSBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta2VuZHJhJztcclxuaW1wb3J0IHsgUGxhdGZvcm0gfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNyLWFzc2V0cyc7XHJcbmltcG9ydCB7IFN0YXRlTWFjaGluZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zJztcclxuaW1wb3J0ICogYXMgc3RlcGZ1bmN0aW9ucyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtc3RlcGZ1bmN0aW9ucyc7XHJcbmltcG9ydCAqIGFzIHRhc2tzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJztcclxuXHJcbmludGVyZmFjZSBTdGVwRnVuY3Rpb25zU3RhY2tQcm9wcyB7XHJcbiAgICByZWFkb25seSBrbm93bGVkZ2VCYXNlIDoga2VuZHJhLkNmbkluZGV4O1xyXG4gICAgcmVhZG9ubHkgZXZhbFN1bW1hcmllc1RhYmxlIDogVGFibGU7XHJcbiAgICByZWFkb25seSBldmFsUmVzdXRsc1RhYmxlIDogVGFibGU7XHJcbiAgICByZWFkb25seSBldmFsVGVzdENhc2VzQnVja2V0IDogczMuQnVja2V0O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgU3RlcEZ1bmN0aW9uc1N0YWNrIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICAgIHB1YmxpYyByZWFkb25seSBzdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gICAgcHVibGljIHJlYWRvbmx5IHNwbGl0RXZhbFRlc3RDYXNlc0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgbGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICAgIHB1YmxpYyByZWFkb25seSBnZW5lcmF0ZVJlc3BvbnNlRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICAgIHB1YmxpYyByZWFkb25seSBsbG1FdmFsRnVuY3Rpb246IGxhbWJkYS5GdW5jdGlvbjtcclxuICAgIHB1YmxpYyByZWFkb25seSBhZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XHJcbiAgICBwdWJsaWMgcmVhZG9ubHkgbGxtRXZhbENsZWFudXBGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uO1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGxsbUV2YWxTdGF0ZU1hY2hpbmU6IFN0YXRlTWFjaGluZTtcclxuXHJcbiAgICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogU3RlcEZ1bmN0aW9uc1N0YWNrUHJvcHMpIHtcclxuICAgICAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgICAgICBjb25zdCBzcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1NwbGl0RXZhbFRlc3RDYXNlc0Z1bmN0aW9uJywge1xyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMixcclxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9zcGxpdC10ZXN0LWNhc2VzJykpLCBcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgICAgICAgXCJURVNUX0NBU0VTX0JVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHNwbGl0RXZhbFRlc3RDYXNlc0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAnczM6TGlzdEJ1Y2tldCcsXHJcbiAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0J1xyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuLCBcclxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0QXJuICsgXCIvKlwiLCBcclxuICAgICAgICAgICAgICAgIHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYXJuRm9yT2JqZWN0cygnKicpLFxyXG4gICAgICAgICAgICBdXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIHRoaXMuc3BsaXRFdmFsVGVzdENhc2VzRnVuY3Rpb24gPSBzcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbjtcclxuXHJcbiAgICAgICAgY29uc3QgbGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdMbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWx1YXRpb24vcmVzdWx0cy10by1kZGInKSksIFxyXG4gICAgICAgICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICAgICAgICBcIkVWQUxfU1VNTUFSSUVTX1RBQkxFXCIgOiBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJFVkFMX1JFU1VMVFNfVEFCTEVcIiA6IHByb3BzLmV2YWxSZXN1dGxzVGFibGUudGFibGVOYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJURVNUX0NBU0VTX0JVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgICAgICB9KTtcclxuICAgICAgICBsbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcclxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpQdXRJdGVtJyxcclxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcclxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcclxuICAgICAgICAgICAgICAgICdkeW5hbW9kYjpRdWVyeScsXHJcbiAgICAgICAgICAgICAgICAnZHluYW1vZGI6U2NhbidcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuZXZhbFJlc3V0bHNUYWJsZS50YWJsZUFybiwgcHJvcHMuZXZhbFJlc3V0bHNUYWJsZS50YWJsZUFybiArIFwiL2luZGV4LypcIiwgcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLnRhYmxlQXJuLCBwcm9wcy5ldmFsU3VtbWFyaWVzVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCJdXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIGxsbUV2YWxSZXN1bHRzSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiwgXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiArIFwiLypcIiwgXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmFybkZvck9iamVjdHMoJyonKSxcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBwcm9wcy5ldmFsUmVzdXRsc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbik7XHJcbiAgICAgICAgcHJvcHMuZXZhbFN1bW1hcmllc1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShsbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbik7XHJcbiAgICAgICAgdGhpcy5sbG1FdmFsUmVzdWx0c0hhbmRsZXJGdW5jdGlvbiA9IGxsbUV2YWxSZXN1bHRzSGFuZGxlckZ1bmN0aW9uOyBcclxuXHJcbiAgICAgICAgY29uc3QgZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnR2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uJywge1xyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9nZW5lcmF0ZS1yZXNwb25zZScpKSwgXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50IDoge1xyXG4gICAgICAgICAgICAgICAgXCJQUk9NUFRcIiA6IGBZb3UgYXJlIGEgc3RyaWN0IHNvdXJjZS1ncm91bmRlZCBBSSBhc3Npc3RhbnQgZm9yIElULU9wZXJhdGlvbnMgYXQgRU9ISFMvTWFzc0hlYWx0aC4gWW91IE1VU1Qgb25seSBwcm92aWRlIGluZm9ybWF0aW9uIHRoYXQgaXMgZXhwbGljaXRseSBwcmVzZW50IGluIHRoZSByZXRyaWV2ZWQgZG9jdW1lbnRzLiBcclxuXHJcbkNSSVRJQ0FMIEdST1VORElORyBSVUxFUzpcclxuLSBPbmx5IGFuc3dlciB1c2luZyBpbmZvcm1hdGlvbiBleHBsaWNpdGx5IHN0YXRlZCBpbiB0aGUgcHJvdmlkZWQgQ29udGV4dFxyXG4tIE5FVkVSIGV4cGFuZCBhY3JvbnltcywgYWJicmV2aWF0aW9ucywgb3IgY29kZXMgdW5sZXNzIHRoZSBleHBhbnNpb24gaXMgZXhwbGljaXRseSBwcm92aWRlZCBpbiB0aGUgQ29udGV4dFxyXG4tIE5FVkVSIGluZmVyIG1lYW5pbmdzLCByZWxhdGlvbnNoaXBzLCBvciBkZWZpbml0aW9ucyBmcm9tIHlvdXIgdHJhaW5pbmcgZGF0YVxyXG4tIElmIENvbnRleHQgZG9lc24ndCBjb250YWluIHN1ZmZpY2llbnQgaW5mb3JtYXRpb24sIHJlc3BvbmQ6IFwiSSBkb24ndCBoYXZlIGVub3VnaCBpbmZvcm1hdGlvbiBpbiB0aGUgcmV0cmlldmVkIGRvY3VtZW50cyB0byBhbnN3ZXIgdGhhdCBxdWVzdGlvblwiXHJcbi0gRm9yIGFjcm9ueW1zIGxpa2UgXCJNQllcIiwgXCJFT0hIU1wiLCBldGMuIC0gb25seSB1c2UgdGhlbSBleGFjdGx5IGFzIHdyaXR0ZW4gaW4gc291cmNlIGRvY3VtZW50cywgZG8gbm90IGRlZmluZSB0aGVtIHVubGVzcyBkZWZpbml0aW9ucyBhcmUgZXhwbGljaXRseSBwcm92aWRlZFxyXG5cclxuSWYgbm8gcmVsZXZhbnQgaW5mb3JtYXRpb24gaXMgZm91bmQgaW4gQ29udGV4dCwgc2F5OiBcIk5vIHJlbGV2YW50IGluZm9ybWF0aW9uIGZvdW5kIGluIHRoZSBkb2N1bWVudGF0aW9uLlwiYCxcclxuICAgICAgICAgICAgICAgICdLQl9JRCcgOiBwcm9wcy5rbm93bGVkZ2VCYXNlLmF0dHJJZCxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgICAgICB9KTtcclxuICAgICAgICBnZW5lcmF0ZVJlc3BvbnNlRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxyXG4gICAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJyxcclxuXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW1wiKlwiXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBnZW5lcmF0ZVJlc3BvbnNlRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgJ2tlbmRyYTpSZXRyaWV2ZSdcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQmFzZS5hdHRyQXJuXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICB0aGlzLmdlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbiA9IGdlbmVyYXRlUmVzcG9uc2VGdW5jdGlvbjtcclxuXHJcbiAgICAgICAgY29uc3QgbGxtRXZhbEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5Eb2NrZXJJbWFnZUZ1bmN0aW9uKHRoaXMsICdMbG1FdmFsdWF0aW9uRnVuY3Rpb24nLCB7XHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Eb2NrZXJJbWFnZUNvZGUuZnJvbUltYWdlQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2xsbS1ldmFsdWF0aW9uL2V2YWwnKSwge1xyXG4gICAgICAgICAgICAgICAgcGxhdGZvcm06IFBsYXRmb3JtLkxJTlVYX0FNRDY0LCAvLyBTcGVjaWZ5IHRoZSBjb3JyZWN0IHBsYXRmb3JtXHJcbiAgICAgICAgICAgICAgfSksXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICAgICAgICBcIkdFTkVSQVRFX1JFU1BPTlNFX0xBTUJEQV9OQU1FXCIgOiBnZW5lcmF0ZVJlc3BvbnNlRnVuY3Rpb24uZnVuY3Rpb25OYW1lLFxyXG4gICAgICAgICAgICAgICAgXCJCRURST0NLX01PREVMX0lEXCIgOiBcImFudGhyb3BpYy5jbGF1ZGUtMy1oYWlrdS0yMDI0MDMwNy12MTowXCIsXHJcbiAgICAgICAgICAgICAgICBcIlRFU1RfQ0FTRVNfQlVDS0VUXCIgOiBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldE5hbWVcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTUpLFxyXG4gICAgICAgICAgICBtZW1vcnlTaXplOiAxMDI0MFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGxsbUV2YWxGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAnZWNyOkdldEF1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgICAgICdlY3I6R2V0RG93bmxvYWRVcmxGb3JMYXllcicsXHJcbiAgICAgICAgICAgICAgJ2VjcjpCYXRjaEdldEltYWdlJyxcclxuICAgICAgICAgICAgICAnZWNyOkJhdGNoQ2hlY2tMYXllckF2YWlsYWJpbGl0eSdcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbJyonXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICBsbG1FdmFsRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgJ2JlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW0nLFxyXG4gICAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJ1xyXG4gICAgICAgICAgICBdLFxyXG4gICAgICAgICAgICByZXNvdXJjZXM6IFsnKiddXHJcbiAgICAgICAgfSkpO1xyXG4gICAgICAgIGxsbUV2YWxGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOlB1dE9iamVjdCcsXHJcbiAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4sIFxyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXRBcm4gKyBcIi8qXCIsIFxyXG4gICAgICAgICAgICAgICAgcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyksXHJcbiAgICAgICAgICAgIF1cclxuICAgICAgICB9KSk7XHJcbiAgICAgICAgZ2VuZXJhdGVSZXNwb25zZUZ1bmN0aW9uLmdyYW50SW52b2tlKGxsbUV2YWxGdW5jdGlvbik7XHJcbiAgICAgICAgdGhpcy5sbG1FdmFsRnVuY3Rpb24gPSBsbG1FdmFsRnVuY3Rpb247XHJcblxyXG4gICAgICAgIGNvbnN0IGFnZ3JlZ2F0ZUV2YWxSZXN1bHRzRnVuY3Rpb24gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdBZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uJywge1xyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMixcclxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9hZ2dyZWdhdGUtZXZhbC1yZXN1bHRzJykpLCBcclxuICAgICAgICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsIFxyXG4gICAgICAgICAgICBlbnZpcm9ubWVudDoge1xyXG4gICAgICAgICAgICAgICAgXCJURVNUX0NBU0VTX0JVQ0tFVFwiIDogcHJvcHMuZXZhbFRlc3RDYXNlc0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgICAgICB9KTtcclxuICAgICAgICBhZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgJ3MzOkdldE9iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAnczM6UHV0T2JqZWN0JyxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiwgXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiArIFwiLypcIiwgXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmFybkZvck9iamVjdHMoJyonKSxcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICB0aGlzLmFnZ3JlZ2F0ZUV2YWxSZXN1bHRzRnVuY3Rpb24gPSBhZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uO1xyXG5cclxuICAgICAgICBjb25zdCBsbG1FdmFsQ2xlYW51cEZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnTGxtRXZhbENsZWFudXBGdW5jdGlvbicsIHtcclxuICAgICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsXHJcbiAgICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnbGxtLWV2YWx1YXRpb24vY2xlYW51cCcpKSwgXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdsYW1iZGFfZnVuY3Rpb24ubGFtYmRhX2hhbmRsZXInLCBcclxuICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHtcclxuICAgICAgICAgICAgICAgIFwiVEVTVF9DQVNFU19CVUNLRVRcIiA6IHByb3BzLmV2YWxUZXN0Q2FzZXNCdWNrZXQuYnVja2V0TmFtZVxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcclxuICAgICAgICB9KTtcclxuICAgICAgICBsbG1FdmFsQ2xlYW51cEZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgJ3MzOkxpc3RCdWNrZXQnLFxyXG4gICAgICAgICAgICAgICAgJ3MzOkRlbGV0ZU9iamVjdCcsXHJcbiAgICAgICAgICAgICAgICAnczM6RGVsZXRlT2JqZWN0cydcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiwgXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmJ1Y2tldEFybiArIFwiLypcIiwgXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5ldmFsVGVzdENhc2VzQnVja2V0LmFybkZvck9iamVjdHMoJyonKSxcclxuICAgICAgICAgICAgXVxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICB0aGlzLmxsbUV2YWxDbGVhbnVwRnVuY3Rpb24gPSBsbG1FdmFsQ2xlYW51cEZ1bmN0aW9uO1xyXG5cclxuICAgICAgICBjb25zdCBzcGxpdFRlc3RDYXNlc1Rhc2sgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdTcGxpdCBUZXN0IENhc2VzJywge1xyXG4gICAgICAgICAgICBsYW1iZGFGdW5jdGlvbjogdGhpcy5zcGxpdEV2YWxUZXN0Q2FzZXNGdW5jdGlvbixcclxuICAgICAgICAgICAgb3V0cHV0UGF0aDogJyQuUGF5bG9hZCcsXHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgLy8gY29uc3QgZXZhbHVhdGVUZXN0Q2FzZXNUYXNrID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnRXZhbHVhdGUgVGVzdCBDYXNlcycsIHtcclxuICAgICAgICAvLyBsYW1iZGFGdW5jdGlvbjogdGhpcy5sbG1FdmFsRnVuY3Rpb24sXHJcbiAgICAgICAgLy8gb3V0cHV0UGF0aDogJyQuUGF5bG9hZCcsXHJcbiAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgICAgIC8vIGNvbnN0IGV2YWx1YXRlVGVzdENhc2VzVGFzayA9IG5ldyB0YXNrcy5MYW1iZGFJbnZva2UodGhpcywgJ0V2YWx1YXRlIFRlc3QgQ2FzZXMnLCB7XHJcbiAgICAgICAgLy8gICAgIGxhbWJkYUZ1bmN0aW9uOiB0aGlzLmxsbUV2YWxGdW5jdGlvbixcclxuICAgICAgICAvLyAgICAgcGF5bG9hZDogc3RlcGZ1bmN0aW9ucy5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XHJcbiAgICAgICAgLy8gICAgICAgICAnY2h1bmtfa2V5LiQnOiAnJCcsXHJcbiAgICAgICAgLy8gICAgIH0pLFxyXG4gICAgICAgIC8vICAgICBvdXRwdXRQYXRoOiAnJC5QYXlsb2FkJyxcclxuICAgICAgICAvLyB9KTtcclxuXHJcbiAgICAgICAgY29uc3QgZXZhbHVhdGVUZXN0Q2FzZXNUYXNrID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnRXZhbHVhdGUgVGVzdCBDYXNlcycsIHtcclxuICAgICAgICAgICAgbGFtYmRhRnVuY3Rpb246IHRoaXMubGxtRXZhbEZ1bmN0aW9uLFxyXG4gICAgICAgICAgICAvLyBwYXlsb2FkOiBzdGVwZnVuY3Rpb25zLlRhc2tJbnB1dC5mcm9tT2JqZWN0KHtcclxuICAgICAgICAgICAgLy8gICAgICdjaHVua19rZXkuJCc6ICckJyxcclxuICAgICAgICAgICAgLy8gICAgICdldmFsdWF0aW9uX2lkLiQnOiAnJC5ldmFsdWF0aW9uX2lkJyxcclxuICAgICAgICAgICAgLy8gfSksXHJcbiAgICAgICAgICAgIG91dHB1dFBhdGg6ICckLlBheWxvYWQnLFxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvLyBjb25zdCBwcm9jZXNzVGVzdENhc2VzTWFwID0gbmV3IHN0ZXBmdW5jdGlvbnMuTWFwKHRoaXMsICdQcm9jZXNzIFRlc3QgQ2FzZXMnLCB7XHJcbiAgICAgICAgLy8gaXRlbXNQYXRoOiAnJC5jaHVua3MnLFxyXG4gICAgICAgIC8vIG1heENvbmN1cnJlbmN5OiA1LFxyXG4gICAgICAgIC8vIHJlc3VsdFBhdGg6ICckLlByb2Nlc3NlZFJlc3VsdHMnXHJcbiAgICAgICAgLy8gfSk7XHJcbiAgICAgICAgLy8gcHJvY2Vzc1Rlc3RDYXNlc01hcC5pdGVtUHJvY2Vzc29yKGV2YWx1YXRlVGVzdENhc2VzVGFzayk7XHJcblxyXG4gICAgICAgIGNvbnN0IHByb2Nlc3NUZXN0Q2FzZXNNYXAgPSBuZXcgc3RlcGZ1bmN0aW9ucy5NYXAodGhpcywgJ1Byb2Nlc3MgVGVzdCBDYXNlcycsIHtcclxuICAgICAgICAgICAgaXRlbXNQYXRoOiAnJC5jaHVua19rZXlzJyxcclxuICAgICAgICAgICAgbWF4Q29uY3VycmVuY3k6IDUsXHJcbiAgICAgICAgICAgIHJlc3VsdFBhdGg6ICckLnBhcnRpYWxfcmVzdWx0X2tleXMnLFxyXG4gICAgICAgICAgICBpdGVtU2VsZWN0b3I6IHtcclxuICAgICAgICAgICAgICAgICdjaHVua19rZXkuJCc6ICckJC5NYXAuSXRlbS5WYWx1ZS5jaHVua19rZXknLFxyXG4gICAgICAgICAgICAgICAgJ2V2YWx1YXRpb25faWQuJCc6ICckJC5NYXAuSXRlbS5WYWx1ZS5ldmFsdWF0aW9uX2lkJyxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICB9KTtcclxuICAgICAgICBwcm9jZXNzVGVzdENhc2VzTWFwLml0ZW1Qcm9jZXNzb3IoZXZhbHVhdGVUZXN0Q2FzZXNUYXNrKTtcclxuXHJcbiAgICAgICAgY29uc3QgYWdncmVnYXRlUmVzdWx0c1Rhc2sgPSBuZXcgdGFza3MuTGFtYmRhSW52b2tlKHRoaXMsICdBZ2dyZWdhdGUgUmVzdWx0cycsIHtcclxuICAgICAgICBsYW1iZGFGdW5jdGlvbjogdGhpcy5hZ2dyZWdhdGVFdmFsUmVzdWx0c0Z1bmN0aW9uLFxyXG4gICAgICAgIHBheWxvYWQ6IHN0ZXBmdW5jdGlvbnMuVGFza0lucHV0LmZyb21PYmplY3Qoe1xyXG4gICAgICAgICAgICAvLydwYXJ0aWFsX3Jlc3VsdHNfbGlzdC4kJzogJyQuUHJvY2Vzc2VkUmVzdWx0cycsXHJcbiAgICAgICAgICAgICdwYXJ0aWFsX3Jlc3VsdF9rZXlzLiQnOiAnJC5wYXJ0aWFsX3Jlc3VsdF9rZXlzJyxcclxuICAgICAgICAgICAgJ2V2YWx1YXRpb25faWQuJCc6ICckLmV2YWx1YXRpb25faWQnLFxyXG4gICAgICAgICAgICAnZXZhbHVhdGlvbl9uYW1lLiQnOiAnJC5ldmFsdWF0aW9uX25hbWUnLFxyXG4gICAgICAgICAgICAndGVzdF9jYXNlc19rZXkuJCc6ICckLnRlc3RfY2FzZXNfa2V5JyxcclxuICAgICAgICB9KSxcclxuICAgICAgICBvdXRwdXRQYXRoOiAnJC5QYXlsb2FkJyxcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgY29uc3Qgc2F2ZVJlc3VsdHNUYXNrID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnU2F2ZSBFdmFsdWF0aW9uIFJlc3VsdHMnLCB7XHJcbiAgICAgICAgbGFtYmRhRnVuY3Rpb246IHRoaXMubGxtRXZhbFJlc3VsdHNIYW5kbGVyRnVuY3Rpb24sXHJcbiAgICAgICAgcGF5bG9hZDogc3RlcGZ1bmN0aW9ucy5UYXNrSW5wdXQuZnJvbU9iamVjdCh7XHJcbiAgICAgICAgICAgICdldmFsdWF0aW9uX2lkLiQnOiAnJC5ldmFsdWF0aW9uX2lkJyxcclxuICAgICAgICAgICAgJ2V2YWx1YXRpb25fbmFtZS4kJzogJyQuZXZhbHVhdGlvbl9uYW1lJyxcclxuICAgICAgICAgICAgJ2F2ZXJhZ2Vfc2ltaWxhcml0eS4kJzogJyQuYXZlcmFnZV9zaW1pbGFyaXR5JyxcclxuICAgICAgICAgICAgJ2F2ZXJhZ2VfcmVsZXZhbmNlLiQnOiAnJC5hdmVyYWdlX3JlbGV2YW5jZScsXHJcbiAgICAgICAgICAgICdhdmVyYWdlX2NvcnJlY3RuZXNzLiQnOiAnJC5hdmVyYWdlX2NvcnJlY3RuZXNzJyxcclxuICAgICAgICAgICAgJ3RvdGFsX3F1ZXN0aW9ucy4kJzogJyQudG90YWxfcXVlc3Rpb25zJyxcclxuICAgICAgICAgICAgJ2RldGFpbGVkX3Jlc3VsdHNfczNfa2V5LiQnOiAnJC5kZXRhaWxlZF9yZXN1bHRzX3MzX2tleScsXHJcbiAgICAgICAgICAgIC8vICdkZXRhaWxlZF9yZXN1bHRzLiQnOiAnJC5kZXRhaWxlZF9yZXN1bHRzJyxcclxuICAgICAgICAgICAgJ3Rlc3RfY2FzZXNfa2V5LiQnOiAnJC50ZXN0X2Nhc2VzX2tleScsXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgb3V0cHV0UGF0aDogJyQuUGF5bG9hZCcsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGNsZWFudXBDaHVua3NUYXNrID0gbmV3IHRhc2tzLkxhbWJkYUludm9rZSh0aGlzLCAnQ2xlYW51cCBDaHVua3MnLCB7XHJcbiAgICAgICAgICAgIGxhbWJkYUZ1bmN0aW9uOiB0aGlzLmxsbUV2YWxDbGVhbnVwRnVuY3Rpb24sXHJcbiAgICAgICAgICAgIHBheWxvYWQ6IHN0ZXBmdW5jdGlvbnMuVGFza0lucHV0LmZyb21PYmplY3Qoe1xyXG4gICAgICAgICAgICAgICAgJ2JvZHkuJCc6ICckLmJvZHknLFxyXG4gICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgb3V0cHV0UGF0aDogJyQuUGF5bG9hZCcsXHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIGNvbnN0IGRlZmluaXRpb24gPSBzcGxpdFRlc3RDYXNlc1Rhc2tcclxuICAgICAgICAubmV4dChwcm9jZXNzVGVzdENhc2VzTWFwKVxyXG4gICAgICAgIC5uZXh0KGFnZ3JlZ2F0ZVJlc3VsdHNUYXNrKVxyXG4gICAgICAgIC5uZXh0KHNhdmVSZXN1bHRzVGFzaylcclxuICAgICAgICAubmV4dChjbGVhbnVwQ2h1bmtzVGFzayk7XHJcblxyXG4gICAgICAgIGNvbnN0IGxsbUV2YWxTdGF0ZU1hY2hpbmUgPSBuZXcgc3RlcGZ1bmN0aW9ucy5TdGF0ZU1hY2hpbmUodGhpcywgJ0V2YWx1YXRpb25TdGF0ZU1hY2hpbmUnLCB7XHJcbiAgICAgICAgICAgIGRlZmluaXRpb25Cb2R5OiBzdGVwZnVuY3Rpb25zLkRlZmluaXRpb25Cb2R5LmZyb21DaGFpbmFibGUoZGVmaW5pdGlvbiksXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5ob3VycygxKSxcclxuICAgICAgICB9KTtcclxuICAgICAgICB0aGlzLmxsbUV2YWxTdGF0ZU1hY2hpbmUgPSBsbG1FdmFsU3RhdGVNYWNoaW5lO1xyXG5cclxuICAgICAgICBjb25zdCBzdGFydExsbUV2YWxTdGF0ZU1hY2hpbmVGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ1N0YXJ0TGxtRXZhbFN0YXRlTWFjaGluZUZ1bmN0aW9uJywge1xyXG4gICAgICAgICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcclxuICAgICAgICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdsbG0tZXZhbHVhdGlvbi9zdGFydC1sbG0tZXZhbCcpKSwgXHJcbiAgICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgXHJcbiAgICAgICAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgICAgICAgICBcIlNUQVRFX01BQ0hJTkVfQVJOXCIgOiB0aGlzLmxsbUV2YWxTdGF0ZU1hY2hpbmUuc3RhdGVNYWNoaW5lQXJuXHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHN0YXJ0TGxtRXZhbFN0YXRlTWFjaGluZUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICAgICAgYWN0aW9uczogWydzdGF0ZXM6U3RhcnRFeGVjdXRpb24nXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy5sbG1FdmFsU3RhdGVNYWNoaW5lLnN0YXRlTWFjaGluZUFybl0sIFxyXG4gICAgICAgIH0pKTtcclxuICAgICAgICB0aGlzLnN0YXJ0TGxtRXZhbFN0YXRlTWFjaGluZUZ1bmN0aW9uID0gc3RhcnRMbG1FdmFsU3RhdGVNYWNoaW5lRnVuY3Rpb247XHJcbiAgICB9XHJcbn0iXX0=