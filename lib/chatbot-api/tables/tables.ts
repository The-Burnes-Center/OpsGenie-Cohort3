import { Stack, StackProps, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Attribute, AttributeType, Table, ProjectionType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';

export class TableStack extends Stack {
  public readonly historyTable : Table;
  public readonly feedbackTable : Table;
  public readonly evalResultsTable : Table;
  public readonly evalSummaryTable : Table;
  public readonly kpiLogsTable : Table;
  public readonly dailyLoginTable : Table;
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Define the chat history table with auto-scaling
    const chatHistoryTable = new Table(scope, 'ChatHistoryTable', {
      partitionKey: { name: 'user_id', type: AttributeType.STRING },
      sortKey: { name: 'session_id', type: AttributeType.STRING },
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Add FedRAMP compliance tags
    Tags.of(chatHistoryTable).add('BackupRequired', 'true');
    Tags.of(chatHistoryTable).add('Environment', 'Production');
    Tags.of(chatHistoryTable).add('ComplianceLevel', 'FedRAMP');
    Tags.of(chatHistoryTable).add('DataClassification', 'Sensitive');

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
      partitionKey: { name: 'user_id', type: AttributeType.STRING },
      sortKey: { name: 'time_stamp', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
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

    // Define the user feedback table with auto-scaling
    const userFeedbackTable = new Table(scope, 'UserFeedbackTable', {
      partitionKey: { name: 'Topic', type: AttributeType.STRING },
      sortKey: { name: 'CreatedAt', type: AttributeType.STRING },
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Add FedRAMP compliance tags
    Tags.of(userFeedbackTable).add('BackupRequired', 'true');
    Tags.of(userFeedbackTable).add('Environment', 'Production');
    Tags.of(userFeedbackTable).add('ComplianceLevel', 'FedRAMP');
    Tags.of(userFeedbackTable).add('DataClassification', 'Sensitive');

    // Add autoscaling for main table
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

    // Add a global secondary index to UserFeedbackTable with partition key CreatedAt
    userFeedbackTable.addGlobalSecondaryIndex({
      indexName: 'CreatedAtIndex',
      partitionKey: { name: 'CreatedAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
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
      partitionKey: { name: 'Any', type: AttributeType.STRING },
      sortKey: { name: 'CreatedAt', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
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
    
    const evalSummariesTable = new Table(scope, 'EvaluationSummariesTable', {
      partitionKey: { name: 'PartitionKey', type: AttributeType.STRING },
      sortKey: { name: 'Timestamp', type: AttributeType.STRING },
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Add FedRAMP compliance tags
    Tags.of(evalSummariesTable).add('BackupRequired', 'true');
    Tags.of(evalSummariesTable).add('Environment', 'Production');
    Tags.of(evalSummariesTable).add('ComplianceLevel', 'FedRAMP');
    Tags.of(evalSummariesTable).add('DataClassification', 'Sensitive');

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

    const evalResultsTable = new Table(scope, 'EvaluationResultsTable', {
      partitionKey: { name: 'EvaluationId', type: AttributeType.STRING },
      sortKey: { name: 'QuestionId', type: AttributeType.STRING },
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Add FedRAMP compliance tags
    Tags.of(evalResultsTable).add('BackupRequired', 'true');
    Tags.of(evalResultsTable).add('Environment', 'Production');
    Tags.of(evalResultsTable).add('ComplianceLevel', 'FedRAMP');
    Tags.of(evalResultsTable).add('DataClassification', 'Sensitive');

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
      partitionKey: { name: 'EvaluationId', type: AttributeType.STRING },
      sortKey: { name: 'QuestionId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
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

    const kpiLogsTable = new Table(scope, 'KPILogsTable', {
      partitionKey: { name: 'Username', type: AttributeType.STRING },
      sortKey: { name: 'Timestamp', type: AttributeType.STRING },
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Add FedRAMP compliance tags
    Tags.of(kpiLogsTable).add('BackupRequired', 'true');
    Tags.of(kpiLogsTable).add('Environment', 'Production');
    Tags.of(kpiLogsTable).add('ComplianceLevel', 'FedRAMP');
    Tags.of(kpiLogsTable).add('DataClassification', 'Sensitive');

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

    const dailyLoginTable = new Table(scope, 'DailyLoginTable', {
      partitionKey: { name: 'Timestamp', type: AttributeType.STRING },
      billingMode: BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Add FedRAMP compliance tags
    Tags.of(dailyLoginTable).add('BackupRequired', 'true');
    Tags.of(dailyLoginTable).add('Environment', 'Production');
    Tags.of(dailyLoginTable).add('ComplianceLevel', 'FedRAMP');
    Tags.of(dailyLoginTable).add('DataClassification', 'Sensitive');

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
