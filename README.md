# ResuForge

A local-first resume builder with AI assistance and job matching. No accounts, no cloud, no subscriptions — runs entirely on your machine.

---

## Features

- **Block Bank** — store all your work experience, education, and projects in one place; reuse across applications
- **Active Resume** — toggle and reorder blocks to tailor your resume for each application
- **AI Writing** — generate bullet points and professional summaries via OpenAI, Anthropic, or Ollama (local)
- **Resumatch** — paste a job description and get a calibrated fit score, skill gaps, concerns, and suggestions
- **Version Snapshots** — save named versions of your entire resume (bank + selection) and restore them fully
- **CV Import** — import a PDF, DOCX, or plain text CV and parse it into your block bank with AI
- **Live Preview** — see your resume update in real time as you edit
- **PDF Export** — export a clean A4 PDF via WeasyPrint
- **Photo Upload** — add a profile photo with circle or rectangle cropping
- **Custom Fields** — add any personal info fields beyond the defaults (GitHub, portfolio, etc.)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13, FastAPI, Uvicorn |
| PDF rendering | WeasyPrint + Jinja2 |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS v4 |
| State | Zustand |
| Drag and drop | @dnd-kit |
| AI providers | OpenAI, Anthropic, Ollama (local) |

---

## Setup

### Prerequisites

- Python 3.11+ (3.13 recommended)
- Node.js 18+
- [WeasyPrint system dependencies](https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#installation) for your OS

### Install & run

```bash
# 1. Backend
cd resumeforge/backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 2. Frontend (new terminal)
cd resumeforge/frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Configuration

On first launch, open **Settings** in the top bar to configure your AI provider:

| Provider | Notes |
|---|---|
| **Ollama** (default) | Runs locally — no API key needed. Install [Ollama](https://ollama.com) and pull a model, e.g. `ollama pull llama3` |
| **OpenAI** | Enter your API key and model (e.g. `gpt-4o-mini`) |
| **Anthropic** | Enter your API key and model (e.g. `claude-haiku-4-5-20251001`) |

---

## Data & Privacy

All data lives locally in `resumeforge/backend/`:

| File | Contents |
|---|---|
| `resume_bank.yaml` | All your blocks and their content |
| `active_resume.yaml` | Current block selection and ordering |
| `snapshots.json` | Saved resume versions |
| `settings.json` | AI provider config and API keys |
| `photo.jpg` | Profile photo |

None of these files are tracked by git. Your data never leaves your machine — except for AI API calls when using a cloud provider.

---

## Project Structure

```
resumeforge/
├── backend/
│   ├── main.py          # FastAPI app and all endpoints
│   ├── ai.py            # AI provider routing and prompts
│   ├── builder.py       # Resume HTML/PDF rendering
│   ├── bank.py          # YAML read/write helpers
│   ├── importer.py      # CV import and text extraction
│   └── template.html    # Jinja2 resume template
└── frontend/
    └── src/
        ├── App.tsx
        ├── api/          # API client
        ├── components/   # UI components
        └── store/        # Zustand state
```
