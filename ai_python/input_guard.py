from __future__ import annotations

from typing import Any

from .config import MAX_DOCUMENTS, MAX_FILE_BYTES, MAX_QUESTION_CHARS, MAX_TOTAL_UPLOAD_BYTES
from .injection import scan_text, sanitize_for_model
from .models import GuardrailError, ScanResult


def validate_question(question: Any) -> str:
    if not isinstance(question, str):
        raise GuardrailError("QUESTION_TYPE", "Câu hỏi phải là văn bản.")
    question = sanitize_for_model(question).strip()
    if not question or len(question) > MAX_QUESTION_CHARS:
        raise GuardrailError("QUESTION_SIZE", "Câu hỏi trống hoặc vượt giới hạn 2.000 ký tự.")
    findings = scan_text(question, source="question")
    if any(f.severity == "high" for f in findings):
        raise GuardrailError("QUESTION_INJECTION", "Câu hỏi có yêu cầu truy xuất chỉ dẫn/bí mật hệ thống.", findings=findings)
    return question


def inspect_uploads(uploads: Any) -> list[ScanResult]:
    if uploads is None:
        return []
    if not isinstance(uploads, list) or len(uploads) > MAX_DOCUMENTS:
        raise GuardrailError("UPLOAD_COUNT", "Danh sách tệp không hợp lệ hoặc vượt 20 tệp.")
    total = 0
    results: list[ScanResult] = []
    for upload in uploads:
        if not isinstance(upload, dict) or not isinstance(upload.get("filename"), str) or not isinstance(upload.get("content"), bytes):
            raise GuardrailError("UPLOAD_SHAPE", "Mỗi tệp cần filename và content dạng bytes.")
        data = upload["content"]
        total += len(data)
        if len(data) > MAX_FILE_BYTES or total > MAX_TOTAL_UPLOAD_BYTES:
            raise GuardrailError("UPLOAD_BUDGET", "Tổng dung lượng tệp vượt giới hạn 10 MB.")
        # Local import keeps optional OCR libraries out of text-only deployments.
        from .file_inspection import inspect_upload
        result = inspect_upload(upload["filename"], data)
        if result.decision != "allow":
            raise GuardrailError("UPLOAD_INJECTION", f"Tệp {result.filename} có nội dung cần cách ly; không gửi tới model.", findings=result.findings)
        results.append(result)
    return results
