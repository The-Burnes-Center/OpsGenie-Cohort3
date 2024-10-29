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
    // timestamp generated in lambda function
    //console.log(interactionData["interaction_data"]);//.interaction_data);
    //console.log("hi hi")
    console.log(JSON.stringify({interaction_data: interactionData}));
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
      //console.log(JSON.stringify({interaction_data: interactionData}));
      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response:', response.status, errorText);
      } else {
        console.log('CHAT INTERACTION SAVED');
      }
    } catch (e) {
      console.log('Chat interaction not saved - ' + e);
    }
  }

  async getChatbotUse(startTime? : string, endTime? : string, nextPageToken? : string) {
    try {
      const auth = await Utils.authenticate();
      console.log("Parameters: " + {startTime,endTime,nextPageToken});
      let params = new URLSearchParams();
      if (startTime) params.append("startTime", startTime);
      if (endTime) params.append("endTime", endTime);
      if (nextPageToken) params.append("nextPageToken", nextPageToken);

      const url = `${this.API}/chatbot-use?${params.toString()}`;
      console.log("This is the link we're using to fetch response:", url);
    
      const response = await fetch(this.API + '/chatbot-use?' + params.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : auth,
        },        
      });
      return await response.json()
    } catch (e) {
      console.log(e);
    }
}

  async deleteChatbotUses(timestamp: string) {
    const auth = await Utils.authenticate();
    let params = new URLSearchParams({timestamp});
    await fetch(this.API + '/chatbot-use?' + params.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },      
    });
    
  }

  async downloadChatbotUses(startTime? : string, endTime? : string) {
    const auth = await Utils.authenticate();
    const response = await fetch(this.API + '/chatbot-uses/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth
      },
      body: JSON.stringify({ startTime, endTime })
    });
    const result = await response.json();
  
    fetch(result.download_url, {
      method: 'GET',
      headers: {
        'Content-Disposition': 'attachment',
      }
      
    }).then(response => response.blob())
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "data.csv";
        document.body.appendChild(a); // we need to append the element to the dom -> otherwise it will not work in firefox
        a.click();
        a.remove();  //afterwards we remove the element again
    });    

  }
}