import json
import re
from pathlib import Path

SETTINGS_FILE = Path(__file__).parent / "settings.json"


def load_settings() -> dict:
    with open(SETTINGS_FILE) as f:
        return json.load(f)


def _extract_json(text: str) -> dict:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return json.loads(match.group())
    raise ValueError("No JSON found in LLM response")


def generate_bullets(
    text: str,
    provider: str = None,
    model: str = None,
    extra_context: str = None,
    block_context: dict = None,
    candidate_name: str = None,
) -> list[str]:
    settings = load_settings()
    provider, model = _resolve_provider(provider or settings.get("llm_provider", "ollama"), model, settings)

    # Build role context block
    role_lines = []
    if block_context:
        if block_context.get("company"):
            role_lines.append(f"Company: {block_context['company']}")
        if block_context.get("title"):
            role_lines.append(f"Role: {block_context['title']}")
        if block_context.get("location"):
            role_lines.append(f"Location: {block_context['location']}")
        if block_context.get("dates"):
            role_lines.append(f"Dates: {block_context['dates']}")
    role_section = "\n".join(role_lines) if role_lines else "Not specified"

    extra_instruction = f"\nAdditional style instruction from the user: {extra_context.strip()}" if extra_context and extra_context.strip() else ""

    candidate_line = f" for {candidate_name}" if candidate_name else ""

    prompt = f"""You are an expert resume writer crafting bullet points{candidate_line}.

Role context:
{role_section}

Task: Convert the description below into 2–3 concise, impactful resume bullet points.

Rules for each bullet:
- Open with a strong past-tense action verb (e.g. Built, Automated, Reduced, Led, Delivered)
- Be specific — name tools, technologies, scale, or stakeholders where relevant
- Quantify impact wherever possible (time saved, % improvement, team size, data volume)
- One sentence, ideally under 120 characters
- Write at the level of a high-performing data/engineering professional{extra_instruction}

Return ONLY a JSON object in this exact format:
{{"bullets": ["...", "...", "..."]}}

Description to convert:
{text}"""

    return _call_llm(prompt, provider, model, settings).get("bullets", [])


def generate_summary(
    active_blocks_detail: str,
    provider: str = None,
    model: str = None,
    extra_context: str = None,
    candidate_name: str = None,
) -> str:
    settings = load_settings()
    provider, model = _resolve_provider(provider or settings.get("llm_provider", "ollama"), model, settings)

    extra_instruction = f"\nAdditional instruction from the user: {extra_context.strip()}" if extra_context and extra_context.strip() else ""
    candidate_line = f" for {candidate_name}" if candidate_name else ""

    prompt = f"""You are an expert resume writer crafting a professional summary{candidate_line}.

Below is the candidate's active resume content — work experience, education, and projects with their actual bullet points:

{active_blocks_detail}
{extra_instruction}

Task: Write a professional summary of 2–3 sentences for the top of the resume.

Rules:
- Do NOT use first person ("I", "my") — write in implied third person
- Lead with the candidate's primary domain and seniority level
- Name 2–3 of the most impressive specific tools, platforms, or techniques
- Close with what they bring to a team or organisation
- Sound confident and specific, not generic — avoid phrases like "results-driven" or "passionate about"
- Total length: 50–80 words

Return ONLY a JSON object:
{{"summary": "..."}}"""

    return _call_llm(prompt, provider, model, settings).get("summary", "")


def match_resume(
    job_description: str,
    resume_context: str,
    provider: str = None,
    model: str = None,
    candidate_name: str = None,
) -> dict:
    settings = load_settings()
    provider, model = _resolve_provider(provider or settings.get("llm_provider", "ollama"), model, settings)

    candidate_line = f" for {candidate_name}" if candidate_name else ""

    prompt = f"""You are a senior recruiter and career strategist evaluating resume fit{candidate_line}. Think carefully before scoring.

═══ RESUME ═══
{resume_context}

═══ JOB DESCRIPTION ═══
{job_description}

═══ INSTRUCTIONS ═══

Step 1 — Read the JD and extract:
- The company's industry/domain and what that implies about day-to-day environment
- Hard requirements: explicit must-haves (specific tools, degrees, certifications, years of experience)
- Any explicit language requirements (e.g. "fluent in German required") — ignore the language the JD is written in
- Soft signals: things not stated as requirements but implied by the role context (e.g. a fully German company posting signals a German-dominant workplace even without stating it; "Digital Innovation Lab" signals a loosely-defined, research-heavy role rather than a hands-on engineering role)

Step 2 — Evaluate the resume:
- Match on skills, seniority, domain relevance, and tools
- Consider TRANSFERABLE SKILLS — a data project in finance still shows data skills relevant to other industries. Do not penalise industry mismatch if the underlying skills transfer.
- Assess domain fit — does the candidate have any experience in or relevant to this industry? Niche industries (healthcare, defence, finance) carry higher domain risk.

Step 3 — Score calibration:
- 70–100 → "apply"    (strong match on hard requirements, domain fit is reasonable)
- 40–69  → "cautious" (meets core requirements but notable concerns or domain gaps)
- 0–39   → "skip"     (fundamental mismatch)
- IMPORTANT: a lack of hard gaps does NOT automatically mean a high score. Concerns, domain unfamiliarity, vague role definitions, and environmental risks should all pull the score down. Be honest — do not give 80+ unless it is genuinely a strong match.

Step 4 — Produce the five outputs:

GAPS — Hard, explicit skill or experience gaps from the JD requirements only.
- Only flag things explicitly required that the candidate clearly lacks.
- Do NOT list generic soft skills (curiosity, teamwork) as gaps.
- It is fine to return an empty list if there are no hard gaps.
- 0–4 items.

CONCERNS — Soft risks and contextual negatives that affect fit but are not hard disqualifiers.
- Domain unfamiliarity (e.g. no healthcare experience for a healthcare role)
- Environmental signals (e.g. German-dominant workplace, startup chaos, research-heavy vs. engineering-heavy)
- Vague role definitions that may not suit the candidate's trajectory
- Anything that makes this a higher-risk application even if skills match
- 2–4 items. There should almost always be something here — a perfect application with zero concerns is rare.

REMOVE — Resume content that actively hurts this specific application.
- Only flag content that is irrelevant AND wastes space that could be used for more relevant content.
- Never suggest removing something that demonstrates transferable skills, even if the topic differs.
- 0–3 items; empty list is fine.

ADD — Specific, actionable improvements.
- Name exact skills, technologies, or experience types to add.
- If an existing bullet should be reframed, say so explicitly: "Reframe the [X] bullet to emphasise [Y]".
- 3–5 items.

Return ONLY a JSON object — no prose, no markdown:
{{
  "verdict": "apply" | "cautious" | "skip",
  "score": <integer 0-100>,
  "gaps": ["..."],
  "concerns": ["..."],
  "remove": ["..."],
  "add": ["..."]
}}"""

    return _call_llm(prompt, provider, model, settings)


def parse_cv(text: str, provider: str = None, model: str = None) -> dict:
    settings = load_settings()
    provider, model = _resolve_provider(provider or settings.get("llm_provider", "ollama"), model, settings)
    prompt = f"""You are a resume parser. Extract the following CV text into a structured JSON object matching this schema exactly — do NOT wrap it in any outer key:
{{
  "personal": {{"name": "", "phone": "", "email": "", "address": "", "dob": "", "linkedin": ""}},
  "summary": "",
  "work_experience": [{{"id": "", "company": "", "title": "", "location": "", "dates": "", "tags": [], "bullets": []}}],
  "education": [{{"id": "", "institution": "", "degree": "", "location": "", "dates": "", "tags": [], "bullets": []}}],
  "projects": [{{"id": "", "title": "", "dates": "", "tags": [], "bullets": []}}],
  "skills": [{{"id": "", "label": "", "content": ""}}],
  "interests": []
}}

For IDs, generate a short slug from the company/institution name (lowercase, underscores, no spaces).
Return only the JSON object with these exact top-level keys. Do not nest it inside another key.

CV Text:
{text}"""

    result = _call_llm(prompt, provider, model, settings)
    return _unwrap_cv(result)


_CV_KEYS = {"personal", "summary", "work_experience", "education", "projects", "skills", "interests"}


def _unwrap_cv(data: dict) -> dict:
    """If the LLM wrapped the result in a single outer key, unwrap it."""
    if any(k in data for k in _CV_KEYS):
        return data
    values = list(data.values())
    if len(values) == 1 and isinstance(values[0], dict):
        return values[0]
    return data


def _resolve_provider(provider: str, model: str | None, settings: dict) -> tuple[str, str]:
    """Map abstract 'api' provider to the concrete api_provider, and fill in the model."""
    if provider == "api":
        provider = settings.get("api_provider", "anthropic")
    if not model:
        if provider == "ollama":
            model = settings.get("ollama_model", "llama3")
        else:
            model = settings.get("api_model", "claude-haiku-4-5-20251001")
    return provider, model


def _call_llm(prompt: str, provider: str, model: str, settings: dict) -> dict:
    if provider == "ollama":
        return _call_ollama(prompt, model or settings.get("ollama_model", "llama3"))
    elif provider == "anthropic":
        return _call_anthropic(prompt, model or settings.get("api_model", "claude-haiku-4-5-20251001"), settings)
    elif provider == "openai":
        return _call_openai(prompt, model or settings.get("api_model", "gpt-4o-mini"), settings)
    else:
        raise ValueError(f"Unknown provider: {provider}")


def _call_ollama(prompt: str, model: str) -> dict:
    import ollama
    response = ollama.chat(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        format="json",
    )
    return json.loads(response.message.content)


def _call_anthropic(prompt: str, model: str, settings: dict) -> dict:
    import anthropic
    client = anthropic.Anthropic(api_key=settings.get("anthropic_api_key", ""))
    message = client.messages.create(
        model=model,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return _extract_json(message.content[0].text)


def _call_openai(prompt: str, model: str, settings: dict) -> dict:
    from openai import OpenAI
    client = OpenAI(api_key=settings.get("openai_api_key", ""))
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    return json.loads(response.choices[0].message.content)
