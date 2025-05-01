import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as kendra from 'aws-cdk-lib/aws-kendra';
import { StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
interface StepFunctionsStackProps {
    readonly knowledgeBase: kendra.CfnIndex;
    readonly evalSummariesTable: Table;
    readonly evalResutlsTable: Table;
    readonly evalTestCasesBucket: s3.Bucket;
}
export declare class StepFunctionsStack extends Construct {
    readonly startLlmEvalStateMachineFunction: lambda.Function;
    readonly splitEvalTestCasesFunction: lambda.Function;
    readonly llmEvalResultsHandlerFunction: lambda.Function;
    readonly generateResponseFunction: lambda.Function;
    readonly llmEvalFunction: lambda.Function;
    readonly aggregateEvalResultsFunction: lambda.Function;
    readonly llmEvalCleanupFunction: lambda.Function;
    readonly llmEvalStateMachine: StateMachine;
    constructor(scope: Construct, id: string, props: StepFunctionsStackProps);
}
export {};
