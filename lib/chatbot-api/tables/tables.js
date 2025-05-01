"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
class TableStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Define the table
        const chatHistoryTable = new aws_dynamodb_1.Table(scope, 'ChatHistoryTable', {
            partitionKey: { name: 'user_id', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'session_id', type: aws_dynamodb_1.AttributeType.STRING },
        });
        // Add a global secondary index to sort ChatHistoryTable by time_stamp
        chatHistoryTable.addGlobalSecondaryIndex({
            indexName: 'TimeIndex',
            partitionKey: { name: 'user_id', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'time_stamp', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        this.historyTable = chatHistoryTable;
        // Define the second table (UserFeedbackTable)
        const userFeedbackTable = new aws_dynamodb_1.Table(scope, 'UserFeedbackTable', {
            partitionKey: { name: 'Topic', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
        });
        // Add a global secondary index to UserFeedbackTable with partition key CreatedAt
        userFeedbackTable.addGlobalSecondaryIndex({
            indexName: 'CreatedAtIndex',
            partitionKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        userFeedbackTable.addGlobalSecondaryIndex({
            indexName: 'AnyIndex',
            partitionKey: { name: 'Any', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'CreatedAt', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        this.feedbackTable = userFeedbackTable;
        const evalSummariesTable = new aws_dynamodb_1.Table(scope, 'EvaluationSummariesTable', {
            partitionKey: { name: 'PartitionKey', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'Timestamp', type: aws_dynamodb_1.AttributeType.STRING },
        });
        this.evalSummaryTable = evalSummariesTable;
        const evalResultsTable = new aws_dynamodb_1.Table(scope, 'EvaluationResultsTable', {
            partitionKey: { name: 'EvaluationId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'QuestionId', type: aws_dynamodb_1.AttributeType.STRING },
        });
        // add secondary index to sort EvaluationResultsTable by Question ID
        evalResultsTable.addGlobalSecondaryIndex({
            indexName: 'QuestionIndex',
            partitionKey: { name: 'EvaluationId', type: aws_dynamodb_1.AttributeType.STRING },
            sortKey: { name: 'QuestionId', type: aws_dynamodb_1.AttributeType.STRING },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        this.evalResultsTable = evalResultsTable;
    }
}
exports.TableStack = TableStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFibGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDZDQUFnRDtBQUVoRCwyREFBMkY7QUFFM0YsTUFBYSxVQUFXLFNBQVEsbUJBQUs7SUFLbkMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFrQjtRQUMxRCxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixtQkFBbUI7UUFDbkIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLG9CQUFLLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFO1lBQzVELFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzdELE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1NBQzVELENBQUMsQ0FBQztRQUVILHNFQUFzRTtRQUN0RSxnQkFBZ0IsQ0FBQyx1QkFBdUIsQ0FBQztZQUN2QyxTQUFTLEVBQUUsV0FBVztZQUN0QixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUM3RCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUMzRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxZQUFZLEdBQUcsZ0JBQWdCLENBQUM7UUFFckMsOENBQThDO1FBQzlDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxvQkFBSyxDQUFDLEtBQUssRUFBRSxtQkFBbUIsRUFBRTtZQUM5RCxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUMzRCxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtTQUMzRCxDQUFDLENBQUM7UUFFSCxpRkFBaUY7UUFDakYsaUJBQWlCLENBQUMsdUJBQXVCLENBQUM7WUFDeEMsU0FBUyxFQUFFLGdCQUFnQjtZQUMzQixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUMvRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQztRQUVILGlCQUFpQixDQUFDLHVCQUF1QixDQUFDO1lBQ3hDLFNBQVMsRUFBRSxVQUFVO1lBQ3JCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3pELE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTSxFQUFFO1lBQzFELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGFBQWEsR0FBRyxpQkFBaUIsQ0FBQztRQUV2QyxNQUFNLGtCQUFrQixHQUFHLElBQUksb0JBQUssQ0FBQyxLQUFLLEVBQUUsMEJBQTBCLEVBQUU7WUFDdEUsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDbEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDM0QsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDO1FBRTNDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxvQkFBSyxDQUFDLEtBQUssRUFBRSx3QkFBd0IsRUFBRTtZQUNsRSxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsY0FBYyxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtZQUNsRSxPQUFPLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU0sRUFBRTtTQUM1RCxDQUFDLENBQUM7UUFDSCxvRUFBb0U7UUFDcEUsZ0JBQWdCLENBQUMsdUJBQXVCLENBQUM7WUFDdkMsU0FBUyxFQUFFLGVBQWU7WUFDMUIsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDbEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDM0QsY0FBYyxFQUFFLDZCQUFjLENBQUMsR0FBRztTQUNuQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZ0JBQWdCLENBQUM7SUFFM0MsQ0FBQztDQUNGO0FBbEVELGdDQWtFQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgQXR0cmlidXRlLCBBdHRyaWJ1dGVUeXBlLCBUYWJsZSwgUHJvamVjdGlvblR5cGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5cclxuZXhwb3J0IGNsYXNzIFRhYmxlU3RhY2sgZXh0ZW5kcyBTdGFjayB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGhpc3RvcnlUYWJsZSA6IFRhYmxlO1xyXG4gIHB1YmxpYyByZWFkb25seSBmZWVkYmFja1RhYmxlIDogVGFibGU7XHJcbiAgcHVibGljIHJlYWRvbmx5IGV2YWxSZXN1bHRzVGFibGUgOiBUYWJsZTtcclxuICBwdWJsaWMgcmVhZG9ubHkgZXZhbFN1bW1hcnlUYWJsZSA6IFRhYmxlO1xyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogU3RhY2tQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XHJcblxyXG4gICAgLy8gRGVmaW5lIHRoZSB0YWJsZVxyXG4gICAgY29uc3QgY2hhdEhpc3RvcnlUYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgJ0NoYXRIaXN0b3J5VGFibGUnLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcl9pZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3Nlc3Npb25faWQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGEgZ2xvYmFsIHNlY29uZGFyeSBpbmRleCB0byBzb3J0IENoYXRIaXN0b3J5VGFibGUgYnkgdGltZV9zdGFtcFxyXG4gICAgY2hhdEhpc3RvcnlUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ1RpbWVJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcl9pZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ3RpbWVfc3RhbXAnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdGhpcy5oaXN0b3J5VGFibGUgPSBjaGF0SGlzdG9yeVRhYmxlO1xyXG5cclxuICAgIC8vIERlZmluZSB0aGUgc2Vjb25kIHRhYmxlIChVc2VyRmVlZGJhY2tUYWJsZSlcclxuICAgIGNvbnN0IHVzZXJGZWVkYmFja1RhYmxlID0gbmV3IFRhYmxlKHNjb3BlLCAnVXNlckZlZWRiYWNrVGFibGUnLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnVG9waWMnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGEgZ2xvYmFsIHNlY29uZGFyeSBpbmRleCB0byBVc2VyRmVlZGJhY2tUYWJsZSB3aXRoIHBhcnRpdGlvbiBrZXkgQ3JlYXRlZEF0XHJcbiAgICB1c2VyRmVlZGJhY2tUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0NyZWF0ZWRBdEluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdDcmVhdGVkQXQnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSk7XHJcblxyXG4gICAgdXNlckZlZWRiYWNrVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdBbnlJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnQW55JywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnQ3JlYXRlZEF0JywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuZmVlZGJhY2tUYWJsZSA9IHVzZXJGZWVkYmFja1RhYmxlOyAgXHJcbiAgICBcclxuICAgIGNvbnN0IGV2YWxTdW1tYXJpZXNUYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgJ0V2YWx1YXRpb25TdW1tYXJpZXNUYWJsZScsIHtcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdQYXJ0aXRpb25LZXknLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBzb3J0S2V5OiB7IG5hbWU6ICdUaW1lc3RhbXAnLCB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgfSk7XHJcbiAgICB0aGlzLmV2YWxTdW1tYXJ5VGFibGUgPSBldmFsU3VtbWFyaWVzVGFibGU7XHJcblxyXG4gICAgY29uc3QgZXZhbFJlc3VsdHNUYWJsZSA9IG5ldyBUYWJsZShzY29wZSwgJ0V2YWx1YXRpb25SZXN1bHRzVGFibGUnLCB7XHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnRXZhbHVhdGlvbklkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnUXVlc3Rpb25JZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICB9KTtcclxuICAgIC8vIGFkZCBzZWNvbmRhcnkgaW5kZXggdG8gc29ydCBFdmFsdWF0aW9uUmVzdWx0c1RhYmxlIGJ5IFF1ZXN0aW9uIElEXHJcbiAgICBldmFsUmVzdWx0c1RhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnUXVlc3Rpb25JbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnRXZhbHVhdGlvbklkJywgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnUXVlc3Rpb25JZCcsIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBQcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuICAgIHRoaXMuZXZhbFJlc3VsdHNUYWJsZSA9IGV2YWxSZXN1bHRzVGFibGU7XHJcblxyXG4gIH1cclxufVxyXG4iXX0=