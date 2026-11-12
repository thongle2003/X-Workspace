"""JSON worker entry point for the modular RAG and file safety package."""
from __future__ import annotations

import base64
import binascii
import json
import sys
from pathlib import Path
from typing import Any

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from ai_python.config import MAX_FILE_BYTES, MAX_TOTAL_UPLOAD_BYTES
    from ai_python.models import GuardrailError
    from ai_python.pipeline import prepare_request, validate_response
else:
    from .config import MAX_FILE_BYTES, MAX_TOTAL_UPLOAD_BYTES
    from .models import GuardrailError
    from .pipeline import prepare_request, validate_response


def _handle(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise GuardrailError("REQUEST", "Request phải là object JSON.")
    if payload.get("phase") == "output":
        return validate_response(payload.get("answer"), payload.get("source_ids", []))
    uploads = payload.get("uploads", [])
    if not isinstance(uploads, list):
        raise GuardrailError("UPLOADS", "uploads phải là danh sách.")
    decoded = []
    encoded_bytes = 0
    for item in uploads:
        if not isinstance(item, dict) or not isinstance(item.get("filename"), str) or not isinstance(item.get("content_base64"), str):
            raise GuardrailError("UPLOAD_SHAPE", "Mỗi upload cần filename và content_base64.")
        encoded_bytes += len(item["content_base64"])
        if len(item["content_base64"]) > ((MAX_FILE_BYTES + 2) // 3) * 4 or encoded_bytes > ((MAX_TOTAL_UPLOAD_BYTES + 2) // 3) * 4:
            raise GuardrailError("UPLOAD_BUDGET", "Tệp mã hóa vượt tổng giới hạn dung lượng.")
        try:
            data = base64.b64decode(item["content_base64"], validate=True)
        except (ValueError, binascii.Error) as error:
            raise GuardrailError("UPLOAD_BASE64", "Nội dung tệp không phải Base64 hợp lệ.") from error
        decoded.append({"filename": item["filename"], "content": data})
    return prepare_request(
        payload.get("question"),
        payload.get("documents", []),
        decoded,
        token_budget=payload.get("token_budget", 600),
    )


if __name__ == "__main__":
    try:
        print(json.dumps(_handle(json.load(sys.stdin)), ensure_ascii=False))
    except (GuardrailError, json.JSONDecodeError) as error:
        print(json.dumps({"error": str(error), "code": getattr(error, "code", "INVALID")}, ensure_ascii=False))
        raise SystemExit(2)
