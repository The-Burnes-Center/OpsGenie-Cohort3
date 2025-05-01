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
exports.KendraIndexStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const kendra = __importStar(require("aws-cdk-lib/aws-kendra"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const constants_1 = require("../../constants");
class KendraIndexStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id);
        const kendraIndexRole = new iam.Role(scope, 'KendraIndexRole', {
            assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
        });
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [
                `arn:aws:s3:::${props.s3Bucket.bucketName}`,
                `arn:aws:s3:::${props.s3Bucket.bucketName}/*`,
            ],
        }));
        // Add the CloudWatch permissions
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cloudwatch:PutMetricData'],
            resources: ['*'],
            conditions: {
                StringEquals: {
                    'cloudwatch:namespace': 'AWS/Kendra',
                },
            },
        }));
        // Add the CloudWatch Logs permissions
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:DescribeLogGroups'],
            resources: ['*'],
        }));
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:CreateLogGroup'],
            resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/kendra/*`],
        }));
        kendraIndexRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['logs:DescribeLogStreams', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/kendra/*:log-stream:*`],
        }));
        // Create a new Kendra index
        const index = new kendra.CfnIndex(scope, 'KendraIndex', {
            name: constants_1.kendraIndexName,
            roleArn: kendraIndexRole.roleArn,
            description: 'Gen AI Chatbot Kendra Index',
            edition: 'DEVELOPER_EDITION',
        });
        const kendraDataSourceRole = new iam.Role(scope, 'KendraDataSourceRole', {
            assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
        });
        kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
            actions: ['s3:GetObject', 's3:ListBucket'],
            resources: [
                `arn:aws:s3:::${props.s3Bucket.bucketName}`,
                `arn:aws:s3:::${props.s3Bucket.bucketName}/*`,
            ],
        }));
        kendraDataSourceRole.addToPolicy(new iam.PolicyStatement({
            actions: ["kendra:BatchPutDocument", "kendra:BatchDeleteDocument"],
            resources: [
                index.attrArn
            ],
        }));
        // Use the provided S3 bucket for the data source and FAQ
        const dataSource = new kendra.CfnDataSource(scope, 'KendraS3DataSource', {
            indexId: index.attrId,
            name: 's3-source',
            type: 'S3',
            roleArn: kendraDataSourceRole.roleArn,
            dataSourceConfiguration: {
                s3Configuration: {
                    bucketName: props.s3Bucket.bucketName,
                },
            }
        });
        dataSource.addDependency(index);
        this.kendraIndex = index;
        this.kendraSource = dataSource;
    }
}
exports.KendraIndexStack = KendraIndexStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2VuZHJhLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsia2VuZHJhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLCtEQUFpRDtBQUVqRCx5REFBMkM7QUFFM0MsK0NBQWlEO0FBTWpELE1BQWEsZ0JBQWlCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFHN0MsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE0QjtRQUNwRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sZUFBZSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLEVBQUU7WUFDN0QsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDO1NBQzVELENBQUMsQ0FBQztRQUVILGVBQWUsQ0FBQyxXQUFXLENBQ3pCLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN0QixPQUFPLEVBQUUsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDO1lBQzFDLFNBQVMsRUFBRTtnQkFDVCxnQkFBZ0IsS0FBSyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUU7Z0JBQzNDLGdCQUFnQixLQUFLLENBQUMsUUFBUSxDQUFDLFVBQVUsSUFBSTthQUM5QztTQUNGLENBQUMsQ0FDSCxDQUFDO1FBR0YsaUNBQWlDO1FBQ2pDLGVBQWUsQ0FBQyxXQUFXLENBQ3pCLElBQUksR0FBRyxDQUFDLGVBQWUsQ0FBQztZQUN0QixNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLO1lBQ3hCLE9BQU8sRUFBRSxDQUFDLDBCQUEwQixDQUFDO1lBQ3JDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUNoQixVQUFVLEVBQUU7Z0JBQ1YsWUFBWSxFQUFFO29CQUNaLHNCQUFzQixFQUFFLFlBQVk7aUJBQ3JDO2FBQ0Y7U0FDRixDQUFDLENBQ0gs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Q0E2R0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBrZW5kcmEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWtlbmRyYSc7XHJcbmltcG9ydCAqIGFzIHMzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSBcImNvbnN0cnVjdHNcIjtcclxuaW1wb3J0IHsga2VuZHJhSW5kZXhOYW1lIH0gZnJvbSBcIi4uLy4uL2NvbnN0YW50c1wiXHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEtlbmRyYUluZGV4U3RhY2tQcm9wcyB7XHJcbiAgczNCdWNrZXQ6IHMzLkJ1Y2tldFxyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgS2VuZHJhSW5kZXhTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGtlbmRyYUluZGV4IDoga2VuZHJhLkNmbkluZGV4O1xyXG4gIHB1YmxpYyByZWFkb25seSBrZW5kcmFTb3VyY2UgOiBrZW5kcmEuQ2ZuRGF0YVNvdXJjZTtcclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogS2VuZHJhSW5kZXhTdGFja1Byb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IGtlbmRyYUluZGV4Um9sZSA9IG5ldyBpYW0uUm9sZShzY29wZSwgJ0tlbmRyYUluZGV4Um9sZScsIHtcclxuICAgICAgYXNzdW1lZEJ5OiBuZXcgaWFtLlNlcnZpY2VQcmluY2lwYWwoJ2tlbmRyYS5hbWF6b25hd3MuY29tJyksXHJcbiAgICB9KTtcclxuXHJcbiAgICBrZW5kcmFJbmRleFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBhY3Rpb25zOiBbJ3MzOkdldE9iamVjdCcsICdzMzpMaXN0QnVja2V0J10sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICBgYXJuOmF3czpzMzo6OiR7cHJvcHMuczNCdWNrZXQuYnVja2V0TmFtZX1gLFxyXG4gICAgICAgICAgYGFybjphd3M6czM6Ojoke3Byb3BzLnMzQnVja2V0LmJ1Y2tldE5hbWV9LypgLFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0pXHJcbiAgICApO1xyXG5cclxuXHJcbiAgICAvLyBBZGQgdGhlIENsb3VkV2F0Y2ggcGVybWlzc2lvbnNcclxuICAgIGtlbmRyYUluZGV4Um9sZS5hZGRUb1BvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YSddLFxyXG4gICAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICAgICAgY29uZGl0aW9uczoge1xyXG4gICAgICAgICAgU3RyaW5nRXF1YWxzOiB7XHJcbiAgICAgICAgICAgICdjbG91ZHdhdGNoOm5hbWVzcGFjZSc6ICdBV1MvS2VuZHJhJyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gQWRkIHRoZSBDbG91ZFdhdGNoIExvZ3MgcGVybWlzc2lvbnNcclxuICAgIGtlbmRyYUluZGV4Um9sZS5hZGRUb1BvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5BTExPVyxcclxuICAgICAgICBhY3Rpb25zOiBbJ2xvZ3M6RGVzY3JpYmVMb2dHcm91cHMnXSxcclxuICAgICAgICByZXNvdXJjZXM6IFsnKiddLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBrZW5kcmFJbmRleFJvbGUuYWRkVG9Qb2xpY3koXHJcbiAgICAgIG5ldyBpYW0uUG9saWN5U3RhdGVtZW50KHtcclxuICAgICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXHJcbiAgICAgICAgYWN0aW9uczogWydsb2dzOkNyZWF0ZUxvZ0dyb3VwJ10sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6bG9nczoke3RoaXMucmVnaW9ufToke3RoaXMuYWNjb3VudH06bG9nLWdyb3VwOi9hd3Mva2VuZHJhLypgXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAga2VuZHJhSW5kZXhSb2xlLmFkZFRvUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxyXG4gICAgICAgIGFjdGlvbnM6IFsnbG9nczpEZXNjcmliZUxvZ1N0cmVhbXMnLCAnbG9nczpDcmVhdGVMb2dTdHJlYW0nLCAnbG9nczpQdXRMb2dFdmVudHMnXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtgYXJuOmF3czpsb2dzOiR7dGhpcy5yZWdpb259OiR7dGhpcy5hY2NvdW50fTpsb2ctZ3JvdXA6L2F3cy9rZW5kcmEvKjpsb2ctc3RyZWFtOipgXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGEgbmV3IEtlbmRyYSBpbmRleFxyXG4gICAgY29uc3QgaW5kZXggPSBuZXcga2VuZHJhLkNmbkluZGV4KHNjb3BlLCAnS2VuZHJhSW5kZXgnLCB7XHJcbiAgICAgIG5hbWU6IGtlbmRyYUluZGV4TmFtZSxcclxuICAgICAgcm9sZUFybjoga2VuZHJhSW5kZXhSb2xlLnJvbGVBcm4sXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnR2VuIEFJIENoYXRib3QgS2VuZHJhIEluZGV4JyxcclxuICAgICAgZWRpdGlvbjogJ0RFVkVMT1BFUl9FRElUSU9OJyxcclxuICAgIH0pO1xyXG5cclxuXHJcbiAgICBjb25zdCBrZW5kcmFEYXRhU291cmNlUm9sZSA9IG5ldyBpYW0uUm9sZShzY29wZSwgJ0tlbmRyYURhdGFTb3VyY2VSb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgna2VuZHJhLmFtYXpvbmF3cy5jb20nKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGtlbmRyYURhdGFTb3VyY2VSb2xlLmFkZFRvUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgYWN0aW9uczogWydzMzpHZXRPYmplY3QnLCAnczM6TGlzdEJ1Y2tldCddLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgYGFybjphd3M6czM6Ojoke3Byb3BzLnMzQnVja2V0LmJ1Y2tldE5hbWV9YCxcclxuICAgICAgICAgIGBhcm46YXdzOnMzOjo6JHtwcm9wcy5zM0J1Y2tldC5idWNrZXROYW1lfS8qYCxcclxuICAgICAgICBdLFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICBrZW5kcmFEYXRhU291cmNlUm9sZS5hZGRUb1BvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGFjdGlvbnM6IFtcImtlbmRyYTpCYXRjaFB1dERvY3VtZW50XCIsIFwia2VuZHJhOkJhdGNoRGVsZXRlRG9jdW1lbnRcIl0sXHJcbiAgICAgICAgcmVzb3VyY2VzOiBbXHJcbiAgICAgICAgICBpbmRleC5hdHRyQXJuXHJcbiAgICAgICAgXSxcclxuICAgICAgfSlcclxuICAgICk7XHJcblxyXG5cclxuICAgIC8vIFVzZSB0aGUgcHJvdmlkZWQgUzMgYnVja2V0IGZvciB0aGUgZGF0YSBzb3VyY2UgYW5kIEZBUVxyXG4gICAgY29uc3QgZGF0YVNvdXJjZSA9IG5ldyBrZW5kcmEuQ2ZuRGF0YVNvdXJjZShzY29wZSwgJ0tlbmRyYVMzRGF0YVNvdXJjZScsIHtcclxuICAgICAgaW5kZXhJZDogaW5kZXguYXR0cklkLFxyXG4gICAgICBuYW1lOiAnczMtc291cmNlJyxcclxuICAgICAgdHlwZTogJ1MzJyxcclxuICAgICAgcm9sZUFybiA6IGtlbmRyYURhdGFTb3VyY2VSb2xlLnJvbGVBcm4sXHJcbiAgICAgIGRhdGFTb3VyY2VDb25maWd1cmF0aW9uOiB7XHJcbiAgICAgICAgczNDb25maWd1cmF0aW9uOiB7XHJcbiAgICAgICAgICBidWNrZXROYW1lOiBwcm9wcy5zM0J1Y2tldC5idWNrZXROYW1lLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgZGF0YVNvdXJjZS5hZGREZXBlbmRlbmN5KGluZGV4KTtcclxuICAgIHRoaXMua2VuZHJhSW5kZXggPSBpbmRleDtcclxuICAgIHRoaXMua2VuZHJhU291cmNlID0gZGF0YVNvdXJjZTtcclxuICB9XHJcbn1cclxuIl19