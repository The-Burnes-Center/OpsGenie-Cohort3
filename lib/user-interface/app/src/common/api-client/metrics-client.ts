import {
  Utils
} from "../utils"
import { AppConfig } from "../types"; 

// This was made by cohort 1. I'm using it to add KPI data
export class MetricClient {
  private readonly API: string;
  constructor(protected _appConfig: AppConfig) {
    this.API = _appConfig.httpEndpoint.slice(0,-1);}

  async getInvocationCount() {
    try {
      const auth = await Utils.authenticate();      
      const response = await fetch(this.API + '/chat-invocations-count', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : auth,
          "Access-Control-Allow-Origin": "*",
        },        
      });
      //console.log(response);
      return await response.json()
    }
    catch (err) {
      console.log(err);
      return "unknown";
    }
  }

  async getResponseTime() {
    try {
      const auth = await Utils.authenticate();      
      const response = await fetch(this.API + '/response-time', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : auth
        },        
      });
      //console.log(response);
      return await response.json()
    }
    catch (err) {
      console.log(err);
      return "unknown";
    }
  }

  async saveChatInteraction(interactionData) {
    // timestamp and interactionID are generated in lambda function
    try {
      const auth = await Utils.authenticate();      
      const response = await fetch(this.API + '/chatbot-use', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : auth,
        },
        body: JSON.stringify({interaction_data: interactionData}),
      })

      console.log('CHAT INTERACTION SAVED')
    } catch (e) {
      console.log('Chat interaction not saved - ' + e);
    }
  }
      
  

  async getChatbotUse(startTime? : string, endTime? : string, nextPageToken? : string) {
    try {
      const auth = await Utils.authenticate();
      // function decodeToken(token) {
      //   const payloadBase64 = token.split('.')[1]; // JWT has three parts, split by '.'
      //   const decodedPayload = atob(payloadBase64); // Decode the Base64 payload
      //   return JSON.parse(decodedPayload).toString(); // Parse it to an object
      // }

      //console.log("DECODED TOKEN: " + decodeToken(auth));
      console.log(startTime + endTime + nextPageToken);
      let params = new URLSearchParams({startTime,endTime,nextPageToken});
      let keysForDel = [];
      params.forEach((value, key) => { // this'll delete the nextPageToken if it's null
        // console.log(value, key)
        if (value === undefined || value == "undefined") {
          keysForDel.push(key);
        }
      });
  
      keysForDel.forEach(key => {
        params.delete(key);
      });

      console.log(this.API + '/chatbot-use' + params.toString());
    
      const response = await fetch(this.API + '/chatbot-use?' + params.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : auth,
          //'Access-Control-Allow-Origin': '*',
        },        
      });
      console.log(response);
      return await response.json()
    } catch (e) {
      console.log(e);
    }
}
}