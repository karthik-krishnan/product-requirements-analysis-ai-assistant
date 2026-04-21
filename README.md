# ProductPilot — Product Backlog Assistant

ProductPilot is an AI-powered product backlog assistant that turns raw requirements into structured, INVEST-compliant agile artefacts. Connect your own LLM API key and go from a high-level brief to fully detailed epics and user stories in minutes.

---

## Quickstart

```bash
docker run -p 8080:80 karthik-krishnan/productpilot:latest
```

Open [http://localhost:8080](http://localhost:8080), click **Settings** in the sidebar, add your API key, and start building your backlog.

---

## How It Works

```
1. Context       →  Paste or upload domain & technical background documents
2. Requirements  →  Describe what you want to build; AI asks targeted clarifying questions
3. Epics         →  Review and refine AI-generated epics; edit or chat with AI per epic
4. Stories       →  Break epics into detailed user stories; validate against INVEST principles
```

---

## Features

- **AI clarification chat** — before generating epics, the AI asks targeted questions to surface gaps and ambiguities
- **Epic generation** — prioritised, categorised epics with tags; refine via inline AI chat
- **Story breakdown** — full user story structure: narrative, acceptance criteria, in/out scope, assumptions, cross-functional needs
- **INVEST validation** — scores each story against all six INVEST principles with AI-generated fix proposals
- **File attachments** — upload PDF, TXT, or MD documents as context; PDFs sent natively to Anthropic and Gemini
- **Export** — copy individual stories as Markdown, export epics or stories to Excel
- **Jira integration** — simulated push flow (ready to wire to a real Jira instance)
- **Multi-provider LLM** — Anthropic Claude, OpenAI, Azure OpenAI, Google Gemini, Ollama (local)
- **Persistent credentials** — API keys saved in browser `localStorage`; never sent to any server

---

## LLM Provider Setup

Open **Settings** (bottom-left sidebar) to configure your provider. Use **Test Connection** to verify before running the workflow.

| Provider | Required |
|---|---|
| Anthropic Claude | API key — [console.anthropic.com](https://console.anthropic.com) |
| OpenAI | API key + model (default: `gpt-4o`) |
| Azure OpenAI | Endpoint URL, API key, deployment name |
| Google Gemini | API key + model (default: `gemini-1.5-pro`) |
| Ollama (local) | Endpoint (default: `http://localhost:11434`) + model name |

> **CORS note:** LLM calls go directly from the browser to the provider API. Anthropic is supported via the `anthropic-dangerous-direct-browser-access` header. For providers that block browser cross-origin requests, run a local proxy or use Ollama.

---

## Assistance Level

The **Assistance Level** slider in Settings controls how many clarifying questions the AI asks before generating artefacts.

| Level | Questions | Best for |
|---|---|---|
| 0 | 0 | Quick draft, iterate later |
| 1 | 1–2 | Minimal guided refinement |
| 2 | 3–4 | Balanced (default) |
| 3 | 5–6 | Thorough requirements analysis |
| 4 | 7+ | Complex enterprise projects |

---

## File Attachments

Upload documents on the Context Setup screen alongside your typed context.

| Provider | TXT / MD | PDF |
|---|---|---|
| Anthropic | ✅ Native document block | ✅ Native document block |
| Google Gemini | ✅ Native inline data | ✅ Native inline data |
| OpenAI / Azure | ✅ Text injected into prompt | ❌ Not supported |
| Ollama | ✅ Text injected into prompt | ❌ Not supported |

---

## Running Locally

**Prerequisites:** Node 18+

```bash
git clone <repo-url>
cd requirement_analysis_demo
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Docker

### Run from Docker Hub

```bash
docker run -p 8080:80 karthik-krishnan/productpilot:latest
```

### Build locally

```bash
docker build -t productpilot .
docker run -p 8080:80 productpilot
```

### Docker Compose

```yaml
services:
  productpilot:
    image: karthik-krishnan/productpilot:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

```bash
docker compose up -d
```

---

## CI/CD

The included GitHub Actions workflow (`.github/workflows/docker.yml`) builds and pushes the Docker image on every push to `main` or a version tag (`v*`).

Add two secrets in **GitHub → Settings → Secrets → Actions**:

| Secret | Value |
|---|---|
| `DOCKERHUB_USERNAME` | your Docker Hub username |
| `DOCKERHUB_TOKEN` | access token from [hub.docker.com/settings/security](https://hub.docker.com/settings/security) |

The workflow also includes commented-out blocks for **AWS ECR** and **GCP Artifact Registry** as drop-in alternatives.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Export | SheetJS (xlsx) |
| LLM APIs | Anthropic, OpenAI, Google Gemini, Ollama |
| Container | Docker + nginx |

---

## Project Structure

```
src/
├── components/
│   ├── ContextCapture.tsx      # Domain & tech context + file upload
│   ├── RequirementsInput.tsx   # Requirements intake + AI clarification chat
│   ├── EpicsView.tsx           # Epic grid + edit/chat dialog
│   ├── StoryBreakdown.tsx      # Story accordion + inline INVEST validation
│   ├── StoryValidation.tsx     # INVEST scoring + fix proposals
│   ├── JiraPushModal.tsx       # Jira push simulation modal
│   └── Settings.tsx            # Provider config + test connection
├── prompts/                    # LLM prompt builders + response parsers
├── services/llm/
│   └── client.ts               # Unified LLM client (all 5 providers)
├── utils/
│   ├── export.ts               # Markdown + Excel export
│   └── files.ts                # File reading + provider attachment helpers
├── types/index.ts
└── App.tsx
```
