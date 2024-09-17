import { AppConfig } from "../types";
import { SessionsClient } from "./sessions-client";
import { KnowledgeManagementClient } from "./knowledge-management-client";
import { UserFeedbackClient } from "./user-feedback-client";
import { ComprehendMedicalClient } from "./comprehend-medical-client";
import { MetricClient } from "./metrics-client";
import { PerformanceClient } from "./performance-client";

export class ApiClient {

  private _sessionsClient: SessionsClient | undefined;
  private _knowledgeManagementClient : KnowledgeManagementClient | undefined;
  private _userFeedbackClient: UserFeedbackClient | undefined;
  private _comprehendMedicalClient: ComprehendMedicalClient | undefined;
  private _metricClient: MetricClient | undefined;
  private _performanceClient: PerformanceClient | undefined;

 
  public get performance() {
    if (!this._performanceClient) {
      this._performanceClient = new PerformanceClient(this._appConfig);
    }

    return this._performanceClient;
  }

  public get knowledgeManagement() {
    if (!this._knowledgeManagementClient) {
      this._knowledgeManagementClient = new KnowledgeManagementClient(this._appConfig);
    }

    return this._knowledgeManagementClient;
  }


  public get sessions() {
    if (!this._sessionsClient) {
      this._sessionsClient = new SessionsClient(this._appConfig);
    }

    return this._sessionsClient;
  }



  public get userFeedback() {
    if (!this._userFeedbackClient) {
      this._userFeedbackClient = new UserFeedbackClient(this._appConfig);
    }

    return this._userFeedbackClient;
  }


  public get comprehendMedicalClient() {
    if (!this._comprehendMedicalClient) {
      this._comprehendMedicalClient = new ComprehendMedicalClient(this._appConfig);
    }

    return this._comprehendMedicalClient; //
  }

  public get metrics() {
    if (!this._metricClient) {
      this._metricClient = new MetricClient(this._appConfig);
    }

    return this._metricClient; //
  }


  constructor(protected _appConfig: AppConfig) {}
}
