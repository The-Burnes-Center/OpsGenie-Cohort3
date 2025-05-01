"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RestBackendAPI = void 0;
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class RestBackendAPI extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const httpApi = new aws_cdk_lib_1.aws_apigatewayv2.HttpApi(this, 'HTTP-API', {
            corsPreflight: {
                allowHeaders: ['*'],
                allowMethods: [
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.GET,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.HEAD,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.OPTIONS,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.POST,
                    aws_cdk_lib_1.aws_apigatewayv2.CorsHttpMethod.DELETE,
                ],
                allowOrigins: ['*'],
                maxAge: aws_cdk_lib_1.Duration.days(10),
            },
        });
        this.restAPI = httpApi;
        /*const appSyncLambdaResolver = new lambda.Function(
          this,
          "GraphQLApiHandler",
          {
            code: props.shared.sharedCode.bundleWithLambdaAsset(
              path.join(__dirname, "./functions/api-handler")
            ),
            handler: "index.handler",
            runtime: props.shared.pythonRuntime,
            architecture: props.shared.lambdaArchitecture,
            timeout: cdk.Duration.minutes(10),
            memorySize: 512,
            tracing: lambda.Tracing.ACTIVE,
            logRetention: logs.RetentionDays.ONE_WEEK,
            environment: {
            },
          }
        );
    
        function addPermissions(apiHandler: lambda.Function) {
          if (props.ragEngines?.workspacesTable) {
            props.ragEngines.workspacesTable.grantReadWriteData(apiHandler);
          }
    
          if (props.ragEngines?.documentsTable) {
            props.ragEngines.documentsTable.grantReadWriteData(apiHandler);
            props.ragEngines?.dataImport.rssIngestorFunction?.grantInvoke(
              apiHandler
            );
          }
    
          if (props.ragEngines?.auroraPgVector) {
            props.ragEngines.auroraPgVector.database.secret?.grantRead(apiHandler);
            props.ragEngines.auroraPgVector.database.connections.allowDefaultPortFrom(
              apiHandler
            );
    
            props.ragEngines.auroraPgVector.createAuroraWorkspaceWorkflow.grantStartExecution(
              apiHandler
            );
          }
    
          if (props.ragEngines?.openSearchVector) {
            apiHandler.addToRolePolicy(
              new iam.PolicyStatement({
                actions: ["aoss:APIAccessAll"],
                resources: [
                  props.ragEngines?.openSearchVector.openSearchCollection.attrArn,
                ],
              })
            );
    
            props.ragEngines.openSearchVector.createOpenSearchWorkspaceWorkflow.grantStartExecution(
              apiHandler
            );
          }
    
          if (props.ragEngines?.kendraRetrieval) {
            props.ragEngines.kendraRetrieval.createKendraWorkspaceWorkflow.grantStartExecution(
              apiHandler
            );
    
            props.ragEngines?.kendraRetrieval?.kendraS3DataSourceBucket?.grantReadWrite(
              apiHandler
            );
    
            if (props.ragEngines.kendraRetrieval.kendraIndex) {
              apiHandler.addToRolePolicy(
                new iam.PolicyStatement({
                  actions: [
                    "kendra:Retrieve",
                    "kendra:Query",
                    "kendra:BatchDeleteDocument",
                    "kendra:BatchPutDocument",
                    "kendra:StartDataSourceSyncJob",
                    "kendra:DescribeDataSourceSyncJob",
                    "kendra:StopDataSourceSyncJob",
                    "kendra:ListDataSourceSyncJobs",
                    "kendra:ListDataSources",
                    "kendra:DescribeIndex",
                  ],
                  resources: [
                    props.ragEngines.kendraRetrieval.kendraIndex.attrArn,
                    `${props.ragEngines.kendraRetrieval.kendraIndex.attrArn}/*`,
                  ],
                })
              );
            }
    
            for (const item of props.config.rag.engines.kendra.external ?? []) {
              if (item.roleArn) {
                apiHandler.addToRolePolicy(
                  new iam.PolicyStatement({
                    actions: ["sts:AssumeRole"],
                    resources: [item.roleArn],
                  })
                );
              } else {
                apiHandler.addToRolePolicy(
                  new iam.PolicyStatement({
                    actions: ["kendra:Retrieve", "kendra:Query"],
                    resources: [
                      `arn:${cdk.Aws.PARTITION}:kendra:${
                        item.region ?? cdk.Aws.REGION
                      }:${cdk.Aws.ACCOUNT_ID}:index/${item.kendraId}`,
                    ],
                  })
                );
              }
            }
          }
    
          if (props.ragEngines?.fileImportWorkflow) {
            props.ragEngines.fileImportWorkflow.grantStartExecution(apiHandler);
          }
    
          if (props.ragEngines?.websiteCrawlingWorkflow) {
            props.ragEngines.websiteCrawlingWorkflow.grantStartExecution(
              apiHandler
            );
          }
    
          if (props.ragEngines?.deleteWorkspaceWorkflow) {
            props.ragEngines.deleteWorkspaceWorkflow.grantStartExecution(
              apiHandler
            );
          }
    
          if (props.ragEngines?.sageMakerRagModels) {
            apiHandler.addToRolePolicy(
              new iam.PolicyStatement({
                actions: ["sagemaker:InvokeEndpoint"],
                resources: [props.ragEngines.sageMakerRagModels.model.endpoint.ref],
              })
            );
          }
    
          for (const model of props.models) {
            apiHandler.addToRolePolicy(
              new iam.PolicyStatement({
                actions: ["sagemaker:InvokeEndpoint"],
                resources: [model.endpoint.ref],
              })
            );
          }
    
          apiHandler.addToRolePolicy(
            new iam.PolicyStatement({
              actions: [
                "comprehend:DetectDominantLanguage",
                "comprehend:DetectSentiment",
              ],
              resources: ["*"],
            })
          );
    
          props.shared.xOriginVerifySecret.grantRead(apiHandler);
          props.shared.apiKeysSecret.grantRead(apiHandler);
          props.shared.configParameter.grantRead(apiHandler);
          props.modelsParameter.grantRead(apiHandler);
          props.sessionsTable.grantReadWriteData(apiHandler);
          props.userFeedbackBucket.grantReadWrite(apiHandler);
          props.ragEngines?.uploadBucket.grantReadWrite(apiHandler);
          props.ragEngines?.processingBucket.grantReadWrite(apiHandler);
    
          if (props.config.bedrock?.enabled) {
            apiHandler.addToRolePolicy(
              new iam.PolicyStatement({
                actions: [
                  "bedrock:ListFoundationModels",
                  "bedrock:ListCustomModels",
                  "bedrock:InvokeModel",
                  "bedrock:InvokeModelWithResponseStream",
                ],
                resources: ["*"],
              })
            );
    
            if (props.config.bedrock?.roleArn) {
              apiHandler.addToRolePolicy(
                new iam.PolicyStatement({
                  actions: ["sts:AssumeRole"],
                  resources: [props.config.bedrock.roleArn],
                })
              );
            }
          }
        }
    
        addPermissions(appSyncLambdaResolver);*/
    }
}
exports.RestBackendAPI = RestBackendAPI;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzdC1hcGkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJyZXN0LWFwaS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFHQSwyQ0FBdUM7QUFDdkMsNkNBQW9FO0FBbUJwRSxNQUFhLGNBQWUsU0FBUSxzQkFBUztJQUUzQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTBCO1FBQ2xFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxPQUFPLEdBQUcsSUFBSSw4QkFBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ3BELGFBQWEsRUFBRTtnQkFDYixZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLFlBQVksRUFBRTtvQkFDWiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHO29CQUMxQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUMzQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxPQUFPO29CQUM5Qiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJO29CQUMzQiw4QkFBTyxDQUFDLGNBQWMsQ0FBQyxNQUFNO2lCQUM5QjtnQkFDRCxZQUFZLEVBQUUsQ0FBQyxHQUFHLENBQUM7Z0JBQ25CLE1BQU0sRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7YUFDMUI7U0FDRixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUN2Qjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O2dEQTZMd0M7SUFFMUMsQ0FBQztDQUNGO0FBcE5ELHdDQW9OQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xyXG5cclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcclxuaW1wb3J0IHsgRHVyYXRpb24sIGF3c19hcGlnYXRld2F5djIgYXMgYXBpZ3d2MiB9IGZyb20gXCJhd3MtY2RrLWxpYlwiO1xyXG5cclxuaW1wb3J0ICogYXMgY29nbml0byBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNvZ25pdG9cIjtcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1keW5hbW9kYlwiO1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSBcImF3cy1jZGstbGliL2F3cy1lYzJcIjtcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XHJcbmltcG9ydCAqIGFzIGxhbWJkYSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWxhbWJkYVwiO1xyXG5pbXBvcnQgKiBhcyBsb2dzIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtbG9nc1wiO1xyXG5pbXBvcnQgKiBhcyBzc20gZnJvbSBcImF3cy1jZGstbGliL2F3cy1zc21cIjtcclxuLy8gaW1wb3J0IHsgU2hhcmVkIH0gZnJvbSBcIi4uL3NoYXJlZFwiO1xyXG5pbXBvcnQgKiBhcyBhcHBzeW5jIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtYXBwc3luY1wiO1xyXG4vLyBpbXBvcnQgeyBwYXJzZSB9IGZyb20gXCJncmFwaHFsXCI7XHJcbmltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gXCJmc1wiO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIFJlc3RCYWNrZW5kQVBJUHJvcHMge1xyXG5cclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIFJlc3RCYWNrZW5kQVBJIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgcmVzdEFQSTogYXBpZ3d2Mi5IdHRwQXBpO1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBSZXN0QmFja2VuZEFQSVByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IGh0dHBBcGkgPSBuZXcgYXBpZ3d2Mi5IdHRwQXBpKHRoaXMsICdIVFRQLUFQSScsIHtcclxuICAgICAgY29yc1ByZWZsaWdodDoge1xyXG4gICAgICAgIGFsbG93SGVhZGVyczogWycqJ10sXHJcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbXHJcbiAgICAgICAgICBhcGlnd3YyLkNvcnNIdHRwTWV0aG9kLkdFVCxcclxuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuSEVBRCxcclxuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuT1BUSU9OUyxcclxuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuUE9TVCxcclxuICAgICAgICAgIGFwaWd3djIuQ29yc0h0dHBNZXRob2QuREVMRVRFLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJyonXSxcclxuICAgICAgICBtYXhBZ2U6IER1cmF0aW9uLmRheXMoMTApLFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLnJlc3RBUEkgPSBodHRwQXBpO1xyXG4gICAgLypjb25zdCBhcHBTeW5jTGFtYmRhUmVzb2x2ZXIgPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIkdyYXBoUUxBcGlIYW5kbGVyXCIsXHJcbiAgICAgIHtcclxuICAgICAgICBjb2RlOiBwcm9wcy5zaGFyZWQuc2hhcmVkQ29kZS5idW5kbGVXaXRoTGFtYmRhQXNzZXQoXHJcbiAgICAgICAgICBwYXRoLmpvaW4oX19kaXJuYW1lLCBcIi4vZnVuY3Rpb25zL2FwaS1oYW5kbGVyXCIpXHJcbiAgICAgICAgKSxcclxuICAgICAgICBoYW5kbGVyOiBcImluZGV4LmhhbmRsZXJcIixcclxuICAgICAgICBydW50aW1lOiBwcm9wcy5zaGFyZWQucHl0aG9uUnVudGltZSxcclxuICAgICAgICBhcmNoaXRlY3R1cmU6IHByb3BzLnNoYXJlZC5sYW1iZGFBcmNoaXRlY3R1cmUsXHJcbiAgICAgICAgdGltZW91dDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMTApLFxyXG4gICAgICAgIG1lbW9yeVNpemU6IDUxMixcclxuICAgICAgICB0cmFjaW5nOiBsYW1iZGEuVHJhY2luZy5BQ1RJVkUsXHJcbiAgICAgICAgbG9nUmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssICAgICAgICBcclxuICAgICAgICBlbnZpcm9ubWVudDogeyAgICAgICAgICBcclxuICAgICAgICB9LFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGZ1bmN0aW9uIGFkZFBlcm1pc3Npb25zKGFwaUhhbmRsZXI6IGxhbWJkYS5GdW5jdGlvbikge1xyXG4gICAgICBpZiAocHJvcHMucmFnRW5naW5lcz8ud29ya3NwYWNlc1RhYmxlKSB7XHJcbiAgICAgICAgcHJvcHMucmFnRW5naW5lcy53b3Jrc3BhY2VzVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUhhbmRsZXIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAocHJvcHMucmFnRW5naW5lcz8uZG9jdW1lbnRzVGFibGUpIHtcclxuICAgICAgICBwcm9wcy5yYWdFbmdpbmVzLmRvY3VtZW50c1RhYmxlLmdyYW50UmVhZFdyaXRlRGF0YShhcGlIYW5kbGVyKTtcclxuICAgICAgICBwcm9wcy5yYWdFbmdpbmVzPy5kYXRhSW1wb3J0LnJzc0luZ2VzdG9yRnVuY3Rpb24/LmdyYW50SW52b2tlKFxyXG4gICAgICAgICAgYXBpSGFuZGxlclxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwcm9wcy5yYWdFbmdpbmVzPy5hdXJvcmFQZ1ZlY3Rvcikge1xyXG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMuYXVyb3JhUGdWZWN0b3IuZGF0YWJhc2Uuc2VjcmV0Py5ncmFudFJlYWQoYXBpSGFuZGxlcik7XHJcbiAgICAgICAgcHJvcHMucmFnRW5naW5lcy5hdXJvcmFQZ1ZlY3Rvci5kYXRhYmFzZS5jb25uZWN0aW9ucy5hbGxvd0RlZmF1bHRQb3J0RnJvbShcclxuICAgICAgICAgIGFwaUhhbmRsZXJcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBwcm9wcy5yYWdFbmdpbmVzLmF1cm9yYVBnVmVjdG9yLmNyZWF0ZUF1cm9yYVdvcmtzcGFjZVdvcmtmbG93LmdyYW50U3RhcnRFeGVjdXRpb24oXHJcbiAgICAgICAgICBhcGlIYW5kbGVyXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHByb3BzLnJhZ0VuZ2luZXM/Lm9wZW5TZWFyY2hWZWN0b3IpIHtcclxuICAgICAgICBhcGlIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgYWN0aW9uczogW1wiYW9zczpBUElBY2Nlc3NBbGxcIl0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgIHByb3BzLnJhZ0VuZ2luZXM/Lm9wZW5TZWFyY2hWZWN0b3Iub3BlblNlYXJjaENvbGxlY3Rpb24uYXR0ckFybixcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuXHJcbiAgICAgICAgcHJvcHMucmFnRW5naW5lcy5vcGVuU2VhcmNoVmVjdG9yLmNyZWF0ZU9wZW5TZWFyY2hXb3Jrc3BhY2VXb3JrZmxvdy5ncmFudFN0YXJ0RXhlY3V0aW9uKFxyXG4gICAgICAgICAgYXBpSGFuZGxlclxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwcm9wcy5yYWdFbmdpbmVzPy5rZW5kcmFSZXRyaWV2YWwpIHtcclxuICAgICAgICBwcm9wcy5yYWdFbmdpbmVzLmtlbmRyYVJldHJpZXZhbC5jcmVhdGVLZW5kcmFXb3Jrc3BhY2VXb3JrZmxvdy5ncmFudFN0YXJ0RXhlY3V0aW9uKFxyXG4gICAgICAgICAgYXBpSGFuZGxlclxyXG4gICAgICAgICk7XHJcblxyXG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXM/LmtlbmRyYVJldHJpZXZhbD8ua2VuZHJhUzNEYXRhU291cmNlQnVja2V0Py5ncmFudFJlYWRXcml0ZShcclxuICAgICAgICAgIGFwaUhhbmRsZXJcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBpZiAocHJvcHMucmFnRW5naW5lcy5rZW5kcmFSZXRyaWV2YWwua2VuZHJhSW5kZXgpIHtcclxuICAgICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICAgICAgXCJrZW5kcmE6UmV0cmlldmVcIixcclxuICAgICAgICAgICAgICAgIFwia2VuZHJhOlF1ZXJ5XCIsXHJcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpCYXRjaERlbGV0ZURvY3VtZW50XCIsXHJcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpCYXRjaFB1dERvY3VtZW50XCIsXHJcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpTdGFydERhdGFTb3VyY2VTeW5jSm9iXCIsXHJcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpEZXNjcmliZURhdGFTb3VyY2VTeW5jSm9iXCIsXHJcbiAgICAgICAgICAgICAgICBcImtlbmRyYTpTdG9wRGF0YVNvdXJjZVN5bmNKb2JcIixcclxuICAgICAgICAgICAgICAgIFwia2VuZHJhOkxpc3REYXRhU291cmNlU3luY0pvYnNcIixcclxuICAgICAgICAgICAgICAgIFwia2VuZHJhOkxpc3REYXRhU291cmNlc1wiLFxyXG4gICAgICAgICAgICAgICAgXCJrZW5kcmE6RGVzY3JpYmVJbmRleFwiLFxyXG4gICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgICAgICBwcm9wcy5yYWdFbmdpbmVzLmtlbmRyYVJldHJpZXZhbC5rZW5kcmFJbmRleC5hdHRyQXJuLFxyXG4gICAgICAgICAgICAgICAgYCR7cHJvcHMucmFnRW5naW5lcy5rZW5kcmFSZXRyaWV2YWwua2VuZHJhSW5kZXguYXR0ckFybn0vKmAsXHJcbiAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgcHJvcHMuY29uZmlnLnJhZy5lbmdpbmVzLmtlbmRyYS5leHRlcm5hbCA/PyBbXSkge1xyXG4gICAgICAgICAgaWYgKGl0ZW0ucm9sZUFybikge1xyXG4gICAgICAgICAgICBhcGlIYW5kbGVyLmFkZFRvUm9sZVBvbGljeShcclxuICAgICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgICBhY3Rpb25zOiBbXCJzdHM6QXNzdW1lUm9sZVwiXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW2l0ZW0ucm9sZUFybl0sXHJcbiAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICAgICAgICAgIGFjdGlvbnM6IFtcImtlbmRyYTpSZXRyaWV2ZVwiLCBcImtlbmRyYTpRdWVyeVwiXSxcclxuICAgICAgICAgICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICAgICAgICBgYXJuOiR7Y2RrLkF3cy5QQVJUSVRJT059OmtlbmRyYToke1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0ucmVnaW9uID8/IGNkay5Bd3MuUkVHSU9OXHJcbiAgICAgICAgICAgICAgICAgIH06JHtjZGsuQXdzLkFDQ09VTlRfSUR9OmluZGV4LyR7aXRlbS5rZW5kcmFJZH1gLFxyXG4gICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICApO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHByb3BzLnJhZ0VuZ2luZXM/LmZpbGVJbXBvcnRXb3JrZmxvdykge1xyXG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMuZmlsZUltcG9ydFdvcmtmbG93LmdyYW50U3RhcnRFeGVjdXRpb24oYXBpSGFuZGxlcik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGlmIChwcm9wcy5yYWdFbmdpbmVzPy53ZWJzaXRlQ3Jhd2xpbmdXb3JrZmxvdykge1xyXG4gICAgICAgIHByb3BzLnJhZ0VuZ2luZXMud2Vic2l0ZUNyYXdsaW5nV29ya2Zsb3cuZ3JhbnRTdGFydEV4ZWN1dGlvbihcclxuICAgICAgICAgIGFwaUhhbmRsZXJcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAocHJvcHMucmFnRW5naW5lcz8uZGVsZXRlV29ya3NwYWNlV29ya2Zsb3cpIHtcclxuICAgICAgICBwcm9wcy5yYWdFbmdpbmVzLmRlbGV0ZVdvcmtzcGFjZVdvcmtmbG93LmdyYW50U3RhcnRFeGVjdXRpb24oXHJcbiAgICAgICAgICBhcGlIYW5kbGVyXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgaWYgKHByb3BzLnJhZ0VuZ2luZXM/LnNhZ2VNYWtlclJhZ01vZGVscykge1xyXG4gICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXCJzYWdlbWFrZXI6SW52b2tlRW5kcG9pbnRcIl0sXHJcbiAgICAgICAgICAgIHJlc291cmNlczogW3Byb3BzLnJhZ0VuZ2luZXMuc2FnZU1ha2VyUmFnTW9kZWxzLm1vZGVsLmVuZHBvaW50LnJlZl0sXHJcbiAgICAgICAgICB9KVxyXG4gICAgICAgICk7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGZvciAoY29uc3QgbW9kZWwgb2YgcHJvcHMubW9kZWxzKSB7XHJcbiAgICAgICAgYXBpSGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgIGFjdGlvbnM6IFtcInNhZ2VtYWtlcjpJbnZva2VFbmRwb2ludFwiXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbbW9kZWwuZW5kcG9pbnQucmVmXSxcclxuICAgICAgICAgIH0pXHJcbiAgICAgICAgKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgYXBpSGFuZGxlci5hZGRUb1JvbGVQb2xpY3koXHJcbiAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICAgICBcImNvbXByZWhlbmQ6RGV0ZWN0RG9taW5hbnRMYW5ndWFnZVwiLFxyXG4gICAgICAgICAgICBcImNvbXByZWhlbmQ6RGV0ZWN0U2VudGltZW50XCIsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICAgIH0pXHJcbiAgICAgICk7XHJcblxyXG4gICAgICBwcm9wcy5zaGFyZWQueE9yaWdpblZlcmlmeVNlY3JldC5ncmFudFJlYWQoYXBpSGFuZGxlcik7XHJcbiAgICAgIHByb3BzLnNoYXJlZC5hcGlLZXlzU2VjcmV0LmdyYW50UmVhZChhcGlIYW5kbGVyKTtcclxuICAgICAgcHJvcHMuc2hhcmVkLmNvbmZpZ1BhcmFtZXRlci5ncmFudFJlYWQoYXBpSGFuZGxlcik7XHJcbiAgICAgIHByb3BzLm1vZGVsc1BhcmFtZXRlci5ncmFudFJlYWQoYXBpSGFuZGxlcik7XHJcbiAgICAgIHByb3BzLnNlc3Npb25zVGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGFwaUhhbmRsZXIpO1xyXG4gICAgICBwcm9wcy51c2VyRmVlZGJhY2tCdWNrZXQuZ3JhbnRSZWFkV3JpdGUoYXBpSGFuZGxlcik7XHJcbiAgICAgIHByb3BzLnJhZ0VuZ2luZXM/LnVwbG9hZEJ1Y2tldC5ncmFudFJlYWRXcml0ZShhcGlIYW5kbGVyKTtcclxuICAgICAgcHJvcHMucmFnRW5naW5lcz8ucHJvY2Vzc2luZ0J1Y2tldC5ncmFudFJlYWRXcml0ZShhcGlIYW5kbGVyKTtcclxuXHJcbiAgICAgIGlmIChwcm9wcy5jb25maWcuYmVkcm9jaz8uZW5hYmxlZCkge1xyXG4gICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICAgXCJiZWRyb2NrOkxpc3RGb3VuZGF0aW9uTW9kZWxzXCIsXHJcbiAgICAgICAgICAgICAgXCJiZWRyb2NrOkxpc3RDdXN0b21Nb2RlbHNcIixcclxuICAgICAgICAgICAgICBcImJlZHJvY2s6SW52b2tlTW9kZWxcIixcclxuICAgICAgICAgICAgICBcImJlZHJvY2s6SW52b2tlTW9kZWxXaXRoUmVzcG9uc2VTdHJlYW1cIixcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgcmVzb3VyY2VzOiBbXCIqXCJdLFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICApO1xyXG5cclxuICAgICAgICBpZiAocHJvcHMuY29uZmlnLmJlZHJvY2s/LnJvbGVBcm4pIHtcclxuICAgICAgICAgIGFwaUhhbmRsZXIuYWRkVG9Sb2xlUG9saWN5KFxyXG4gICAgICAgICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgICAgICAgYWN0aW9uczogW1wic3RzOkFzc3VtZVJvbGVcIl0sXHJcbiAgICAgICAgICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuY29uZmlnLmJlZHJvY2sucm9sZUFybl0sXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICApO1xyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGFkZFBlcm1pc3Npb25zKGFwcFN5bmNMYW1iZGFSZXNvbHZlcik7Ki9cclxuXHJcbiAgfVxyXG59XHJcbiJdfQ==