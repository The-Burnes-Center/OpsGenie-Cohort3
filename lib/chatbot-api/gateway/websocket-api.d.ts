import { aws_apigatewayv2 as apigwv2 } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as iam from "aws-cdk-lib/aws-iam";
interface WebsocketBackendAPIProps {
    readonly logWriteRole?: iam.Role;
}
export declare class WebsocketBackendAPI extends Construct {
    readonly wsAPI: apigwv2.WebSocketApi;
    readonly wsAPIStage: apigwv2.WebSocketStage;
    constructor(scope: Construct, id: string, props: WebsocketBackendAPIProps);
}
export {};
