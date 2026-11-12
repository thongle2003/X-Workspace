from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal


Severity = Literal["low", "medium", "high"]
Decision = Literal["allow", "quarantine", "block"]


@dataclass(frozen=True)
class Finding:
    rule: str
    severity: Severity
    location: str
    excerpt_hash: str


@dataclass
class ScanResult:
    filename: str
    media_type: str
    extracted_text: str
    decision: Decision
    findings: list[Finding] = field(default_factory=list)
    pages_or_sheets: int = 1
    ocr_used: bool = False


class GuardrailError(ValueError):
    def __init__(self, code: str, message: str, *, findings: list[Finding] | None = None):
        super().__init__(message)
        self.code = code
        self.findings = findings or []
