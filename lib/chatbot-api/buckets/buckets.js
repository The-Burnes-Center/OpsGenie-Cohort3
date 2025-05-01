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
class S3BucketStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Create a new S3 bucket
        this.kendraBucket = new s3.Bucket(scope, 'KendraSourceBucket', {
            // bucketName: 'kendra-s3-source',
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }]
        });
        this.feedbackBucket = new s3.Bucket(scope, 'FeedbackDownloadBucket', {
            // bucketName: 'feedback-download',
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }]
        });
        this.evalResultsBucket = new s3.Bucket(scope, 'EvalResultsBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }]
        });
        this.evalTestCasesBucket = new s3.Bucket(scope, 'EvalTestCasesBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }]
        });
        this.ragasDependenciesBucket = new s3.Bucket(scope, 'RagasDependenciesBucket', {
            versioned: true,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
            cors: [{
                    allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT, s3.HttpMethods.DELETE],
                    allowedOrigins: ['*'],
                    allowedHeaders: ["*"]
                }]
        });
    }
}
exports.S3BucketStack = S3BucketStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVja2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJ1Y2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsdURBQXlDO0FBSXpDLE1BQWEsYUFBYyxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBTzFDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIseUJBQXlCO1FBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxvQkFBb0IsRUFBRTtZQUM3RCxrQ0FBa0M7WUFDbEMsU0FBUyxFQUFFLElBQUk7WUFDZixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsSUFBSSxFQUFFLENBQUM7b0JBQ0wsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7b0JBQ2pHLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUN0QixDQUFDO1NBQ0gsQ0FBQyxDQUFDO1FBR0gsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLHdCQUF3QixFQUFFO1lBQ25FLG1DQUFtQztZQUNuQyxTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixJQUFJLEVBQUUsQ0FBQztvQkFDTCxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztvQkFDakcsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ3RCLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxtQkFBbUIsRUFBRTtZQUNqRSxTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixJQUFJLEVBQUUsQ0FBQztvQkFDTCxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztvQkFDakcsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ3RCLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxxQkFBcUIsRUFBRTtZQUNyRSxTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixJQUFJLEVBQUUsQ0FBQztvQkFDTCxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztvQkFDakcsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ3RCLENBQUM7U0FDSCxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSx5QkFBeUIsRUFBRTtZQUM3RSxTQUFTLEVBQUUsSUFBSTtZQUNmLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtZQUN2QixJQUFJLEVBQUUsQ0FBQztvQkFDTCxjQUFjLEVBQUUsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLElBQUksRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBQyxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQztvQkFDakcsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7aUJBQ3RCLENBQUM7U0FDSCxDQUFDLENBQUM7SUFFTCxDQUFDO0NBQ0Y7QUF0RUQsc0NBc0VDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgczMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJztcclxuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tIFwiY29uc3RydWN0c1wiO1xyXG5cclxuZXhwb3J0IGNsYXNzIFMzQnVja2V0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xyXG4gIHB1YmxpYyByZWFkb25seSBrZW5kcmFCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZmVlZGJhY2tCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZXZhbFJlc3VsdHNCdWNrZXQ6IHMzLkJ1Y2tldDtcclxuICBwdWJsaWMgcmVhZG9ubHkgZXZhbFRlc3RDYXNlc0J1Y2tldDogczMuQnVja2V0O1xyXG4gIHB1YmxpYyByZWFkb25seSByYWdhc0RlcGVuZGVuY2llc0J1Y2tldDogczMuQnVja2V0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcclxuXHJcbiAgICAvLyBDcmVhdGUgYSBuZXcgUzMgYnVja2V0XHJcbiAgICB0aGlzLmtlbmRyYUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQoc2NvcGUsICdLZW5kcmFTb3VyY2VCdWNrZXQnLCB7XHJcbiAgICAgIC8vIGJ1Y2tldE5hbWU6ICdrZW5kcmEtczMtc291cmNlJyxcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgICAgY29yczogW3tcclxuICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCxzMy5IdHRwTWV0aG9kcy5QT1NULHMzLkh0dHBNZXRob2RzLlBVVCxzMy5IdHRwTWV0aG9kcy5ERUxFVEVdLFxyXG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgICAgICBcclxuICAgICAgICBhbGxvd2VkSGVhZGVyczogW1wiKlwiXVxyXG4gICAgICB9XVxyXG4gICAgfSk7XHJcblxyXG4gICAgICBcclxuICAgIHRoaXMuZmVlZGJhY2tCdWNrZXQgPSBuZXcgczMuQnVja2V0KHNjb3BlLCAnRmVlZGJhY2tEb3dubG9hZEJ1Y2tldCcsIHtcclxuICAgICAgLy8gYnVja2V0TmFtZTogJ2ZlZWRiYWNrLWRvd25sb2FkJyxcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgICAgY29yczogW3tcclxuICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCxzMy5IdHRwTWV0aG9kcy5QT1NULHMzLkh0dHBNZXRob2RzLlBVVCxzMy5IdHRwTWV0aG9kcy5ERUxFVEVdLFxyXG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgXHJcbiAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFtcIipcIl0gICAgIFxyXG4gICAgICB9XVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5ldmFsUmVzdWx0c0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQoc2NvcGUsICdFdmFsUmVzdWx0c0J1Y2tldCcsIHtcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcclxuICAgICAgY29yczogW3tcclxuICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCxzMy5IdHRwTWV0aG9kcy5QT1NULHMzLkh0dHBNZXRob2RzLlBVVCxzMy5IdHRwTWV0aG9kcy5ERUxFVEVdLFxyXG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgXHJcbiAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFtcIipcIl0gICAgIFxyXG4gICAgICB9XVxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5ldmFsVGVzdENhc2VzQnVja2V0ID0gbmV3IHMzLkJ1Y2tldChzY29wZSwgJ0V2YWxUZXN0Q2FzZXNCdWNrZXQnLCB7XHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXHJcbiAgICAgIGNvcnM6IFt7XHJcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsczMuSHR0cE1ldGhvZHMuUE9TVCxzMy5IdHRwTWV0aG9kcy5QVVQsczMuSHR0cE1ldGhvZHMuREVMRVRFXSxcclxuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIFxyXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdICAgICBcclxuICAgICAgfV1cclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMucmFnYXNEZXBlbmRlbmNpZXNCdWNrZXQgPSBuZXcgczMuQnVja2V0KHNjb3BlLCAnUmFnYXNEZXBlbmRlbmNpZXNCdWNrZXQnLCB7XHJcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXHJcbiAgICAgIGNvcnM6IFt7XHJcbiAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtzMy5IdHRwTWV0aG9kcy5HRVQsczMuSHR0cE1ldGhvZHMuUE9TVCxzMy5IdHRwTWV0aG9kcy5QVVQsczMuSHR0cE1ldGhvZHMuREVMRVRFXSxcclxuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIFxyXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdICAgICBcclxuICAgICAgfV1cclxuICAgIH0pO1xyXG5cclxuICB9XHJcbn1cclxuIl19