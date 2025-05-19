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
exports.WebsocketBackendAPI = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const constructs_1 = require("constructs");
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
class WebsocketBackendAPI extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        // Create the main Message Topic acting as a message bus
        const webSocketApi = new aws_cdk_lib_1.aws_apigatewayv2.WebSocketApi(this, 'WS-API');
        // Create log group if logWriteRole is provided
        const logGroup = props.logWriteRole ?
            new logs.LogGroup(this, 'WebSocketApiLogs', {
                retention: logs.RetentionDays.ONE_WEEK,
                logGroupName: `/aws/apigateway/${id}-websocket-api`
            }) : undefined;
        // Configure the WebSocket stage with logging if logWriteRole is provided
        const webSocketApiStage = new aws_cdk_lib_1.aws_apigatewayv2.WebSocketStage(this, 'WS-API-prod', {
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
exports.WebsocketBackendAPI = WebsocketBackendAPI;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vic29ja2V0LWFwaS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIndlYnNvY2tldC1hcGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSw2Q0FBMEQ7QUFDMUQsMkNBQXVDO0FBRXZDLDJEQUE2QztBQVU3QyxNQUFhLG1CQUFvQixTQUFRLHNCQUFTO0lBR2hELFlBQ0UsS0FBZ0IsRUFDaEIsRUFBVSxFQUNWLEtBQStCO1FBRS9CLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakIsd0RBQXdEO1FBQ3hELE1BQU0sWUFBWSxHQUFHLElBQUksOEJBQU8sQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRTlELCtDQUErQztRQUMvQyxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxrQkFBa0IsRUFBRTtnQkFDMUMsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUTtnQkFDdEMsWUFBWSxFQUFFLG1CQUFtQixFQUFFLGdCQUFnQjthQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUVqQix5RUFBeUU7UUFDekUsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLDhCQUFPLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDeEUsWUFBWTtZQUNaLFNBQVMsRUFBRSxNQUFNO1lBQ2pCLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGdEQUFnRDtZQUNoRCxHQUFHLENBQUMsS0FBSyxDQUFDLFlBQVksSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxpQkFBaUIsRUFBRTtvQkFDakIsY0FBYyxFQUFFLFFBQVEsQ0FBQyxXQUFXO29CQUNwQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQzt3QkFDckIsU0FBUyxFQUFFLG9CQUFvQjt3QkFDL0IsRUFBRSxFQUFFLDRCQUE0Qjt3QkFDaEMsV0FBVyxFQUFFLHNCQUFzQjt3QkFDbkMsUUFBUSxFQUFFLG1CQUFtQjt3QkFDN0IsTUFBTSxFQUFFLGlCQUFpQjt3QkFDekIsWUFBWSxFQUFFLHVCQUF1Qjt3QkFDckMsZ0JBQWdCLEVBQUUsa0NBQWtDO3dCQUNwRCxTQUFTLEVBQUUsMkJBQTJCO3FCQUN2QyxDQUFDO2lCQUNIO2FBQ0YsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1NBQ1IsQ0FBQyxDQUFDO1FBRUgsOERBQThEO1FBQzlELElBQUksS0FBSyxDQUFDLFlBQVksSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNuQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUMxQyxDQUFDO1FBRUQsSUFBSSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUM7UUFDMUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQztJQUV0QyxDQUFDO0NBRUY7QUFwREQsa0RBb0RDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gXCJhd3MtY2RrLWxpYlwiO1xyXG5pbXBvcnQgeyBhd3NfYXBpZ2F0ZXdheXYyIGFzIGFwaWd3djIgfSBmcm9tIFwiYXdzLWNkay1saWJcIjtcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtaWFtXCI7XHJcbmltcG9ydCAqIGFzIGxvZ3MgZnJvbSBcImF3cy1jZGstbGliL2F3cy1sb2dzXCI7XHJcblxyXG4vLyBpbXBvcnQgeyBOYWdTdXBwcmVzc2lvbnMgfSBmcm9tIFwiY2RrLW5hZ1wiO1xyXG5cclxuaW50ZXJmYWNlIFdlYnNvY2tldEJhY2tlbmRBUElQcm9wcyB7ICBcclxuICAvLyByZWFkb25seSB1c2VyUG9vbDogVXNlclBvb2w7XHJcbiAgLy8gcmVhZG9ubHkgYXBpOiBhcHBzeW5jLkdyYXBocWxBcGk7XHJcbiAgcmVhZG9ubHkgbG9nV3JpdGVSb2xlPzogaWFtLlJvbGU7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBXZWJzb2NrZXRCYWNrZW5kQVBJIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgd3NBUEkgOiBhcGlnd3YyLldlYlNvY2tldEFwaTtcclxuICBwdWJsaWMgcmVhZG9ubHkgd3NBUElTdGFnZSA6IGFwaWd3djIuV2ViU29ja2V0U3RhZ2U7XHJcbiAgY29uc3RydWN0b3IoXHJcbiAgICBzY29wZTogQ29uc3RydWN0LFxyXG4gICAgaWQ6IHN0cmluZyxcclxuICAgIHByb3BzOiBXZWJzb2NrZXRCYWNrZW5kQVBJUHJvcHNcclxuICApIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcbiAgICAvLyBDcmVhdGUgdGhlIG1haW4gTWVzc2FnZSBUb3BpYyBhY3RpbmcgYXMgYSBtZXNzYWdlIGJ1c1xyXG4gICAgY29uc3Qgd2ViU29ja2V0QXBpID0gbmV3IGFwaWd3djIuV2ViU29ja2V0QXBpKHRoaXMsICdXUy1BUEknKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgbG9nIGdyb3VwIGlmIGxvZ1dyaXRlUm9sZSBpcyBwcm92aWRlZFxyXG4gICAgY29uc3QgbG9nR3JvdXAgPSBwcm9wcy5sb2dXcml0ZVJvbGUgPyBcclxuICAgICAgbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ1dlYlNvY2tldEFwaUxvZ3MnLCB7XHJcbiAgICAgICAgcmV0ZW50aW9uOiBsb2dzLlJldGVudGlvbkRheXMuT05FX1dFRUssXHJcbiAgICAgICAgbG9nR3JvdXBOYW1lOiBgL2F3cy9hcGlnYXRld2F5LyR7aWR9LXdlYnNvY2tldC1hcGlgXHJcbiAgICAgIH0pIDogdW5kZWZpbmVkO1xyXG5cclxuICAgIC8vIENvbmZpZ3VyZSB0aGUgV2ViU29ja2V0IHN0YWdlIHdpdGggbG9nZ2luZyBpZiBsb2dXcml0ZVJvbGUgaXMgcHJvdmlkZWRcclxuICAgIGNvbnN0IHdlYlNvY2tldEFwaVN0YWdlID0gbmV3IGFwaWd3djIuV2ViU29ja2V0U3RhZ2UodGhpcywgJ1dTLUFQSS1wcm9kJywge1xyXG4gICAgICB3ZWJTb2NrZXRBcGksXHJcbiAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxyXG4gICAgICBhdXRvRGVwbG95OiB0cnVlLFxyXG4gICAgICAvLyBDb25maWd1cmUgbG9nZ2luZyBpZiBsb2dXcml0ZVJvbGUgaXMgcHJvdmlkZWRcclxuICAgICAgLi4uKHByb3BzLmxvZ1dyaXRlUm9sZSAmJiBsb2dHcm91cCA/IHtcclxuICAgICAgICBhY2Nlc3NMb2dTZXR0aW5nczoge1xyXG4gICAgICAgICAgZGVzdGluYXRpb25Bcm46IGxvZ0dyb3VwLmxvZ0dyb3VwQXJuLFxyXG4gICAgICAgICAgZm9ybWF0OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICAgIHJlcXVlc3RJZDogJyRjb250ZXh0LnJlcXVlc3RJZCcsXHJcbiAgICAgICAgICAgIGlwOiAnJGNvbnRleHQuaWRlbnRpdHkuc291cmNlSXAnLFxyXG4gICAgICAgICAgICByZXF1ZXN0VGltZTogJyRjb250ZXh0LnJlcXVlc3RUaW1lJyxcclxuICAgICAgICAgICAgcm91dGVLZXk6ICckY29udGV4dC5yb3V0ZUtleScsXHJcbiAgICAgICAgICAgIHN0YXR1czogJyRjb250ZXh0LnN0YXR1cycsXHJcbiAgICAgICAgICAgIGNvbm5lY3Rpb25JZDogJyRjb250ZXh0LmNvbm5lY3Rpb25JZCcsXHJcbiAgICAgICAgICAgIGludGVncmF0aW9uRXJyb3I6ICckY29udGV4dC5pbnRlZ3JhdGlvbkVycm9yTWVzc2FnZScsXHJcbiAgICAgICAgICAgIGF1dGhFcnJvcjogJyRjb250ZXh0LmF1dGhvcml6ZXIuZXJyb3InLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgfVxyXG4gICAgICB9IDoge30pXHJcbiAgICB9KTtcclxuICAgIFxyXG4gICAgLy8gR3JhbnQgcGVybWlzc2lvbnMgZm9yIEFQSSBHYXRld2F5IHRvIHdyaXRlIHRvIHRoZSBsb2cgZ3JvdXBcclxuICAgIGlmIChwcm9wcy5sb2dXcml0ZVJvbGUgJiYgbG9nR3JvdXApIHtcclxuICAgICAgbG9nR3JvdXAuZ3JhbnRXcml0ZShwcm9wcy5sb2dXcml0ZVJvbGUpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB0aGlzLndzQVBJID0gd2ViU29ja2V0QXBpO1xyXG4gICAgdGhpcy53c0FQSVN0YWdlID0gd2ViU29ja2V0QXBpU3RhZ2U7XHJcbiAgICBcclxuICB9XHJcblxyXG59XHJcbiJdfQ==