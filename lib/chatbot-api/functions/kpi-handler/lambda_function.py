"""
Purpose: Lambda functions to deal with requests surrounding KPIs (currently just chatbot uses/interctions)

Overview:
This file provides an AWS Lambda function designed to handle HTTP requests for managing KPIs in a DynamoDB table. 
It supports operations for posting, retrieving, downloading, and deleting KPIs. Admin users can access all functionalities, while non-admins have limited permissions.

Environment variables:
- `FEEDBACK_TABLE`: The name of the DynamoDB table storing feedback entries.
- `FEEDBACK_S3_DOWNLOAD`: The S3 bucket used for storing downloadable feedback CSV files.

Classes:
- `DecimalEncoder`: A custom JSON encoder class to convert `Decimal` objects into strings.

Functions:
- `lambda_handler`: Main entry point for the Lambda function. Routes incoming requests to below functions based on the HTTP method and user role.

- `post_kpi`: Handles POST requests to store KPIs in the DynamoDB table.
- `download_kpi`: Handles POST requests to generate and return a downloadable CSV file of KPIs within a specified date range.
- `get_kpi`: Handles GET requests to retrieve KPIs from the DynamoDB table with optional pagination support.
- `delete_kpi`: Handles DELETE requests to remove specific KPI entries from the DynamoDB table.

Usage:
Deploy this file as part of an AWS Lambda function integrated with an API Gateway. 
"""

import json
import uuid
import boto3
import os
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
#table = dynamodb.Table(os.environ.get('FEEDBACK_TABLE'))
table = dynamodb.Table('mec-chatbot-logs')

from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
  def default(self, obj):
    if isinstance(obj, Decimal):
      return str(obj)
    return json.JSONEncoder.default(self, obj)
    

def lambda_handler(event, context):
    # Determine the type of HTTP method
    admin = False
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        roles = json.loads(claims['custom:role'])
        if "Admin" in roles:                        
            #print("admin granted!")
            admin = True
        else:
            print("Caught error: attempted unauthorized admin access")
            admin = False
    except:
        print("Caught error: admin access and user roles are not present")
        return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps('Unable to check user role, please ensure you have Cognito configured correctly with a custom:role attribute.')
            }
    http_method = event.get('routeKey')
    if 'POST' in http_method:
        """
        Set up download functionality later
        """
        # if event.get('rawPath') == '/user-feedback/download-feedback' and admin:
        #     return download_kpi(event)
        return post_kpi(event)
    elif 'GET' in http_method and admin:
        return get_kpi(event)
    elif 'DELETE' in http_method and admin:
        return delete_kpi(event)
    else:
        return {
            'statusCode': 405,
            'body': json.dumps('Method Not Allowed')
        }

def post_kpi(event):
    try:
        # Load JSON data from the event body
        interaction_data = json.loads(event['body'])
        # Generate a unique feedback ID and current timestamp
        interaction_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        # Prepare the item to store in DynamoDB
        print(interaction_data.__dict__)
        interaction_data = interaction_data['interaction_data']
        item = {
            'interactionID': interaction_id,
            'username': interaction_data['username'],
            'botMessage': interaction_data['botMessage'],
            'responseTime': interaction_data['responseTime'],
            'timestamp': timestamp
        }
        # Put the item into the DynamoDB table
        table.put_item(Item=item)
        if interaction_data == 0:
            print("Negative feedback placed")
        return {
            'headers' : {
                'Access-Control-Allow-Origin' : "*"
            },
            'statusCode': 200,
            'body': json.dumps({'interactionID': interaction_id})
        }
    except Exception as e:
        print(e)
        print("Caught error: DynamoDB error - could not add interaction to table")
        return {
            'headers' : {
                'Access-Control-Allow-Origin' : "*"
            },
            'statusCode': 500,
            'body': json.dumps('Failed to store interaction: ' + str(e))
        }
        
    
def download_kpi(event):

    # load parameters
    data = json.loads(event['body'])
    start_time = data.get('startTime')
    end_time = data.get('endTime')
    topic = "any" #data.get('topic')
        
    response = None

    # if topic is any, use the appropriate index
    if not topic or topic=="any":                
        query_kwargs = {
            'IndexName': 'AnyIndex',
            'KeyConditionExpression': Key('Any').eq("YES") & Key('CreatedAt').between(start_time, end_time)
        }
    else:
        query_kwargs = {
            'KeyConditionExpression': Key('CreatedAt').between(start_time, end_time) & Key('Topic').eq(topic),            
        }   

    try:
        response = table.query(**query_kwargs)
    except Exception as e:
        print("Caught error: DynamoDB error - could not load feedback for download")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 500,
            'body': json.dumps('Failed to retrieve feedback for download: ' + str(e))
        }
    
    
    def clean_csv(field):
        print("working")
        field = str(field).replace('"', '""')
        field = field.replace('\n','').replace(',', '')
        return f'{field}'
    
    csv_content = "FeedbackID, SessionID, UserPrompt, FeedbackComment, Topic, Problem, Feedback, ChatbotMessage, CreatedAt\n"
    
    for item in response['Items']:
        csv_content += f"{clean_csv(item['FeedbackID'])}, {clean_csv(item['SessionID'])}, {clean_csv(item['UserPrompt'])}, {clean_csv(item['FeedbackComments'])}, {clean_csv(item['Topic'])}, {clean_csv(item['Problem'])}, {clean_csv(item['Feedback'])}, {clean_csv(item['ChatbotMessage'])}, {clean_csv(item['CreatedAt'])}\n"
        print(csv_content)
    
    s3 = boto3.client('s3')
    S3_DOWNLOAD_BUCKET = os.environ["FEEDBACK_S3_DOWNLOAD"]

    try:
        file_name = f"feedback-{start_time}-{end_time}.csv"
        s3.put_object(Bucket=S3_DOWNLOAD_BUCKET, Key=file_name, Body=csv_content)
        presigned_url = s3.generate_presigned_url('get_object', Params={'Bucket': S3_DOWNLOAD_BUCKET, 'Key': file_name}, ExpiresIn=3600)

    except Exception as e:
        print("Caught error: S3 error - could not generate download link")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 500,
            'body': json.dumps('Failed to retrieve feedback for download: ' + str(e))
        }
    return {
        'headers': {
                'Access-Control-Allow-Origin': "*"
            },
        'statusCode': 200,
        'body': json.dumps({'download_url': presigned_url})
    }
        

def get_kpi(event):
    try:
        # Extract query parameters
        query_params = event.get('queryStringParameters', {})
        timestamp = query_params.get('timestamp')
        # start_time = query_params.get('startTime')
        # end_time = query_params.get('endTime')
        # topic = query_params.get('topic')
        exclusive_start_key = query_params.get('nextPageToken')  # Pagination token

        # Validate required parameters
        if not timestamp:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required query parameters'})
            }

        # Set up the query conditions for DynamoDB
        query_kwargs = {
            'KeyConditionExpression': Key('timestamp') == timestamp, #between(start_time, end_time) & Key('topic').eq(topic),
            'ScanIndexForward': False,  # Sort results in descending order by timestamp
            'Limit': 10  # Limit to 10 items per request
        }

        # Handle pagination if nextPageToken is provided
        if exclusive_start_key:
            query_kwargs['ExclusiveStartKey'] = json.loads(exclusive_start_key)

        # Perform the query on DynamoDB
        response = table.query(**query_kwargs)

        # Prepare the response body
        body = {
            'Items': response.get('Items', [])
        }

        # If DynamoDB returns a pagination token, include it in the response
        if 'LastEvaluatedKey' in response:
            body['NextPageToken'] = json.dumps(response['LastEvaluatedKey'])

        # Return the successful response
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 200,
            'body': json.dumps(body)
        }

    except Exception as e:
        print(f"Caught error: {str(e)}")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*"
            },
            'statusCode': 500,
            'body': json.dumps({'error': f"Failed to retrieve data: {str(e)}"})
        }
    
# FIX!!!!        
def delete_kpi(event):
    try:
        # Extract FeedbackID from the event
        # feedback_id = json.loads(event['body']).get('FeedbackID')
        query_params = event.get('queryStringParameters', {})
        topic = query_params.get('topic')
        created_at = query_params.get('createdAt')
        
        if not topic:
            return {
                'headers': {
                    'Access-Control-Allow-Origin': '*'
                },
                'statusCode': 400,
                'body': json.dumps('Missing FeedbackID')
            }
        # Delete the item from the DynamoDB table
        response = table.delete_item(
            Key={
                'Topic': topic,
                'CreatedAt' : created_at
            }
        )
        return {
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'statusCode': 200,
            'body': json.dumps({'message': 'Feedback deleted successfully'})
        }
    except Exception as e:
        print("Caught error: DynamoDB error - could not delete feedback")
        return {
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'statusCode': 500,
            'body': json.dumps('Failed to delete feedback: ' + str(e))
        }