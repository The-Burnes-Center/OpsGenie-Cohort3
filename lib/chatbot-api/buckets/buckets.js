"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3BucketStack = void 0;
const cdk = require("aws-cdk-lib");
const s3 = require("aws-cdk-lib/aws-s3");
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

        // Add a policy to allow public read access to the S3 bucket
        kendraBucket.addToResourcePolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            principals: [new iam.AnyPrincipal()],
            actions: ['s3:GetObject'],             
            resources: [`${kendraBucket.bucketArn}/*`] 
        }));


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
    }
}
exports.S3BucketStack = S3BucketStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVja2V0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJ1Y2tldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHlDQUF5QztBQUd6QyxNQUFhLGFBQWMsU0FBUSxHQUFHLENBQUMsS0FBSztJQUkxQyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHlCQUF5QjtRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLEVBQUU7WUFDN0Qsa0NBQWtDO1lBQ2xDLFNBQVMsRUFBRSxJQUFJO1lBQ2YsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztZQUN4QyxpQkFBaUIsRUFBRSxJQUFJO1lBQ3ZCLElBQUksRUFBRSxDQUFDO29CQUNMLGNBQWMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxFQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDO29CQUNqRyxjQUFjLEVBQUUsQ0FBQyxHQUFHLENBQUM7b0JBQ3JCLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztpQkFDdEIsQ0FBQztTQUNILENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSx3QkFBd0IsRUFBRTtZQUNuRSxtQ0FBbUM7WUFDbkMsU0FBUyxFQUFFLElBQUk7WUFDZixhQUFhLEVBQUUsR0FBRyxDQUFDLGFBQWEsQ0FBQyxPQUFPO1lBQ3hDLGlCQUFpQixFQUFFLElBQUk7WUFDdkIsSUFBSSxFQUFFLENBQUM7b0JBQ0wsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUM7b0JBQ2pHLGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQztvQkFDckIsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO2lCQUN0QixDQUFDO1NBQ0gsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBaENELHNDQWdDQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcblxuZXhwb3J0IGNsYXNzIFMzQnVja2V0U3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkga2VuZHJhQnVja2V0OiBzMy5CdWNrZXQ7XG4gIHB1YmxpYyByZWFkb25seSBmZWVkYmFja0J1Y2tldDogczMuQnVja2V0O1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIENyZWF0ZSBhIG5ldyBTMyBidWNrZXRcbiAgICB0aGlzLmtlbmRyYUJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQoc2NvcGUsICdLZW5kcmFTb3VyY2VCdWNrZXQnLCB7XG4gICAgICAvLyBidWNrZXROYW1lOiAna2VuZHJhLXMzLXNvdXJjZScsXG4gICAgICB2ZXJzaW9uZWQ6IHRydWUsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgICBjb3JzOiBbe1xuICAgICAgICBhbGxvd2VkTWV0aG9kczogW3MzLkh0dHBNZXRob2RzLkdFVCxzMy5IdHRwTWV0aG9kcy5QT1NULHMzLkh0dHBNZXRob2RzLlBVVCxzMy5IdHRwTWV0aG9kcy5ERUxFVEVdLFxuICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sICAgICAgXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdXG4gICAgICB9XVxuICAgIH0pO1xuXG4gICAgdGhpcy5mZWVkYmFja0J1Y2tldCA9IG5ldyBzMy5CdWNrZXQoc2NvcGUsICdGZWVkYmFja0Rvd25sb2FkQnVja2V0Jywge1xuICAgICAgLy8gYnVja2V0TmFtZTogJ2ZlZWRiYWNrLWRvd25sb2FkJyxcbiAgICAgIHZlcnNpb25lZDogdHJ1ZSxcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogdHJ1ZSxcbiAgICAgIGNvcnM6IFt7XG4gICAgICAgIGFsbG93ZWRNZXRob2RzOiBbczMuSHR0cE1ldGhvZHMuR0VULHMzLkh0dHBNZXRob2RzLlBPU1QsczMuSHR0cE1ldGhvZHMuUFVULHMzLkh0dHBNZXRob2RzLkRFTEVURV0sXG4gICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgXG4gICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbXCIqXCJdICAgICBcbiAgICAgIH1dXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==