from pathlib import Path
import ai as ai_module


def extract_text_from_pdf(file_bytes: bytes) -> str:
    import pdfplumber
    import io
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text_parts.append(page.extract_text() or "")
    return "\n".join(text_parts)


def extract_text_from_docx(file_bytes: bytes) -> str:
    import docx
    import io
    doc = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in doc.paragraphs)


def parse_cv(text: str, provider: str = None, model: str = None) -> dict:
    return ai_module.parse_cv(text, provider=provider, model=model)
