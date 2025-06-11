# 📁 Repository Structure Guide

## Overview

This repository contains **Ops Genie**, an AI-powered chatbot system designed for the IT Operations team at the Executive Office of Health and Human Services (EOHHS), Massachusetts. The system is built using AWS CDK (Cloud Development Kit) with a serverless architecture that includes a React frontend, multiple AWS Lambda functions, and AI/ML services.

---

## 📂 Directory Structure

### Root Level
```
ITOPS-Cohort3/
├── 📁 bin/                    # CDK application entry point
├── 📁 lib/                    # Main source code (CDK constructs & functions)
├── 📁 test/                   # Test files
├── 📄 package.json           # Node.js dependencies and scripts
├── 📄 cdk.json               # CDK configuration
├── 📄 tsconfig.json          # TypeScript configuration
├── 📄 jest.config.js         # Jest testing configuration
└── 📄 README.md              # Project documentation
```

### 🗂️ Core Components (`lib/`)

#### 1. **Authorization** (`lib/authorization/`)
- **Purpose**: Handles user authentication and API authorization
- **Key Features**:
  - WebSocket API authorizer with JWT token validation
  - Dependencies: `python-jose`, `requests`, `certifi`
- **Structure**:
  ```
  authorization/
  └── websocket-api-authorizer/    # Lambda authorizer function
      ├── 📁 bin/                  # Python executable dependencies
      └── 📦 [python-packages]/    # Required Python libraries
  ```

#### 2. **Chatbot API** (`lib/chatbot-api/`)
- **Purpose**: Core backend services for the chatbot functionality
- **Architecture**: Serverless functions with different responsibilities

##### 📁 Functions
```
functions/
├── 📁 chat-invocations-counter/     # Tracks chat usage metrics
├── 📁 comprehend-medical/           # PII detection and redaction
├── 📁 email-feedback/               # Handles user feedback via email
├── 📁 feedback-handler/             # Processes user feedback
│   └── 📁 missing-content-filter-notifier/
├── 📁 knowledge-management/         # Document management system
│   ├── 📁 delete-s3/               # S3 document deletion
│   ├── 📁 get-s3/                  # S3 document retrieval
│   ├── 📁 kendra-sync/             # Sync with AWS Kendra
│   └── 📁 upload-s3/               # S3 document upload
├── 📁 kpi-handler/                  # Key performance indicators
├── 📁 llm-eval/                     # LLM evaluation system
│   ├── 📁 eval-results-handler/
│   ├── 📁 S3-get-test-cases/
│   ├── 📁 S3-upload/
├── 📁 session-handler/              # User session management
├── 📁 step-functions/               # AWS Step Functions
│   └── 📁 llm-evaluation/          # Orchestrated LLM evaluation
│       ├── 📁 aggregate-eval-results/
│       ├── 📁 cleanup/
│       ├── 📁 eval/
│       ├── 📁 generate-response/
│       │   └── 📁 models/
│       ├── 📁 results-to-ddb/
│       ├── 📁 split-test-cases/
│       └── 📁 start-llm-eval/
└── 📁 websocket-chat/               # Real-time chat functionality
    └── 📁 models/
```

##### 📁 Infrastructure
```
chatbot-api/
├── 📁 backup/                       # Backup configurations
├── 📁 buckets/                      # S3 bucket definitions
├── 📁 gateway/                      # API Gateway configurations
├── 📁 kendra/                       # AWS Kendra search configurations
├── 📁 monitoring/                   # CloudWatch monitoring setup
└── 📁 tables/                       # DynamoDB table definitions
```

#### 3. **User Interface** (`lib/user-interface/`)
- **Purpose**: React-based frontend application
- **Framework**: React with TypeScript, AWS Amplify

##### 📁 React App Structure (`lib/user-interface/app/`)
```
app/
├── 📁 public/                       # Static assets
│   └── 📁 images/                   # Image assets
│       ├── 📁 mayflower/
│       └── 📁 welcome/
├── 📁 src/                          # Source code
│   ├── 📁 amplify/                  # AWS Amplify configuration
│   │   ├── 📁 backend/
│   │   │   ├── 📁 auth/
│   │   │   └── 📁 types/
│   │   └── 📁 hooks/
│   ├── 📁 common/                   # Shared utilities
│   │   ├── 📁 api-client/           # API client configurations
│   │   ├── 📁 helpers/              # Utility functions
│   │   ├── 📁 hooks/                # Custom React hooks
│   │   └── 📁 i18n/                 # Internationalization
│   ├── 📁 components/               # React components
│   │   ├── 📁 chatbot/              # Chatbot-specific components
│   │   ├── 📁 sideNavigation/       # Navigation components
│   │   └── 📁 wrappers/             # Layout wrappers
│   ├── 📁 pages/                    # Page components
│   │   ├── 📁 admin/                # Admin interface
│   │   └── 📁 chatbot/              # Chatbot pages
│   │       ├── 📁 playground/       # Chat playground
│   │       └── 📁 sessions/         # Chat sessions
│   ├── 📁 styles/                   # CSS/styling files
│   ├── 📄 app.tsx                   # Main app component
│   ├── 📄 main.tsx                  # App entry point
│   └── 📄 global.d.ts               # TypeScript global types
└── 📁 amplify/                      # Amplify configuration
    ├── 📁 backend/
    └── 📁 hooks/
```

#### 4. **Shared** (`lib/shared/`)
- **Purpose**: Common utilities and configurations shared across services

---

## 🛠️ Technology Stack

### Infrastructure & DevOps
- **AWS CDK**: Infrastructure as Code
- **AWS CloudFormation**: Resource provisioning
- **TypeScript**: Primary language for CDK constructs

### Backend Services
- **AWS Lambda**: Serverless compute
- **AWS API Gateway**: WebSocket API
- **AWS DynamoDB**: NoSQL database
- **AWS S3**: Object storage
- **AWS Step Functions**: Workflow orchestration

### AI/ML Services
- **AWS Bedrock**: Large Language Models
- **AWS Kendra**: Intelligent search
- **AWS Comprehend Medical**: PII detection

### Frontend
- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **AWS Cloudscape**: Design system
- **AWS Amplify**: Frontend deployment

### Authentication
- **AWS Cognito**: User authentication
- **JWT**: Token-based authorization

---

## 🔧 Key Configuration Files

| File | Purpose |
|------|---------|
| `cdk.json` | CDK application configuration and feature flags |
| `package.json` | Node.js dependencies and npm scripts |
| `tsconfig.json` | TypeScript compiler configuration |
| `jest.config.js` | Jest testing framework configuration |

---

## 📊 Data Flow

### Chat Interaction Flow
1. **User Input** → React Frontend
2. **WebSocket Connection** → API Gateway
3. **Authentication** → Cognito + Lambda Authorizer
4. **Message Processing** → WebSocket Chat Lambda
5. **Knowledge Retrieval** → Kendra Search
6. **AI Response** → AWS Bedrock
7. **PII Detection** → Comprehend Medical
8. **Response** → WebSocket → Frontend

### Document Management Flow
1. **Upload** → S3 Bucket
2. **Processing** → Knowledge Management Lambda
3. **Indexing** → Kendra Sync
4. **Availability** → Chat System

---

## 🎯 Key Features by Component

### 🤖 Chat System
- Real-time WebSocket communication
- AI-powered responses with source citations
- PII protection and redaction
- Session management

### 📊 Analytics & Monitoring
- Chat invocation tracking
- KPI metrics collection
- LLM evaluation system
- User feedback processing

### 🔍 Knowledge Management
- Document upload/download
- Kendra search integration
- SharePoint synchronization
- Content versioning

### 🔐 Security
- JWT-based authentication
- PII detection and redaction
- Secure WebSocket connections
- Role-based access control

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- AWS CLI configured
- AWS CDK CLI installed
- TypeScript knowledge

### Development Workflow
1. **Install dependencies**: `npm install`
2. **Build project**: `npm run build`
3. **Run tests**: `npm test`
4. **Deploy**: `npm run cdk deploy`

### Common Commands
```bash
# Build the project
npm run build

# Watch for changes
npm run watch

# Run tests
npm test

# CDK commands
npm run cdk deploy    # Deploy to AWS
npm run cdk diff      # Show differences
npm run cdk synth     # Synthesize CloudFormation
```

---

## 📈 Monitoring & Evaluation

The system includes comprehensive monitoring through:
- **CloudWatch**: Infrastructure metrics
- **Custom KPIs**: Business metrics
- **LLM Evaluation**: AI response quality
- **User Feedback**: Satisfaction tracking

---

## 🔄 Data Sources

- **Primary**: SharePoint integration via Kendra
- **Secondary**: S3-based document storage
- **Configuration**: DynamoDB tables
- **Logs**: CloudWatch Logs

---

## 🎨 UI/UX Design

The frontend follows AWS Cloudscape Design System principles:
- **Consistent**: Standardized components
- **Accessible**: WCAG compliance
- **Responsive**: Mobile-friendly design
- **Professional**: Government-appropriate styling

---

## 📝 Development Notes

- **Naming Convention**: Uses `gen-ai-mvp` as the base name
- **TypeScript**: Strict type checking enabled
- **Testing**: Jest framework with comprehensive coverage
- **Code Quality**: ESLint and Prettier configured
- **Documentation**: Inline comments and README files

---

This guide provides a comprehensive overview of the repository structure. For specific implementation details, refer to the individual component documentation and source code comments.