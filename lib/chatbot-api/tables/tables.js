"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
class TableStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Define the chat history table with auto-scaling
        const chatHistoryTable = new aws_dynamodb_1.Table(scope, 'ChatHistoryTable', {
            partitionKey: { name: 'user_id', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'session_id', type: aws_dynamodb_1.AttributeType.STRING },
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add FedRAMP compliance tags
        aws_cdk_lib_1.Tags.of(chatHistoryTable).add('BackupRequired', 'true');
        aws_cdk_lib_1.Tags.of(chatHistoryTable).add('Environment', 'Production');
        aws_cdk_lib_1.Tags.of(chatHistoryTable).add('ComplianceLevel', 'FedRAMP');
        aws_cdk_lib_1.Tags.of(chatHistoryTable).add('DataClassification', 'Sensitive');
        // Add autoscaling for main table
        chatHistoryTable.autoScaleReadCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        chatHistoryTable.autoScaleWriteCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        // Add a global secondary index to sort ChatHistoryTable by time_stamp
        chatHistoryTable.addGlobalSecondaryIndex({
            indexName: 'TimeIndex',
            partitionKey: { name: 'user_id', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'time_stamp', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add autoscaling for TimeIndex GSI
        chatHistoryTable.autoScaleGlobalSecondaryIndexReadCapacity('TimeIndex', {
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        chatHistoryTable.autoScaleGlobalSecondaryIndexWriteCapacity('TimeIndex', {
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        this.historyTable = chatHistoryTable;
        // User feedback table (keeping original structure)
        const userFeedbackTable = new aws_dynamodb_1.Table(scope, 'UserFeedbackTable', {
            partitionKey: { name: 'Topic', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add FedRAMP compliance tags
        aws_cdk_lib_1.Tags.of(userFeedbackTable).add('BackupRequired', 'true');
        aws_cdk_lib_1.Tags.of(userFeedbackTable).add('Environment', 'Production');
        aws_cdk_lib_1.Tags.of(userFeedbackTable).add('ComplianceLevel', 'FedRAMP');
        aws_cdk_lib_1.Tags.of(userFeedbackTable).add('DataClassification', 'Sensitive');
        // Add autoscaling for user feedback table
        userFeedbackTable.autoScaleReadCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        userFeedbackTable.autoScaleWriteCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        userFeedbackTable.addGlobalSecondaryIndex({
            indexName: 'CreatedAtIndex',
            partitionKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add autoscaling for CreatedAtIndex GSI
        userFeedbackTable.autoScaleGlobalSecondaryIndexReadCapacity('CreatedAtIndex', {
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        userFeedbackTable.autoScaleGlobalSecondaryIndexWriteCapacity('CreatedAtIndex', {
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        userFeedbackTable.addGlobalSecondaryIndex({
            indexName: 'AnyIndex',
            partitionKey: { name: 'Any', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add autoscaling for AnyIndex GSI
        userFeedbackTable.autoScaleGlobalSecondaryIndexReadCapacity('AnyIndex', {
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        userFeedbackTable.autoScaleGlobalSecondaryIndexWriteCapacity('AnyIndex', {
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        this.feedbackTable = userFeedbackTable;
        const evalSummariesTable = new aws_dynamodb_1.Table(scope, 'EvaluationSummariesTable', {
            partitionKey: { name: 'PartitionKey', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'Timestamp', type: aws_dynamodb_1.AttributeType.STRING },
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add FedRAMP compliance tags
        aws_cdk_lib_1.Tags.of(evalSummariesTable).add('BackupRequired', 'true');
        aws_cdk_lib_1.Tags.of(evalSummariesTable).add('Environment', 'Production');
        aws_cdk_lib_1.Tags.of(evalSummariesTable).add('ComplianceLevel', 'FedRAMP');
        aws_cdk_lib_1.Tags.of(evalSummariesTable).add('DataClassification', 'Sensitive');
        // Add autoscaling for evaluation summaries table
        evalSummariesTable.autoScaleReadCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        evalSummariesTable.autoScaleWriteCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        this.evalSummaryTable = evalSummariesTable;
        const evalResultsTable = new aws_dynamodb_1.Table(scope, 'EvaluationResultsTable', {
            partitionKey: { name: 'EvaluationId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'QuestionId', type: aws_dynamodb_1.AttributeType.STRING },
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add FedRAMP compliance tags
        aws_cdk_lib_1.Tags.of(evalResultsTable).add('BackupRequired', 'true');
        aws_cdk_lib_1.Tags.of(evalResultsTable).add('Environment', 'Production');
        aws_cdk_lib_1.Tags.of(evalResultsTable).add('ComplianceLevel', 'FedRAMP');
        aws_cdk_lib_1.Tags.of(evalResultsTable).add('DataClassification', 'Sensitive');
        // Add autoscaling for evaluation results table
        evalResultsTable.autoScaleReadCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        evalResultsTable.autoScaleWriteCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        // add secondary index to sort EvaluationResultsTable by Question ID
        evalResultsTable.addGlobalSecondaryIndex({
            indexName: 'QuestionIndex',
            partitionKey: { name: 'EvaluationId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'QuestionId', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add autoscaling for QuestionIndex GSI
        evalResultsTable.autoScaleGlobalSecondaryIndexReadCapacity('QuestionIndex', {
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        evalResultsTable.autoScaleGlobalSecondaryIndexWriteCapacity('QuestionIndex', {
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        this.evalResultsTable = evalResultsTable;
        const kpiLogsTable = new aws_dynamodb_1.Table(scope, 'KPILogsTable', {
            partitionKey: { name: 'Username', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'Timestamp', type: aws_dynamodb_1.AttributeType.STRING },
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add FedRAMP compliance tags
        aws_cdk_lib_1.Tags.of(kpiLogsTable).add('BackupRequired', 'true');
        aws_cdk_lib_1.Tags.of(kpiLogsTable).add('Environment', 'Production');
        aws_cdk_lib_1.Tags.of(kpiLogsTable).add('ComplianceLevel', 'FedRAMP');
        aws_cdk_lib_1.Tags.of(kpiLogsTable).add('DataClassification', 'Sensitive');
        // Add autoscaling for KPI logs table
        kpiLogsTable.autoScaleReadCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        kpiLogsTable.autoScaleWriteCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        const dailyLoginTable = new aws_dynamodb_1.Table(scope, 'DailyLoginTable', {
            partitionKey: { name: 'Timestamp', type: aws_dynamodb_1.AttributeType.STRING },
            billingMode: aws_dynamodb_1.BillingMode.PROVISIONED,
            readCapacity: 5,
            writeCapacity: 5,
        });
        // Add FedRAMP compliance tags
        aws_cdk_lib_1.Tags.of(dailyLoginTable).add('BackupRequired', 'true');
        aws_cdk_lib_1.Tags.of(dailyLoginTable).add('Environment', 'Production');
        aws_cdk_lib_1.Tags.of(dailyLoginTable).add('ComplianceLevel', 'FedRAMP');
        aws_cdk_lib_1.Tags.of(dailyLoginTable).add('DataClassification', 'Sensitive');
        // Add autoscaling for daily login table
        dailyLoginTable.autoScaleReadCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        dailyLoginTable.autoScaleWriteCapacity({
            minCapacity: 5,
            maxCapacity: 100,
        }).scaleOnUtilization({
            targetUtilizationPercent: 70,
        });
        this.kpiLogsTable = kpiLogsTable;
        this.dailyLoginTable = dailyLoginTable;
    }
}
exports.TableStack = TableStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFzRDtBQUV0RCwyREFBd0c7QUFFeEcsTUFBYSxVQUFXLFNBQVEsbUJBQUs7SUFRbkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQjtRQUMxRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixrREFBa0Q7UUFDbEQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLG9CQUFLLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFO1lBQzVELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzdELE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzNELFdBQVcsRUFBRSwwQkFBVyxDQUFDLFdBQVc7WUFDcEMsWUFBWSxFQUFFLENBQUM7WUFDZixhQUFhLEVBQUUsQ0FBQztTQUNqQixDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsa0JBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDeEQsa0JBQUksQ0FBQyxFQUFFLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsYUFBYSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQzNELGtCQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzVELGtCQUFJLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLENBQUMsR0FBRyxDQUFDLG9CQUFvQixFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWpFLGlDQUFpQztRQUNqQyxn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QXdCLEVBQUUsRUFBRTtTQUM3QixDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztJQUN6QyxDQUFDO0NBQ0Y7QUF0U0QsZ0NBc1NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMsIFRhZ3MgfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBBdHRyaWJ1dGUsIEF0dHJpYnV0ZVR5cGUsIFRhYmxlLCBQcm9qZWN0aW9uVHlwZSwgQmlsbGluZ01vZGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRhYmxlU3RhY2sgZXh0ZW5kcyBTdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGhpc3RvcnlUYWJsZSA6IFRhYmxlO1xyXG4gIHB1YmxpYyByZWFkb25seSBmZWVkYmFja1RhYmxlIDogVGFibGU7XHJcbiAgcHVibGljIHJlYWRvbmx5IGV2YWxSZXN1bHRzVGFibGUgOiBUYWJsZTtcclxuICBwdWJsaWMgcmVhZG9ubHkgZXZhbFN1bW1hcnlUYWJsZSA6IFRhYmxlO1xyXG4gIHB1YmxpYyByZWFkb25seSBrcGlMb2dzVGFibGUgOiBUYWJsZTtcclxuICBwdWJsaWMgcmVhZG9ubHkgZGFpbHlMb2dpblRhYmxlIDogVGFibGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLy8gRGVmaW5lIHRoZSBjaGF0IGhpc3RvcnkgdGFibGUgd2l0aCBhdXRvLXNjYWxpbmdcclxuICAgIGNvbnN0IGNoYXRIaXN0b3J5VGFibGUgPSBuZXcgVGFibGUoc2NvcGUsICdDaGF0SGlzdG9yeVRhYmxlJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3VzZXJfaWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdzZXNzaW9uX2lkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IEJpbGxpbmdNb2RlLlBST1ZJU0lPTkVELFxyXG4gICAgICByZWFkQ2FwYWNpdHk6IDUsXHJcbiAgICAgIHdyaXRlQ2FwYWNpdHk6IDUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgRmVkUkFNUCBjb21wbGlhbmNlIHRhZ3NcclxuICAgIFRhZ3Mub2YoY2hhdEhpc3RvcnlUYWJsZSkuYWRkKCdCYWNrdXBSZXF1aXJlZCcsICd0cnVlJyk7XHJcbiAgICBUYWdzLm9mKGNoYXRIaXN0b3J5VGFibGUpLmFkZCgnRW52aXJvbm1lbnQnLCAnUHJvZHVjdGlvbicpO1xyXG4gICAgVGFncy5vZihjaGF0SGlzdG9yeVRhYmxlKS5hZGQoJ0NvbXBsaWFuY2VMZXZlbCcsICdGZWRSQU1QJyk7XHJcbiAgICBUYWdzLm9mKGNoYXRIaXN0b3J5VGFibGUpLmFkZCgnRGF0YUNsYXNzaWZpY2F0aW9uJywgJ1NlbnNpdGl2ZScpO1xyXG5cclxuICAgIC8vIEFkZCBhdXRvc2NhbGluZyBmb3IgbWFpbiB0YWJsZVxyXG4gICAgY2hhdEhpc3RvcnlUYWJsZS5hdXRvU2NhbGVSZWFkQ2FwYWNpdHkoe1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjaGF0SGlzdG9yeVRhYmxlLmF1dG9TY2FsZVdyaXRlQ2FwYWNpdHkoe1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYSBnbG9iYWwgc2Vjb25kYXJ5IGluZGV4IHRvIHNvcnQgQ2hhdEhpc3RvcnlUYWJsZSBieSB0aW1lX3N0YW1wXHJcbiAgICBjaGF0SGlzdG9yeVRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnVGltZUluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VyX2lkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAndGltZV9zdGFtcCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBQcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICAgIHJlYWRDYXBhY2l0eTogNSxcclxuICAgICAgd3JpdGVDYXBhY2l0eTogNSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBhdXRvc2NhbGluZyBmb3IgVGltZUluZGV4IEdTSVxyXG4gICAgY2hhdEhpc3RvcnlUYWJsZS5hdXRvU2NhbGVHbG9iYWxTZWNvbmRhcnlJbmRleFJlYWRDYXBhY2l0eSgnVGltZUluZGV4Jywge1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBjaGF0SGlzdG9yeVRhYmxlLmF1dG9TY2FsZUdsb2JhbFNlY29uZGFyeUluZGV4V3JpdGVDYXBhY2l0eSgnVGltZUluZGV4Jywge1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmhpc3RvcnlUYWJsZSA9IGNoYXRIaXN0b3J5VGFibGU7XHJcblxyXG4gICAgLy8gVXNlciBmZWVkYmFjayB0YWJsZSAoa2VlcGluZyBvcmlnaW5hbCBzdHJ1Y3R1cmUpXHJcbiAgICBjb25zdCB1c2VyRmVlZGJhY2tUYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgJ1VzZXJGZWVkYmFja1RhYmxlJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1RvcGljJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnQ3JlYXRlZEF0JywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IEJpbGxpbmdNb2RlLlBST1ZJU0lPTkVELFxyXG4gICAgICByZWFkQ2FwYWNpdHk6IDUsXHJcbiAgICAgIHdyaXRlQ2FwYWNpdHk6IDUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgRmVkUkFNUCBjb21wbGlhbmNlIHRhZ3NcclxuICAgIFRhZ3Mub2YodXNlckZlZWRiYWNrVGFibGUpLmFkZCgnQmFja3VwUmVxdWlyZWQnLCAndHJ1ZScpO1xyXG4gICAgVGFncy5vZih1c2VyRmVlZGJhY2tUYWJsZSkuYWRkKCdFbnZpcm9ubWVudCcsICdQcm9kdWN0aW9uJyk7XHJcbiAgICBUYWdzLm9mKHVzZXJGZWVkYmFja1RhYmxlKS5hZGQoJ0NvbXBsaWFuY2VMZXZlbCcsICdGZWRSQU1QJyk7XHJcbiAgICBUYWdzLm9mKHVzZXJGZWVkYmFja1RhYmxlKS5hZGQoJ0RhdGFDbGFzc2lmaWNhdGlvbicsICdTZW5zaXRpdmUnKTtcclxuXHJcbiAgICAvLyBBZGQgYXV0b3NjYWxpbmcgZm9yIHVzZXIgZmVlZGJhY2sgdGFibGVcclxuICAgIHVzZXJGZWVkYmFja1RhYmxlLmF1dG9TY2FsZVJlYWRDYXBhY2l0eSh7XHJcbiAgICAgIG1pbkNhcGFjaXR5OiA1LFxyXG4gICAgICBtYXhDYXBhY2l0eTogMTAwLFxyXG4gICAgfSkuc2NhbGVPblV0aWxpemF0aW9uKHtcclxuICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcclxuICAgIH0pO1xyXG5cclxuICAgIHVzZXJGZWVkYmFja1RhYmxlLmF1dG9TY2FsZVdyaXRlQ2FwYWNpdHkoe1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICB1c2VyRmVlZGJhY2tUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0NyZWF0ZWRBdEluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgICByZWFkQ2FwYWNpdHk6IDUsXHJcbiAgICAgIHdyaXRlQ2FwYWNpdHk6IDUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYXV0b3NjYWxpbmcgZm9yIENyZWF0ZWRBdEluZGV4IEdTSVxyXG4gICAgdXNlckZlZWRiYWNrVGFibGUuYXV0b1NjYWxlR2xvYmFsU2Vjb25kYXJ5SW5kZXhSZWFkQ2FwYWNpdHkoJ0NyZWF0ZWRBdEluZGV4Jywge1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICB1c2VyRmVlZGJhY2tUYWJsZS5hdXRvU2NhbGVHbG9iYWxTZWNvbmRhcnlJbmRleFdyaXRlQ2FwYWNpdHkoJ0NyZWF0ZWRBdEluZGV4Jywge1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICB1c2VyRmVlZGJhY2tUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0FueUluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdBbnknLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgICByZWFkQ2FwYWNpdHk6IDUsXHJcbiAgICAgIHdyaXRlQ2FwYWNpdHk6IDUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgYXV0b3NjYWxpbmcgZm9yIEFueUluZGV4IEdTSVxyXG4gICAgdXNlckZlZWRiYWNrVGFibGUuYXV0b1NjYWxlR2xvYmFsU2Vjb25kYXJ5SW5kZXhSZWFkQ2FwYWNpdHkoJ0FueUluZGV4Jywge1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICB1c2VyRmVlZGJhY2tUYWJsZS5hdXRvU2NhbGVHbG9iYWxTZWNvbmRhcnlJbmRleFdyaXRlQ2FwYWNpdHkoJ0FueUluZGV4Jywge1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLmZlZWRiYWNrVGFibGUgPSB1c2VyRmVlZGJhY2tUYWJsZTsgIFxyXG4gICAgXHJcbiAgICBjb25zdCBldmFsU3VtbWFyaWVzVGFibGUgPSBuZXcgVGFibGUoc2NvcGUsICdFdmFsdWF0aW9uU3VtbWFyaWVzVGFibGUnLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnUGFydGl0aW9uS2V5JywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnVGltZXN0YW1wJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IEJpbGxpbmdNb2RlLlBST1ZJU0lPTkVELFxyXG4gICAgICByZWFkQ2FwYWNpdHk6IDUsXHJcbiAgICAgIHdyaXRlQ2FwYWNpdHk6IDUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgRmVkUkFNUCBjb21wbGlhbmNlIHRhZ3NcclxuICAgIFRhZ3Mub2YoZXZhbFN1bW1hcmllc1RhYmxlKS5hZGQoJ0JhY2t1cFJlcXVpcmVkJywgJ3RydWUnKTtcclxuICAgIFRhZ3Mub2YoZXZhbFN1bW1hcmllc1RhYmxlKS5hZGQoJ0Vudmlyb25tZW50JywgJ1Byb2R1Y3Rpb24nKTtcclxuICAgIFRhZ3Mub2YoZXZhbFN1bW1hcmllc1RhYmxlKS5hZGQoJ0NvbXBsaWFuY2VMZXZlbCcsICdGZWRSQU1QJyk7XHJcbiAgICBUYWdzLm9mKGV2YWxTdW1tYXJpZXNUYWJsZSkuYWRkKCdEYXRhQ2xhc3NpZmljYXRpb24nLCAnU2Vuc2l0aXZlJyk7XHJcblxyXG4gICAgLy8gQWRkIGF1dG9zY2FsaW5nIGZvciBldmFsdWF0aW9uIHN1bW1hcmllcyB0YWJsZVxyXG4gICAgZXZhbFN1bW1hcmllc1RhYmxlLmF1dG9TY2FsZVJlYWRDYXBhY2l0eSh7XHJcbiAgICAgIG1pbkNhcGFjaXR5OiA1LFxyXG4gICAgICBtYXhDYXBhY2l0eTogMTAwLFxyXG4gICAgfSkuc2NhbGVPblV0aWxpemF0aW9uKHtcclxuICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcclxuICAgIH0pO1xyXG5cclxuICAgIGV2YWxTdW1tYXJpZXNUYWJsZS5hdXRvU2NhbGVXcml0ZUNhcGFjaXR5KHtcclxuICAgICAgbWluQ2FwYWNpdHk6IDUsXHJcbiAgICAgIG1heENhcGFjaXR5OiAxMDAsXHJcbiAgICB9KS5zY2FsZU9uVXRpbGl6YXRpb24oe1xyXG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5ldmFsU3VtbWFyeVRhYmxlID0gZXZhbFN1bW1hcmllc1RhYmxlO1xyXG5cclxuICAgIGNvbnN0IGV2YWxSZXN1bHRzVGFibGUgPSBuZXcgVGFibGUoc2NvcGUsICdFdmFsdWF0aW9uUmVzdWx0c1RhYmxlJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ0V2YWx1YXRpb25JZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ1F1ZXN0aW9uSWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogQmlsbGluZ01vZGUuUFJPVklTSU9ORUQsXHJcbiAgICAgIHJlYWRDYXBhY2l0eTogNSxcclxuICAgICAgd3JpdGVDYXBhY2l0eTogNSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBGZWRSQU1QIGNvbXBsaWFuY2UgdGFnc1xyXG4gICAgVGFncy5vZihldmFsUmVzdWx0c1RhYmxlKS5hZGQoJ0JhY2t1cFJlcXVpcmVkJywgJ3RydWUnKTtcclxuICAgIFRhZ3Mub2YoZXZhbFJlc3VsdHNUYWJsZSkuYWRkKCdFbnZpcm9ubWVudCcsICdQcm9kdWN0aW9uJyk7XHJcbiAgICBUYWdzLm9mKGV2YWxSZXN1bHRzVGFibGUpLmFkZCgnQ29tcGxpYW5jZUxldmVsJywgJ0ZlZFJBTVAnKTtcclxuICAgIFRhZ3Mub2YoZXZhbFJlc3VsdHNUYWJsZSkuYWRkKCdEYXRhQ2xhc3NpZmljYXRpb24nLCAnU2Vuc2l0aXZlJyk7XHJcblxyXG4gICAgLy8gQWRkIGF1dG9zY2FsaW5nIGZvciBldmFsdWF0aW9uIHJlc3VsdHMgdGFibGVcclxuICAgIGV2YWxSZXN1bHRzVGFibGUuYXV0b1NjYWxlUmVhZENhcGFjaXR5KHtcclxuICAgICAgbWluQ2FwYWNpdHk6IDUsXHJcbiAgICAgIG1heENhcGFjaXR5OiAxMDAsXHJcbiAgICB9KS5zY2FsZU9uVXRpbGl6YXRpb24oe1xyXG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgZXZhbFJlc3VsdHNUYWJsZS5hdXRvU2NhbGVXcml0ZUNhcGFjaXR5KHtcclxuICAgICAgbWluQ2FwYWNpdHk6IDUsXHJcbiAgICAgIG1heENhcGFjaXR5OiAxMDAsXHJcbiAgICB9KS5zY2FsZU9uVXRpbGl6YXRpb24oe1xyXG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gYWRkIHNlY29uZGFyeSBpbmRleCB0byBzb3J0IEV2YWx1YXRpb25SZXN1bHRzVGFibGUgYnkgUXVlc3Rpb24gSURcclxuICAgIGV2YWxSZXN1bHRzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdRdWVzdGlvbkluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdFdmFsdWF0aW9uSWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdRdWVzdGlvbklkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgICAgcmVhZENhcGFjaXR5OiA1LFxyXG4gICAgICB3cml0ZUNhcGFjaXR5OiA1LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGF1dG9zY2FsaW5nIGZvciBRdWVzdGlvbkluZGV4IEdTSVxyXG4gICAgZXZhbFJlc3VsdHNUYWJsZS5hdXRvU2NhbGVHbG9iYWxTZWNvbmRhcnlJbmRleFJlYWRDYXBhY2l0eSgnUXVlc3Rpb25JbmRleCcsIHtcclxuICAgICAgbWluQ2FwYWNpdHk6IDUsXHJcbiAgICAgIG1heENhcGFjaXR5OiAxMDAsXHJcbiAgICB9KS5zY2FsZU9uVXRpbGl6YXRpb24oe1xyXG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgZXZhbFJlc3VsdHNUYWJsZS5hdXRvU2NhbGVHbG9iYWxTZWNvbmRhcnlJbmRleFdyaXRlQ2FwYWNpdHkoJ1F1ZXN0aW9uSW5kZXgnLCB7XHJcbiAgICAgIG1pbkNhcGFjaXR5OiA1LFxyXG4gICAgICBtYXhDYXBhY2l0eTogMTAwLFxyXG4gICAgfSkuc2NhbGVPblV0aWxpemF0aW9uKHtcclxuICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuZXZhbFJlc3VsdHNUYWJsZSA9IGV2YWxSZXN1bHRzVGFibGU7XHJcblxyXG4gICAgY29uc3Qga3BpTG9nc1RhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCAnS1BJTG9nc1RhYmxlJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1VzZXJuYW1lJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnVGltZXN0YW1wJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IEJpbGxpbmdNb2RlLlBST1ZJU0lPTkVELFxyXG4gICAgICByZWFkQ2FwYWNpdHk6IDUsXHJcbiAgICAgIHdyaXRlQ2FwYWNpdHk6IDUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBZGQgRmVkUkFNUCBjb21wbGlhbmNlIHRhZ3NcclxuICAgIFRhZ3Mub2Yoa3BpTG9nc1RhYmxlKS5hZGQoJ0JhY2t1cFJlcXVpcmVkJywgJ3RydWUnKTtcclxuICAgIFRhZ3Mub2Yoa3BpTG9nc1RhYmxlKS5hZGQoJ0Vudmlyb25tZW50JywgJ1Byb2R1Y3Rpb24nKTtcclxuICAgIFRhZ3Mub2Yoa3BpTG9nc1RhYmxlKS5hZGQoJ0NvbXBsaWFuY2VMZXZlbCcsICdGZWRSQU1QJyk7XHJcbiAgICBUYWdzLm9mKGtwaUxvZ3NUYWJsZSkuYWRkKCdEYXRhQ2xhc3NpZmljYXRpb24nLCAnU2Vuc2l0aXZlJyk7XHJcblxyXG4gICAgLy8gQWRkIGF1dG9zY2FsaW5nIGZvciBLUEkgbG9ncyB0YWJsZVxyXG4gICAga3BpTG9nc1RhYmxlLmF1dG9TY2FsZVJlYWRDYXBhY2l0eSh7XHJcbiAgICAgIG1pbkNhcGFjaXR5OiA1LFxyXG4gICAgICBtYXhDYXBhY2l0eTogMTAwLFxyXG4gICAgfSkuc2NhbGVPblV0aWxpemF0aW9uKHtcclxuICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcclxuICAgIH0pO1xyXG5cclxuICAgIGtwaUxvZ3NUYWJsZS5hdXRvU2NhbGVXcml0ZUNhcGFjaXR5KHtcclxuICAgICAgbWluQ2FwYWNpdHk6IDUsXHJcbiAgICAgIG1heENhcGFjaXR5OiAxMDAsXHJcbiAgICB9KS5zY2FsZU9uVXRpbGl6YXRpb24oe1xyXG4gICAgICB0YXJnZXRVdGlsaXphdGlvblBlcmNlbnQ6IDcwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgZGFpbHlMb2dpblRhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCAnRGFpbHlMb2dpblRhYmxlJywge1xyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ1RpbWVzdGFtcCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBCaWxsaW5nTW9kZS5QUk9WSVNJT05FRCxcclxuICAgICAgcmVhZENhcGFjaXR5OiA1LFxyXG4gICAgICB3cml0ZUNhcGFjaXR5OiA1LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEZlZFJBTVAgY29tcGxpYW5jZSB0YWdzXHJcbiAgICBUYWdzLm9mKGRhaWx5TG9naW5UYWJsZSkuYWRkKCdCYWNrdXBSZXF1aXJlZCcsICd0cnVlJyk7XHJcbiAgICBUYWdzLm9mKGRhaWx5TG9naW5UYWJsZSkuYWRkKCdFbnZpcm9ubWVudCcsICdQcm9kdWN0aW9uJyk7XHJcbiAgICBUYWdzLm9mKGRhaWx5TG9naW5UYWJsZSkuYWRkKCdDb21wbGlhbmNlTGV2ZWwnLCAnRmVkUkFNUCcpO1xyXG4gICAgVGFncy5vZihkYWlseUxvZ2luVGFibGUpLmFkZCgnRGF0YUNsYXNzaWZpY2F0aW9uJywgJ1NlbnNpdGl2ZScpO1xyXG5cclxuICAgIC8vIEFkZCBhdXRvc2NhbGluZyBmb3IgZGFpbHkgbG9naW4gdGFibGVcclxuICAgIGRhaWx5TG9naW5UYWJsZS5hdXRvU2NhbGVSZWFkQ2FwYWNpdHkoe1xyXG4gICAgICBtaW5DYXBhY2l0eTogNSxcclxuICAgICAgbWF4Q2FwYWNpdHk6IDEwMCxcclxuICAgIH0pLnNjYWxlT25VdGlsaXphdGlvbih7XHJcbiAgICAgIHRhcmdldFV0aWxpemF0aW9uUGVyY2VudDogNzAsXHJcbiAgICB9KTtcclxuXHJcbiAgICBkYWlseUxvZ2luVGFibGUuYXV0b1NjYWxlV3JpdGVDYXBhY2l0eSh7XHJcbiAgICAgIG1pbkNhcGFjaXR5OiA1LFxyXG4gICAgICBtYXhDYXBhY2l0eTogMTAwLFxyXG4gICAgfSkuc2NhbGVPblV0aWxpemF0aW9uKHtcclxuICAgICAgdGFyZ2V0VXRpbGl6YXRpb25QZXJjZW50OiA3MCxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMua3BpTG9nc1RhYmxlID0ga3BpTG9nc1RhYmxlO1xyXG4gICAgdGhpcy5kYWlseUxvZ2luVGFibGUgPSBkYWlseUxvZ2luVGFibGU7XHJcbiAgfVxyXG59XHJcbiJdfQ==