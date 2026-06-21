import os
import tempfile
import yaml
from pathlib import Path

BASE = Path(__file__).parent
BANK_FILE = BASE / "resume_bank.yaml"
ACTIVE_FILE = BASE / "active_resume.yaml"


def _atomic_write(path: Path, data: dict):
    tmp = path.with_suffix(".yaml.tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False, default_flow_style=False)
    tmp.replace(path)


def load_bank() -> dict:
    with open(BANK_FILE, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def save_bank(data: dict):
    _atomic_write(BANK_FILE, data)


def load_active() -> dict:
    with open(ACTIVE_FILE, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def save_active(data: dict):
    _atomic_write(ACTIVE_FILE, data)


def get_section_blocks(bank: dict, section: str) -> list:
    return bank.get(section, [])


def find_block(bank: dict, section: str, block_id: str) -> dict | None:
    for block in bank.get(section, []):
        if block.get("id") == block_id:
            return block
    return None


def slugify(text: str) -> str:
    import re
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "_", slug)
    slug = re.sub(r"-+", "_", slug)
    return slug[:40]
