import json
import os
import boto3
import nodemailer
from datetime import datetime, timedelta

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(os.environ.get('FEEDBACK_TABLE'))
admin_emails = os.environ.get('ADMIN_EMAILS').split(' ')

transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    "user": os.environ.get('SENDER_EMAIL'),
    "pass": os.environ.get('SENDER_PASSWORD'),
  },
});

def lambda_handler(event, context):
    # calculate time range
    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    
    now_str = now.strftime('%Y-%m-%dT%H:%M:%SZ')
    seven_days_ago_str = seven_days_ago.strftime('%Y-%m-%dT%H:%M:%SZ')

    # Query the table for feedback within the last 7 days
    try:
        response = table.scan(
            FilterExpression="CreatedAt BETWEEN :start AND :end",
            ExpressionAttributeValues={
                ":start": seven_days_ago_str,
                ":end": now_str
            }
        )
        
        feedback_items = response.get('Items', [])
        print(f"Found {len(feedback_items)} feedback entries.")
        
        if feedback_items:
            # Prepare the feedback data to send in the email
            feedback_text = "\n\n".join(
                [f"User: {item.get('UserId', 'N/A')}, Feedback: {item.get('Feedback', 'N/A')}, Date: {item.get('CreatedAt', 'N/A')}" for item in feedback_items]
            )
            send_email(feedback_items, now)
        #print(feedback_items)

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
        
def send_email(feedback_data, timestamp):
    """
    Sends an email with the feedback data to the admin list.
    """
    readable_time = datetime.utcnow().strftime('%b. %d, %Y %H:%M')
    subject = f"Weekly Feedback Report - {readable_time}"
    body = f"Here is the feedback collected in the past 7 days:\n\n{feedback_data}"
    
    mailOptions = {
        'from': os.environ.get('SENDER_EMAIL'),
        'to': admin_emails,
        'subject': subject,
        'text': body
    }
    # Send an email to each admin
    try:
        transporter.sendMail(mailOptions)
        print(f"Email sent!")
    except Exception as e:
        print(f"Error sending email: {e}")