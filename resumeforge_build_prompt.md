Build a resume builder desktop app called "ResumeForge". This is a full-stack local web app
(FastAPI backend + React frontend) that runs entirely on the user's machine. No cloud, no accounts.

---

## WHAT IT IS

A GUI tool for building, editing, and exporting a resume PDF. The user maintains a "bank" of
resume content blocks (jobs, projects, education, skills, summary, interests). They drag and
drop blocks into an active layout, edit them inline, and export to PDF. An AI assistant
(local Ollama or API LLM) helps write bullets and summaries.

---

## TECH STACK

Backend: Python 3.11+, FastAPI, Uvicorn
PDF generation: WeasyPrint + Jinja2 (for HTML→PDF rendering)
CV parsing (import feature): pdfplumber (PDF), python-docx (Word)
LLM: ollama Python client (local), anthropic + openai SDKs (API) — user picks in settings
Data storage: YAML files (resume_bank.yaml, active_resume.yaml) — no database needed

Frontend: React 18 + TypeScript
Styling: Tailwind CSS + shadcn/ui components
Drag and drop: dnd-kit (@dnd-kit/core, @dnd-kit/sortable)
State management: Zustand
HTTP client: fetch (or axios)
Build tool: Vite

Start script: a single `./start.sh` that launches both FastAPI (port 8000) and Vite dev server
(port 5173), opening the browser automatically.

---

## DATA MODEL

The backend stores two YAML files:

### resume_bank.yaml — all content, never deleted from

```yaml
personal:
  name: "..."
  phone: "..."
  email: "..."
  address: "..."
  dob: "..."
  linkedin: "..."
  photo: "photo.jpg"  # optional, path relative to project dir

summary: "Optional freeform paragraph shown at top of resume below contact details."

work_experience:
  - id: loreal                          # unique slug, no spaces
    company: "L'Oréal"
    title: "Intern – Data & Analytics"
    location: "Düsseldorf, Germany"
    dates: "04/2026–Present"
    tags: [gcp, python, bigquery, etl]  # used for filtering
    bullets:
      - "Built end-to-end retailer data pipelines..."
      - "Independently scoped and delivered..."

education:
  - id: frankfurt_school_msc
    institution: "Frankfurt School of Finance & Management"
    degree: "M. Sc. – Master of Applied Data Science"
    location: "Frankfurt am Main, Germany"
    dates: "09/2024–Present"
    tags: [machine-learning, data-science]
    bullets:
      - "Relevant courses: ..."
      - "GPA: 1.5/6.0"

projects:
  - id: rag_assistant
    title: "Production RAG System — Technical Knowledge Assistant"
    dates: "2026"
    tags: [rag, llm, python]
    bullets:
      - "Developed a production-grade RAG pipeline..."

skills:
  programming: "Python (Advanced), SQL (Advanced), C++ (Advanced)"
  data_engineering: "GCP (Advanced), BigQuery (Advanced), ETL/ELT Pipelines"
  machine_learning: "Scikit-learn, TensorFlow, LightGBM, RAG/LLM Systems"
  bi_visualization: "Power BI, Tableau, Matplotlib/Plotly"
  languages: "English (Bilingual), Hindi (Native), German (B2)"

interests:
  - "Golf: Former competitive player, now an avid hobbyist"
  - "3D Printing & CAD: Enthusiast in additive manufacturing"
```

### active_resume.yaml — what appears in the current PDF output

```yaml
include_summary: true   # show/hide the summary paragraph

work_experience:
  - id: loreal
  - id: amex
    max_bullets: 2       # optional: only show first N bullets

education:
  - id: frankfurt_school_msc
  - id: thapar_be

projects:
  - id: rag_assistant
  - id: pwc_forecasting

include_skills: true
include_interests: true
```

---

## PDF TEMPLATE

Use WeasyPrint + Jinja2. The PDF template is an HTML file (template.html) styled with a
companion resume.css. The template receives a context object assembled by the backend from
the bank + active config.

### template.html

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link rel="stylesheet" href="resume.css">
</head>
<body>

<!-- HEADER -->
<div class="header">
  {% if photo_exists %}
  <div class="header-photo">
    <img src="{{ photo_path }}" alt="Photo">
  </div>
  {% endif %}
  <div class="header-info {% if not photo_exists %}header-info-no-photo{% endif %}">
    <h1>{{ personal.name }}</h1>
    <div class="contact-grid">
      <div><span class="label">Mobile:</span> {{ personal.phone }}</div>
      <div><span class="label">E-mail:</span> {{ personal.email }}</div>
      <div><span class="label">Address:</span> {{ personal.address }}</div>
      <div><span class="label">Date and place of birth:</span> {{ personal.dob }}</div>
      <div><span class="label">LinkedIn:</span> {{ personal.linkedin }}</div>
    </div>
  </div>
</div>

{% if summary %}
<div class="section">
  <h2 class="section-title">PROFESSIONAL SUMMARY</h2>
  <p class="summary-text">{{ summary }}</p>
</div>
{% endif %}

{% if work_experience %}
<div class="section">
  <h2 class="section-title">WORK EXPERIENCE</h2>
  {% for job in work_experience %}
  <div class="entry">
    <div class="entry-header">
      <div class="entry-left">
        <div class="entry-company">{{ job.company }}</div>
        <div class="entry-subtitle">{{ job.title }}</div>
      </div>
      <div class="entry-right">
        <div class="entry-location">{{ job.location }}</div>
        <div class="entry-dates">{{ job.dates }}</div>
      </div>
    </div>
    <ul class="bullets">
      {% for bullet in job.bullets %}<li>{{ bullet }}</li>{% endfor %}
    </ul>
  </div>
  {% endfor %}
</div>
{% endif %}

{% if education %}
<div class="section">
  <h2 class="section-title">EDUCATION</h2>
  {% for edu in education %}
  <div class="entry">
    <div class="entry-header">
      <div class="entry-left">
        <div class="entry-company">{{ edu.institution }}</div>
        <div class="entry-subtitle">{{ edu.degree }}</div>
      </div>
      <div class="entry-right">
        <div class="entry-location">{{ edu.location }}</div>
        <div class="entry-dates">{{ edu.dates }}</div>
      </div>
    </div>
    {% if edu.bullets %}
    <ul class="bullets">
      {% for bullet in edu.bullets %}<li>{{ bullet }}</li>{% endfor %}
    </ul>
    {% endif %}
  </div>
  {% endfor %}
</div>
{% endif %}

{% if projects %}
<div class="section">
  <h2 class="section-title">PROJECTS</h2>
  {% for project in projects %}
  <div class="entry">
    <div class="entry-header">
      <div class="entry-left"><div class="entry-company">{{ project.title }}</div></div>
      <div class="entry-right"><div class="entry-dates">{{ project.dates }}</div></div>
    </div>
    <ul class="bullets">
      {% for bullet in project.bullets %}<li>{{ bullet }}</li>{% endfor %}
    </ul>
  </div>
  {% endfor %}
</div>
{% endif %}

{% if skills %}
<div class="section">
  <h2 class="section-title">SKILLS</h2>
  <div class="skills-block">
    <p><strong>Programming:</strong> {{ skills.programming }}</p>
    <p><strong>Data Engineering:</strong> {{ skills.data_engineering }}</p>
    <p><strong>Machine Learning:</strong> {{ skills.machine_learning }}</p>
    <p><strong>BI &amp; Visualization:</strong> {{ skills.bi_visualization }}</p>
    <p><strong>Languages:</strong> {{ skills.languages }}</p>
  </div>
</div>
{% endif %}

{% if interests %}
<div class="section">
  <h2 class="section-title">INTERESTS</h2>
  <ul class="bullets">
    {% for item in interests %}<li>{{ item }}</li>{% endfor %}
  </ul>
</div>
{% endif %}

</body>
</html>
```

### resume.css

```css
@page { size: A4; margin: 1.4cm 1.5cm 1.4cm 1.5cm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; font-size: 9.5pt; line-height: 1.35; color: #000; }

.header { display: flex; align-items: center; gap: 1.2cm; margin-bottom: 0.5cm; }
.header-photo img { width: 2.8cm; height: 3.2cm; object-fit: cover;
  object-position: center top; border-radius: 2px; }
.header-info { flex: 1; }
.header-info-no-photo { text-align: center; }
.header-info h1 { font-size: 22pt; font-weight: bold; margin-bottom: 0.25cm; }
.contact-grid { display: flex; flex-direction: column; gap: 2px; }
.contact-grid div { font-size: 9pt; }
.label { font-weight: bold; }

.section { margin-bottom: 0.2cm; }
.section-title { font-size: 10pt; font-weight: bold; text-transform: uppercase;
  border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 0.2cm; }

.entry { margin-bottom: 0.22cm; }
.entry-header { display: flex; justify-content: space-between;
  align-items: flex-start; gap: 0.5cm; }
.entry-left { flex: 1; }
.entry-right { text-align: right; white-space: nowrap; flex-shrink: 0; }
.entry-company { font-weight: bold; font-size: 9.5pt; }
.entry-subtitle { font-style: italic; font-size: 9pt; }
.entry-location { font-weight: bold; font-size: 9pt; }
.entry-dates { font-size: 9pt; }

ul.bullets { margin-top: 2px; margin-left: 0.4cm; padding-left: 0.3cm; }
ul.bullets li { font-size: 9pt; margin-bottom: 1.5px; list-style-type: disc; }

.summary-text { font-size: 9pt; line-height: 1.4; }
.skills-block p { font-size: 9pt; margin-bottom: 2px; }
```

---

## BACKEND API ENDPOINTS

All endpoints under FastAPI. CORS enabled for localhost:5173.

```
GET  /api/bank                        → returns full resume_bank.yaml as JSON
PUT  /api/bank/personal               → update personal details
PUT  /api/bank/summary                → update summary text

GET  /api/bank/blocks/{section}       → list blocks for section (work_experience|education|projects)
POST /api/bank/blocks/{section}       → add new block to bank
PUT  /api/bank/blocks/{section}/{id}  → update a block's fields/bullets
DELETE /api/bank/blocks/{section}/{id} → remove block from bank permanently

GET  /api/active                      → returns active_resume.yaml as JSON
PUT  /api/active                      → save entire active config (order, visibility,
                                        max_bullets, include_summary, include_skills,
                                        include_interests)

GET  /api/skills                      → get skills object
PUT  /api/skills                      → update skills object

GET  /api/interests                   → get interests list
PUT  /api/interests                   → update interests list

GET  /api/preview                     → renders template with current active config,
                                        returns HTML string
POST /api/build                       → generates PDF, returns as application/pdf download

POST /api/ai/bullets                  → body: {text: "freeform description", model: "...",
                                          provider: "ollama|anthropic|openai"}
                                        → returns {bullets: ["...", "...", "..."]}
POST /api/ai/summary                  → body: {model: "...", provider: "..."}
                                        → collects all active blocks, generates a 3-sentence
                                          summary → returns {summary: "..."}

POST /api/import                      → multipart form upload of PDF or DOCX
                                        → extracts text, sends to LLM, parses into bank
                                          structure → returns draft bank JSON (user reviews
                                          before saving)

GET  /api/settings                    → returns current settings (llm provider, ollama model,
                                        etc.) with API keys masked
PUT  /api/settings                    → save settings to settings.json
GET  /api/ollama/models               → proxies GET http://localhost:11434/api/tags,
                                        returns model list
```

---

## FRONTEND LAYOUT

Single page app. Three-panel layout:

```
┌─────────────────────────────────────────────────────────────────┐
│  ResumeForge                              [Settings] [Export PDF]│
├──────────────────┬──────────────────────────┬───────────────────┤
│                  │                          │                   │
│   BLOCK BANK     │     ACTIVE RESUME        │   LIVE PREVIEW    │
│                  │                          │                   │
│  All blocks in   │  Drag-and-drop canvas.   │  Iframe showing   │
│  the bank,       │  Sections are stacked    │  GET /api/preview │
│  grouped by      │  panels. Each block is   │  Updates on every │
│  section.        │  a card: toggle on/off,  │  change.          │
│                  │  set max_bullets, drag   │                   │
│  Click any to    │  to reorder. Click to    │                   │
│  edit. Button    │  open edit modal.        │                   │
│  to add new.     │                          │                   │
│                  │  [+ Add from bank]       │                   │
│  [+ Add Block]   │                          │                   │
│  [Import CV]     │                          │                   │
│                  │                          │                   │
└──────────────────┴──────────────────────────┴───────────────────┘
```

### Key UI components

**BlockCard** — used in both panels
- Shows company/title (or project title) and date range
- Checkbox or toggle to include/exclude from active resume
- Drag handle for reordering
- Click → opens BlockEditModal

**BlockEditModal** — full edit experience
- Fields: company, title, location, dates, tags (as tag chips)
- Bullet list: each bullet is an editable text input, draggable to reorder, delete button
- "Add bullet manually" button
- AI Write panel (collapsible): textarea for freeform description → "Generate bullets" →
  shows AI suggestions → user clicks to add each one to the bullet list
- Save / Cancel

**SummaryCard** — at top of active canvas
- Toggle to include/exclude
- Click to edit inline or in modal
- "Generate with AI" button → calls /api/ai/summary

**SkillsEditor** — edit the 5 skills category strings inline (programming, data_engineering,
machine_learning, bi_visualization, languages)

**InterestsEditor** — editable list of interest strings, add/remove

**ImportCV modal**
- File upload (PDF or DOCX) or paste-as-text textarea
- "Parse with AI" → shows structured draft for review
- User can accept all / accept individual sections / discard

**Settings panel/modal**
- LLM Provider: toggle between "Local (Ollama)" and "API"
- If Ollama: dropdown of available models from /api/ollama/models
- If API: provider dropdown (Anthropic / OpenAI), API key input (stored in settings.json,
  never returned to frontend after saving), model name input

---

## AI SYSTEM PROMPTS

### Bullets prompt

```
You are a professional resume writer. Convert the following description of work experience
into 2-3 concise, impactful resume bullet points. Each bullet should:
- Start with a strong action verb (past tense)
- Be specific and quantify impact where possible
- Be one sentence, under 120 characters
- Use professional language suitable for a data/engineering role

Return only a JSON object: {"bullets": ["...", "...", "..."]}

Description: {user_text}
```

### Summary prompt

```
You are a professional resume writer. Based on the following work experience and projects,
write a 2-3 sentence professional summary for the top of a resume. It should:
- Be written in third person implied (no "I")
- Highlight the candidate's main domain, strongest tools, and career level
- End with what they bring to a team

Return only a JSON object: {"summary": "..."}

Experience:
{active_blocks_summary}
```

---

## PROJECT STRUCTURE

```
resumeforge/
├── backend/
│   ├── main.py              # FastAPI app, all routes
│   ├── bank.py              # YAML read/write helpers
│   ├── builder.py           # PDF build logic (WeasyPrint + Jinja2)
│   ├── ai.py                # LLM routing (ollama / anthropic / openai)
│   ├── importer.py          # CV import: pdfplumber + docx + LLM parse
│   ├── template.html        # Jinja2 resume template
│   ├── resume.css           # PDF stylesheet
│   ├── resume_bank.yaml     # user's content bank (seed with real data below)
│   ├── active_resume.yaml   # current active config (seed with real data below)
│   └── settings.json        # llm provider, model, api keys
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── BlockCard.tsx
│   │   │   ├── BlockEditModal.tsx
│   │   │   ├── SummaryCard.tsx
│   │   │   ├── SkillsEditor.tsx
│   │   │   ├── InterestsEditor.tsx
│   │   │   ├── LivePreview.tsx
│   │   │   ├── ImportModal.tsx
│   │   │   └── SettingsModal.tsx
│   │   ├── store/
│   │   │   └── useResumeStore.ts   # Zustand store
│   │   └── api/
│   │       └── client.ts           # all fetch calls to backend
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.ts
├── start.sh                 # launches both backend + frontend
├── setup.sh                 # creates venv, installs deps, npm install
└── README.md
```

---

## BUILD ORDER

Build in this exact order, getting each working before moving to the next:

1. **Backend skeleton** — FastAPI app, CORS, GET /api/bank, GET /api/active, GET /api/preview
   returning rendered HTML, POST /api/build returning PDF download. Test with curl.

2. **Frontend skeleton** — Vite + React + Tailwind + shadcn setup. Three-panel layout (empty).
   Fetch /api/bank on load, render block titles in a list. Confirm data flows end to end.

3. **Active canvas + drag/drop** — dnd-kit sortable list for each section in the middle panel.
   PUT /api/active on every reorder. Toggle include/exclude per card.

4. **Live preview** — iframe in right panel hitting /api/preview. Auto-refresh on any state
   change (debounce 500ms).

5. **Block edit modal** — click any card → modal with all fields + bullet list editing.
   PUT /api/bank/blocks/{section}/{id} on save.

6. **AI bullets** — collapsible panel inside BlockEditModal. Textarea + Generate button →
   POST /api/ai/bullets → show results → click to add bullet.

7. **Summary** — SummaryCard at top of canvas with toggle + inline edit + AI generate button.

8. **Skills + Interests editors** — inline editors, PUT /api/skills and PUT /api/interests.

9. **Settings modal** — provider toggle, Ollama model list, API key inputs. GET/PUT /api/settings.

10. **CV Import** — ImportModal with file upload + text paste. POST /api/import → show draft →
    merge into bank.

11. **Add new block** — "Add Block" button opens blank BlockEditModal, POST to bank on save.

12. **Polish** — loading states, error toasts, keyboard shortcuts (Ctrl+S to save,
    Ctrl+E to export).

---

## DEPENDENCIES

### backend/requirements.txt

```
fastapi>=0.111
uvicorn[standard]>=0.29
pyyaml>=6.0
jinja2>=3.1
weasyprint>=61.0
pdfplumber>=0.10
python-docx>=1.1
python-multipart>=0.0.9
ollama>=0.2
anthropic>=0.28
openai>=1.30
```

### frontend package.json (key deps)

```
react, react-dom, typescript
@vitejs/plugin-react, vite
tailwindcss, @tailwindcss/vite
@radix-ui/react-dialog, @radix-ui/react-switch, @radix-ui/react-tooltip
@dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
zustand
lucide-react
```

---

## NOTES & CONSTRAINTS

- WeasyPrint on macOS requires pango installed via Homebrew (`brew install pango`).
  setup.sh should check for this and warn if missing.
- Backend uses a Python venv at backend/.venv
- All YAML writes should be atomic (write to temp file, then rename) to avoid corruption
- settings.json must never return plaintext API keys — mask them in GET /api/settings
- The live preview iframe should use the `srcdoc` attribute (not a src URL) to avoid
  caching issues
- Ollama must be running locally for local LLM — /api/ollama/models should return a clear
  error if Ollama is unreachable, and the UI should show a friendly message
- Block IDs are slugs (e.g. "loreal", "amex") — auto-generate from company name on create
- The bank is append-only from the UI: removing a block from active_resume.yaml does not
  delete it from the bank. Hard delete is a separate explicit action with a confirmation dialog.

---

## SEED DATA

Pre-populate resume_bank.yaml and active_resume.yaml with the following real data so the
app launches with a working populated example.

### resume_bank.yaml

```yaml
personal:
  name: Uday Sidhu
  phone: "+49 152 24678295"
  email: uday_singh.sidhu@fs-students.de
  address: Bocholter Str. 1, 40468 Düsseldorf
  dob: 01/03/1999 in Delhi, India
  linkedin: linkedin.com/in/udaysidhu1/
  photo: photo.jpg

summary: "Data professional with hands-on experience building production data pipelines on GCP, automating financial reporting, and applying ML to real-world business problems. MSc in Applied Data Science with a background spanning data engineering, analytics, and credit risk. Comfortable owning the full lifecycle from raw data to stakeholder-ready insight."

work_experience:
  - id: loreal
    company: "L'Oréal"
    title: "Intern – Data & Analytics"
    location: "Düsseldorf, Germany"
    dates: "04/2026–Present"
    tags: [data-engineering, gcp, python, bigquery, bi, power-bi, analytics, cloud, etl, pipeline]
    bullets:
      - "Built end-to-end retailer data pipelines on GCP within a platform serving 400+ retailers, owning the full lifecycle from source analysis and ingestion via Cloud Functions in Python, through BigQuery transformation layers, to Power BI dashboard delivery"
      - "Independently scoped and delivered a new retailer integration from scratch, including pipeline architecture and downstream dashboards tracking sell-in/sell-out, AOV and GMV"
      - "Maintained data quality and consistency across ingestion layers, applying version control and structured testing to keep production pipelines reliable"

  - id: amex
    company: "American Express"
    title: "Working Student – Credit Risk Management"
    location: "Frankfurt, Germany"
    dates: "10/2025–03/2026"
    tags: [python, sql, bigquery, gcp, credit-risk, risk-modelling, reporting, automation, analytics, finance, banking]
    bullets:
      - "Automated monthly credit risk reporting across the Germany and Austria portfolio using Python, SQL and BigQuery, freeing up roughly 4 hours of senior analyst time per day previously spent on manual work"
      - "Independently conducted model performance tracking on transaction-level risk scores, flagging prediction-delinquency divergence to the risk modelling team"
      - "Analysed high-balance delinquent accounts to support risk segmentation and early detection of deteriorating profiles"

  - id: frankfurt_school_web
    company: "Frankfurt School of Finance & Management"
    title: "Working Student – Web & CMS Development"
    location: "Frankfurt, Germany"
    dates: "07/2025–09/2025"
    tags: [html, css, web-development, cms, frontend, stakeholder-management, agency-coordination]
    bullets:
      - "Assisted in the development and rollout of new digital features, collaborating with cross-functional teams"
      - "Coordinated with an external development agency to ensure timely delivery and quality assurance"
      - "Worked with HTML and CSS to implement front-end changes and content formatting across web properties"

  - id: usability_academy
    company: "Usability Academy"
    title: "Student Developer – Data Automation"
    location: "Remote (Germany)"
    dates: "05/2025–08/2025"
    tags: [python, sql, etl, automation, make-com, data-integration, mini-job]
    bullets:
      - "Built ETL pipelines in Python and SQL to extract, transform, and integrate backend customer data across internal systems"
      - "Automated contract creation and internal record management workflows using Make.com and Python"

  - id: tcs
    company: "Tata Consultancy Services"
    title: "System Engineer"
    location: "Noida, India"
    dates: "08/2021–08/2024"
    tags: [ibm-as400, sql, databases, tableau, data-visualisation, erp, supply-chain, retail, compliance, full-time]
    bullets:
      - "Developed and optimized IBM AS/400 programs for Walgreens' distribution centers, ensuring regulatory compliance and process efficiency"
      - "Managed relational databases, implementing customer-driven changes for improved data integrity and operational performance"
      - "Designed Tableau dashboards to enhance real-time inventory tracking across retail stores and distribution centers"

education:
  - id: frankfurt_school_msc
    institution: "Frankfurt School of Finance & Management"
    degree: "M. Sc. – Master of Applied Data Science"
    location: "Frankfurt am Main, Germany"
    dates: "09/2024–Present"
    tags: [machine-learning, deep-learning, algorithms, databases, cloud, data-science, masters]
    bullets:
      - "Relevant courses: Algorithms and Data Structures, Machine Learning, Databases and Cloud Computing, Deep Learning"
      - "Current GPA: 1.5/6.0 (1.0 = Best)"

  - id: thapar_be
    institution: "Thapar Institute of Engineering and Technology"
    degree: "Bachelor of Engineering in Mechatronics"
    location: "Patiala, India"
    dates: "08/2017–06/2021"
    tags: [engineering, mechatronics, bachelors]
    bullets:
      - "GPA: 7.45/10"

projects:
  - id: rag_knowledge_assistant
    title: "Production RAG System — Technical Knowledge Assistant"
    dates: "2026"
    tags: [rag, nlp, llm, python, search, embeddings, langfuse, ragas, information-retrieval, machine-learning]
    bullets:
      - "Developed a production-grade RAG pipeline over embedded systems documentation, enabling natural language queries for hardware specs"
      - "Implemented hybrid search (dense semantic + BM25 keyword search) fused via Reciprocal Rank Fusion (RRF) and cross-encoder reranking"
      - "Integrated Langfuse for end-to-end query tracing (latency/token cost) and utilised RAGAS metrics for structural pipeline evaluation"

  - id: pwc_forecasting
    title: "Company Cooperation Project with PricewaterhouseCoopers (PwC)"
    dates: "09/2025–01/2026"
    tags: [machine-learning, forecasting, time-series, n-beats, n-hits, chronos, python, consulting, presentation, benchmarking]
    bullets:
      - "Implemented and benchmarked global forecasting models (N-BEATS, N-HiTS, Chronos-2) using PwC's Forecast+ framework across M4 and M5 competition datasets"
      - "Identified Amazon Chronos-2 as the top-performing model across accuracy, stability and runtime metrics"
      - "Presented findings at a PwC company townhall, delivering recommendations on global forecasting model selection that informed the team's approach"

  - id: bitcoin_etf
    title: "Bitcoin ETF Fund Flow Analysis"
    dates: "03/2025"
    tags: [finance, quantitative, time-series, var, econometrics, python, crypto, statistics]
    bullets:
      - "Conducted VAR (Vector Autoregression) analysis to examine lagged dependencies between Bitcoin price and ETF fund flows"
      - "Identified a strong initial co-movement which weakened over the year, indicating shifting market dynamics"
      - "Found short-term self-implicated lag dependencies at minute and hourly levels, but no long-term effects beyond three days"

skills:
  programming: "Python (Advanced), SQL (Advanced), C++ (Advanced), R (Intermediate)"
  data_engineering: "GCP (Advanced), BigQuery (Advanced), ETL/ELT Pipelines, Cloud Functions, REST APIs, Make.com, Git, CI/CD"
  machine_learning: "Scikit-learn (Advanced), TensorFlow, LightGBM, Pandas/NumPy (Advanced), RAG/LLM Systems, Time Series Forecasting"
  bi_visualization: "Power BI, Tableau, Looker, Matplotlib/Plotly"
  languages: "English (Bilingual), Hindi (Native/Bilingual), German (Goethe-Zertifikat B2, Pursuing C1)"

interests:
  - "Golf: Former competitive player, now an avid hobbyist"
  - "3D Printing & CAD: Enthusiast in computer-aided design and additive manufacturing"
  - "Table Tennis: Recreational player"
  - "Guitarist and passionate musician"
  - "Aeromodelling: Design and build RC aircraft from scratch, including electronics and airframe"
```

### active_resume.yaml

```yaml
include_summary: true

work_experience:
  - id: loreal
  - id: amex
  - id: frankfurt_school_web
  - id: usability_academy
  - id: tcs

education:
  - id: frankfurt_school_msc
  - id: thapar_be

projects:
  - id: rag_knowledge_assistant
  - id: pwc_forecasting
  - id: bitcoin_etf

include_skills: true
include_interests: true
```
