import json
from jose import jwt, jwk
from jose.utils import base64url_decode
import requests
import os

def lambda_handler(event, context):
    token = event['queryStringParameters']['Authorization']
    print(token)
    user_pool_id = os.environ.get('USER_POOL_ID')
    region = 'us-east-1'
    app_client_id = os.environ.get('APP_CLIENT_ID')
    keys_url = f'https://cognito-idp.{region}.amazonaws.com/{user_pool_id}/.well-known/jwks.json'
    
    # Download JWKs and transform them to a key dictionary
    response = requests.get(keys_url)
    keys = response.json()['keys']
    key_dict = {key['kid']: json.dumps(key) for key in keys}

    # Decode and validate the token
    headers = jwt.get_unverified_headers(token)
    print(key_dict)
    print(headers)
    key = json.loads(key_dict[headers['kid']])
    public_key = jwk.construct(key)
    print(public_key)

    # Validate the token
    try:
        claims = jwt.decode(token, public_key, algorithms=['RS256'], audience=app_client_id)
        print(claims)
        principalId = claims['sub']

        # Enhanced role-based access control
        user_has_access = False
        access_reason = "No valid access found"
        
        # Check for Cognito groups (preferred method)
        if 'cognito:groups' in claims:
            user_groups = claims['cognito:groups']
            print(f"User groups: {user_groups}")
            if 'Admin' in user_groups or 'User' in user_groups:
                user_has_access = True
                access_reason = f"Access granted via Cognito groups: {user_groups}"
        
        # Fallback: Check custom role attribute (for backward compatibility)
        elif 'custom:role' in claims:
            try:
                roles = json.loads(claims['custom:role'])
                print(f"Custom roles: {roles}")
                if isinstance(roles, list) and ('Admin' in roles or 'User' in roles):
                    user_has_access = True
                    access_reason = f"Access granted via custom roles: {roles}"
                elif isinstance(roles, str) and (roles == 'Admin' or roles == 'User'):
                    user_has_access = True
                    access_reason = f"Access granted via custom role: {roles}"
            except (json.JSONDecodeError, TypeError) as e:
                print(f"Error parsing custom:role: {e}")
        
        if not user_has_access:
            print(f"Access denied: {access_reason}")
            raise Exception("User does not have required role (Admin or User)")
        
        print(f"Access granted: {access_reason}")

        # Generate policy document
        policy_document = {
            'principalId': principalId,
            'policyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Action': 'execute-api:Invoke',
                    'Effect': 'Allow',
                    'Resource': event['methodArn']
                }]
            },
            'context': {
                'accessReason': access_reason,
                'userGroups': json.dumps(claims.get('cognito:groups', [])),
                'customRole': claims.get('custom:role', '[]')
            }
        }

        return policy_document
    except Exception as e:
        print(f'Token validation error: {str(e)}')
        # Return explicit deny policy
        return {
            'principalId': 'user',
            'policyDocument': {
                'Version': '2012-10-17',
                'Statement': [{
                    'Action': 'execute-api:Invoke',
                    'Effect': 'Deny',
                    'Resource': event['methodArn']
                }]
            }
        }