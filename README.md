# ProductPilot — AI-Powered Requirements Studio

ProductPilot transforms raw product ideas into structured agile artefacts using large language models. It guides teams through a four-step workflow — from high-level context capture to fully validated, INVEST-compliant user stories — with real-time AI assistance at every stage.

---

## Features

- **Context capture** — document domain knowledge and technical constraints that inform all downstream AI calls
- **Requirements intake** — paste or type requirements; the AI asks targeted clarifying questions before generating epics
- **Epic generation** — produces a prioritised, categorised set of epics with edit and AI-chat refinement per epic
- **Story breakdown** — breaks any epic into detailed user stories (narrative, acceptance criteria, in/out scope, assumptions, cross-functional needs)
- **INVEST validation** — analyses each story against all six INVEST principles with scored feedback, AI-generated fix proposals, and a one-click "Fix All" action
- **Inline story chat** — discuss and refine individual stories without leaving the breakdown view
- **Multi-provider LLM support** — Anthropic Claude, OpenAI, Azure OpenAI, Google Gemini, Ollama (local)
- **Demo mode** — works out of the box with sample data; no API key required to explore the UI
- **Persistent credentials** — API keys are saved in browser `localStorage`; they never touch the server

---

## Workflow

```
1. Context       →  Domain & technical background
2. Requirements  →  Intake + AI clarification Q&A + epic generation
3. Epics         →  Review, edit, and chat about generated epics
4. Stories       →  Per-epic story breakdown + inline INVEST validation
```

---

## Tech Stack

| Layer     | Technology                               |
|-----------|------------------------------------------|
| UI        | React 18, TypeScript, Vite               |
| Styling   | Tailwind CSS                             |
| Icons     | Lucide React                             |
| LLM APIs  | Anthropic, OpenAI, Google Gemini, Ollama |
| Container | Docker + nginx (static SPA server)       |

---

## Running Locally

**Prerequisites:** Node 18+

```bash
git clone <repo-url>
cd requirement_analysis_demo
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The app works in demo mode immediately — click **Settings** in the sidebar to wire up a real LLM provider.

---

## Docker

### Build and run

```bash
docker build -t productpilot .
docker run -p 8080:80 productpilot
```

Open [http://localhost:8080](http://localhost:8080).

### Docker Compose

```yaml
services:
  productpilot:
    build: .
    ports:
      - "8080:80"
    restart: unless-stopped
```

```bash
docker compose up -d
```

---

## CI/CD — Automated Docker Builds

The included GitHub Actions workflow (`.github/workflows/docker.yml`) builds and pushes the Docker image on every push to `main` or a version tag (`v*`).

### Docker Hub (default)

1. Create an access token at [hub.docker.com/settings/security](https://hub.docker.com/settings/security)
2. Add two secrets in **GitHub → Settings → Secrets → Actions**:

| Secret               | Value                        |
|----------------------|------------------------------|
| `DOCKERHUB_USERNAME` | your Docker Hub username     |
| `DOCKERHUB_TOKEN`    | the access token you created |

Push to `main` → image published as `<username>/productpilot:latest`.

### Alternative registries

The workflow file contains commented-out blocks for **AWS ECR** and **GCP Artifact Registry**. Swap the login and image-name steps for whichever registry you use — no other changes needed.

---

## LLM Provider Configuration

Open **Settings** (bottom-left of the sidebar) to configure your provider.

| Provider        | Required fields                                          |
|-----------------|----------------------------------------------------------|
| Anthropic Claude| API key ([console.anthropic.com](https://console.anthropic.com)) |
| OpenAI          | API key + model (default: `gpt-4o`)                     |
| Azure OpenAI    | Endpoint URL, API key, deployment name                   |
| Google Gemini   | API key + model (default: `gemini-1.5-pro`)              |
| Ollama (local)  | Endpoint (default: `http://localhost:11434`) + model name|

Use the **Test Connection** button to verify your credentials before running the workflow.

To reset to demo mode, open Settings and clear your API key, or run this in the browser console:

```js
localStorage.removeItem('productpilot_settings')
```

> **Browser CORS note:** LLM calls go directly from the browser to the provider API. Anthropic is supported via the `anthropic-dangerous-direct-browser-access` header. For providers that block browser cross-origin requests, run a local proxy or use Ollama.

---

## Assistance Level

The **Assistance Level** slider in Settings controls how many clarifying questions the AI asks before generating artefacts.

| Level | Questions | Best for                        |
|-------|-----------|---------------------------------|
| 0     | 0         | Quick draft, iterate later      |
| 1     | 1–2       | Minimal guided refinement       |
| 2     | 3–4       | Balanced (default)              |
| 3     | 5–6       | Thorough requirements analysis  |
| 4     | 7+        | Complex enterprise projects     |

---

## Project Structure

```
src/
├── components/
│   ├── Settings.tsx            # Provider config + test connection
│   ├── ContextCapture.tsx      # Domain & tech context input
│   ├── RequirementsInput.tsx   # Requirements intake + AI clarification chat
│   ├── EpicsView.tsx           # Epic grid + edit/chat dialog
│   ├── StoryBreakdown.tsx      # Story accordion + inline INVEST validation
│   └── StoryValidation.tsx     # ValidationSection (exported for reuse)
├── prompts/                    # LLM prompt builders + response parsers
│   ├── system.ts
│   ├── clarifyingQuestions.ts
│   ├── generateEpics.ts
│   ├── generateStories.ts
│   ├── validateINVEST.ts
│   └── fixINVEST.ts
├── services/llm/
│   └── client.ts               # Unified LLM client (all 5 providers)
├── data/
│   └── mockData.ts             # Demo-mode fallback data
├── types/
│   └── index.ts
└── App.tsx
```
