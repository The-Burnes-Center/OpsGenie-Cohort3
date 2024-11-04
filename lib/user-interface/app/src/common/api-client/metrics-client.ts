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
      console.log('Error saving chatbot interaction - ' + e);
    }
  }

  async getChatbotUse(startTime? : string, endTime? : string, nextPageToken? : string) {
    try {
      const auth = await Utils.authenticate();
      //console.log("Parameters: " + {startTime,endTime,nextPageToken});
      let params = new URLSearchParams();
      if (startTime) params.append("startTime", startTime);
      if (endTime) params.append("endTime", endTime);
      if (nextPageToken) params.append("nextPageToken", nextPageToken);

      const url = `${this.API}/chatbot-use?${params.toString()}`;
      //console.log("This is the link we're using to fetch response:", url);
    
      const response = await fetch(this.API + '/chatbot-use?' + params.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization' : auth,
        },        
      });
      return await response.json()
    } catch (e) {
      console.log("Error retrieving chatbot use data - " + e);
    }
}

  async deleteChatbotUses(timestamp: string) {
    try {
      const auth = await Utils.authenticate();
      let params = new URLSearchParams({Timestamp: timestamp});
      await fetch(this.API + '/chatbot-use?' + params.toString(), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth
        },      
      });
    } catch (e) {
      console.log("Error deleting chatbot use datapoints - " + e);
    }
    
  }

  async downloadChatbotUses(startTime?: string, endTime?: string) {
    try {
        const auth = await Utils.authenticate();
        const response = await fetch(this.API + '/chatbot-use/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': auth
            },
            body: JSON.stringify({ startTime, endTime })
        });

        // Check if the response is OK, else throw an error
        if (!response.ok) {
            throw new Error(`Failed to fetch download URL: ${response.statusText}`);
        }

        const result = await response.json();

        // Fetch the actual file for download
        const fileResponse = await fetch(result.download_url);
        if (!fileResponse.ok) {
            throw new Error("Failed to download the file.");
        }

        const blob = await fileResponse.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        //a.download = `chatbotUses-${}-.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    } catch (error) {
        console.error("Download failed:", error);
        throw error;
    }
  }

}