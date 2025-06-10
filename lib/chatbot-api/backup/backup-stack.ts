import { Stack, StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export interface BackupStackProps extends StackProps {
  readonly tables: dynamodb.Table[];
}

export class BackupStack extends Stack {
  constructor(scope: Construct, id: string, props: BackupStackProps) {
    super(scope, id, props);

    // Create a backup vault for storing backups
    const backupVault = new backup.BackupVault(this, 'DynamoDBBackupVault', {
      backupVaultName: 'dynamodb-backup-vault',
      encryptionKey: undefined, // Uses default AWS managed key
      accessPolicy: new iam.PolicyDocument({
        statements: [
          new iam.PolicyStatement({
            sid: 'BackupVaultAccess',
            effect: iam.Effect.ALLOW,
            principals: [new iam.ServicePrincipal('backup.amazonaws.com')],
            actions: [
              'backup:CopyIntoBackupVault',
              'backup:CreateBackupVault',
              'backup:DeleteBackupVault',
              'backup:DescribeBackupVault',
              'backup:GetBackupVaultAccessPolicy',
              'backup:GetBackupVaultNotifications',
              'backup:ListBackupVaults',
              'backup:PutBackupVaultAccessPolicy',
              'backup:PutBackupVaultNotifications'
            ],
            resources: ['*']
          })
        ]
      })
    });

    // Create an IAM role for AWS Backup service
    const backupRole = new iam.Role(this, 'BackupServiceRole', {
      assumedBy: new iam.ServicePrincipal('backup.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForBackup'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSBackupServiceRolePolicyForRestores'),
      ],
    });

    // Create backup plan for DynamoDB tables (FedRAMP compliant)
    const backupPlan = new backup.BackupPlan(this, 'DynamoDBBackupPlan', {
      backupPlanName: 'DynamoDB-FedRAMP-Compliance-Plan',
      backupVault: backupVault,
      backupPlanRules: [
        // Daily backup rule
        new backup.BackupPlanRule({
          ruleName: 'DailyBackup',
          scheduleExpression: backup.ScheduleExpression.cron({
            hour: '2',  // 2 AM UTC
            minute: '0',
            day: '*',
            month: '*',
            year: '*'
          }),
          startWindow: Duration.hours(1),
          completionWindow: Duration.hours(8),
          deleteAfter: Duration.days(35), // Retain for 35 days
          copyActions: []
        }),
        // Weekly backup rule for longer retention
        new backup.BackupPlanRule({
          ruleName: 'WeeklyBackup',
          scheduleExpression: backup.ScheduleExpression.cron({
            hour: '3',  // 3 AM UTC
            minute: '0',
            weekDay: 'SUN', // Sunday
          }),
          startWindow: Duration.hours(1),
          completionWindow: Duration.hours(8),
          deleteAfter: Duration.days(365), // Retain for 1 year
          copyActions: []
        }),
        // Monthly backup rule for compliance archival
        new backup.BackupPlanRule({
          ruleName: 'MonthlyBackup',
          scheduleExpression: backup.ScheduleExpression.cron({
            hour: '4',  // 4 AM UTC
            minute: '0',
            day: '1',   // First day of month
            month: '*',
            year: '*'
          }),
          startWindow: Duration.hours(1),
          completionWindow: Duration.hours(8),
          deleteAfter: Duration.days(2555), // Retain for 7 years (FedRAMP requirement)
          copyActions: []
        })
      ]
    });

    // Create backup selection to include all DynamoDB tables
    const tableArns = props.tables.map(table => table.tableArn);
    
    new backup.BackupSelection(this, 'DynamoDBBackupSelection', {
      backupPlan: backupPlan,
      backupSelectionName: 'DynamoDB-Tables-Selection',
      role: backupRole,
      resources: [
        ...tableArns.map(arn => backup.BackupResource.fromArn(arn))
      ],
      conditions: {
        stringEquals: {
          'aws:ResourceTag/BackupRequired': ['true']
        }
      }
    });

    // Tag all tables for backup selection
    props.tables.forEach((table, index) => {
      table.node.addMetadata('BackupRequired', 'true');
      
      // Add tags using L1 construct if available
      const cfnTable = table.node.defaultChild as dynamodb.CfnTable;
      if (cfnTable && cfnTable.tags) {
        cfnTable.tags.setTag('BackupRequired', 'true');
        cfnTable.tags.setTag('Environment', 'Production');
        cfnTable.tags.setTag('ComplianceLevel', 'FedRAMP');
      }
    });
  }
} 