import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as cdk from 'aws-cdk-lib';
import * as events from 'aws-cdk-lib/aws-events';

export interface BackupStackProps extends StackProps {
  readonly dynamoTables: string[];
}

export class BackupStack extends Stack {
  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    const stackName = Stack.of(this).stackName;

    // Create a backup vault
    const backupVault = new backup.BackupVault(this, 'DynamoDBBackupVault', {
      backupVaultName: `${stackName}-dynamodb-backup-vault`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create a backup plan
    const backupPlan = new backup.BackupPlan(this, 'DynamoDBBackupPlan', {
      backupPlanName: `${stackName}-dynamodb-fedramp-compliance-plan`,
      backupVault: backupVault,
    });

    // Add daily backup rule
    backupPlan.addRule(new backup.BackupPlanRule({
      ruleName: `${stackName}-daily-backup`,
      completionWindow: cdk.Duration.hours(2),
      startWindow: cdk.Duration.hours(1),
      scheduleExpression: events.Schedule.cron({ 
        minute: '0',
        hour: '5',
        day: '*',
        month: '*',
        year: '*'
      }),
      deleteAfter: cdk.Duration.days(30),
    }));

    // Add weekly backup rule
    backupPlan.addRule(new backup.BackupPlanRule({
      ruleName: `${stackName}-weekly-backup`,
      completionWindow: cdk.Duration.hours(2),
      startWindow: cdk.Duration.hours(1),
      scheduleExpression: events.Schedule.cron({ 
        minute: '0',
        hour: '5',
        day: '?',
        month: '*',
        year: '*',
        weekDay: 'SUN'
      }),
      deleteAfter: cdk.Duration.days(90),
    }));

    // Add monthly backup rule
    backupPlan.addRule(new backup.BackupPlanRule({
      ruleName: `${stackName}-monthly-backup`,
      completionWindow: cdk.Duration.hours(2),
      startWindow: cdk.Duration.hours(1),
      scheduleExpression: events.Schedule.cron({ 
        minute: '0',
        hour: '5',
        day: '1',
        month: '*',
        year: '*'
      }),
      deleteAfter: cdk.Duration.days(365),
    }));

    // Create backup selection
    new backup.BackupSelection(this, 'DynamoDBBackupSelection', {
      backupPlan: backupPlan,
      backupSelectionName: `${stackName}-dynamodb-tables-selection`,
      resources: props.dynamoTables.map(tableArn => 
        backup.BackupResource.fromArn(tableArn)
      ),
    });
  }
} 