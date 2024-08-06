"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LambdaFunctionStack = void 0;
const cdk = require("aws-cdk-lib");
const path = require("path");
// Import Lambda L2 construct
const lambda = require("aws-cdk-lib/aws-lambda");
const iam = require("aws-cdk-lib/aws-iam");
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
                "INDEX_ID": props.kendraIndex.attrId
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
        const getS3APIHandlerFunction = new lambda.Function(scope, 'GetS3FilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/get-s3')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        getS3APIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.getS3Function = getS3APIHandlerFunction;
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
        const uploadS3APIHandlerFunction = new lambda.Function(scope, 'UploadS3FilesHandlerFunction', {
            runtime: lambda.Runtime.NODEJS_20_X, // Choose any supported Node.js runtime
            code: lambda.Code.fromAsset(path.join(__dirname, 'knowledge-management/upload-s3')), // Points to the lambda directory
            handler: 'index.handler', // Points to the 'hello' file in the lambda directory
            environment: {
                "BUCKET": props.knowledgeBucket.bucketName,
            },
            timeout: cdk.Duration.seconds(30)
        });
        uploadS3APIHandlerFunction.addToRolePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                's3:*'
            ],
            resources: [props.knowledgeBucket.bucketArn, props.knowledgeBucket.bucketArn + "/*"]
        }));
        this.uploadS3Function = uploadS3APIHandlerFunction;
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
    }
}
exports.LambdaFunctionStack = LambdaFunctionStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnVuY3Rpb25zLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZnVuY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG1DQUFtQztBQUVuQyw2QkFBNkI7QUFFN0IsNkJBQTZCO0FBQzdCLGlEQUFpRDtBQUNqRCwyQ0FBMkM7QUFpQjNDLE1BQWEsbUJBQW9CLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFXaEQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUErQjtRQUN2RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0seUJBQXlCLEdBQUcsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSx3QkFBd0IsRUFBRTtZQUNyRixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsdUNBQXVDO1lBQzVFLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsaUNBQWlDO1lBQ3ZHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxxREFBcUQ7WUFDaEcsV0FBVyxFQUFFO2dCQUNYLGdCQUFnQixFQUFHLEtBQUssQ0FBQyxZQUFZLENBQUMsU0FBUzthQUNoRDtZQUNELE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDbEMsQ0FBQyxDQUFDO1FBRUgseUJBQXlCLENBQUMsZUFBZSxDQUFDLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUNoRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRTtnQkFDUCxrQkFBa0I7Z0JBQ2xCLGtCQUFrQjtnQkFDbEIscUJBQXFCO2dCQUNyQixxQkFBcUI7Z0JBQ3JCLGdCQUFnQjtnQkFDaEIsZUFBZTthQUNoQjtZQUNELFNBQVMsRUFBRSxDQUFD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QUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyxnQ0FBZ0MsQ0FBQztZQUMzQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUFDLENBQUM7UUFFSixJQUFJLENBQUMsOEJBQThCLEdBQUcsOEJBQThCLENBQUM7SUFFdkUsQ0FBQztDQUNGO0FBL01ELGtEQStNQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5cbi8vIEltcG9ydCBMYW1iZGEgTDIgY29uc3RydWN0XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBpYW0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWlhbSc7XG5pbXBvcnQgeyBUYWJsZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBrZW5kcmEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWtlbmRyYSc7XG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XG5pbXBvcnQgKiBhcyBjbG91ZHdhdGNoIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHdhdGNoJztcblxuXG5pbnRlcmZhY2UgTGFtYmRhRnVuY3Rpb25TdGFja1Byb3BzIHsgIFxuICByZWFkb25seSB3c0FwaUVuZHBvaW50IDogc3RyaW5nOyAgXG4gIHJlYWRvbmx5IHNlc3Npb25UYWJsZSA6IFRhYmxlO1xuICByZWFkb25seSBrZW5kcmFJbmRleCA6IGtlbmRyYS5DZm5JbmRleDtcbiAgcmVhZG9ubHkga2VuZHJhU291cmNlIDoga2VuZHJhLkNmbkRhdGFTb3VyY2U7XG4gIHJlYWRvbmx5IGZlZWRiYWNrVGFibGUgOiBUYWJsZTtcbiAgcmVhZG9ubHkgZmVlZGJhY2tCdWNrZXQgOiBzMy5CdWNrZXQ7XG4gIHJlYWRvbmx5IGtub3dsZWRnZUJ1Y2tldCA6IHMzLkJ1Y2tldDtcbn1cblxuZXhwb3J0IGNsYXNzIExhbWJkYUZ1bmN0aW9uU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sgeyAgXG4gIHB1YmxpYyByZWFkb25seSBjaGF0RnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBzZXNzaW9uRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSBmZWVkYmFja0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgZGVsZXRlUzNGdW5jdGlvbiA6IGxhbWJkYS5GdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IGdldFMzRnVuY3Rpb24gOiBsYW1iZGEuRnVuY3Rpb247XG4gIHB1YmxpYyByZWFkb25seSB1cGxvYWRTM0Z1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgc3luY0tlbmRyYUZ1bmN0aW9uIDogbGFtYmRhLkZ1bmN0aW9uO1xuICBwdWJsaWMgcmVhZG9ubHkgY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb247XG5cblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTGFtYmRhRnVuY3Rpb25TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkKTsgICAgXG5cbiAgICBjb25zdCBzZXNzaW9uQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ1Nlc3Npb25IYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ3Nlc3Npb24taGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiRERCX1RBQkxFX05BTUVcIiA6IHByb3BzLnNlc3Npb25UYWJsZS50YWJsZU5hbWVcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcbiAgICBcbiAgICBzZXNzaW9uQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdkeW5hbW9kYjpHZXRJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlB1dEl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6VXBkYXRlSXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpEZWxldGVJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOlF1ZXJ5JyxcbiAgICAgICAgJ2R5bmFtb2RiOlNjYW4nXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuc2Vzc2lvblRhYmxlLnRhYmxlQXJuLCBwcm9wcy5zZXNzaW9uVGFibGUudGFibGVBcm4gKyBcIi9pbmRleC8qXCJdXG4gICAgfSkpO1xuXG4gICAgdGhpcy5zZXNzaW9uRnVuY3Rpb24gPSBzZXNzaW9uQVBJSGFuZGxlckZ1bmN0aW9uO1xuXG4gICAgICAgIC8vIERlZmluZSB0aGUgTGFtYmRhIGZ1bmN0aW9uIHJlc291cmNlXG4gICAgICAgIGNvbnN0IHdlYnNvY2tldEFQSUZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0NoYXRIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxuICAgICAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnd2Vic29ja2V0LWNoYXQnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgICAgIGhhbmRsZXI6ICdpbmRleC5oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgICAgICBlbnZpcm9ubWVudCA6IHtcbiAgICAgICAgICAgIFwibXZwX3dlYnNvY2tldF9fYXBpX2VuZHBvaW50X3Rlc3RcIiA6IHByb3BzLndzQXBpRW5kcG9pbnQucmVwbGFjZShcIndzc1wiLFwiaHR0cHNcIiksXG4gICAgICAgICAgICBcIklOREVYX0lEXCIgOiBwcm9wcy5rZW5kcmFJbmRleC5hdHRySWRcbiAgICAgICAgICB9LFxuICAgICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwMClcbiAgICAgICAgfSk7XG4gICAgICAgIHdlYnNvY2tldEFQSUZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsV2l0aFJlc3BvbnNlU3RyZWFtJyxcbiAgICAgICAgICAgICdiZWRyb2NrOkludm9rZU1vZGVsJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdXG4gICAgICAgIH0pKTtcbiAgICAgICAgd2Vic29ja2V0QVBJRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICAgICAgYWN0aW9uczogW1xuICAgICAgICAgICAgJ2tlbmRyYTpSZXRyaWV2ZSdcbiAgICAgICAgICBdLFxuICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLmtlbmRyYUluZGV4LmF0dHJBcm5dXG4gICAgICAgIH0pKTtcblxuICAgICAgICB3ZWJzb2NrZXRBUElGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgICAgICBhY3Rpb25zOiBbXG4gICAgICAgICAgICAnbGFtYmRhOkludm9rZUZ1bmN0aW9uJ1xuICAgICAgICAgIF0sXG4gICAgICAgICAgcmVzb3VyY2VzOiBbdGhpcy5zZXNzaW9uRnVuY3Rpb24uZnVuY3Rpb25Bcm5dXG4gICAgICAgIH0pKTtcbiAgICAgICAgXG4gICAgICAgIHRoaXMuY2hhdEZ1bmN0aW9uID0gd2Vic29ja2V0QVBJRnVuY3Rpb247XG5cbiAgICBjb25zdCBmZWVkYmFja0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdGZWVkYmFja0hhbmRsZXJGdW5jdGlvbicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLlBZVEhPTl8zXzEyLCAvLyBDaG9vc2UgYW55IHN1cHBvcnRlZCBOb2RlLmpzIHJ1bnRpbWVcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnZmVlZGJhY2staGFuZGxlcicpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiRkVFREJBQ0tfVEFCTEVcIiA6IHByb3BzLmZlZWRiYWNrVGFibGUudGFibGVOYW1lLFxuICAgICAgICBcIkZFRURCQUNLX1MzX0RPV05MT0FEXCIgOiBwcm9wcy5mZWVkYmFja0J1Y2tldC5idWNrZXROYW1lXG4gICAgICB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgfSk7XG4gICAgXG4gICAgZmVlZGJhY2tBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2R5bmFtb2RiOkdldEl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6UHV0SXRlbScsXG4gICAgICAgICdkeW5hbW9kYjpVcGRhdGVJdGVtJyxcbiAgICAgICAgJ2R5bmFtb2RiOkRlbGV0ZUl0ZW0nLFxuICAgICAgICAnZHluYW1vZGI6UXVlcnknLFxuICAgICAgICAnZHluYW1vZGI6U2NhbidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5mZWVkYmFja1RhYmxlLnRhYmxlQXJuLCBwcm9wcy5mZWVkYmFja1RhYmxlLnRhYmxlQXJuICsgXCIvaW5kZXgvKlwiXVxuICAgIH0pKTtcblxuICAgIGZlZWRiYWNrQVBJSGFuZGxlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbXG4gICAgICAgICdzMzoqJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmZlZWRiYWNrQnVja2V0LmJ1Y2tldEFybixwcm9wcy5mZWVkYmFja0J1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxuICAgIH0pKTtcblxuICAgIHRoaXMuZmVlZGJhY2tGdW5jdGlvbiA9IGZlZWRiYWNrQVBJSGFuZGxlckZ1bmN0aW9uO1xuICAgIFxuICAgIGNvbnN0IGRlbGV0ZVMzQVBJSGFuZGxlckZ1bmN0aW9uID0gbmV3IGxhbWJkYS5GdW5jdGlvbihzY29wZSwgJ0RlbGV0ZVMzRmlsZXNIYW5kbGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMiwgLy8gQ2hvb3NlIGFueSBzdXBwb3J0ZWQgTm9kZS5qcyBydW50aW1lXG4gICAgICBjb2RlOiBsYW1iZGEuQ29kZS5mcm9tQXNzZXQocGF0aC5qb2luKF9fZGlybmFtZSwgJ2tub3dsZWRnZS1tYW5hZ2VtZW50L2RlbGV0ZS1zMycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiQlVDS0VUXCIgOiBwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0TmFtZSwgICAgICAgIFxuICAgICAgfSxcbiAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDMwKVxuICAgIH0pO1xuXG4gICAgZGVsZXRlUzNBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ3MzOionXG4gICAgICBdLFxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMua25vd2xlZGdlQnVja2V0LmJ1Y2tldEFybixwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuK1wiLypcIl1cbiAgICB9KSk7XG4gICAgdGhpcy5kZWxldGVTM0Z1bmN0aW9uID0gZGVsZXRlUzNBUElIYW5kbGVyRnVuY3Rpb247XG5cbiAgICBjb25zdCBnZXRTM0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdHZXRTM0ZpbGVzSGFuZGxlckZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC9nZXQtczMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXG4gICAgICB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgfSk7XG5cbiAgICBnZXRTM0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6KidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuLHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxuICAgIH0pKTtcbiAgICB0aGlzLmdldFMzRnVuY3Rpb24gPSBnZXRTM0FQSUhhbmRsZXJGdW5jdGlvbjtcblxuXG4gICAgY29uc3Qga2VuZHJhU3luY0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdTeW5jS2VuZHJhSGFuZGxlckZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuUFlUSE9OXzNfMTIsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC9rZW5kcmEtc3luYycpKSwgLy8gUG9pbnRzIHRvIHRoZSBsYW1iZGEgZGlyZWN0b3J5XG4gICAgICBoYW5kbGVyOiAnbGFtYmRhX2Z1bmN0aW9uLmxhbWJkYV9oYW5kbGVyJywgLy8gUG9pbnRzIHRvIHRoZSAnaGVsbG8nIGZpbGUgaW4gdGhlIGxhbWJkYSBkaXJlY3RvcnlcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFwiS0VORFJBXCIgOiBwcm9wcy5rZW5kcmFJbmRleC5hdHRySWQsICAgICAgXG4gICAgICAgIFwiU09VUkNFXCIgOiBwcm9wcy5rZW5kcmFTb3VyY2UuYXR0cklkICBcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMClcbiAgICB9KTtcblxuICAgIGtlbmRyYVN5bmNBUElIYW5kbGVyRnVuY3Rpb24uYWRkVG9Sb2xlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcbiAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcbiAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgJ2tlbmRyYToqJ1xuICAgICAgXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmtlbmRyYUluZGV4LmF0dHJBcm4sIHByb3BzLmtlbmRyYVNvdXJjZS5hdHRyQXJuXVxuICAgIH0pKTtcbiAgICB0aGlzLnN5bmNLZW5kcmFGdW5jdGlvbiA9IGtlbmRyYVN5bmNBUElIYW5kbGVyRnVuY3Rpb247XG5cbiAgICBjb25zdCB1cGxvYWRTM0FQSUhhbmRsZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdVcGxvYWRTM0ZpbGVzSGFuZGxlckZ1bmN0aW9uJywge1xuICAgICAgcnVudGltZTogbGFtYmRhLlJ1bnRpbWUuTk9ERUpTXzIwX1gsIC8vIENob29zZSBhbnkgc3VwcG9ydGVkIE5vZGUuanMgcnVudGltZVxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KHBhdGguam9pbihfX2Rpcm5hbWUsICdrbm93bGVkZ2UtbWFuYWdlbWVudC91cGxvYWQtczMnKSksIC8vIFBvaW50cyB0byB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgaGFuZGxlcjogJ2luZGV4LmhhbmRsZXInLCAvLyBQb2ludHMgdG8gdGhlICdoZWxsbycgZmlsZSBpbiB0aGUgbGFtYmRhIGRpcmVjdG9yeVxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgXCJCVUNLRVRcIiA6IHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXROYW1lLCAgICAgICAgXG4gICAgICB9LFxuICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApXG4gICAgfSk7XG5cbiAgICB1cGxvYWRTM0FQSUhhbmRsZXJGdW5jdGlvbi5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogW1xuICAgICAgICAnczM6KidcbiAgICAgIF0sXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy5rbm93bGVkZ2VCdWNrZXQuYnVja2V0QXJuLHByb3BzLmtub3dsZWRnZUJ1Y2tldC5idWNrZXRBcm4rXCIvKlwiXVxuICAgIH0pKTtcbiAgICB0aGlzLnVwbG9hZFMzRnVuY3Rpb24gPSB1cGxvYWRTM0FQSUhhbmRsZXJGdW5jdGlvbjtcblxuICAgIGNvbnN0IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbiA9IG5ldyBsYW1iZGEuRnVuY3Rpb24oc2NvcGUsICdDaGF0SW52b2NhdGlvbnNDb3VudGVyRnVuY3Rpb24nLCB7XG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5QWVRIT05fM18xMixcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldChwYXRoLmpvaW4oX19kaXJuYW1lLCAnY2hhdC1pbnZvY2F0aW9ucy1jb3VudGVyJykpLFxuICAgICAgaGFuZGxlcjogJ2xhbWJkYV9mdW5jdGlvbi5sYW1iZGFfaGFuZGxlcicsXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygzMCksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBDSEFUX0ZVTkNUSU9OX05BTUU6IHRoaXMuY2hhdEZ1bmN0aW9uLmZ1bmN0aW9uTmFtZSxcbiAgICAgIH0sICAgIFxuICAgIH0pO1xuXG4gICAgY2hhdEludm9jYXRpb25zQ291bnRlckZ1bmN0aW9uLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6R2V0TWV0cmljU3RhdGlzdGljcyddLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICB9KSk7XG5cbiAgICB0aGlzLmNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbiA9IGNoYXRJbnZvY2F0aW9uc0NvdW50ZXJGdW5jdGlvbjtcblxuICB9XG59XG4iXX0=