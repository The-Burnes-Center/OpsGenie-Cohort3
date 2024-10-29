"""
Purpose: Lambda functions to deal with requests surrounding KPIs (currently just chatbot uses/interctions)

Overview:
This file provides an AWS Lambda function designed to handle HTTP requests for managing KPIs in a DynamoDB table. 
It supports operations for posting, retrieving, downloading, and deleting KPIs. Admin users can access all functionalities, while non-admins have limited permissions.

Environment variables:
- `INTERACTION_TABLE`: The name of the DynamoDB table storing interaction entries.
- `INTERACTION_S3_DOWNLOAD`: The S3 bucket used for storing downloadable interaction data CSV files.

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
table = dynamodb.Table(os.environ.get('INTERACTION_TABLE'))

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
        print(http_method)
        #if event.get('rawPath') == '/kpi/download' and admin: Idk what this means but it is not working. Unsure about RawPath
        if http_method == 'POST /chatbot-uses/download' and admin:
            print('we are downloading')
            return download_kpi(event)
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

# works yasss
def post_kpi(event):
    try:
        # load JSON data from the event body
        timestamp = datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ')
        
        body = json.loads(event['body'], parse_float=Decimal)

        interaction_data = body.get('interaction_data')
        print(interaction_data)
        
        # Check if interaction_data is present
        if not interaction_data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing interaction_data'})
            }        
        
        username = interaction_data.get('Username')
        user_message = interaction_data.get('UserPrompt')
        bot_response = interaction_data.get('BotMessage')
        response_time = interaction_data.get('ResponseTime', Decimal(0))
        item = {
            'Username': username,
            'BotMessage': bot_response,
            'ResponseTime': response_time,
            'UserPrompt': user_message,
            'Timestamp': timestamp
        }
        
        #print("item: " + item)
        # Put the item into the DynamoDB table
        table.put_item(Item=item)
        if interaction_data == 0:
            print("Negative feedback placed")
        return {
            'headers' : {
                'Access-Control-Allow-Origin' : "*"
            },
            'statusCode': 200,
            'body': json.dumps('POST successful')
        }
    except Exception as e:
        print("Caught error: DynamoDB error - could not add interaction to table: " + str(e))
        return {
            'headers' : {
                'Access-Control-Allow-Origin' : "*"
            },
            'statusCode': 500,
            'body': json.dumps('Failed to store interaction: ' + str(e))
        }

def download_kpi(event):

    # Load parameters from request body
    data = json.loads(event['body'])
    start_time = data.get('startTime')
    end_time = data.get('endTime')

    response = None

    # Query the interaction table using the timestamp range (No topic involved)
    query_kwargs = {
        'FilterExpression': Attr('timestamp').between(start_time, end_time)
    }

    try:
        response = table.query(**query_kwargs)
    except Exception as e:
        print("Caught error: DynamoDB error - could not lollowd interaction data for download")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Headers': "*",
                'Access-Control-Allow-Methods': "GET,POST"
            },
            'statusCode': 500,
            'body': json.dumps('Failed to retrieve interaction data for download: ' + str(e))
        }

    # Helper function to clean data for CSV
    def clean_csv(field):
        field = str(field)#.replace('"', '""')
        #field = field.replace('\n', '').replace(',', '')
        return f'{field}'
    
    # CSV header with relevant interaction data fields
    csv_content = "Timestamp, Username, User Prompt, Bot Message, Response Time\n"

    # Build CSV content row by row
    for item in response['Items']:
        csv_content += f"{clean_csv(item['Timestamp'])}, {clean_csv(item['Username'])}, {clean_csv(item['UserPrompt'])}, {clean_csv(item['BotMessage'])}, {clean_csv(item['ResponseTime'])}\n"
    
    # Upload CSV to S3
    s3 = boto3.client('s3')
    S3_DOWNLOAD_BUCKET = os.environ["INTERACTION_S3_DOWNLOAD"]

    try:
        file_name = f"interaction-data-{start_time}-{end_time}.csv"
        s3.put_object(Bucket=S3_DOWNLOAD_BUCKET, Key=file_name, Body=csv_content)
        
        # Generate a presigned URL for download
        presigned_url = s3.generate_presigned_url('get_object', Params={'Bucket': S3_DOWNLOAD_BUCKET, 'Key': file_name}, ExpiresIn=3600)

    except Exception as e:
        print("Caught error: S3 error - could not generate download link")
        return {
            'headers': {
                'Access-Control-Allow-Origin': "*",
                'Access-Control-Allow-Headers': "*",
                'Access-Control-Allow-Methods': "GET,POST"
            },
            'statusCode': 500,
            'body': json.dumps('Failed to generate download link: ' + str(e))
        }

    return {
        'headers': {
            'Access-Control-Allow-Origin': "*",
            'Access-Control-Allow-Headers': "*",
            'Access-Control-Allow-Methods': "GET,POST"
        },
        'statusCode': 200,
        'body': json.dumps({'download_url': presigned_url})
    }
    
def get_kpi(event):
    try:
        # Extract query parameters
        query_params = event.get('queryStringParameters', {})
        print("Query params:", query_params)
        start_time = query_params.get('startTime')
        end_time = query_params.get('endTime')
        # topic = query_params.get('topic')
        exclusive_start_key = query_params.get('nextPageToken') # pagination token
        print(f"startTime: {start_time}, endTime: {end_time}, nextPageToken: {exclusive_start_key}")
        
        start_time = datetime.strptime(start_time, '%Y-%m-%dT%H:%M:%S.%fZ')
        end_time = datetime.strptime(end_time, '%Y-%m-%dT%H:%M:%S.%fZ')

        # Convert back to ISO format with milliseconds and UTC suffix 'Z'
        start_time = start_time.isoformat(timespec='milliseconds') + 'Z'
        end_time = end_time.isoformat(timespec='milliseconds') + 'Z'

        # Validate required parameters
        if not start_time or not end_time:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required query parameters'})
            }

        scan_kwargs = {
            'FilterExpression': Attr("Timestamp").between(start_time, end_time),
            'Limit': 10  # Limit to 10 items per request
        }
        
        # Handle pagination if nextPageToken is provided
        if exclusive_start_key:
            scan_kwargs['ExclusiveStartKey'] = json.loads(exclusive_start_key)

        # Perform the query operation
        response = table.scan(**scan_kwargs)


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
            'body': json.dumps(body, cls=DecimalEncoder)
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
    
# WORKS
def delete_kpi(event):
    try:
        query_params = event.get('queryStringParameters', {})
        timestamp = query_params.get('Timestamp')

        if not timestamp:
            return {
                'headers': {
                    'Access-Control-Allow-Origin': '*'
                },
                'statusCode': 400,
                'body': json.dumps('Missing timestamp')
            }
            
        # Delete the item from the DynamoDB table
        response = table.delete_item(
            Key={
                'Timestamp': timestamp,
            }
        )
        return {
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'statusCode': 200,
            'body': json.dumps({'message': 'Interaction item deleted successfully'})
        }
    except Exception as e:
        print("Caught error: DynamoDB error - could not delete interaction item")
        return {
            'headers': {
                'Access-Control-Allow-Origin': '*'
            },
            'statusCode': 500,
            'body': json.dumps('Failed to delete interaction item: ' + str(e))
        }