import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cloudwatchActions from 'aws-cdk-lib/aws-cloudwatch-actions';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';

export interface CloudWatchAlarmsStackProps {
  readonly lambdaFunctions: lambda.Function[];
  readonly dynamoTables: dynamodb.Table[];
  readonly restApiId?: string;
  readonly websocketApiId?: string;
}

export class CloudWatchAlarmsStack extends Construct {
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: CloudWatchAlarmsStackProps) {
    super(scope, id);

    const stackName = Stack.of(this).stackName;

    // Create SNS topic for alarm notifications (FedRAMP compliance requirement)
    this.alarmTopic = new sns.Topic(this, 'AlarmNotificationTopic', {
      topicName: `${stackName}-fedramp-compliance-alarms`,
      displayName: 'FedRAMP Compliance Alarm Notifications',
    });

    // Add email subscription (you can customize this)
    this.alarmTopic.addSubscription(
      new snsSubscriptions.EmailSubscription('itops-admin@example.com') // Replace with your admin email
    );

    // Create alarms for Lambda functions
    props.lambdaFunctions.forEach((lambdaFunction, index) => {
      this.createLambdaAlarms(lambdaFunction, index);
    });

    // Create alarms for DynamoDB tables
    props.dynamoTables.forEach((table, index) => {
      this.createDynamoDBAlarms(table, index);
    });

    // Create API Gateway alarms if provided
    if (props.restApiId) {
      this.createApiGatewayAlarms(props.restApiId, 'REST');
    }

    if (props.websocketApiId) {
      this.createApiGatewayAlarms(props.websocketApiId, 'WebSocket');
    }

    // Add CloudFormation output for the SNS topic ARN
    new cdk.CfnOutput(this, 'AlarmTopicARN', {
      value: this.alarmTopic.topicArn,
      description: 'The ARN of the alarm topic',
    });
  }

  private createLambdaAlarms(lambdaFunction: lambda.Function, index: number): void {
    const functionName = lambdaFunction.functionName;

    // Lambda Error Rate Alarm
    const errorRateAlarm = new cloudwatch.Alarm(this, `LambdaErrorRateAlarm-${index}`, {
      alarmName: `${functionName}-HighErrorRate`,
      alarmDescription: `High error rate detected for Lambda function ${functionName}`,
      metric: lambdaFunction.metricErrors({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5, // More than 5 errors in 5 minutes
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    // Add actions for all states (FedRAMP compliance)
    errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    errorRateAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    errorRateAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Lambda Duration Alarm
    const durationAlarm = new cloudwatch.Alarm(this, `LambdaDurationAlarm-${index}`, {
      alarmName: `${functionName}-HighDuration`,
      alarmDescription: `High duration detected for Lambda function ${functionName}`,
      metric: lambdaFunction.metricDuration({
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: lambdaFunction.timeout ? lambdaFunction.timeout.toMilliseconds() * 0.8 : 240000, // 80% of timeout or 4 minutes
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    durationAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    durationAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    durationAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // Lambda Throttles Alarm
    const throttleAlarm = new cloudwatch.Alarm(this, `LambdaThrottleAlarm-${index}`, {
      alarmName: `${functionName}-Throttles`,
      alarmDescription: `Throttles detected for Lambda function ${functionName}`,
      metric: lambdaFunction.metricThrottles({
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 1, // Any throttles
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    throttleAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    throttleAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    throttleAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));
  }

  private createDynamoDBAlarms(table: dynamodb.Table, index: number): void {
    const tableName = table.tableName;

    // DynamoDB Throttled Requests Alarm
    const throttledRequestsAlarm = new cloudwatch.Alarm(this, `DynamoDBThrottledRequestsAlarm-${index}`, {
      alarmName: `${tableName}-ThrottledRequests`,
      alarmDescription: `Throttled requests detected for DynamoDB table ${tableName}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'SystemErrors',
        dimensionsMap: {
          TableName: tableName,
        },
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 1, // Any system errors
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    throttledRequestsAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    throttledRequestsAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    throttledRequestsAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // DynamoDB High Error Rate Alarm
    const errorRateAlarm = new cloudwatch.Alarm(this, `DynamoDBErrorRateAlarm-${index}`, {
      alarmName: `${tableName}-HighErrorRate`,
      alarmDescription: `High error rate detected for DynamoDB table ${tableName}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'UserErrors',
        dimensionsMap: {
          TableName: tableName,
        },
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10, // More than 10 user errors in 5 minutes
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    errorRateAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    errorRateAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    errorRateAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // DynamoDB Read/Write Capacity Utilization Alarms
    const readCapacityAlarm = new cloudwatch.Alarm(this, `DynamoDBReadCapacityAlarm-${index}`, {
      alarmName: `${tableName}-HighReadCapacityUtilization`,
      alarmDescription: `High read capacity utilization for DynamoDB table ${tableName}`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/DynamoDB',
        metricName: 'ConsumedReadCapacityUnits',
        dimensionsMap: {
          TableName: tableName,
        },
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 240, // 80% of 5 minutes * 60 seconds = 300 capacity units
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    readCapacityAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    readCapacityAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    readCapacityAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));
  }

  private createApiGatewayAlarms(apiId: string, apiType: string): void {
    // API Gateway 4XX Error Rate Alarm
    const clientErrorAlarm = new cloudwatch.Alarm(this, `ApiGateway4XXErrorAlarm-${apiType}`, {
      alarmName: `${apiType}-API-High4XXErrors`,
      alarmDescription: `High 4XX error rate detected for ${apiType} API Gateway`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '4XXError',
        dimensionsMap: {
          ApiId: apiId,
        },
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 10, // More than 10 4XX errors in 5 minutes
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    clientErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    clientErrorAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    clientErrorAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // API Gateway 5XX Error Rate Alarm
    const serverErrorAlarm = new cloudwatch.Alarm(this, `ApiGateway5XXErrorAlarm-${apiType}`, {
      alarmName: `${apiType}-API-High5XXErrors`,
      alarmDescription: `High 5XX error rate detected for ${apiType} API Gateway`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: '5XXError',
        dimensionsMap: {
          ApiId: apiId,
        },
        period: Duration.minutes(5),
        statistic: 'Sum',
      }),
      threshold: 5, // More than 5 5XX errors in 5 minutes
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    serverErrorAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    serverErrorAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    serverErrorAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));

    // API Gateway Latency Alarm
    const latencyAlarm = new cloudwatch.Alarm(this, `ApiGatewayLatencyAlarm-${apiType}`, {
      alarmName: `${apiType}-API-HighLatency`,
      alarmDescription: `High latency detected for ${apiType} API Gateway`,
      metric: new cloudwatch.Metric({
        namespace: 'AWS/ApiGateway',
        metricName: 'Latency',
        dimensionsMap: {
          ApiId: apiId,
        },
        period: Duration.minutes(5),
        statistic: 'Average',
      }),
      threshold: 10000, // 10 seconds
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    latencyAlarm.addAlarmAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    latencyAlarm.addOkAction(new cloudwatchActions.SnsAction(this.alarmTopic));
    latencyAlarm.addInsufficientDataAction(new cloudwatchActions.SnsAction(this.alarmTopic));
  }
} 