import * as cdk from "aws-cdk-lib";
import { aws_apigatewayv2 as apigwv2 } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";

// import { NagSuppressions } from "cdk-nag";

interface WebsocketBackendAPIProps {  
  // readonly userPool: UserPool;
  // readonly api: appsync.GraphqlApi;
  readonly logWriteRole?: iam.Role;
}

export class WebsocketBackendAPI extends Construct {
  public readonly wsAPI : apigwv2.WebSocketApi;
  public readonly wsAPIStage : apigwv2.WebSocketStage;
  constructor(
    scope: Construct,
    id: string,
    props: WebsocketBackendAPIProps
  ) {
    super(scope, id);
    // Create the main Message Topic acting as a message bus
    const webSocketApi = new apigwv2.WebSocketApi(this, 'WS-API');

    // Create log group if logWriteRole is provided
    const logGroup = props.logWriteRole ? 
      new logs.LogGroup(this, 'WebSocketApiLogs', {
        retention: logs.RetentionDays.ONE_WEEK,
        logGroupName: `/aws/apigateway/${cdk.Stack.of(this).stackName}-${id}-websocket-api`
      }) : undefined;

    // Configure the WebSocket stage with logging if logWriteRole is provided
    const webSocketApiStage = new apigwv2.WebSocketStage(this, 'WS-API-prod', {
      webSocketApi,
      stageName: 'prod',
      autoDeploy: true,
      // Configure logging if logWriteRole is provided
      ...(props.logWriteRole && logGroup ? {
        accessLogSettings: {
          destinationArn: logGroup.logGroupArn,
          format: JSON.stringify({
            requestId: '$context.requestId',
            ip: '$context.identity.sourceIp',
            requestTime: '$context.requestTime',
            routeKey: '$context.routeKey',
            status: '$context.status',
            connectionId: '$context.connectionId',
            integrationError: '$context.integrationErrorMessage',
            authError: '$context.authorizer.error',
          }),
        }
      } : {})
    });
    
    // Grant permissions for API Gateway to write to the log group
    if (props.logWriteRole && logGroup) {
      logGroup.grantWrite(props.logWriteRole);
    }
    
    this.wsAPI = webSocketApi;
    this.wsAPIStage = webSocketApiStage;
    
  }

}
