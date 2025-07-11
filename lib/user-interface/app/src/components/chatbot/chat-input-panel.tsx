import {
  Button,
  Container,
  Icon,
  Select,
  SelectProps,
  SpaceBetween,
  Spinner,
  StatusIndicator,
} from "@cloudscape-design/components";
import {
  Dispatch,
  SetStateAction,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { Auth } from "aws-amplify";
import TextareaAutosize from "react-textarea-autosize";
import { ReadyState } from "react-use-websocket";
import { ApiClient } from "../../common/api-client/api-client";
import { AppContext } from "../../common/app-context";
import styles from "../../styles/chat.module.scss";
import {
  ChatBotConfiguration,
  ChatBotHistoryItem,
  ChatBotMessageResponse,
  ChatBotMessageType,
  ChatInputState,
  ImageFile,
} from "./types";
import {
  getSignedUrl,
  updateMessageHistoryRef,
  assembleHistory
} from "./utils";
import { Utils } from "../../common/utils";
import {SessionRefreshContext} from "../../common/session-refresh-context"
import { useNotifications } from "../notif-manager";
import { timeStamp } from "console";
import { SYSTEM_PROMPT } from "./prompts";


export interface ChatInputPanelProps {
  running: boolean;
  setRunning: Dispatch<SetStateAction<boolean>>;
  session: { id: string; loading: boolean };
  messageHistory: ChatBotHistoryItem[];
  setMessageHistory: (history: ChatBotHistoryItem[]) => void;
  configuration: ChatBotConfiguration;
  setConfiguration: Dispatch<React.SetStateAction<ChatBotConfiguration>>;
}

export abstract class ChatScrollState {
  static userHasScrolled = false;
  static skipNextScrollEvent = false;
  static skipNextHistoryUpdate = false;
}

export default function ChatInputPanel(props: ChatInputPanelProps) {
  const appContext = useContext(AppContext);
  const {needsRefresh, setNeedsRefresh} = useContext(SessionRefreshContext);
  const apiClient = new ApiClient(appContext);
  const navigate = useNavigate();
  const { transcript, listening, browserSupportsSpeechRecognition } =
    useSpeechRecognition();
  const [state, setState] = useState<ChatInputState>({
    value: "",
  });
  const [configDialogVisible, setConfigDialogVisible] = useState(false);
  const [imageDialogVisible, setImageDialogVisible] = useState(false);
  const [files, setFiles] = useState<ImageFile[]>([]);
  const [readyState, setReadyState] = useState<ReadyState>(
    ReadyState.OPEN
  );
      
    
  // const [firstTime, setFirstTime] = useState<boolean>(false);
  const messageHistoryRef = useRef<ChatBotHistoryItem[]>([]);

  const { addNotification } = useNotifications();

  useEffect(() => {
    messageHistoryRef.current = props.messageHistory;
    // // console.log(messageHistoryRef.current.length)
    // if (messageHistoryRef.current.length < 3) {
    //   setFirstTime(true);
    // } else {
    //   setFirstTime(false);
    // }
  }, [props.messageHistory]);

  useEffect(() => {
    if (transcript) {
      setState((state) => ({ ...state, value: transcript }));
    }
  }, [transcript]);

  useEffect(() => {
    const onWindowScroll = () => {
      if (ChatScrollState.skipNextScrollEvent) {
        ChatScrollState.skipNextScrollEvent = false;
        return;
      }

      const isScrollToTheEnd =
        Math.abs(
          window.innerHeight +
          window.scrollY -
          document.documentElement.scrollHeight
        ) <= 10;

      if (!isScrollToTheEnd) {
        ChatScrollState.userHasScrolled = true;
      } else {
        ChatScrollState.userHasScrolled = false;
      }
    };

    window.addEventListener("scroll", onWindowScroll);

    return () => {
      window.removeEventListener("scroll", onWindowScroll);
    };
  }, []);

  useLayoutEffect(() => {
    if (ChatScrollState.skipNextHistoryUpdate) {
      ChatScrollState.skipNextHistoryUpdate = false;
      return;
    }

    if (!ChatScrollState.userHasScrolled && props.messageHistory.length > 0) {
      ChatScrollState.skipNextScrollEvent = true;
      window.scrollTo({
        top: document.documentElement.scrollHeight + 1000,
        behavior: "instant",
      });
    }
  }, [props.messageHistory]);

  
  // THIS IS THE ALL-IMPORTANT MESSAGE SENDING FUNCTION
  const handleSendMessage = async () => {
    // if (!state.selectedModel) return;
    if (props.running) return;
    if (readyState !== ReadyState.OPEN) return;
    ChatScrollState.userHasScrolled = false;

    let username;
    await Auth.currentAuthenticatedUser().then((value) => username = value.username);
    
    // so that we can later retrieve the email address of user for the logs table
    const result = await Auth.currentAuthenticatedUser();
    if (!username) return;
    // const readline = require('readline').createInterface({
    //   input: process.stdin,
    //   output: process.stdout
    // });    

    let messageToSend = state.value.trim();
    console.log(messageToSend);
    const redactedMessage  = await apiClient.comprehendMedicalClient.redactText(messageToSend);
    if (messageToSend !== redactedMessage) {
      addNotification("warning", "Please do not attempt to share sensitive member information.")
      messageToSend = redactedMessage;
    }
    if (messageToSend.length === 0) {
      addNotification("error","Please do not submit blank text!");
      return;          
    }

    const startTime = new Date().getTime();
    
    setState({ value: "" });
    // let start = new Date().getTime() / 1000;
    
    try {
      props.setRunning(true);
      let receivedData = '';      
      
      messageHistoryRef.current = [
        ...messageHistoryRef.current,

        {
          type: ChatBotMessageType.Human,
          content: messageToSend,
          metadata: {
            ...props.configuration,
          },
          tokens: [],
        },
        {
          type: ChatBotMessageType.AI,
          tokens: [],
          content: receivedData,
          metadata: {},
        },
      ];
      props.setMessageHistory(messageHistoryRef.current);

      let firstTime = false;
      if (messageHistoryRef.current.length < 3) {
        firstTime = true;
      }
      // const wsUrl = 'wss://ngdpdxffy0.execute-api.us-east-1.amazonaws.com/test/';      
      const TEST_URL = appContext.wsEndpoint+"/"
      // Create a new WebSocket connection
      const TOKEN = (await Auth.currentSession()).getAccessToken().getJwtToken()  
          
      // console.log(TOKEN)
      const wsUrl = TEST_URL+'?Authorization='+TOKEN;
      //const wsUrl = appContext.wsEndpoint+"/"
      const ws = new WebSocket(wsUrl);

      let incomingMetadata: boolean = false;
      let sources = {};
      let lastDataReceived = Date.now();
      let progressTimeout: NodeJS.Timeout;

      // Smart timeout that resets when data is received
      const resetProgressTimeout = () => {
        if (progressTimeout) {
          clearTimeout(progressTimeout);
        }
        progressTimeout = setTimeout(() => {
          if (receivedData == '') {
            // Log timeout details for pattern analysis
            console.warn('Timeout occurred:', {
              messageLength: messageToSend.length,
              messagePreview: messageToSend.substring(0, 100),
              sessionId: props.session.id,
              timestamp: new Date().toISOString()
            });
            
            ws.close()
            messageHistoryRef.current.pop();
            messageHistoryRef.current.push({
              type: ChatBotMessageType.AI,
              tokens: [],
              content: 'Response timed out! The query may be too complex. Please try rephrasing or breaking it into smaller questions.',
              metadata: {},
            })
            props.setMessageHistory(messageHistoryRef.current);
          }
        }, 90000); // Increased to 90 seconds for complex queries
      };

      // Initial timeout setup
      resetProgressTimeout();

      // Event listener for when the connection is open
      ws.addEventListener('open', function open() {
        console.log('Connected to the WebSocket server');
        // readline.question('What is your question? ', question => {
        const message = JSON.stringify({
          "action": "getChatbotResponse",
          "data": {
            userMessage: messageToSend,
            chatHistory: assembleHistory(messageHistoryRef.current.slice(0, -2)),
            systemPrompt: SYSTEM_PROMPT,
            projectId: 'vgbt420420',
            user_id : username,
            session_id: props.session.id
          }
        });
        // readline.close();
        // Replace 'Hello, world!' with your message
        ws.send(message);
        // console.log('Message sent:', message);
        // });
      });
      // Event listener for incoming messages
      ws.addEventListener('message', async function incoming(data) {
        // console.log(data);        
        if (data.data.includes("<!ERROR!>:")) {
          addNotification("error",data.data);          
          ws.close();
          return;
        }
        if (data.data == '!<|EOF_STREAM|>!') {
          
          incomingMetadata = true;
          return;
          // return;
        }
        if (!incomingMetadata) {
          receivedData += data.data;
          resetProgressTimeout(); // Reset timeout when data is received
        } else {
          // Robust source parsing with error handling
          try {
            const parsedSources = JSON.parse(data.data);
            sources = { "Sources": parsedSources };
            console.log("Sources successfully parsed:", sources);
          } catch (error) {
            console.error("Failed to parse sources:", error, "Raw data:", data.data);
            // Keep sources as empty object if parsing fails, but don't break the flow
            sources = { "Sources": [] };
          }
        }

        


        // console.log(data.data);
        // Update the chat history state with the new message        
        messageHistoryRef.current = [
          ...messageHistoryRef.current.slice(0, -2),

          {
            type: ChatBotMessageType.Human,
            content: messageToSend,
            metadata: {
              ...props.configuration,
            },
            tokens: [],
          },
          {
            type: ChatBotMessageType.AI,
            tokens: [],
            content: receivedData,
            metadata: sources,
          },
        ];
        // console.log(messageHistoryRef.current)
        props.setMessageHistory(messageHistoryRef.current);
        // if (data.data == '') {
        //   ws.close()
        // }

      });
      // Handle possible errors
      ws.addEventListener('error', function error(err) {
        console.error('WebSocket error:', err);
      });
      // Handle WebSocket closure
      ws.addEventListener('close', async function close() {
        // Clear any remaining timeouts
        if (progressTimeout) {
          clearTimeout(progressTimeout);
        }
        
        // await apiClient.sessions.updateSession("0", props.session.id, messageHistoryRef.current);
        if (firstTime) {   
          // console.log("first time!", firstTime)
          // console.log("did we also need a refresh?", needsRefresh)
          Utils.delay(1500).then(() => setNeedsRefresh(true));
        }
        props.setRunning(false);        
        console.log('Disconnected from the WebSocket server');

        /* calculate response time */
        const endTime = new Date().getTime();
        const responseTime = (endTime - startTime) / 1000; // time in seconds
        console.log("Length of bot response in seconds: ", responseTime);
        const interactionData = {
          Username: result?.attributes?.email || username,
          BotMessage: receivedData,
          UserPrompt: messageToSend,
          ResponseTime: responseTime,
          //Flagged: responseTime >= 30,
        }

        apiClient.metrics.saveChatInteraction(interactionData);

      });

      

    } catch (error) {
      // setMessage('');
      console.error('Error sending message:', error);
      alert('Sorry, something has gone horribly wrong! Please try again or refresh the page.');
      props.setRunning(false);
    }
  };

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  return (
    <SpaceBetween direction="vertical" size="s">
      <div className={styles.input_container}>
        <div className={styles.input_wrapper}>
          {browserSupportsSpeechRecognition && (
            <Button
              iconName={listening ? "microphone-off" : "microphone"}
              variant="icon"
              onClick={listening ? SpeechRecognition.stopListening : SpeechRecognition.startListening}
              aria-label={listening ? "Stop voice input" : "Start voice input"}
              className={styles.voice_input_button}
            >
              <span className={styles.visually_hidden}>
                {listening ? "Stop voice input" : "Start voice input"}
              </span>
            </Button>
          )}
          <div style={{ width: '100%', position: 'relative', flex: '1 1 auto' }}>
            <label htmlFor="chat-input" className="visually-hidden">
              Type a message
            </label>
            <TextareaAutosize
              id="chat-input"
              className={styles.chatInput}
              placeholder="Type a message"
              aria-label="Message to send"
              value={state.value}
              onChange={(e) => setState({ ...state, value: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              maxRows={5}
              style={{ width: '100%', boxSizing: 'border-box', resize: 'none' }}
            />
          </div>
          <div className={styles.input_buttons_wrapper}>
            <Button
              disabled={
                readyState !== ReadyState.OPEN ||
                props.running ||
                state.value.trim().length === 0 ||
                props.session.loading
              }
              onClick={handleSendMessage}
              aria-label="Send message"
              variant="primary"
            >
              {props.running ? (
                <>
                  Loading&nbsp;&nbsp;
                  <Spinner />
                </>
              ) : (
                "Send"
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className={styles.input_controls}>
        <div>
          {/* <Select
            disabled={props.running}
            statusType={state.modelsStatus}
            loadingText="Loading models (might take few seconds)..."
            placeholder="Select a model"
            empty={
              <div>
                No models available. Please make sure you have access to Amazon
                Bedrock or alternatively deploy a self hosted model on SageMaker
                or add API_KEY to Secrets Manager
              </div>
            }
            filteringType="auto"
            selectedOption={state.selectedModel}
            onChange={({ detail }) => {
              setState((state) => ({
                ...state,
                selectedModel: detail.selectedOption,
                selectedModelMetadata: getSelectedModelMetadata(
                  state.models,
                  detail.selectedOption
                ),
              }));
              if (detail.selectedOption?.value) {
                StorageHelper.setSelectedLLM(detail.selectedOption.value);
              }
            }}
            options={modelsOptions}
          /> */}
          {/* {appContext?.config.rag_enabled && (
            <Select
              disabled={
                props.running || !state.selectedModelMetadata?.ragSupported
              }
              loadingText="Loading workspaces (might take few seconds)..."
              statusType={state.workspacesStatus}
              placeholder="Select a workspace (RAG data source)"
              filteringType="auto"
              selectedOption={state.selectedWorkspace}
              options={workspaceOptions}
              onChange={({ detail }) => {
                if (detail.selectedOption?.value === "__create__") {
                  navigate("/rag/workspaces/create");
                } else {
                  setState((state) => ({
                    ...state,
                    selectedWorkspace: detail.selectedOption,
                  }));

                  StorageHelper.setSelectedWorkspaceId(
                    detail.selectedOption?.value ?? ""
                  );
                }
              }}
              empty={"No Workspaces available"}
            />
          )} */}
        </div>
        <div className={styles.input_controls_right}>
          <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
            <div style={{ paddingTop: "1px" }}>
              {/* <ConfigDialog
                sessionId={props.session.id}
                visible={configDialogVisible}
                setVisible={setConfigDialogVisible}
                configuration={props.configuration}
                setConfiguration={props.setConfiguration}
              /> */}
            
              {/*<Button
                iconName="settings"
                variant="icon"
                onClick={() => setConfigDialogVisible(true)}
                
              />*/}
            </div>
            <StatusIndicator
              type={
                readyState === ReadyState.OPEN
                  ? "success"
                  : readyState === ReadyState.CONNECTING ||
                    readyState === ReadyState.UNINSTANTIATED
                    ? "in-progress"
                    : "error"
              }
              aria-label={`Connection status: ${connectionStatus}`}
            >
              {readyState === ReadyState.OPEN ? "Connected" : connectionStatus}
            </StatusIndicator>
          </SpaceBetween>
        </div>
      </div>
    </SpaceBetween>
  );
}
