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
exports.UserInterface = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const s3deploy = __importStar(require("aws-cdk-lib/aws-s3-deployment"));
const constructs_1 = require("constructs");
const node_child_process_1 = require("node:child_process");
const path = __importStar(require("node:path"));
const generate_app_1 = require("./generate-app");
const cdk_nag_1 = require("cdk-nag");
const utils_1 = require("../shared/utils");
const constants_1 = require("../constants");
class UserInterface extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const appPath = path.join(__dirname, "app");
        const buildPath = path.join(appPath, "dist");
        const uploadLogsBucket = new s3.Bucket(this, "WebsiteLogsBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            autoDeleteObjects: true,
            // bucketName: props.config.privateWebsite ? props.config.domain : undefined,
            websiteIndexDocument: "index.html",
            websiteErrorDocument: "index.html",
            enforceSSL: true,
            serverAccessLogsBucket: uploadLogsBucket,
        });
        // Deploy either Private (only accessible within VPC) or Public facing website
        let apiEndpoint;
        let websocketEndpoint;
        let distribution;
        const publicWebsite = new generate_app_1.Website(this, "Website", { ...props, websiteBucket: websiteBucket });
        distribution = publicWebsite.distribution;
        const exportsAsset = s3deploy.Source.jsonData("aws-exports.json", {
            Auth: {
                region: cdk.Aws.REGION,
                userPoolId: props.userPoolId,
                userPoolWebClientId: props.userPoolClientId,
                oauth: {
                    domain: props.cognitoDomain.concat(".auth.us-east-1.amazoncognito.com"),
                    scope: ["aws.cognito.signin.user.admin", "email", "openid", "profile"],
                    redirectSignIn: "https://" + distribution.distributionDomainName,
                    redirectSignOut: "https://" + distribution.distributionDomainName,
                    responseType: "code"
                }
            },
            httpEndpoint: props.api.httpAPI.restAPI.url,
            wsEndpoint: props.api.wsAPI.wsAPIStage.url,
            federatedSignInProvider: constants_1.OIDCIntegrationName
        });
        const asset = s3deploy.Source.asset(appPath, {
            bundling: {
                image: cdk.DockerImage.fromRegistry("public.ecr.aws/sam/build-nodejs18.x:latest"),
                command: [
                    "sh",
                    "-c",
                    [
                        "npm --cache /tmp/.npm install",
                        `npm --cache /tmp/.npm run build`,
                        "cp -aur /asset-input/dist/* /asset-output/",
                    ].join(" && "),
                ],
                local: {
                    tryBundle(outputDir) {
                        try {
                            const options = {
                                stdio: "inherit",
                                env: {
                                    ...process.env,
                                },
                            };
                            (0, node_child_process_1.execSync)(`npm --silent --prefix "${appPath}" ci`, options);
                            (0, node_child_process_1.execSync)(`npm --silent --prefix "${appPath}" run build`, options);
                            utils_1.Utils.copyDirRecursive(buildPath, outputDir);
                        }
                        catch (e) {
                            console.error(e);
                            return false;
                        }
                        return true;
                    },
                },
            },
        });
        new s3deploy.BucketDeployment(this, "UserInterfaceDeployment", {
            prune: false,
            sources: [asset, exportsAsset],
            destinationBucket: websiteBucket,
            distribution: distribution
        });
        /**
         * CDK NAG suppression
         */
        cdk_nag_1.NagSuppressions.addResourceSuppressions(uploadLogsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Bucket is the server access logs bucket for websiteBucket.",
            },
        ]);
    }
}
exports.UserInterface = UserInterface;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUduQyx1REFBeUM7QUFDekMsd0VBQTBEO0FBQzFELDJDQUF1QztBQUN2QywyREFHNEI7QUFDNUIsZ0RBQWtDO0FBRWxDLGlEQUF3QztBQUN4QyxxQ0FBMEM7QUFDMUMsMkNBQXVDO0FBQ3ZDLDRDQUFtRDtBQVNuRCxNQUFhLGFBQWMsU0FBUSxzQkFBUztJQUMxQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUMsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFN0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ2hFLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixVQUFVLEVBQUUsSUFBSTtTQUNqQixDQUFDLENBQUM7UUFFSCxNQUFNLGFBQWEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUN6RCxhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1lBQ2pELGlCQUFpQixFQUFFLElBQUk7WUFDdkIsNkVBQTZFO1lBQzdFLG9CQUFv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Q0FBQztZQUM5QixpQkFBaUIsRUFBRSxhQUFhO1lBQ2hDLFlBQVksRUFBRSxZQUFZO1NBQzNCLENBQUMsQ0FBQztRQUdIOztXQUVHO1FBQ0gseUJBQWUsQ0FBQyx1QkFBdUIsQ0FDckMsZ0JBQWdCLEVBQ2hCO1lBQ0U7Z0JBQ0UsRUFBRSxFQUFFLGlCQUFpQjtnQkFDckIsTUFBTSxFQUFFLDREQUE0RDthQUNyRTtTQUNGLENBQ0YsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQWhIRCxzQ0FnSEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XHJcbmltcG9ydCAqIGFzIGNmIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udFwiO1xyXG5pbXBvcnQgKiBhcyBpYW0gZnJvbSBcImF3cy1jZGstbGliL2F3cy1pYW1cIjtcclxuaW1wb3J0ICogYXMgczMgZnJvbSBcImF3cy1jZGstbGliL2F3cy1zM1wiO1xyXG5pbXBvcnQgKiBhcyBzM2RlcGxveSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzLWRlcGxveW1lbnRcIjtcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcclxuaW1wb3J0IHtcclxuICBFeGVjU3luY09wdGlvbnNXaXRoQnVmZmVyRW5jb2RpbmcsXHJcbiAgZXhlY1N5bmMsXHJcbn0gZnJvbSBcIm5vZGU6Y2hpbGRfcHJvY2Vzc1wiO1xyXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gXCJub2RlOnBhdGhcIjtcclxuaW1wb3J0IHsgQ2hhdEJvdEFwaSB9IGZyb20gXCIuLi9jaGF0Ym90LWFwaVwiO1xyXG5pbXBvcnQgeyBXZWJzaXRlIH0gZnJvbSBcIi4vZ2VuZXJhdGUtYXBwXCJcclxuaW1wb3J0IHsgTmFnU3VwcHJlc3Npb25zIH0gZnJvbSBcImNkay1uYWdcIjtcclxuaW1wb3J0IHsgVXRpbHMgfSBmcm9tIFwiLi4vc2hhcmVkL3V0aWxzXCJcclxuaW1wb3J0IHsgT0lEQ0ludGVncmF0aW9uTmFtZSB9IGZyb20gXCIuLi9jb25zdGFudHNcIjtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVXNlckludGVyZmFjZVByb3BzIHtcclxuICByZWFkb25seSB1c2VyUG9vbElkOiBzdHJpbmc7XHJcbiAgcmVhZG9ubHkgdXNlclBvb2xDbGllbnRJZDogc3RyaW5nO1xyXG4gIHJlYWRvbmx5IGFwaTogQ2hhdEJvdEFwaTtcclxuICByZWFkb25seSBjb2duaXRvRG9tYWluIDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgVXNlckludGVyZmFjZSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFVzZXJJbnRlcmZhY2VQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCBhcHBQYXRoID0gcGF0aC5qb2luKF9fZGlybmFtZSwgXCJhcHBcIik7XHJcbiAgICBjb25zdCBidWlsZFBhdGggPSBwYXRoLmpvaW4oYXBwUGF0aCwgXCJkaXN0XCIpO1xyXG5cclxuICAgIGNvbnN0IHVwbG9hZExvZ3NCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIFwiV2Vic2l0ZUxvZ3NCdWNrZXRcIiwge1xyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogczMuQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgIH0pO1xyXG5cclxuICAgIGNvbnN0IHdlYnNpdGVCdWNrZXQgPSBuZXcgczMuQnVja2V0KHRoaXMsIFwiV2Vic2l0ZUJ1Y2tldFwiLCB7XHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgICAvLyBidWNrZXROYW1lOiBwcm9wcy5jb25maWcucHJpdmF0ZVdlYnNpdGUgPyBwcm9wcy5jb25maWcuZG9tYWluIDogdW5kZWZpbmVkLFxyXG4gICAgICB3ZWJzaXRlSW5kZXhEb2N1bWVudDogXCJpbmRleC5odG1sXCIsXHJcbiAgICAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiBcImluZGV4Lmh0bWxcIixcclxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgc2VydmVyQWNjZXNzTG9nc0J1Y2tldDogdXBsb2FkTG9nc0J1Y2tldCxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIERlcGxveSBlaXRoZXIgUHJpdmF0ZSAob25seSBhY2Nlc3NpYmxlIHdpdGhpbiBWUEMpIG9yIFB1YmxpYyBmYWNpbmcgd2Vic2l0ZVxyXG4gICAgbGV0IGFwaUVuZHBvaW50OiBzdHJpbmc7XHJcbiAgICBsZXQgd2Vic29ja2V0RW5kcG9pbnQ6IHN0cmluZztcclxuICAgIGxldCBkaXN0cmlidXRpb247XHJcblxyXG4gICAgY29uc3QgcHVibGljV2Vic2l0ZSA9IG5ldyBXZWJzaXRlKHRoaXMsIFwiV2Vic2l0ZVwiLCB7IC4uLnByb3BzLCB3ZWJzaXRlQnVja2V0OiB3ZWJzaXRlQnVja2V0IH0pO1xyXG4gICAgZGlzdHJpYnV0aW9uID0gcHVibGljV2Vic2l0ZS5kaXN0cmlidXRpb25cclxuXHJcblxyXG5cclxuICAgIGNvbnN0IGV4cG9ydHNBc3NldCA9IHMzZGVwbG95LlNvdXJjZS5qc29uRGF0YShcImF3cy1leHBvcnRzLmpzb25cIiwge1xyXG4gICAgICBBdXRoOiB7XHJcbiAgICAgICAgcmVnaW9uOiBjZGsuQXdzLlJFR0lPTixcclxuICAgICAgICB1c2VyUG9vbElkOiBwcm9wcy51c2VyUG9vbElkLFxyXG4gICAgICAgIHVzZXJQb29sV2ViQ2xpZW50SWQ6IHByb3BzLnVzZXJQb29sQ2xpZW50SWQsXHJcbiAgICAgICAgb2F1dGg6IHtcclxuICAgICAgICAgIGRvbWFpbjogcHJvcHMuY29nbml0b0RvbWFpbi5jb25jYXQoXCIuYXV0aC51cy1lYXN0LTEuYW1hem9uY29nbml0by5jb21cIiksXHJcbiAgICAgICAgICBzY29wZTogW1wiYXdzLmNvZ25pdG8uc2lnbmluLnVzZXIuYWRtaW5cIixcImVtYWlsXCIsIFwib3BlbmlkXCIsIFwicHJvZmlsZVwiXSxcclxuICAgICAgICAgIHJlZGlyZWN0U2lnbkluOiBcImh0dHBzOi8vXCIgKyBkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZSxcclxuICAgICAgICAgIHJlZGlyZWN0U2lnbk91dDogXCJodHRwczovL1wiICsgZGlzdHJpYnV0aW9uLmRpc3RyaWJ1dGlvbkRvbWFpbk5hbWUsXHJcbiAgICAgICAgICByZXNwb25zZVR5cGU6IFwiY29kZVwiXHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBodHRwRW5kcG9pbnQgOiBwcm9wcy5hcGkuaHR0cEFQSS5yZXN0QVBJLnVybCxcclxuICAgICAgd3NFbmRwb2ludCA6IHByb3BzLmFwaS53c0FQSS53c0FQSVN0YWdlLnVybCxcclxuICAgICAgZmVkZXJhdGVkU2lnbkluUHJvdmlkZXIgOiBPSURDSW50ZWdyYXRpb25OYW1lXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBhc3NldCA9IHMzZGVwbG95LlNvdXJjZS5hc3NldChhcHBQYXRoLCB7XHJcbiAgICAgIGJ1bmRsaW5nOiB7XHJcbiAgICAgICAgaW1hZ2U6IGNkay5Eb2NrZXJJbWFnZS5mcm9tUmVnaXN0cnkoXHJcbiAgICAgICAgICBcInB1YmxpYy5lY3IuYXdzL3NhbS9idWlsZC1ub2RlanMxOC54OmxhdGVzdFwiXHJcbiAgICAgICAgKSxcclxuICAgICAgICBjb21tYW5kOiBbXHJcbiAgICAgICAgICBcInNoXCIsXHJcbiAgICAgICAgICBcIi1jXCIsXHJcbiAgICAgICAgICBbXHJcbiAgICAgICAgICAgIFwibnBtIC0tY2FjaGUgL3RtcC8ubnBtIGluc3RhbGxcIixcclxuICAgICAgICAgICAgYG5wbSAtLWNhY2hlIC90bXAvLm5wbSBydW4gYnVpbGRgLFxyXG4gICAgICAgICAgICBcImNwIC1hdXIgL2Fzc2V0LWlucHV0L2Rpc3QvKiAvYXNzZXQtb3V0cHV0L1wiLFxyXG4gICAgICAgICAgXS5qb2luKFwiICYmIFwiKSxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGxvY2FsOiB7XHJcbiAgICAgICAgICB0cnlCdW5kbGUob3V0cHV0RGlyOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICBjb25zdCBvcHRpb25zOiBFeGVjU3luY09wdGlvbnNXaXRoQnVmZmVyRW5jb2RpbmcgPSB7XHJcbiAgICAgICAgICAgICAgICBzdGRpbzogXCJpbmhlcml0XCIsXHJcbiAgICAgICAgICAgICAgICBlbnY6IHtcclxuICAgICAgICAgICAgICAgICAgLi4ucHJvY2Vzcy5lbnYsXHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICAgIGV4ZWNTeW5jKGBucG0gLS1zaWxlbnQgLS1wcmVmaXggXCIke2FwcFBhdGh9XCIgY2lgLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgICBleGVjU3luYyhgbnBtIC0tc2lsZW50IC0tcHJlZml4IFwiJHthcHBQYXRofVwiIHJ1biBidWlsZGAsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgIFV0aWxzLmNvcHlEaXJSZWN1cnNpdmUoYnVpbGRQYXRoLCBvdXRwdXREaXIpO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcclxuICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IHMzZGVwbG95LkJ1Y2tldERlcGxveW1lbnQodGhpcywgXCJVc2VySW50ZXJmYWNlRGVwbG95bWVudFwiLCB7XHJcbiAgICAgIHBydW5lOiBmYWxzZSxcclxuICAgICAgc291cmNlczogW2Fzc2V0LCBleHBvcnRzQXNzZXRdLFxyXG4gICAgICBkZXN0aW5hdGlvbkJ1Y2tldDogd2Vic2l0ZUJ1Y2tldCxcclxuICAgICAgZGlzdHJpYnV0aW9uOiBkaXN0cmlidXRpb25cclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICAvKipcclxuICAgICAqIENESyBOQUcgc3VwcHJlc3Npb25cclxuICAgICAqL1xyXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxyXG4gICAgICB1cGxvYWRMb2dzQnVja2V0LFxyXG4gICAgICBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVMxXCIsXHJcbiAgICAgICAgICByZWFzb246IFwiQnVja2V0IGlzIHRoZSBzZXJ2ZXIgYWNjZXNzIGxvZ3MgYnVja2V0IGZvciB3ZWJzaXRlQnVja2V0LlwiLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF1cclxuICAgICk7XHJcbiAgfVxyXG59XHJcbiJdfQ==