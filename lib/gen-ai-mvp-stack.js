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
exports.GenAiMvpStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const chatbot_api_1 = require("./chatbot-api");
const constants_1 = require("./constants");
const authorization_1 = require("./authorization");
const user_interface_1 = require("./user-interface");
// import * as sqs from 'aws-cdk-lib/aws-sqs';
class GenAiMvpStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // The code that defines your stack goes here
        // example resource
        // const queue = new sqs.Queue(this, 'GenAiMvpQueue', {
        //   visibilityTimeout: cdk.Duration.seconds(300)
        // });
        // let authentication;
        // if (AUTHENTICATION) {
        //   authentication = new AuthorizationStack(this, "Authorization")
        // }
        const authentication = new authorization_1.AuthorizationStack(this, "Authorization");
        const chatbotAPI = new chatbot_api_1.ChatBotApi(this, "ChatbotAPI", { authentication });
        const userInterface = new user_interface_1.UserInterface(this, "UserInterface", { userPoolId: authentication.userPool.userPoolId,
            userPoolClientId: authentication.userPoolClient.userPoolClientId,
            cognitoDomain: constants_1.cognitoDomainName,
            api: chatbotAPI
        });
    }
}
exports.GenAiMvpStack = GenAiMvpStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuLWFpLW12cC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImdlbi1haS1tdnAtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFFbkMsK0NBQTJDO0FBQzNDLDJDQUErRDtBQUMvRCxtREFBb0Q7QUFDcEQscURBQWdEO0FBRWhELDhDQUE4QztBQUU5QyxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUMxQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLDZDQUE2QztRQUU3QyxtQkFBbUI7UUFDbkIsdURBQXVEO1FBQ3ZELGlEQUFpRDtRQUNqRCxNQUFNO1FBQ04sc0JBQXNCO1FBQ3RCLHdCQUF3QjtRQUN4QixtRUFBbUU7UUFDbkUsSUFBSTtRQUNKLE1BQU0sY0FBYyxHQUFHLElBQUksa0NBQWtCLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQ3BFLE1BQU0sVUFBVSxHQUFHLElBQUksd0JBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEVBQUMsY0FBYyxFQUFDLENBQUMsQ0FBQztRQUN4RSxNQUFNLGFBQWEsR0FBRyxJQUFJLDhCQUFhLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFDNUQsRUFBQyxVQUFVLEVBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxVQUFVO1lBQy9DLGdCQUFnQixFQUFHLGNBQWMsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCO1lBQ2pFLGFBQWEsRUFBRyw2QkFBaUI7WUFDakMsR0FBRyxFQUFHLFVBQVU7U0FDakIsQ0FBQyxDQUFBO0lBRUosQ0FBQztDQUNGO0FBeEJELHNDQXdCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBDaGF0Qm90QXBpIH0gZnJvbSBcIi4vY2hhdGJvdC1hcGlcIjtcclxuaW1wb3J0IHsgQVVUSEVOVElDQVRJT04sIGNvZ25pdG9Eb21haW5OYW1lIH0gZnJvbSBcIi4vY29uc3RhbnRzXCJcclxuaW1wb3J0IHsgQXV0aG9yaXphdGlvblN0YWNrIH0gZnJvbSBcIi4vYXV0aG9yaXphdGlvblwiXHJcbmltcG9ydCB7IFVzZXJJbnRlcmZhY2UgfSBmcm9tIFwiLi91c2VyLWludGVyZmFjZVwiXHJcblxyXG4vLyBpbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XHJcblxyXG5leHBvcnQgY2xhc3MgR2VuQWlNdnBTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLy8gVGhlIGNvZGUgdGhhdCBkZWZpbmVzIHlvdXIgc3RhY2sgZ29lcyBoZXJlXHJcblxyXG4gICAgLy8gZXhhbXBsZSByZXNvdXJjZVxyXG4gICAgLy8gY29uc3QgcXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdHZW5BaU12cFF1ZXVlJywge1xyXG4gICAgLy8gICB2aXNpYmlsaXR5VGltZW91dDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzAwKVxyXG4gICAgLy8gfSk7XHJcbiAgICAvLyBsZXQgYXV0aGVudGljYXRpb247XHJcbiAgICAvLyBpZiAoQVVUSEVOVElDQVRJT04pIHtcclxuICAgIC8vICAgYXV0aGVudGljYXRpb24gPSBuZXcgQXV0aG9yaXphdGlvblN0YWNrKHRoaXMsIFwiQXV0aG9yaXphdGlvblwiKVxyXG4gICAgLy8gfVxyXG4gICAgY29uc3QgYXV0aGVudGljYXRpb24gPSBuZXcgQXV0aG9yaXphdGlvblN0YWNrKHRoaXMsIFwiQXV0aG9yaXphdGlvblwiKVxyXG4gICAgY29uc3QgY2hhdGJvdEFQSSA9IG5ldyBDaGF0Qm90QXBpKHRoaXMsIFwiQ2hhdGJvdEFQSVwiLCB7YXV0aGVudGljYXRpb259KTtcclxuICAgIGNvbnN0IHVzZXJJbnRlcmZhY2UgPSBuZXcgVXNlckludGVyZmFjZSh0aGlzLCBcIlVzZXJJbnRlcmZhY2VcIixcclxuICAgICB7dXNlclBvb2xJZCA6IGF1dGhlbnRpY2F0aW9uLnVzZXJQb29sLnVzZXJQb29sSWQsXHJcbiAgICAgIHVzZXJQb29sQ2xpZW50SWQgOiBhdXRoZW50aWNhdGlvbi51c2VyUG9vbENsaWVudC51c2VyUG9vbENsaWVudElkLFxyXG4gICAgICBjb2duaXRvRG9tYWluIDogY29nbml0b0RvbWFpbk5hbWUsXHJcbiAgICAgIGFwaSA6IGNoYXRib3RBUElcclxuICAgIH0pXHJcbiAgICBcclxuICB9XHJcbn1cclxuIl19