import json
import boto3
from enum import Enum

class State(Enum):
    AL = "Alabama"
    AK = "Alaska" 
    AZ = "Arizona"
    AR = "Arkansas"
    CA = "California"
    CO = "Colorado"
    CT = "Connecticut"
    DE = "Delaware"
    FL = "Florida"
    GA = "Georgia"
    HI = "Hawaii"
    ID = "Idaho"
    IL = "Illinois"
    IN = "Indiana"
    IA = "Iowa"
    KS = "Kansas"
    KY = "Kentucky"
    LA = "Louisiana"
    ME = "Maine"
    MD = "Maryland"
    MA = "Massachusetts"
    MI = "Michigan"
    MN = "Minnesota"
    MS = "Mississippi"
    MO = "Missouri"
    MT = "Montana"
    NE = "Nebraska"
    NV = "Nevada"
    NH = "New Hampshire"
    NJ = "New Jersey"
    NM = "New Mexico"
    NY = "New York"
    NC = "North Carolina"
    ND = "North Dakota"
    OH = "Ohio"
    OK = "Oklahoma"
    OR = "Oregon"
    PA = "Pennsylvania"
    RI = "Rhode Island"
    SC = "South Carolina"
    SD = "South Dakota"
    TN = "Tennessee"
    TX = "Texas"
    UT = "Utah"
    VT = "Vermont"
    VA = "Virginia"
    WA = "Washington"
    WV = "West Virginia"
    WI = "Wisconsin"
    WY = "Wyoming"

def contains_state(text):
    for state in State:
        if state.name in text or state.value in text:
            return True
    return False
    
    
def find_state(address):
    for state in State:
        # Replace both the full state name and the abbreviation if present
        if state.name in address:
            address = address.replace(state.name, "")
        if state.value in address:
            address = address.replace(state.value, "")
    return address.strip()  # Strip to clean up any leading/trailing whitespace

    

client = boto3.client(service_name='comprehendmedical', region_name='us-east-1')

def lambda_handler(event, context):
    try:
        if event.get('body'):
            body = json.loads(event['body'])
        else:
            body = {}

        content = body.get('content', '')
        if not content:
            return {'headers': {
                'Access-Control-Allow-Origin': '*'
                },'statusCode': 400, 'body': json.dumps("Error: No content provided")}

        results = client.detect_phi(Text=content)
        detectedPHI = results['Entities']

    except Exception as e:
        print(e)
        return {'headers': {
                'Access-Control-Allow-Origin': '*'
                },
            'statusCode': 500,
            'body': json.dumps({"Error": "Something went wrong!"})
        }

    return {'headers': {
                'Access-Control-Allow-Origin': '*'
                },
        'statusCode': 200,
        'body': json.dumps({"redacted_text": redact_text(content, detectedPHI)})
    }

def redact_text(prompt, entities):
    redacted_text = prompt
    for entity in entities:
        if entity["Type"] == "PROFESSION" or entity["Type"] == "URL":
            continue  # Skip redaction for professions and URLs
        elif entity["Type"] == "AGE":
            age = float(entity.get('Text', '0'))  # Default to 0 if no age found
            if age > 89:
                redacted_text = redacted_text.replace(entity['Text'], "[AGE OVER 89]")
            else: 
                redacted_text = redacted_text.replace(entity['Text'], "[AGE]")
        elif entity["Type"] == "ADDRESS":
            print(f"Found address in the message{entity}")
            if contains_state(entity['Text']):
                print(f"contains state was true for {entity['Text']}")
                address_without_state = find_state(entity['Text'])
                print(f"address_without_state: {address_without_state}")
                if address_without_state != "":
                    redacted_text = redacted_text.replace(address_without_state, "[ADDRESS]")
                    print(f"Redacted Text after replace: {redacted_text}")
                else: 
                    print(f"Contains only state")
            else:
                redacted_text = redacted_text.replace(entity['Text'], "[ADDRESS]")
                
                
        elif entity["Type"] == "NAME":
            name = entity.get('Text', 'Jake').lower() # if there is no name default to Jake
            print(f"Found name in the message{entity}")
            if name in ["kaileigh mulligan", "chaffee"]:
                redacted_text = redacted_text.replace(entity['Text'], name)
            else:
                redacted_text = redacted_text.replace(entity['Text'], "[NAME]")
                    
        else:
            entity_text = entity.get('Text', '')
            redacted_text = redacted_text.replace(entity_text, "[" + entity["Type"] + "]")
    return redacted_text

