from __future__ import annotations

import re
from typing import Any

from .config import MAX_OUTPUT_CHARS, MAX_OUTPUT_SENTENCES
from .injection import normalize_for_scan, scan_text, sanitize_for_model
from .models import GuardrailError

SECRET_RE = re.compile(r"\b(?:sk-[A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._~+/=-]{16,})\b", re.I)
RISKY_RE = re.compile(r"\b(guaranteed returns?|risk[- ]free returns?|buy now|sell now|invest now|cam ket loi nhuan|chac chan sinh loi|khong co rui ro|nen mua ngay|nen dau tu ngay)\b", re.I)
SENTENCE_RE = re.compile(r"(?<=[.!?。！？])\s+|\n+")


def validate_response(answer: Any, source_ids: Any) -> dict[str, Any]:
    if not isinstance(answer, str) or not answer.strip():
        raise GuardrailError("EMPTY_RESPONSE", "AI không trả câu trả lời hợp lệ.")
    if not isinstance(source_ids, list) or any(not isinstance(item, str) for item in source_ids):
        raise GuardrailError("SOURCE_IDS", "Danh sách nguồn không hợp lệ.")
    clean = sanitize_for_model(answer).strip()
    if SECRET_RE.search(clean):
        raise GuardrailError("RESPONSE_SECRET", "Phản hồi chứa chuỗi giống thông tin xác thực.")
    if RISKY_RE.search(normalize_for_scan(clean)):
        raise GuardrailError("RESPONSE_FINANCIAL", "Phản hồi chứa cam kết/lời khuyên đầu tư bị cấm.")
    findings = scan_text(clean, source="model-output")
    if any(item.severity == "high" for item in findings):
        raise GuardrailError("RESPONSE_INJECTION", "Phản hồi có chỉ dẫn độc hại hoặc rò rỉ bí mật.", findings=findings)
    cited = re.findall(r"\[([\w.-]{1,100})\]", clean)
    allowed = set(source_ids)
    if any(item not in allowed for item in cited):
        raise GuardrailError("UNKNOWN_CITATION", "Phản hồi trích nguồn không được gửi trong ngữ cảnh.")
    if allowed and not cited:
        raise GuardrailError("MISSING_CITATION", "Phản hồi chưa trích dẫn nguồn được cung cấp.")
    sentences = [item.strip() for item in SENTENCE_RE.split(clean) if item.strip()]
    clipped = " ".join(sentences[:MAX_OUTPUT_SENTENCES])[:MAX_OUTPUT_CHARS]
    return {"answer": clipped, "source_ids": list(dict.fromkeys(cited)), "shortened": clipped != clean}
