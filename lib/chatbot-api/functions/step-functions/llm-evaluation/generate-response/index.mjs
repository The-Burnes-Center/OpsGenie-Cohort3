/**
 * Purpose: WebSocket Event Handler for AWS Lambda **VERSION FOR EVAL ONLY**
 * 
 * Overview:
 * This file contains a set of functions designed to handle WebSocket events in an AWS Lambda environment.
 * The main entry point is the `handler` function, which processes incoming WebSocket requests and routes
 * them to the appropriate handler based on the event type (connect, disconnect, custom routes).
 * 
 * Environment variables:
 * - `mvp_websocket__api_endpoint_test`: The WebSocket API endpoint used for communication.
 * - `INDEX_ID`: The ID of the Amazon Kendra index to query for relevant documents.
 * - `SESSION_HANDLER`: The name of the Lambda function responsible for handling session data.
 * 
 * Functions:
 * - `processBedrockStream`: Handles the streaming of AI model responses and sends them back to the WebSocket client.
 * - `getPromptWithHistoricalContext`: Enhances user prompts (Mistral7b) by incorporating context from chat history.
 * - `retrieveKendraDocs`: Queries Amazon Kendra to retrieve relevant documents based on the user's enhanced prompt.
 * - `injectKendraDocsInPrompt`: Combines retrieved documents with the user prompt to provide contextually enriched instructions.
 * - `getUserResponse`: Orchestrates the full process of generating a chatbot response (Claude), managing sessions, generating a session title (Mistral7b), and communicating with the client.
 * - `draftEmailResponse`: Generates a formal email draft based on chat history (Claude)
 * - `handler`: The main Lambda function entry point, routing incoming WebSocket events to the appropriate handler.
 * 
 * Usage:
 * Deploy this file as part of an AWS Lambda function connected to an API Gateway WebSocket API. The handler function
 * will automatically manage WebSocket connections, process user inputs, and respond accordingly based on the routes defined.
 * 
 */
import { ApiGatewayManagementApiClient, PostToConnectionCommand, DeleteConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi';
import { KendraClient, RetrieveCommand } from "@aws-sdk/client-kendra";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda"
import { QueryCommand } from "@aws-sdk/client-kendra";
import ClaudeModel from "./models/claude3Sonnet.mjs";
// import ClaudeModel from "../websocket-chat/models/claude3Sonnet.mjs";

//const SYS_PROMPT = process.env.PROMPT;

// Enhance a user prompt by re-writing it using the context from the chat history
async function getPromptWithHistoricalContext(prompt, history) {
  try {
    // instructions for when there is a chat history 
    if (history.length > 0) {
      let enhancer = new Mistral7BModel();
      // const CONTEXT_COMPLETION_INSTRUCTIONS = "When interacting with a *similarity search program*, consider the relevance of chat history in refining user prompts. If the chat history is pertinent, utilize it to enhance the user's current query. Focus primarily on answering the user's present question, and if the chat history is not applicable, proceed with the user's current prompt alone.";
      const CONTEXT_COMPLETION_INSTRUCTIONS = "Given a chat history and the latest user question \
      which might reference context in the chat history, formulate a standalone question \
      which can be understood without the chat history. Do NOT answer the question, \
      just reformulate it if needed using relevant keywords from the chat history and otherwise return it as is.";
      const new_history = history.slice(-3);
      const enhancedPrompt = await enhancer.getResponse(CONTEXT_COMPLETION_INSTRUCTIONS, new_history, prompt);
      console.log(enhancedPrompt);
      return enhancedPrompt.replaceAll('"','');
      // instructions for when there is NO chat history
    } else {
      return prompt.replaceAll('"','');;
    }
  }
  catch (error) {
    console.error("Error in getting prompt with historical context:", error);
    return prompt;
  }
}

async function processBedrockStream(id, modelStream, model) {
  try {
    let model_response = ''

    for await (const event of modelStream) {
      const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
      const parsedChunk = await model.parseChunk(chunk);
      if (parsedChunk) {
        let responseParams = {
          ConnectionId: id,
          Data: parsedChunk.toString()
        }
        model_response = model_response.concat(parsedChunk)
        
      }
    
    }
    return model_response
  }
  catch(e) {
    console.log("Error processing bedrock stream:", e)
  }
}


/* Retrieves documents from a Kendra index */
async function retrieveKendraDocs(query, kendra, kendraIndex) {
  let params = {
    QueryText: query.slice(0, 999),
    IndexId: kendraIndex,
    PageSize: 12,
    PageNumber: 1,
    SortingConfiguration: {
      DocumentAttributeKey: '_last_updated_at', // Using the built-in attribute for last updated timestamp
      SortOrder: 'DESC' // Ensure latest documents come first
    }
  };

  try {
    const { ResultItems } = await kendra.send(new RetrieveCommand(params));
    console.log(ResultItems)
    // filter the items based on confidence, change if needed to include LOW confidence results
    const confidenceFilteredResults = ResultItems.filter(item =>
      item.ScoreAttributes.ScoreConfidence == "VERY_HIGH"
      || item.ScoreAttributes.ScoreConfidence == "HIGH"
      || item.ScoreAttributes.ScoreConfidence == "MEDIUM"
      || item.ScoreAttributes.ScoreConfidence == "LOW"
    )
    let fullContent = confidenceFilteredResults.map(item => item.Content).join('\n');
    const documentUris = confidenceFilteredResults.map(item => {
      return { title: item.DocumentTitle, uri: item.DocumentURI }
    });

    // removes duplicate sources based on URI
    const flags = new Set();
    const uniqueUris = documentUris.filter(entry => {
      if (flags.has(entry.uri)) {
        return false;
      }
      flags.add(entry.uri);
      return true;
    });

    // console.log(fullContent);

    //Returning both full content and list of document URIs
    if (fullContent == '') {
      fullContent = `No knowledge available! This query is likely outside the scope of the MassHealth IT Operations Team.
      Please mention that no relevant information was found and either they should provide more context or contact IT Operations Supervisor.`
      console.log("Warning: no relevant sources found")
    }

    return {
      content: fullContent,
      uris: uniqueUris
    };
  } catch (error) {
    console.error("Caught error: could not retreive Kendra documents:", error);
    // return no context
    return {
      content: `No knowledge available! This query is likely outside the scope of the MassHealth IT Operations Team.
      Please mention that no relevant information was found and either they should provide more context or contact IT Operations Supervisor.`,
      uris: []
    };
  }
}


function injectKendraDocsInPrompt(prompt, docs) {
  // Enhanced prompt injection with strict grounding enforcement
  console.log(docs);
  return `RETRIEVED CONTEXT (Your ONLY source of truth):
${docs}

STRICT INSTRUCTIONS: 
${prompt}

CRITICAL REMINDER: You MUST only use information explicitly present in the RETRIEVED CONTEXT above. Do NOT use your training knowledge to expand acronyms, infer meanings, or add information not explicitly stated in the context. If the context doesn't contain the information needed to answer, clearly state that you cannot provide an answer based on the available documentation.`;
}

/*
getUserResponse orchastrates a series of tasks including enhancing the user prompt, querying kendra
querying claude for a response, managing session data, titling the session, communicating with the websocket client,
and sending sources 
*/
const getUserResponse = async (id, requestJSON) => {
  try {
    console.log(requestJSON)
    const data = requestJSON.data;
    const systemPrompt = process.env.PROMPT;
    const userMessage = requestJSON.userMessage;
    const chatHistory = requestJSON.chatHistory;
    const kendra = new KendraClient({ region: 'us-east-1' });

    const enhancedUserPrompt = await getPromptWithHistoricalContext(userMessage, chatHistory);
    const docString = await retrieveKendraDocs(enhancedUserPrompt, kendra, process.env.KB_ID);
    const enhancedSystemPrompt = injectKendraDocsInPrompt(systemPrompt, docString.content);
    let claude = new ClaudeModel();

    let response = await claude.getResponse(enhancedSystemPrompt, chatHistory, userMessage);
    // let modelResponse = await processBedrockStream(1, stream, claude);
    console.log("RETURNED --------", {
      response: response,
      sources: docString.uris,
    }, "END RETURN ----------")

    return {
      response: response,
      sources: docString.uris,
    };
  } catch (error) {
    console.error("Error in getUserResponse:", error);
    return {
      error: `An error occurred while processing your request: ${error.message}`,
    };
  }
}



// Acts as a entry point for Lambda functions. processing incoming websocket requests and routing them 
// based on the type of event. 
export const handler = async (event) => {
  try {
    let body = {};
    if (event.body) {
      body = JSON.parse(event.body);
    }
    else {
      body = event
    }

    console.log("GET CHATBOT RESPONSE");
    const result = await getUserResponse(1, body);
    const modelResponse = result.response;
    const sources = result.sources;
    console.log(result)
    return {
      statusCode: 200,
      body: JSON.stringify({modelResponse, sources}),
    };

  } catch (error) {
    console.error("Handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};