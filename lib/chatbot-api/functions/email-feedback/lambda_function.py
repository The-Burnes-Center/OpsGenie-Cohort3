import json
import boto3
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('the table')  # Replace with your actual table name

def lambda_handler(event, context):
    # calculate time range
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    
    now_str = now.strftime('%Y-%m-%dT%H:%M:%SZ')
    seven_days_ago_str = seven_days_ago.strftime('%Y-%m-%dT%H:%M:%SZ')

    # Query the table for feedback within the last 7 days
    try:
        response = table.query(
            FilterExpression="timestamp BETWEEN :start AND :end",
            ExpressionAttributeValues={
                ":start": seven_days_ago_str,
                ":end": now_str
            }
        )
        
        feedback_items = response.get('Items', [])
        print(f"Found {len(feedback_items)} feedback entries.")
        print(feedback_items)

        return {
            'statusCode': 200,
            'body': json.dumps(feedback_items)
        }

    except Exception as e:
        print(f"Error fetching feedback: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Error fetching feedback from DynamoDB')
        }