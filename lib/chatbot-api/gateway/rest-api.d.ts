import { Construct } from "constructs";
import { aws_apigatewayv2 as apigwv2 } from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
export interface RestBackendAPIProps {
    readonly logWriteRole?: iam.Role;
}
export declare class RestBackendAPI extends Construct {
    readonly restAPI: apigwv2.HttpApi;
    constructor(scope: Construct, id: string, props: RestBackendAPIProps);
}
