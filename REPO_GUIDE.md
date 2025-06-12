# ITOPS RAG Chatbot Repository Guide

## Overview

This repository contains the ITOPS Retrieval-Augmented Generation (RAG) chatbot system - an enterprise-grade solution for providing accurate IT documentation access. The system features strict hallucination prevention measures and a citation system to ensure information reliability.

## Repository Structure

```
ITOPS-Cohort3/
├── bin/                    # CDK app entry point
├── lib/                    # Main application code
│   ├── authorization/      # Authentication and authorization components
│   ├── chatbot-api/        # Backend API and Lambda functions
│   │   ├── backup/         # Database backup configuration
│   │   ├── buckets/        # S3 bucket definitions
│   │   ├── functions/      # Lambda function implementations
│   │   │   ├── chat-invocations-counter/
│   │   │   ├── comprehend-medical/
│   │   │   ├── email-feedback/
│   │   │   ├── feedback-handler/
│   │   │   ├── knowledge-management/
│   │   │   ├── kpi-handler/
│   │   │   ├── llm-eval/   # LLM evaluation pipeline
│   │   │   ├── session-handler/
│   │   │   ├── step-functions/    # Step function workflows
│   │   │   │   └── llm-evaluation/
│   │   │   │       └── generate-response/    # Response generation with grounding
│   │   │   └── websocket-chat/    # WebSocket chat implementation
│   │   │       └── models/        # LLM model interfaces (Claude)
│   │   ├── gateway/        # API Gateway configuration
│   │   ├── kendra/         # Amazon Kendra search configuration
│   │   ├── monitoring/     # CloudWatch and observability
│   │   └── tables/         # DynamoDB table definitions
│   ├── shared/             # Shared utilities and components
│   └── user-interface/     # Frontend web application
│       └── app/
│           ├── public/
│           └── src/
│               ├── common/       # Shared frontend utilities
│               ├── components/   # React components
│               │   ├── chatbot/  # Chat interface components
│               │   ├── sideNavigation/
│               │   └── wrappers/
│               ├── pages/        # Application pages
│               └── styles/       # CSS and styling
└── test/                   # Test suite for CDK infrastructure
```

## Key Components

### Backend Services

1. **WebSocket Chat Handler (lib/chatbot-api/functions/websocket-chat/)**
   - Manages real-time chat sessions
   - Implements hallucination prevention with strict grounding
   - Processes and returns cited responses with source metadata

2. **Step Functions Workflow (lib/chatbot-api/functions/step-functions/)**
   - Orchestrates the response generation pipeline
   - Contains LLM prompt engineering for grounding and citation

3. **Knowledge Management (lib/chatbot-api/functions/knowledge-management/)**
   - Handles document storage, indexing, and retrieval
   - Integrates with Amazon Kendra for semantic search

### Frontend Application

1. **Chat Interface (lib/user-interface/app/src/components/chatbot/)**
   - User-facing chat experience
   - Citation display and source navigation
   - Feedback mechanisms

2. **Admin Pages (lib/user-interface/app/src/pages/admin/)**
   - Analytics and metrics dashboards
   - System configuration

## Anti-Hallucination Architecture

The system employs multiple layers to prevent hallucinations:

1. **Strict Grounding Instructions** - LLM is explicitly instructed to only use retrieved content
2. **Citation Requirements** - All generated content must reference numbered sources
3. **Temperature = 0** - Deterministic LLM responses for consistency
4. **Source-Based Response Verification** - Only information from actual retrieved documents

## Deployment

The project uses AWS CDK for infrastructure as code:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Deploy all stacks
npx cdk deploy --all
```

Key Endpoints:
- Chat Interface: CloudFront distribution
- WebSocket API: API Gateway WebSocket endpoint
- HTTP API: API Gateway REST endpoint

## Citation System

The citation system provides:

1. **Inline Citations** - References in the format [1], [2], etc.
2. **Source Links** - Clickable references to original documents
3. **Source Metadata** - Document titles, confidence scores, and content excerpts

## Development Guidelines

When modifying the system:

1. **Maintain Strict Grounding** - Don't compromise hallucination prevention
2. **Test Citation Accuracy** - Ensure citation numbers match displayed sources
3. **Optimize Source Relevance** - Improve Kendra search and context selection
4. **Keep Temperature=0** - Avoid increasing randomness in LLM responses 