import {Utils} from "../utils"
import { AppConfig } from "../types"; 

/**
 * Class for retreiving 
 */
export class PerformanceClient {
  private readonly API;
  constructor(protected _appConfig: AppConfig) {
    this.API = _appConfig.httpEndpoint.slice(0,-1);}

  // Takes in a piece of chatbbot use data
  async sendPerformance(performanceData) {

    console.log('send function works');
    const auth = await Utils.authenticate();
    const response = await fetch(this.API + 'chatbot-use', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'auth',
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ performanceData })
    });

  }

  async downloadPerformance(topic : string, startTime? : string, endTime? : string) {
    const auth = await Utils.authenticate();
    const response = await fetch(this.API + 'chatbot-use', {
    //const response = await fetch('https://b3ljauwcsrh3dfkkecfr3d7xy4.appsync-api.us-east-1.amazonaws.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': auth,
        //"Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ topic, startTime, endTime })
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

  async getChatbotUses(startTime? : string, endTime? : string, nextPageToken? : string) {
    console.log('we made it this far');
    
    try {
      const auth = await Utils.authenticate();
      let params = new URLSearchParams({startTime, endTime, nextPageToken});
      let keysForDel = [];
      params.forEach((value, key) => {
        if (value === undefined || value == "undefined") {
          keysForDel.push(key);
        }
      });

      keysForDel.forEach(key => {
        params.delete(key);
      });

    // Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://56btacyw1a.execute-api.us-east-1.amazonaws.com/chatbot-use. (Reason: CORS header ‘Access-Control-Allow-Origin’ missing). Status code: 404.
    // Cross-Origin Request Warning: The Same Origin Policy will disallow reading the remote resource at https://56btacyw1a.execute-api.us-east-1.amazonaws.com/chatbot-use soon. (Reason: When the `Access-Control-Allow-Headers` is `*`, the `Authorization` header is not covered. To include the `Authorization` header, it must be explicitly listed in CORS header `Access-Control-Allow-Headers`).

      const response = await fetch(this.API + '/chatbot-use', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': auth, 
          //"Access-Control-Allow-Origin": "*",
        },      
      });
      const result = await response.json();
      return result;
    } catch (e) {
      console.log('getChatbotuses failed')
      console.log(e);
      return;
    }

  }

  // async deleteFeedback(topic : string, createdAt : string) {
  //   const auth = await Utils.authenticate();
  //   let params = new URLSearchParams({topic, createdAt});
  //   await fetch(this.API + '/user-feedback?' + params.toString(), {
  //     method: 'DELETE',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': auth,
  //       //"Access-Control-Allow-Origin": "*"
  //     },
  //   });
    
  // }
}
