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
exports.Website = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const cf = __importStar(require("aws-cdk-lib/aws-cloudfront"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const constructs_1 = require("constructs");
const cdk_nag_1 = require("cdk-nag");
class Website extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        /////////////////////////////////////
        ///// CLOUDFRONT IMPLEMENTATION /////
        /////////////////////////////////////
        const originAccessIdentity = new cf.OriginAccessIdentity(this, "S3OAI");
        props.websiteBucket.grantRead(originAccessIdentity);
        const distributionLogsBucket = new s3.Bucket(this, "DistributionLogsBucket", {
            objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            enforceSSL: true,
        });
        const distribution = new cf.CloudFrontWebDistribution(this, "Distribution", {
            // CUSTOM DOMAIN FOR PUBLIC WEBSITE
            // REQUIRES:
            // 1. ACM Certificate ARN in us-east-1 and Domain of website to be input during 'npm run config':
            //    "privateWebsite" : false,
            //    "certificate" : "arn:aws:acm:us-east-1:1234567890:certificate/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXX",
            //    "domain" : "sub.example.com"
            // 2. After the deployment, in your Route53 Hosted Zone, add an "A Record" that points to the Cloudfront Alias (https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-to-cloudfront-distribution.html)
            // ...(props.config.certificate && props.config.domain && {
            //   viewerCertificate: cf.ViewerCertificate.fromAcmCertificate(
            //     acm.Certificate.fromCertificateArn(this,'CloudfrontAcm', props.config.certificate),
            //     {
            //       aliases: [props.config.domain]
            //     })
            // }),
            viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            priceClass: cf.PriceClass.PRICE_CLASS_ALL,
            httpVersion: cf.HttpVersion.HTTP2_AND_3,
            loggingConfig: {
                bucket: distributionLogsBucket,
            },
            originConfigs: [
                {
                    behaviors: [{ isDefaultBehavior: true }],
                    s3OriginSource: {
                        s3BucketSource: props.websiteBucket,
                        originAccessIdentity,
                    },
                },
                {
                    behaviors: [
                        {
                            pathPattern: "/chatbot/files/*",
                            allowedMethods: cf.CloudFrontAllowedMethods.ALL,
                            viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                            defaultTtl: cdk.Duration.seconds(0),
                            forwardedValues: {
                                queryString: true,
                                headers: [
                                    "Referer",
                                    "Origin",
                                    "Authorization",
                                    "Content-Type",
                                    "x-forwarded-user",
                                    "Access-Control-Request-Headers",
                                    "Access-Control-Request-Method",
                                ],
                            },
                        },
                    ],
                    s3OriginSource: {
                        s3BucketSource: props.websiteBucket,
                        originAccessIdentity,
                    },
                },
            ],
            // geoRestriction: cfGeoRestrictEnable ? cf.GeoRestriction.allowlist(...cfGeoRestrictList): undefined,
            errorConfigurations: [
                {
                    errorCode: 404,
                    errorCachingMinTtl: 0,
                    responseCode: 200,
                    responsePagePath: "/index.html",
                },
            ],
        });
        this.distribution = distribution;
        // ###################################################
        // Outputs
        // ###################################################
        new cdk.CfnOutput(this, "UserInterfaceDomainName", {
            value: `https://${distribution.distributionDomainName}`,
        });
        cdk_nag_1.NagSuppressions.addResourceSuppressions(distributionLogsBucket, [
            {
                id: "AwsSolutions-S1",
                reason: "Bucket is the server access logs bucket for websiteBucket.",
            },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(props.websiteBucket, [
            { id: "AwsSolutions-S5", reason: "OAI is configured for read." },
        ]);
        cdk_nag_1.NagSuppressions.addResourceSuppressions(distribution, [
            { id: "AwsSolutions-CFR1", reason: "No geo restrictions" },
            {
                id: "AwsSolutions-CFR2",
                reason: "WAF not required due to configured Cognito auth.",
            },
            { id: "AwsSolutions-CFR4", reason: "TLS 1.2 is the default." },
        ]);
    }
}
exports.Website = Website;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGUtYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2VuZXJhdGUtYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLCtEQUFpRDtBQUNqRCx1REFBeUM7QUFFekMsMkNBQXVDO0FBRXZDLHFDQUEwQztBQVUxQyxNQUFhLE9BQVEsU0FBUSxzQkFBUztJQUdwQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQW1CO1FBQzNELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIscUNBQXFDO1FBQ3JDLHFDQUFxQztRQUNyQyxxQ0FBcUM7UUFFckMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEUsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUdwRCxNQUFNLHNCQUFzQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FDMUMsSUFBSSxFQUNKLHdCQUF3QixFQUN4QjtZQUNFLGVBQWUsRUFBRSxFQUFFLENBQUMsZUFBZSxDQUFDLGFBQWE7WUFDakQsaUJBQWlCLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLFNBQVM7WUFDakQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLFVBQVUsRUFBRSxJQUFJO1NBQ2pCLENBQ0YsQ0FBQztRQUVGLE1BQU0sWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLHlCQUF5QixDQUNuRCxJQUFJLEVBQ0osY0FBYyxFQUNkO1lBQ0UsbUNBQW1DO1lBQ25DLFlBQVk7WUFDWixpR0FBaUc7WUFDakcsK0JBQStCO1lBQy9CLHlHQUF5RztZQUN6RyxrQ0FBa0M7WUFDbEMsa05BQWtOO1lBQ2xOLDJEQUEyRDtZQUMzRCxnRUFBZ0U7WUFDaEUsMEZBQTBGO1lBQzFGLFFBQVE7WUFDUix1Q0FBdUM7WUFDdkMsU0FBUztZQUNULE1BQU07WUFDTixvQkFBb0IsRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsaUJBQWlCO1lBQy9ELFVBQVUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLGVBQWU7WUFDekMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsV0FBVztZQUN2QyxhQUFhLEVBQUU7Z0JBQ2IsTUFBTSxFQUFFLHNCQUFzQjthQUMvQjtZQUNELGFBQWEsRUFBRTtnQkFDYjtvQkFDRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxDQUFDO29CQUN4QyxjQUFjLEVBQUU7d0JBQ2QsY0FBYyxFQUFFLEtBQUssQ0FBQyxhQUFhO3dCQUNuQyxvQkFBb0I7cUJBQ3JCO2lCQUNGO2dCQUNEO29CQUNFLFNBQVMsRUFBRTt3QkFDVDs0QkFDRSxXQUFXLEVBQUUsa0JBQWtCOzRCQUMvQixjQUFjLEVBQUUsRUFBRSxDQUFDLHdCQUF3QixDQUFDLEdBQUc7NEJBQy9DLG9CQUFvQixFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxpQkFBaUI7NEJBQy9ELFVBQVUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7NEJBQ25DLGVBQWUsRUFBRTtnQ0FDZixXQUFXLEVBQUUsSUFBSTtnQ0FDakIsT0FBTyxFQUFFO29DQUNQLFNBQVM7b0NBQ1QsUUFBUTtvQ0FDUixlQUFlO29DQUNmLGNBQWM7b0NBQ2Qsa0JBQWtCO29DQUNsQixnQ0FBZ0M7b0NBQ2hDLCtCQUErQjtpQ0FDaEM7NkJBQ0Y7eUJBQ0Y7cUJBQ0Y7b0JBQ0QsY0FBYyxFQUFFO3dCQUNkLGNBQWMsRUFBRSxLQUFLLENBQUMsYUFBYTt3QkFDbkMsb0JBQW9CO3FCQUNyQjtpQkFDRjthQUNGO1lBRUQsc0dBQXNHO1lBQ3RHLG1CQUFtQixFQUFFO2dCQUNuQjtvQkFDRSxTQUFTLEVBQUUsR0FBRztvQkFDZCxrQkFBa0IsRUFBRSxDQUFDO29CQUNyQixZQUFZLEVBQUUsR0FBRztvQkFDakIsZ0JBQWdCLEVBQUUsYUFBYTtpQkFDaEM7YUFDRjtTQUNGLENBQ0YsQ0FBQztRQUVGLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO1FBRWpDLHNEQUFzRDtRQUN0RCxVQUFVO1FBQ1Ysc0RBQXNEO1FBQ3RELElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDakQsS0FBSyxFQUFFLFdBQVcsWUFBWSxDQUFDLHNCQUFzQixFQUFFO1NBQ3hELENBQUMsQ0FBQztRQUVILHlCQUFlLENBQUMsdUJBQXVCLENBQ3JDLHNCQUFzQixFQUN0QjtZQUNFO2dCQUNFLEVBQUUsRUFBRSxpQkFBaUI7Z0JBQ3JCLE1BQU0sRUFBRSw0REFBNEQ7YUFDckU7U0FDRixDQUNGLENBQUM7UUFFRix5QkFBZSxDQUFDLHVCQUF1QixDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUU7WUFDM0QsRUFBRSxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLDZCQUE2QixFQUFFO1NBQ2pFLENBQUMsQ0FBQztRQUVILHlCQUFlLENBQUMsdUJBQXVCLENBQUMsWUFBWSxFQUFFO1lBQ3BELEVBQUUsRUFBRSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxxQkFBcUIsRUFBRTtZQUMxRDtnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixNQUFNLEVBQUUsa0RBQWtEO2FBQzNEO1lBQ0QsRUFBRSxFQUFFLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxFQUFFLHlCQUF5QixFQUFFO1NBQy9ELENBQUMsQ0FBQztJQUNILENBQUM7Q0FFRjtBQW5JSCwwQkFtSUciLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSBcImF3cy1jZGstbGliXCI7XHJcbmltcG9ydCAqIGFzIGNmIGZyb20gXCJhd3MtY2RrLWxpYi9hd3MtY2xvdWRmcm9udFwiO1xyXG5pbXBvcnQgKiBhcyBzMyBmcm9tIFwiYXdzLWNkay1saWIvYXdzLXMzXCI7XHJcbmltcG9ydCAqIGFzIGFjbSBmcm9tIFwiYXdzLWNkay1saWIvYXdzLWNlcnRpZmljYXRlbWFuYWdlclwiO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xyXG5pbXBvcnQgeyBDaGF0Qm90QXBpIH0gZnJvbSBcIi4uL2NoYXRib3QtYXBpXCI7XHJcbmltcG9ydCB7IE5hZ1N1cHByZXNzaW9ucyB9IGZyb20gXCJjZGstbmFnXCI7XHJcblxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBXZWJzaXRlUHJvcHMgeyAgXHJcbiAgcmVhZG9ubHkgdXNlclBvb2xJZDogc3RyaW5nO1xyXG4gIHJlYWRvbmx5IHVzZXJQb29sQ2xpZW50SWQ6IHN0cmluZztcclxuICByZWFkb25seSBhcGk6IENoYXRCb3RBcGk7XHJcbiAgcmVhZG9ubHkgd2Vic2l0ZUJ1Y2tldDogczMuQnVja2V0O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgV2Vic2l0ZSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgICByZWFkb25seSBkaXN0cmlidXRpb246IGNmLkNsb3VkRnJvbnRXZWJEaXN0cmlidXRpb247XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBXZWJzaXRlUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG4gICAgLy8vLy8gQ0xPVURGUk9OVCBJTVBMRU1FTlRBVElPTiAvLy8vL1xyXG4gICAgLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vLy8vL1xyXG5cclxuICAgIGNvbnN0IG9yaWdpbkFjY2Vzc0lkZW50aXR5ID0gbmV3IGNmLk9yaWdpbkFjY2Vzc0lkZW50aXR5KHRoaXMsIFwiUzNPQUlcIik7XHJcbiAgICBwcm9wcy53ZWJzaXRlQnVja2V0LmdyYW50UmVhZChvcmlnaW5BY2Nlc3NJZGVudGl0eSk7ICAgIFxyXG5cclxuXHJcbiAgICBjb25zdCBkaXN0cmlidXRpb25Mb2dzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChcclxuICAgICAgdGhpcyxcclxuICAgICAgXCJEaXN0cmlidXRpb25Mb2dzQnVja2V0XCIsXHJcbiAgICAgIHtcclxuICAgICAgICBvYmplY3RPd25lcnNoaXA6IHMzLk9iamVjdE93bmVyc2hpcC5PQkpFQ1RfV1JJVEVSLFxyXG4gICAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBzMy5CbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG5cclxuICAgIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IG5ldyBjZi5DbG91ZEZyb250V2ViRGlzdHJpYnV0aW9uKFxyXG4gICAgICB0aGlzLFxyXG4gICAgICBcIkRpc3RyaWJ1dGlvblwiLFxyXG4gICAgICB7XHJcbiAgICAgICAgLy8gQ1VTVE9NIERPTUFJTiBGT1IgUFVCTElDIFdFQlNJVEVcclxuICAgICAgICAvLyBSRVFVSVJFUzpcclxuICAgICAgICAvLyAxLiBBQ00gQ2VydGlmaWNhdGUgQVJOIGluIHVzLWVhc3QtMSBhbmQgRG9tYWluIG9mIHdlYnNpdGUgdG8gYmUgaW5wdXQgZHVyaW5nICducG0gcnVuIGNvbmZpZyc6XHJcbiAgICAgICAgLy8gICAgXCJwcml2YXRlV2Vic2l0ZVwiIDogZmFsc2UsXHJcbiAgICAgICAgLy8gICAgXCJjZXJ0aWZpY2F0ZVwiIDogXCJhcm46YXdzOmFjbTp1cy1lYXN0LTE6MTIzNDU2Nzg5MDpjZXJ0aWZpY2F0ZS9YWFhYWFhYWC1YWFhYLVhYWFgtWFhYWC1YWFhYWFhYWFhYWFwiLFxyXG4gICAgICAgIC8vICAgIFwiZG9tYWluXCIgOiBcInN1Yi5leGFtcGxlLmNvbVwiXHJcbiAgICAgICAgLy8gMi4gQWZ0ZXIgdGhlIGRlcGxveW1lbnQsIGluIHlvdXIgUm91dGU1MyBIb3N0ZWQgWm9uZSwgYWRkIGFuIFwiQSBSZWNvcmRcIiB0aGF0IHBvaW50cyB0byB0aGUgQ2xvdWRmcm9udCBBbGlhcyAoaHR0cHM6Ly9kb2NzLmF3cy5hbWF6b24uY29tL1JvdXRlNTMvbGF0ZXN0L0RldmVsb3Blckd1aWRlL3JvdXRpbmctdG8tY2xvdWRmcm9udC1kaXN0cmlidXRpb24uaHRtbClcclxuICAgICAgICAvLyAuLi4ocHJvcHMuY29uZmlnLmNlcnRpZmljYXRlICYmIHByb3BzLmNvbmZpZy5kb21haW4gJiYge1xyXG4gICAgICAgIC8vICAgdmlld2VyQ2VydGlmaWNhdGU6IGNmLlZpZXdlckNlcnRpZmljYXRlLmZyb21BY21DZXJ0aWZpY2F0ZShcclxuICAgICAgICAvLyAgICAgYWNtLkNlcnRpZmljYXRlLmZyb21DZXJ0aWZpY2F0ZUFybih0aGlzLCdDbG91ZGZyb250QWNtJywgcHJvcHMuY29uZmlnLmNlcnRpZmljYXRlKSxcclxuICAgICAgICAvLyAgICAge1xyXG4gICAgICAgIC8vICAgICAgIGFsaWFzZXM6IFtwcm9wcy5jb25maWcuZG9tYWluXVxyXG4gICAgICAgIC8vICAgICB9KVxyXG4gICAgICAgIC8vIH0pLFxyXG4gICAgICAgIHZpZXdlclByb3RvY29sUG9saWN5OiBjZi5WaWV3ZXJQcm90b2NvbFBvbGljeS5SRURJUkVDVF9UT19IVFRQUyxcclxuICAgICAgICBwcmljZUNsYXNzOiBjZi5QcmljZUNsYXNzLlBSSUNFX0NMQVNTX0FMTCxcclxuICAgICAgICBodHRwVmVyc2lvbjogY2YuSHR0cFZlcnNpb24uSFRUUDJfQU5EXzMsXHJcbiAgICAgICAgbG9nZ2luZ0NvbmZpZzoge1xyXG4gICAgICAgICAgYnVja2V0OiBkaXN0cmlidXRpb25Mb2dzQnVja2V0LFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgb3JpZ2luQ29uZmlnczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBiZWhhdmlvcnM6IFt7IGlzRGVmYXVsdEJlaGF2aW9yOiB0cnVlIH1dLFxyXG4gICAgICAgICAgICBzM09yaWdpblNvdXJjZToge1xyXG4gICAgICAgICAgICAgIHMzQnVja2V0U291cmNlOiBwcm9wcy53ZWJzaXRlQnVja2V0LFxyXG4gICAgICAgICAgICAgIG9yaWdpbkFjY2Vzc0lkZW50aXR5LFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgYmVoYXZpb3JzOiBbXHJcbiAgICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgICAgcGF0aFBhdHRlcm46IFwiL2NoYXRib3QvZmlsZXMvKlwiLFxyXG4gICAgICAgICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IGNmLkNsb3VkRnJvbnRBbGxvd2VkTWV0aG9kcy5BTEwsXHJcbiAgICAgICAgICAgICAgICB2aWV3ZXJQcm90b2NvbFBvbGljeTogY2YuVmlld2VyUHJvdG9jb2xQb2xpY3kuUkVESVJFQ1RfVE9fSFRUUFMsXHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0VHRsOiBjZGsuRHVyYXRpb24uc2Vjb25kcygwKSxcclxuICAgICAgICAgICAgICAgIGZvcndhcmRlZFZhbHVlczoge1xyXG4gICAgICAgICAgICAgICAgICBxdWVyeVN0cmluZzogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgaGVhZGVyczogW1xyXG4gICAgICAgICAgICAgICAgICAgIFwiUmVmZXJlclwiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwiT3JpZ2luXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJBdXRob3JpemF0aW9uXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgXCJDb250ZW50LVR5cGVcIixcclxuICAgICAgICAgICAgICAgICAgICBcIngtZm9yd2FyZGVkLXVzZXJcIixcclxuICAgICAgICAgICAgICAgICAgICBcIkFjY2Vzcy1Db250cm9sLVJlcXVlc3QtSGVhZGVyc1wiLFxyXG4gICAgICAgICAgICAgICAgICAgIFwiQWNjZXNzLUNvbnRyb2wtUmVxdWVzdC1NZXRob2RcIixcclxuICAgICAgICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgXSxcclxuICAgICAgICAgICAgczNPcmlnaW5Tb3VyY2U6IHtcclxuICAgICAgICAgICAgICBzM0J1Y2tldFNvdXJjZTogcHJvcHMud2Vic2l0ZUJ1Y2tldCxcclxuICAgICAgICAgICAgICBvcmlnaW5BY2Nlc3NJZGVudGl0eSxcclxuICAgICAgICAgICAgfSwgICAgICAgICAgICBcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgICBcclxuICAgICAgICAvLyBnZW9SZXN0cmljdGlvbjogY2ZHZW9SZXN0cmljdEVuYWJsZSA/IGNmLkdlb1Jlc3RyaWN0aW9uLmFsbG93bGlzdCguLi5jZkdlb1Jlc3RyaWN0TGlzdCk6IHVuZGVmaW5lZCxcclxuICAgICAgICBlcnJvckNvbmZpZ3VyYXRpb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIGVycm9yQ29kZTogNDA0LFxyXG4gICAgICAgICAgICBlcnJvckNhY2hpbmdNaW5UdGw6IDAsXHJcbiAgICAgICAgICAgIHJlc3BvbnNlQ29kZTogMjAwLFxyXG4gICAgICAgICAgICByZXNwb25zZVBhZ2VQYXRoOiBcIi9pbmRleC5odG1sXCIsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH1cclxuICAgICk7XHJcblxyXG4gICAgdGhpcy5kaXN0cmlidXRpb24gPSBkaXN0cmlidXRpb247XHJcblxyXG4gICAgLy8gIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjXHJcbiAgICAvLyBPdXRwdXRzXHJcbiAgICAvLyAjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsIFwiVXNlckludGVyZmFjZURvbWFpbk5hbWVcIiwge1xyXG4gICAgICB2YWx1ZTogYGh0dHBzOi8vJHtkaXN0cmlidXRpb24uZGlzdHJpYnV0aW9uRG9tYWluTmFtZX1gLFxyXG4gICAgfSk7XHJcblxyXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKFxyXG4gICAgICBkaXN0cmlidXRpb25Mb2dzQnVja2V0LFxyXG4gICAgICBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLVMxXCIsXHJcbiAgICAgICAgICByZWFzb246IFwiQnVja2V0IGlzIHRoZSBzZXJ2ZXIgYWNjZXNzIGxvZ3MgYnVja2V0IGZvciB3ZWJzaXRlQnVja2V0LlwiLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF1cclxuICAgICk7XHJcblxyXG4gICAgTmFnU3VwcHJlc3Npb25zLmFkZFJlc291cmNlU3VwcHJlc3Npb25zKHByb3BzLndlYnNpdGVCdWNrZXQsIFtcclxuICAgICAgeyBpZDogXCJBd3NTb2x1dGlvbnMtUzVcIiwgcmVhc29uOiBcIk9BSSBpcyBjb25maWd1cmVkIGZvciByZWFkLlwiIH0sXHJcbiAgICBdKTtcclxuXHJcbiAgICBOYWdTdXBwcmVzc2lvbnMuYWRkUmVzb3VyY2VTdXBwcmVzc2lvbnMoZGlzdHJpYnV0aW9uLCBbXHJcbiAgICAgIHsgaWQ6IFwiQXdzU29sdXRpb25zLUNGUjFcIiwgcmVhc29uOiBcIk5vIGdlbyByZXN0cmljdGlvbnNcIiB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6IFwiQXdzU29sdXRpb25zLUNGUjJcIixcclxuICAgICAgICByZWFzb246IFwiV0FGIG5vdCByZXF1aXJlZCBkdWUgdG8gY29uZmlndXJlZCBDb2duaXRvIGF1dGguXCIsXHJcbiAgICAgIH0sXHJcbiAgICAgIHsgaWQ6IFwiQXdzU29sdXRpb25zLUNGUjRcIiwgcmVhc29uOiBcIlRMUyAxLjIgaXMgdGhlIGRlZmF1bHQuXCIgfSxcclxuICAgIF0pO1xyXG4gICAgfVxyXG5cclxuICB9XHJcbiJdfQ==