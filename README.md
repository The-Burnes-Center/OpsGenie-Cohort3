# 🤖 Ops Genie

> _AI-powered chatbot that helps the IT Operations team from Health and Human Services, MA have a unified knowledge base and get information quickly through intelligent queries._


## ✨ What It Does

- 🔍 **Intelligent Query Handling**: Ask questions and get accurate answers with source citations  
  Provides instant access to IT operations information with references to original documentation.
  ![image](https://github.com/user-attachments/assets/8d93cd74-1c2e-4a25-8173-a30d4f7673b4)


- 📊 **LLM Evaluation**: Built-in evaluation system for monitoring AI response quality  
  Ensures consistent and reliable performance through automated testing and metrics.
  ![image](https://github.com/user-attachments/assets/41c364de-c051-4ed9-bdfa-e47b40dc101c)

- 🔒 **PII Protection**: Automatic detection and redaction of sensitive information  
  Uses AWS Comprehend Medical to identify and protect personally identifiable information.
  ![image](https://github.com/user-attachments/assets/a9c48562-2cee-4828-8fb6-f081fec570fb)


- 📈 **KPI Metrics**: Real-time monitoring and analytics dashboard  
  Track usage patterns, response times, and system performance metrics.
  ![image](https://github.com/user-attachments/assets/ddbe9b27-ff9f-4710-af64-66493e73d603)

- 💬 **Feedback Collection**: User feedback system for continuous improvement  
  Collects thumbs up/down feedback and detailed user comments to enhance the system.
  ![image](https://github.com/user-attachments/assets/f0d2e53a-ebd6-4bc5-af26-afe8c39980b0)


---

## 🏗️ Architecture

![System Architecture](https://lucid.app/lucidchart/0d7467b5-9218-4c5f-98a3-670fc96da88a/edit?viewport_loc=-514%2C238%2C3108%2C1354%2C0_0&invitationId=inv_47165b85-e37b-4b9c-a2b4-8d5f9aee1ec3)

![image](https://github.com/user-attachments/assets/3136a80c-a5f7-47ce-a205-b06b19bd3201)


---

## 🛠️ Tech Stack

| Layer          | Tools & Frameworks                                      |
|----------------|---------------------------------------------------------|
| **Frontend**   | React, TypeScript, AWS Cloudscape Design System         |
| **Backend**    | AWS Lambda, WebSocket API, DynamoDB                     |
| **AI/ML**      | AWS Bedrock, AWS Kendra, AWS Comprehend Medical         |
| **Infra/DevOps**| AWS CDK, CloudFormation                                |

---

## ⚡ Setup

> _Refer to setup documentation for detailed installation and configuration instructions._
> [Implementation Playbook](https://docs.google.com/document/d/1YqcMh-ubh5ryxv_fhOnpF6yVk5QV0B-GSeOG4oRiwgI/edit?usp=sharing)


## 🔐 Security & Privacy

- **PII Redaction**: Automatic detection and removal of personally identifiable information using AWS Comprehend Medical
- **Secure Authentication**: User authentication and session management
- **Data Protection**: All sensitive data is processed and stored securely within AWS infrastructure
- **Automatic Data Sync**: All the data is synced in the solution via Sharepoint securely with AWS Sharepoint Connector.

---

## 🚧 Roadmap

- [ ] Implement agentic architecture for enhanced AI capabilities
- [ ] Additional features to be determined based on user feedback

---

## 🤝 Contributing

This project was inspired by MEC (Massachusetts Enrollment Center) initiatives.

---

## 👥 Authors & Acknowledgements

- **Built by**: [Prasoon Raj](https://github.com/Pra-soon) and [Deepikasai Mettu  ](https://github.com/deepikasai-mettu)
- **Organization**: Burnes Center for Social Change  
- **Created for**: Executive Office of Health and Human Services (EOHHS), Massachusetts

**Unique Value Proposition**: This is the first dedicated IT operations chatbot for Health and Human Services, MA. It stays current by syncing with their SharePoint systems, ensuring users always have access to the most up-to-date information and procedures.



