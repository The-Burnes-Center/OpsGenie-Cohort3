import json
import boto3
import os

# Retrieve environment variables for Kendra index (no longer need SOURCE)
kendra_index = os.environ['KENDRA']

# Initialize a Kendra client
client = boto3.client('kendra')

def get_all_data_sources():
    """
    Get all data sources for the Kendra index.
    
    Returns:
        list: List of data source summaries
    """
    try:
        response = client.list_data_sources(IndexId=kendra_index)
        return response.get('SummaryItems', [])
    except Exception as e:
        print(f"Error getting data sources: {str(e)}")
        return []

def check_running():
    """
    Check if any sync jobs for any data source in the index are currently running.

    Returns:
        bool: True if there are any ongoing sync or sync-indexing jobs, False otherwise.
    """
    data_sources = get_all_data_sources()
    
    for source in data_sources:
        source_id = source['Id']
        try:
            # List ongoing sync jobs with status 'SYNCING'
            syncing = client.list_data_source_sync_jobs(
                Id=source_id,
                IndexId=kendra_index,
                StatusFilter='SYNCING'
            )
            
            # List ongoing sync jobs with status 'SYNCING_INDEXING'
            syncing_indexing = client.list_data_source_sync_jobs(
                Id=source_id,
                IndexId=kendra_index,
                StatusFilter='SYNCING_INDEXING'
            )
            
            # Combine the history of both job types
            hist = syncing_indexing['History'] + syncing['History']
            
            # If any data source is syncing, return True
            if len(hist) > 0:
                return True
        except Exception as e:
            print(f"Error checking sync status for data source {source_id}: {str(e)}")
    
    return False

def start_sync_all_sources():
    """
    Start sync jobs for all data sources in the index.
    
    Returns:
        dict: Results of sync attempts
    """
    data_sources = get_all_data_sources()
    results = {
        'started': [],
        'failed': [],
        'already_syncing': []
    }
    
    if not data_sources:
        print("No data sources found in the index")
        return results
    
    print(f"Found {len(data_sources)} data sources to sync")
    
    for source in data_sources:
        source_id = source['Id']
        source_name = source.get('Name', source_id)
        source_type = source.get('Type', 'Unknown')
        
        print(f"Processing data source: {source_name} ({source_type})")
        
        try:
            # Check if this specific source is already syncing
            syncing = client.list_data_source_sync_jobs(
                Id=source_id,
                IndexId=kendra_index,
                StatusFilter='SYNCING'
            )
            
            syncing_indexing = client.list_data_source_sync_jobs(
                Id=source_id,
                IndexId=kendra_index,
                StatusFilter='SYNCING_INDEXING'
            )
            
            if len(syncing['History']) > 0 or len(syncing_indexing['History']) > 0:
                print(f"Data source {source_name} is already syncing")
                results['already_syncing'].append(f"{source_name} ({source_type})")
            else:
                # Start sync for this data source
                print(f"Starting sync for data source {source_name}")
                client.start_data_source_sync_job(
                    Id=source_id,
                    IndexId=kendra_index
                )
                results['started'].append(f"{source_name} ({source_type})")
                
        except Exception as e:
            error_msg = f"{source_name} ({source_type}): {str(e)}"
            results['failed'].append(error_msg)
            print(f"Error starting sync for data source {source_id}: {str(e)}")
    
    return results

def lambda_handler(event, context):
    """
    AWS Lambda handler function for handling requests.

    Args:
        event (dict): The event dictionary containing request data.
        context (dict): The context dictionary containing information about the Lambda function execution.

    Returns:
        dict: A response dictionary with a status code, headers, and body.
    """
    
    # Retrieve the resource path from the event dictionary
    resource_path = event.get('rawPath', '')
    
    # Check admin access    
    try:
        claims = event["requestContext"]["authorizer"]["jwt"]["claims"]
        roles = json.loads(claims['custom:role'])
        if "Admin" in roles:                        
            print("admin granted!")
        else:
            return {
                'statusCode': 403,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps('User is not authorized to perform this action')
            }
    except:
        return {
                'statusCode': 500,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps('Unable to check user role, please ensure you have Cognito configured correctly with a custom:role attribute.')
            }    
        
    # Check if the request is for syncing Kendra
    if "sync-kendra" in resource_path:
        if check_running():
            print("Some data sources are already syncing")
            return {
                'statusCode': 200,
                'headers': {'Access-Control-Allow-Origin': '*'},
                'body': json.dumps('STILL SYNCING')
            }
        else:
            # Start sync for all data sources
            print("Starting sync for all data sources")
            sync_results = start_sync_all_sources()
            
            # Log results for debugging
            print(f"Sync results: {sync_results}")
            
            if len(sync_results['started']) > 0:
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps('STARTED SYNCING')
                }
            elif len(sync_results['already_syncing']) > 0:
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps('STILL SYNCING')
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps('SYNC FAILED - No data sources available or all failed')
                }
   
    # Check if the request is for checking the sync status        
    elif "still-syncing" in resource_path:
        status_msg = 'STILL SYNCING' if check_running() else 'DONE SYNCING'
        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps(status_msg)
        }