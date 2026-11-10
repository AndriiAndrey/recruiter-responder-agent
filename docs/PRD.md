# Product Requirements Document (PRD): Local AI Recruiter Responder Agent

## 1. Product Description

The Local AI Recruiter Responder Agent is a privacy-first, fully local full-stack desktop web application designed to help software engineers track, analyze, and draft contextual responses to technical recruiters on LinkedIn. Built using the TanStack Start framework and backed by a local SQLite database, the application acts as an interactive command center.

Instead of relying on unstable or risk-prone LinkedIn scrapers, users manually create isolated workspace chat channels for each recruiter. By pasting messages directly into an interactive Chat UI, users can review the dialogue and click an action button to leverage a local AI model (any OpenAI-compatible endpoint, e.g., oMLX/MLX on Apple Silicon) configured via environment variables (local by default). The model reviews the entire message history alongside a single local markdown file (`context.md`) containing the user's CV and project experience to accurately draft professional responses or selectively formulate clarifying questions about the role.

## 2. Product Goals

- **Privacy-First, Local-By-Default AI:** All data (chat history, resumes, prompts, drafts) stays on the user's local machine by default. The AI runs through a user-configured **OpenAI-compatible endpoint** — local by default (e.g., oMLX/MLX, LM Studio, llama.cpp on Apple Silicon), but the user may explicitly point it at a remote endpoint, in which case prompt data is sent to that service. No telemetry, analytics, or unconfigured third-party calls are ever made.
- **Streamlined Pipeline Tracking:** Replace chaotic markdown file logs with a structured, multi-chat workspace to easily monitor multiple interview/recruitment loops concurrently.
- **Deterministic AI Generation:** Eliminate hallucinated skills or falsified project metrics by strictly anchoring the model's knowledge base to a single source of truth document.
- **Minimalist, High-Performance UX:** Provide a blazing-fast, single-pane application experience tailored for quick message copy-pasting, editing, and staging.

## 3. Must-Have Requirements

### 🛠️ Core Technology Stack

- **Framework:** TanStack Start (Full-stack React with Server Functions).
- **AI Execution:** Any OpenAI-compatible model endpoint (local by default — e.g., oMLX/MLX, LM Studio, or llama.cpp on Apple Silicon — configured via `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL_NAME`; a remote endpoint is an explicit user opt-in).
- **Database:** Local SQLite database file stored directly within the project directory.
- **Data Context:** A single local markdown file (`data/context.md`) inside the project containing the user's comprehensive CV and project history.

### 💬 Thread & Chat Management

- **Multi-Chat Workspace:** A persistent sidebar navigation pane listing separate conversation channels grouped by the recruiter's name and company.
- **Manual Thread Creation:** A dedicated Plus (+) icon/button that opens a creation dialog to initialize a new recruiter conversation stream.
- **Bi-directional Input Form:** An input terminal with an explicit toggle distinguishing each message's sender:
  1. Messages pasted directly from a recruiter (the opponent) on LinkedIn.
  2. The user's own sent replies.
  3. The user's private notes.
  All three are part of the conversation history and are provided to the AI as full context.
- **Persistent Sequential Logging:** A database action to commit all entered messages chronologically to the local SQLite file. Committed messages can be edited or deleted by the user.

### 🤖 On-Demand AI Reasoning (Model Integration)

- **Explicit Action-Triggered Generation:** AI replies must never generate automatically on text entry. Generation must only occur when the user clicks an explicit "Generate AI Answer" button.
- **Contextual Anchor Constraints:** The system prompt must restrict the local model to only generate text based on the local CV text and the exact chronology of the chosen chat thread.
- **Ambiguity Detection:** The model must analyze the recruiter's inquiry for information missing from standard requests (such as salary bounds, specific tech stacks, remote rules, or role expectations) and proactively write clarifying questions.
- **Staged Text Review:** Generated AI drafts must output directly into an editable text field, allowing the user to read, refine, or rewrite the draft before committing it to the local history database.
