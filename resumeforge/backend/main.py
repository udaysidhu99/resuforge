import json
import re
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import bank as bank_module
import builder
import ai as ai_module
import importer

app = FastAPI(title="ResumeForge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SETTINGS_FILE = Path(__file__).parent / "settings.json"
SNAPSHOTS_FILE = Path(__file__).parent / "snapshots.json"

app.mount("/static", StaticFiles(directory=str(Path(__file__).parent)), name="static")


# ── helpers ──────────────────────────────────────────────────────────────────

def _load_snapshots() -> list:
    if not SNAPSHOTS_FILE.exists():
        return []
    with open(SNAPSHOTS_FILE) as f:
        return json.load(f)


def _save_snapshots(data: list):
    tmp = SNAPSHOTS_FILE.with_suffix(".json.tmp")
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2)
    tmp.replace(SNAPSHOTS_FILE)


def _load_settings() -> dict:
    with open(SETTINGS_FILE) as f:
        return json.load(f)


def _save_settings(data: dict):
    with open(SETTINGS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def _mask_settings(s: dict) -> dict:
    masked = dict(s)
    for k in ("anthropic_api_key", "openai_api_key"):
        if masked.get(k):
            masked[k] = "***"
    return masked


# ── bank endpoints ────────────────────────────────────────────────────────────

@app.get("/api/bank")
def get_bank():
    return bank_module.load_bank()


@app.put("/api/bank")
def replace_bank(body: dict):
    bank_module.save_bank(body)
    return body


@app.put("/api/bank/personal")
def update_personal(body: dict):
    data = bank_module.load_bank()
    data["personal"] = body
    bank_module.save_bank(data)
    return data["personal"]


@app.put("/api/bank/summary")
def update_summary(body: dict):
    data = bank_module.load_bank()
    data["summary"] = body.get("summary", "")
    bank_module.save_bank(data)
    return {"summary": data["summary"]}


@app.get("/api/bank/blocks/{section}")
def get_blocks(section: str):
    data = bank_module.load_bank()
    return data.get(section, [])


@app.post("/api/bank/blocks/{section}")
def add_block(section: str, body: dict):
    data = bank_module.load_bank()
    if section not in data:
        data[section] = []
    if not body.get("id"):
        name = body.get("company") or body.get("institution") or body.get("title", "block")
        body["id"] = bank_module.slugify(name)
    existing_ids = {b["id"] for b in data[section]}
    base = body["id"]
    counter = 1
    while body["id"] in existing_ids:
        body["id"] = f"{base}_{counter}"
        counter += 1
    data[section].append(body)
    bank_module.save_bank(data)
    return body


@app.put("/api/bank/blocks/{section}/{block_id}")
def update_block(section: str, block_id: str, body: dict):
    data = bank_module.load_bank()
    blocks = data.get(section, [])
    for i, b in enumerate(blocks):
        if b["id"] == block_id:
            body["id"] = block_id
            blocks[i] = body
            bank_module.save_bank(data)
            return body
    raise HTTPException(404, f"Block {block_id} not found in {section}")


@app.delete("/api/bank/blocks/{section}/{block_id}")
def delete_block(section: str, block_id: str):
    data = bank_module.load_bank()
    blocks = data.get(section, [])
    original = len(blocks)
    data[section] = [b for b in blocks if b["id"] != block_id]
    if len(data[section]) == original:
        raise HTTPException(404, f"Block {block_id} not found")
    bank_module.save_bank(data)
    return {"ok": True}


# ── active resume endpoints ───────────────────────────────────────────────────

@app.get("/api/active")
def get_active():
    return bank_module.load_active()


@app.put("/api/active")
def update_active(body: dict):
    bank_module.save_active(body)
    return body


# ── skills & interests ────────────────────────────────────────────────────────

@app.get("/api/skills")
def get_skills():
    return bank_module.load_bank().get("skills", [])


@app.put("/api/skills")
def update_skills(body: list = Body(...)):
    data = bank_module.load_bank()
    data["skills"] = body
    bank_module.save_bank(data)
    return body


@app.post("/api/skills")
def add_skill(body: dict):
    data = bank_module.load_bank()
    skills = data.get("skills", [])
    if not body.get("id"):
        body["id"] = bank_module.slugify(body.get("label", "skill"))
    existing_ids = {s["id"] for s in skills}
    base = body["id"]
    counter = 1
    while body["id"] in existing_ids:
        body["id"] = f"{base}_{counter}"
        counter += 1
    skills.append(body)
    data["skills"] = skills
    bank_module.save_bank(data)
    return body


@app.put("/api/skills/{skill_id}")
def update_skill(skill_id: str, body: dict):
    data = bank_module.load_bank()
    skills = data.get("skills", [])
    for i, s in enumerate(skills):
        if s["id"] == skill_id:
            body["id"] = skill_id
            skills[i] = body
            data["skills"] = skills
            bank_module.save_bank(data)
            return body
    raise HTTPException(404, f"Skill {skill_id} not found")


@app.delete("/api/skills/{skill_id}")
def delete_skill(skill_id: str):
    data = bank_module.load_bank()
    original = len(data.get("skills", []))
    data["skills"] = [s for s in data.get("skills", []) if s["id"] != skill_id]
    if len(data["skills"]) == original:
        raise HTTPException(404, f"Skill {skill_id} not found")
    bank_module.save_bank(data)
    # also remove from active
    active = bank_module.load_active()
    active["skills"] = [e for e in active.get("skills", []) if e["id"] != skill_id]
    bank_module.save_active(active)
    return {"ok": True}


@app.get("/api/interests")
def get_interests():
    return bank_module.load_bank().get("interests", [])


@app.put("/api/interests")
def update_interests(body: list = Body(...)):
    data = bank_module.load_bank()
    data["interests"] = body
    bank_module.save_bank(data)
    return body


# ── preview & build ───────────────────────────────────────────────────────────

@app.get("/api/preview", response_class=HTMLResponse)
def preview():
    return builder.render_html(for_preview=True)


@app.post("/api/build")
def build_pdf():
    pdf_bytes = builder.build_pdf()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="resume.pdf"'},
    )


# ── AI endpoints ──────────────────────────────────────────────────────────────

class BulletsRequest(BaseModel):
    text: str
    provider: str | None = None
    model: str | None = None
    extra_context: str | None = None
    block_context: dict | None = None


class SummaryRequest(BaseModel):
    provider: str | None = None
    model: str | None = None
    extra_context: str | None = None


class MatchRequest(BaseModel):
    provider: str | None = None
    model: str | None = None
    job_description: str


@app.post("/api/ai/bullets")
def ai_bullets(req: BulletsRequest):
    try:
        bank = bank_module.load_bank()
        candidate_name = bank.get("personal", {}).get("name")
        bullets = ai_module.generate_bullets(
            req.text,
            provider=req.provider,
            model=req.model,
            extra_context=req.extra_context,
            block_context=req.block_context,
            candidate_name=candidate_name,
        )
        return {"bullets": bullets}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/ai/summary")
def ai_summary(req: SummaryRequest):
    try:
        bank = bank_module.load_bank()
        active = bank_module.load_active()
        candidate_name = bank.get("personal", {}).get("name")

        # Build rich context with actual bullets, not just job titles
        sections = []
        for section in ("work_experience", "education", "projects"):
            bank_map = {b["id"]: b for b in bank.get(section, [])}
            for entry in active.get(section, []):
                block = bank_map.get(entry["id"])
                if not block:
                    continue
                title = block.get("company") or block.get("institution") or block.get("title", "")
                role = block.get("title") or block.get("degree", "")
                dates = block.get("dates", "")
                bullets = block.get("bullets", [])
                header = f"{title} — {role} ({dates})" if role else f"{title} ({dates})"
                bullet_lines = "\n".join(f"  • {b}" for b in bullets[:3])
                sections.append(f"{header}\n{bullet_lines}" if bullet_lines else header)

        detail = "\n\n".join(sections)
        summary_text = ai_module.generate_summary(
            detail,
            provider=req.provider,
            model=req.model,
            extra_context=req.extra_context,
            candidate_name=candidate_name,
        )
        return {"summary": summary_text}
    except Exception as e:
        raise HTTPException(500, str(e))


@app.post("/api/ai/match")
def ai_match(req: MatchRequest):
    try:
        bank = bank_module.load_bank()
        active = bank_module.load_active()
        candidate_name = bank.get("personal", {}).get("name")

        # Build formatted resume context (same pattern as summary endpoint)
        sections = []
        for section in ("work_experience", "education", "projects"):
            bank_map = {b["id"]: b for b in bank.get(section, [])}
            for entry in active.get(section, []):
                block = bank_map.get(entry["id"])
                if not block:
                    continue
                title = block.get("company") or block.get("institution") or block.get("title", "")
                role = block.get("title") or block.get("degree", "")
                dates = block.get("dates", "")
                bullets = block.get("bullets", [])
                header = f"{title} — {role} ({dates})" if role else f"{title} ({dates})"
                bullet_lines = "\n".join(f"  • {b}" for b in bullets)
                sections.append(f"{header}\n{bullet_lines}" if bullet_lines else header)

        # Add skills
        bank_skills = {s["id"]: s for s in bank.get("skills", [])}
        active_skills = [bank_skills[e["id"]] for e in active.get("skills", []) if e["id"] in bank_skills]
        if active_skills:
            skill_lines = "\n".join(f"  {s['label']}: {s['content']}" for s in active_skills)
            sections.append(f"Skills:\n{skill_lines}")

        resume_context = "\n\n".join(sections)

        result = ai_module.match_resume(
            req.job_description,
            resume_context,
            provider=req.provider,
            model=req.model,
            candidate_name=candidate_name,
        )
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


# ── CV import ─────────────────────────────────────────────────────────────────

@app.post("/api/import")
async def import_cv(
    file: UploadFile | None = File(default=None),
    text: str | None = None,
    provider: str | None = None,
    model: str | None = None,
):
    if file and file.filename:
        content = await file.read()
        fname = file.filename.lower()
        if fname.endswith(".pdf"):
            cv_text = importer.extract_text_from_pdf(content)
        elif fname.endswith(".docx"):
            cv_text = importer.extract_text_from_docx(content)
        else:
            raise HTTPException(400, "Only PDF and DOCX files are supported")
    elif text:
        cv_text = text
    else:
        raise HTTPException(400, "Provide a file or text")

    try:
        result = importer.parse_cv(cv_text, provider=provider, model=model)
        return result
    except Exception as e:
        raise HTTPException(500, str(e))


# ── snapshots ────────────────────────────────────────────────────────────────

@app.get("/api/snapshots")
def get_snapshots():
    snapshots = _load_snapshots()
    return [{"id": s["id"], "name": s["name"], "created_at": s["created_at"]} for s in snapshots]


@app.post("/api/snapshots")
def save_snapshot(body: dict):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Name is required")
    from datetime import datetime
    snapshots = _load_snapshots()
    base_id = bank_module.slugify(name)
    existing_ids = {s["id"] for s in snapshots}
    snap_id = base_id
    if snap_id in existing_ids:
        snap_id = f"{base_id}_{datetime.now().strftime('%H%M%S')}"
    snapshot = {
        "id": snap_id,
        "name": name,
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "active": bank_module.load_active(),
        "bank": bank_module.load_bank(),
    }
    snapshots.append(snapshot)
    _save_snapshots(snapshots)
    return {"id": snapshot["id"], "name": snapshot["name"], "created_at": snapshot["created_at"]}


@app.put("/api/snapshots/{snapshot_id}/restore")
def restore_snapshot(snapshot_id: str):
    snapshots = _load_snapshots()
    snapshot = next((s for s in snapshots if s["id"] == snapshot_id), None)
    if not snapshot:
        raise HTTPException(404, f"Snapshot {snapshot_id} not found")
    if "bank" in snapshot:
        bank_module.save_bank(snapshot["bank"])
    bank_module.save_active(snapshot["active"])
    return snapshot["active"]


@app.delete("/api/snapshots/{snapshot_id}")
def delete_snapshot(snapshot_id: str):
    snapshots = _load_snapshots()
    updated = [s for s in snapshots if s["id"] != snapshot_id]
    if len(updated) == len(snapshots):
        raise HTTPException(404, f"Snapshot {snapshot_id} not found")
    _save_snapshots(updated)
    return {"ok": True}


# ── settings ──────────────────────────────────────────────────────────────────

@app.get("/api/settings")
def get_settings():
    return _mask_settings(_load_settings())


@app.put("/api/settings")
def update_settings(body: dict):
    current = _load_settings()
    for k in ("anthropic_api_key", "openai_api_key"):
        if body.get(k) == "***":
            body[k] = current.get(k, "")
    current.update(body)
    _save_settings(current)
    return _mask_settings(current)


# ── Ollama models proxy ───────────────────────────────────────────────────────

@app.post("/api/upload/photo")
async def upload_photo(file: UploadFile = File(...)):
    content = await file.read()
    photo_path = Path(__file__).parent / "photo.jpg"
    with open(photo_path, "wb") as f:
        f.write(content)
    return {"ok": True, "path": "photo.jpg"}


@app.get("/api/ollama/models")
def ollama_models():
    try:
        import ollama
        result = ollama.list()
        models = [m.model for m in result.models]
        return {"models": models}
    except Exception as e:
        raise HTTPException(503, f"Ollama unreachable: {e}")
