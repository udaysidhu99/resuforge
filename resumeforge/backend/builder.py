import json
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
import weasyprint

from bank import load_bank, load_active

BASE = Path(__file__).parent
SETTINGS_FILE = BASE / "settings.json"


def _load_settings() -> dict:
    try:
        with open(SETTINGS_FILE) as f:
            return json.load(f)
    except Exception:
        return {}


def build_context(for_preview: bool = False) -> dict:
    bank = load_bank()
    active = load_active()
    settings = _load_settings()

    personal = bank.get("personal", {})
    photo_filename = personal.get("photo", "photo.jpg")
    photo_path = BASE / photo_filename
    photo_exists = photo_path.exists()
    photo_shape = settings.get("photo_shape", "rect")  # "rect" | "circle"

    if photo_exists:
        if for_preview:
            photo_src = f"http://localhost:8000/static/{photo_filename}"
        else:
            photo_src = photo_path.as_uri()
    else:
        photo_src = ""

    # Build active skills list from bank
    bank_skills = {s["id"]: s for s in bank.get("skills", [])}
    active_skills = [
        bank_skills[e["id"]]
        for e in active.get("skills", [])
        if e["id"] in bank_skills
    ]

    ctx = {
        "personal": personal,
        "photo_exists": photo_exists,
        "photo_path": photo_src,
        "photo_shape": photo_shape,
        "summary": bank.get("summary", "") if active.get("include_summary", True) else "",
        "work_experience": [],
        "education": [],
        "projects": [],
        "skills": active_skills if active_skills else None,
        "interests": bank.get("interests") if active.get("include_interests", True) else None,
    }

    bank_by_section = {
        "work_experience": {b["id"]: b for b in bank.get("work_experience", [])},
        "education": {b["id"]: b for b in bank.get("education", [])},
        "projects": {b["id"]: b for b in bank.get("projects", [])},
    }

    for section in ("work_experience", "education", "projects"):
        for entry in active.get(section, []):
            bid = entry["id"]
            block = bank_by_section[section].get(bid)
            if not block:
                continue
            block = dict(block)
            max_b = entry.get("max_bullets")
            if max_b is not None:
                block["bullets"] = block.get("bullets", [])[:max_b]
            ctx[section].append(block)

    return ctx


def render_html(for_preview: bool = False) -> str:
    env = Environment(loader=FileSystemLoader(str(BASE)))
    template = env.get_template("template.html")
    return template.render(**build_context(for_preview=for_preview))


def build_pdf() -> bytes:
    html_str = render_html(for_preview=False)
    doc = weasyprint.HTML(string=html_str, base_url=str(BASE)).write_pdf()
    return doc
