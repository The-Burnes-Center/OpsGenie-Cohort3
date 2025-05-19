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
exports.S3BucketStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cloudtrail = __importStar(require("aws-cdk-lib/aws-cloudtrail"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const kms = __importStar(require("aws-cdk-lib/aws-kms"));
class S3BucketStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const cloudTrailBucket = new s3.Bucket(scope, 'CloudTrailBucket', {
            encryption: s3.BucketEncryption.KMS_MANAGED,
            enforceSSL: true,
        });
        const cloudTrailKey = new kms.Key(scope, 'CloudTrailKey', {
            enableKeyRotation: true,
            alias: cdk.Stack.of(this).stackName + 'CloudTrailKey',
        });
        const dataEventTrailLogGroup = new logs.LogGroup(scope, 'DataEventTrailLogGroup', {});
        const dataEventTrail = new cloudtrail.Trail(scope, 'DataEventTrail', {
            encryptionKey: cloudTrailKey,
            bucket: cloudTrailBucket,
            sendToCloudWatchLogs: true,
            cloudWatchLogGroup: dataEventTrailLogGroup,
        });
        // Give Cloudtrail permissions to use KMS
        cloudTrailKey.grantEncryptDecrypt(new iam.ServicePrincipal('cloudtrail.amazonaws.com'));
        cloudTrailKey.grantEncrypt(new kms.ViaServicePrincipal('s3.amazonaws.com', new iam.AnyPrincipal()));
        // Create a new S3 bucket for logging
        const loggingBucket = new s3.Bucket(scope, "LoggingBucket", {
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryption: s3.BucketEncryption.KMS_MANAGED,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }],
            enforceSSL: true,
        });
        loggingBucket.grantReadWrite(new iam.ServicePrincipal('logs.amazonaws.com'));
        // Create a new S3 bucket
        this.kendraBucket = new s3.Bucket(scope, 'KendraSourceBucket', {
            // bucketName: 'kendra-s3-source',
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryption: s3.BucketEncryption.KMS_MANAGED,
            serverAccessLogsBucket: loggingBucket,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }],
            enforceSSL: true,
        });
        // Create an S3 data source role for Kendra needed to configure 
        // the s3 data source on Kendra console after deployment.
        const kendraS3Role = new iam.Role(this, 'KendraS3DataSourceRole', {
            assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
            description: 'IAM role for Kendra to access S3 bucket',
        });
        // Add Kendra-specific permissions for document operations
        kendraS3Role.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
                'kendra:BatchPutDocument',
                'kendra:BatchDeleteDocument'
            ],
            resources: [
                `arn:aws:kendra:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:index/*`
            ]
        }));
        // Add bucket policy to allow Kendra's IAM role to access S3 bucket created above
        this.kendraBucket.addToResourcePolicy(new iam.PolicyStatement({
            actions: [
                's3:GetObject',
                's3:ListBucket'
            ],
            resources: [
                this.kendraBucket.arnForObjects('*'),
                this.kendraBucket.bucketArn
            ],
            principals: [new iam.ArnPrincipal(kendraS3Role.roleArn)]
        }));
        // Output the role name/ARN for easy reference in each stack deployment
        new cdk.CfnOutput(this, 'KendraS3RoleName', {
            value: kendraS3Role.roleName,
            description: `Kendra S3 data source role name for stack ${cdk.Stack.of(this).stackName}`
        });
        new cdk.CfnOutput(this, 'KendraS3RoleArn', {
            value: kendraS3Role.roleArn,
            description: `Kendra S3 data source role ARN for stack ${cdk.Stack.of(this).stackName}`
        });
        this.feedbackBucket = new s3.Bucket(scope, 'FeedbackDownloadBucket', {
            // bucketName: 'feedback-download',
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryption: s3.BucketEncryption.KMS_MANAGED,
            serverAccessLogsBucket: loggingBucket,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }],
            enforceSSL: true,
        });
        this.evalResultsBucket = new s3.Bucket(scope, 'EvalResultsBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryption: s3.BucketEncryption.KMS_MANAGED,
            serverAccessLogsBucket: loggingBucket,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }],
            enforceSSL: true,
        });
        this.evalTestCasesBucket = new s3.Bucket(scope, 'EvalTestCasesBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryption: s3.BucketEncryption.KMS_MANAGED,
            serverAccessLogsBucket: loggingBucket,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }],
            enforceSSL: true,
        });
        this.ragasDependenciesBucket = new s3.Bucket(scope, 'RagasDependenciesBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            encryption: s3.BucketEncryption.KMS_MANAGED,
            serverAccessLogsBucket: loggingBucket,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }],
            enforceSSL: true,
        });
        // Add S3 event selectors to the CloudTrail        
        dataEventTrail.logAllS3DataEvents({ includeManagementEvents: false });
    }
}
exports.S3BucketStack = S3BucketStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVja2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJ1Y2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBQ3pDLHlEQUEyQztBQUMzQyx1RUFBeUQ7QUFDekQsMkRBQTZDO0FBQzdDLHlEQUEyQztBQUczQyxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQU8xQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxrQkFBa0IsRUFBRTtZQUNoRSxVQUFVLEVBQUUsRUFBRSxDQUFDLGdCQUFnQixDQUFDLFdBQVc7WUFDM0MsVUFBVSxFQUFFLElBQUk7U0FDakIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxhQUFhLEdBQUcsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUU7WUFDeEQsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxHQUFHLGVBQWU7U0FDdEQsQ0FBQyxDQUFDO1FBRUgsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLHdCQUF3QixFQUFFLEVBQ2pGLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLEVBQUU7WUFDbkUsYUFBYSxFQUFFLGFBQWE7WUFDNUIsTUFBTSxFQUFFLGdCQUFnQjtZQUN4QixvQkFBb0IsRUFBRSxJQUFJO1lBQzFCLGtCQUFrQixFQUFFLHNCQUFzQjtT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LEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0NBQ0Y7QUFwS0Qsc0NBb0tDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgKiBhcyBjbG91ZHRyYWlsIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jbG91ZHRyYWlsJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIGttcyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mta21zJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcclxuXHJcbmV4cG9ydCBjbGFzcyBTM0J1Y2tldFN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcclxuICBwdWJsaWMgcmVhZG9ubHkga2VuZHJhQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgcHVibGljIHJlYWRvbmx5IGZlZWRiYWNrQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgcHVibGljIHJlYWRvbmx5IGV2YWxSZXN1bHRzQnVja2V0OiBzMy5CdWNrZXQ7XHJcbiAgcHVibGljIHJlYWRvbmx5IGV2YWxUZXN0Q2FzZXNCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICBwdWJsaWMgcmVhZG9ubHkgcmFnYXNEZXBlbmRlbmNpZXNCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgY29uc3QgY2xvdWRUcmFpbEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQoc2NvcGUsICdDbG91ZFRyYWlsQnVja2V0Jywge1xyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNU19NQU5BR0VELFxyXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgY2xvdWRUcmFpbEtleSA9IG5ldyBrbXMuS2V5KHNjb3BlLCAnQ2xvdWRUcmFpbEtleScsIHtcclxuICAgICAgZW5hYmxlS2V5Um90YXRpb246IHRydWUsICAgIFxyXG4gICAgICBhbGlhczogY2RrLlN0YWNrLm9mKHRoaXMpLnN0YWNrTmFtZSArICdDbG91ZFRyYWlsS2V5JywgICAgXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCBkYXRhRXZlbnRUcmFpbExvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAoc2NvcGUsICdEYXRhRXZlbnRUcmFpbExvZ0dyb3VwJywge1xyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZGF0YUV2ZW50VHJhaWwgPSBuZXcgY2xvdWR0cmFpbC5UcmFpbChzY29wZSwgJ0RhdGFFdmVudFRyYWlsJywge1xyXG4gICAgICBlbmNyeXB0aW9uS2V5OiBjbG91ZFRyYWlsS2V5LFxyXG4gICAgICBidWNrZXQ6IGNsb3VkVHJhaWxCdWNrZXQsXHJcbiAgICAgIHNlbmRUb0Nsb3VkV2F0Y2hMb2dzOiB0cnVlLFxyXG4gICAgICBjbG91ZFdhdGNoTG9nR3JvdXA6IGRhdGFFdmVudFRyYWlsTG9nR3JvdXAsXHJcbiAgICB9KTsgICAgXHJcblxyXG4gICAgLy8gR2l2ZSBDbG91ZHRyYWlsIHBlcm1pc3Npb25zIHRvIHVzZSBLTVNcclxuICAgIGNsb3VkVHJhaWxLZXkuZ3JhbnRFbmNyeXB0RGVjcnlwdChuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2Nsb3VkdHJhaWwuYW1hem9uYXdzLmNvbScpKTtcclxuICAgIGNsb3VkVHJhaWxLZXkuZ3JhbnRFbmNyeXB0KG5ldyBrbXMuVmlhU2VydmljZVByaW5jaXBhbCgnczMuYW1hem9uYXdzLmNvbScsIG5ldyBpYW0uQW55UHJpbmNpcGFsKCkpKTtcclxuXHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgbmV3IFMzIGJ1Y2tldCBmb3IgbG9nZ2luZ1xyXG4gICAgY29uc3QgbG9nZ2luZ0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQoc2NvcGUsIFwiTG9nZ2luZ0J1Y2tldFwiLCB7XHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TX01BTkFHRUQsXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgICBjb3JzOiBbe1xyXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULHMzLkh0dHBNZXRob2RzLlBPU1QsczMuSHR0cE1ldGhvZHMuUFVULHMzLkh0dHBNZXRob2RzLkRFTEVURV0sXHJcbiAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLCBcclxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXSAgICAgXHJcbiAgICAgIH1dLFxyXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIGxvZ2dpbmdCdWNrZXQuZ3JhbnRSZWFkV3JpdGUobmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdsb2dzLmFtYXpvbmF3cy5jb20nKSk7ICAgIFxyXG4gICAgXHJcbiAgICAvLyBDcmVhdGUgYSBuZXcgUzMgYnVja2V0XHJcbiAgICB0aGlzLmtlbmRyYUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQoc2NvcGUsICdLZW5kcmFTb3VyY2VCdWNrZXQnLCB7XHJcbiAgICAgIC8vIGJ1Y2tldE5hbWU6ICdrZW5kcmEtczMtc291cmNlJyxcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBlbmNyeXB0aW9uOiBzMy5CdWNrZXRFbmNyeXB0aW9uLktNU19NQU5BR0VELCBcclxuICAgICAgc2VydmVyQWNjZXNzTG9nc0J1Y2tldDogbG9nZ2luZ0J1Y2tldCwgICAgICAgICAgIFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgICAgY29yczogW3tcclxuICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCxzMy5IdHRwTWV0aG9kcy5QT1NULHMzLkh0dHBNZXRob2RzLlBVVCxzMy5IdHRwTWV0aG9kcy5ERUxFVEVdLFxyXG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgICAgICBcclxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXVxyXG4gICAgICB9XSwgIFxyXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLCAgICBcclxuICAgIH0pO1xyXG4gICAgLy8gQ3JlYXRlIGFuIFMzIGRhdGEgc291cmNlIHJvbGUgZm9yIEtlbmRyYSBuZWVkZWQgdG8gY29uZmlndXJlIFxyXG4gICAgLy8gdGhlIHMzIGRhdGEgc291cmNlIG9uIEtlbmRyYSBjb25zb2xlIGFmdGVyIGRlcGxveW1lbnQuXHJcbiAgICBjb25zdCBrZW5kcmFTM1JvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ0tlbmRyYVMzRGF0YVNvdXJjZVJvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdrZW5kcmEuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0lBTSByb2xlIGZvciBLZW5kcmEgdG8gYWNjZXNzIFMzIGJ1Y2tldCcsXHJcbiAgICB9KTtcclxuICAgIC8vIEFkZCBLZW5kcmEtc3BlY2lmaWMgcGVybWlzc2lvbnMgZm9yIGRvY3VtZW50IG9wZXJhdGlvbnNcclxuICAgIGtlbmRyYVMzUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAgICAgJ2tlbmRyYTpCYXRjaFB1dERvY3VtZW50JyxcclxuICAgICAgICAgICAgJ2tlbmRyYTpCYXRjaERlbGV0ZURvY3VtZW50J1xyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICAgIGBhcm46YXdzOmtlbmRyYToke2Nkay5TdGFjay5vZih0aGlzKS5yZWdpb259OiR7Y2RrLlN0YWNrLm9mKHRoaXMpLmFjY291bnR9OmluZGV4LypgXHJcbiAgICAgICAgXVxyXG4gICAgfSkpO1xyXG4gICAgLy8gQWRkIGJ1Y2tldCBwb2xpY3kgdG8gYWxsb3cgS2VuZHJhJ3MgSUFNIHJvbGUgdG8gYWNjZXNzIFMzIGJ1Y2tldCBjcmVhdGVkIGFib3ZlXHJcbiAgICB0aGlzLmtlbmRyYUJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICAgICAnczM6TGlzdEJ1Y2tldCdcclxuICAgICAgICBdLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgICB0aGlzLmtlbmRyYUJ1Y2tldC5hcm5Gb3JPYmplY3RzKCcqJyksXHJcbiAgICAgICAgICAgIHRoaXMua2VuZHJhQnVja2V0LmJ1Y2tldEFyblxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uQXJuUHJpbmNpcGFsKGtlbmRyYVMzUm9sZS5yb2xlQXJuKV1cclxuICAgIH0pKTtcclxuICAgIC8vIE91dHB1dCB0aGUgcm9sZSBuYW1lL0FSTiBmb3IgZWFzeSByZWZlcmVuY2UgaW4gZWFjaCBzdGFjayBkZXBsb3ltZW50XHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnS2VuZHJhUzNSb2xlTmFtZScsIHtcclxuICAgICAgICB2YWx1ZToga2VuZHJhUzNSb2xlLnJvbGVOYW1lLFxyXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgS2VuZHJhIFMzIGRhdGEgc291cmNlIHJvbGUgbmFtZSBmb3Igc3RhY2sgJHtjZGsuU3RhY2sub2YodGhpcykuc3RhY2tOYW1lfWBcclxuICAgIH0pO1xyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0tlbmRyYVMzUm9sZUFybicsIHtcclxuICAgICAgICB2YWx1ZToga2VuZHJhUzNSb2xlLnJvbGVBcm4sXHJcbiAgICAgICAgZGVzY3JpcHRpb246IGBLZW5kcmEgUzMgZGF0YSBzb3VyY2Ugcm9sZSBBUk4gZm9yIHN0YWNrICR7Y2RrLlN0YWNrLm9mKHRoaXMpLnN0YWNrTmFtZX1gXHJcbiAgICB9KTtcclxuICAgICAgXHJcbiAgICB0aGlzLmZlZWRiYWNrQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChzY29wZSwgJ0ZlZWRiYWNrRG93bmxvYWRCdWNrZXQnLCB7XHJcbiAgICAgIC8vIGJ1Y2tldE5hbWU6ICdmZWVkYmFjay1kb3dubG9hZCcsXHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5LTVNfTUFOQUdFRCxcclxuICAgICAgc2VydmVyQWNjZXNzTG9nc0J1Y2tldDogbG9nZ2luZ0J1Y2tldCxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXHJcbiAgICAgIGNvcnM6IFt7XHJcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsczMuSHR0cE1ldGhvZHMuUE9TVCxzMy5IdHRwTWV0aG9kcy5QVVQsczMuSHR0cE1ldGhvZHMuREVMRVRFXSxcclxuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIFxyXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdICAgICBcclxuICAgICAgfV0sXHJcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmV2YWxSZXN1bHRzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChzY29wZSwgJ0V2YWxSZXN1bHRzQnVja2V0Jywge1xyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TX01BTkFHRUQsXHJcbiAgICAgIHNlcnZlckFjY2Vzc0xvZ3NCdWNrZXQ6IGxvZ2dpbmdCdWNrZXQsXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgICBjb3JzOiBbe1xyXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULHMzLkh0dHBNZXRob2RzLlBPU1QsczMuSHR0cE1ldGhvZHMuUFVULHMzLkh0dHBNZXRob2RzLkRFTEVURV0sXHJcbiAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLCBcclxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXSAgICAgXHJcbiAgICAgIH1dLCAgICAgXHJcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsIFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5ldmFsVGVzdENhc2VzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChzY29wZSwgJ0V2YWxUZXN0Q2FzZXNCdWNrZXQnLCB7XHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgZW5jcnlwdGlvbjogczMuQnVja2V0RW5jcnlwdGlvbi5LTVNfTUFOQUdFRCxcclxuICAgICAgc2VydmVyQWNjZXNzTG9nc0J1Y2tldDogbG9nZ2luZ0J1Y2tldCxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXHJcbiAgICAgIGNvcnM6IFt7XHJcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsczMuSHR0cE1ldGhvZHMuUE9TVCxzMy5IdHRwTWV0aG9kcy5QVVQsczMuSHR0cE1ldGhvZHMuREVMRVRFXSxcclxuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIFxyXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdICAgICBcclxuICAgICAgfV0sXHJcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnJhZ2FzRGVwZW5kZW5jaWVzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChzY29wZSwgJ1JhZ2FzRGVwZW5kZW5jaWVzQnVja2V0Jywge1xyXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGVuY3J5cHRpb246IHMzLkJ1Y2tldEVuY3J5cHRpb24uS01TX01BTkFHRUQsXHJcbiAgICAgIHNlcnZlckFjY2Vzc0xvZ3NCdWNrZXQ6IGxvZ2dpbmdCdWNrZXQsXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiB0cnVlLFxyXG4gICAgICBjb3JzOiBbe1xyXG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULHMzLkh0dHBNZXRob2RzLlBPU1QsczMuSHR0cE1ldGhvZHMuUFVULHMzLkh0dHBNZXRob2RzLkRFTEVURV0sXHJcbiAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLCBcclxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXSAgICAgXHJcbiAgICAgIH1dLFxyXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgfSk7XHJcbiAgICBcclxuICAgIC8vIEFkZCBTMyBldmVudCBzZWxlY3RvcnMgdG8gdGhlIENsb3VkVHJhaWwgICAgICAgIFxyXG4gICAgZGF0YUV2ZW50VHJhaWwubG9nQWxsUzNEYXRhRXZlbnRzKHtpbmNsdWRlTWFuYWdlbWVudEV2ZW50czogZmFsc2V9KTtcclxuICB9XHJcbn1cclxuIl19