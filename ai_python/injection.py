from __future__ import annotations

import base64
import codecs
import hashlib
import html
import re
import unicodedata
import urllib.parse
from collections.abc import Iterable

from .models import Finding

_ZERO_WIDTH = dict.fromkeys(map(ord, "\u200b\u200c\u200d\u2060\ufeff\u00ad"), None)
_BIDI = dict.fromkeys(map(ord, "\u202a\u202b\u202c\u202d\u202e\u2066\u2067\u2068\u2069"), None)
_CONFUSABLES = str.maketrans({
    "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
    "і": "i", "ӏ": "l", "Α": "A", "Β": "B", "Ε": "E", "Ι": "I", "Ο": "O",
    "Ρ": "P", "С": "C", "Χ": "X", "а": "a", "о": "o", "е": "e",
})
_PATTERNS: tuple[tuple[str, str, re.Pattern[str]], ...] = (
    ("instruction_override", "high", re.compile(r"\b(ignore|disregard|forget|override|bypass)\b.{0,100}\b(previous|above|all|system|developer|safety|instructions?|rules?|prompt)\b", re.I | re.S)),
    ("instruction_override_vi", "high", re.compile(r"\b(bo qua|phot lo|quen|ghi de|vuot qua)\b.{0,100}\b(chi dan|huong dan|quy tac|he thong|prompt|an toan)\b", re.I | re.S)),
    ("secret_exfiltration", "high", re.compile(r"\b(reveal|print|show|expose|leak|send|upload|exfiltrate)\b.{0,100}\b(system prompt|api.?key|secret|credential|password|token|private data)\b", re.I | re.S)),
    ("secret_exfiltration_vi", "high", re.compile(r"\b(tiet lo|in ra|hien|gui|trich xuat)\b.{0,100}\b(khoa api|mat khau|bi mat|token|du lieu rieng|prompt he thong)\b", re.I | re.S)),
    ("context_exfiltration", "high", re.compile(r"\b(print|show|dump|export|reveal|output|copy|in ra|hien thi|trich xuat)\b.{0,100}\b(raw )?(retrieved )?(context|documents?|files?|vector database|toan bo tai lieu|noi dung goc)\b", re.I | re.S)),
    ("tool_or_network_command", "high", re.compile(r"\b(call|invoke|run|execute|open|browse|fetch|curl|wget)\b.{0,100}\b(tool|shell|terminal|browser|url|endpoint|network|command)\b", re.I | re.S)),
    ("indirect_instruction_override", "high", re.compile(r"\b(ignore|disregard|forget|bo qua|quen)\b.{0,100}\b(user'?s (request|question|message)|the user|previous|developer|system|retrieved|original question|current task|yeu cau cua nguoi dung|cau hoi (goc|cua nguoi dung)|chi dan)\b", re.I | re.S)),
    ("authority_override", "high", re.compile(r"\b(higher priority|higher authority|supersede|override|uu tien cao hon|co quyen cao hon)\b.{0,100}\b(system|developer|instruction|prompt|he thong|chi dan)\b", re.I | re.S)),
    ("jailbreak_or_role_change", "high", re.compile(r"\b(jailbreak|developer mode|unrestricted mode|you are now|act as|pretend to be|ban bay gio la|che do nha phat trien)\b", re.I)),
    ("filter_bypass", "high", re.compile(r"\b(bypass|disable|evade|turn off|vuot qua|tat)\b.{0,80}\b(filter|guardrail|safety|security|bo loc|bao ve|an toan)\b", re.I | re.S)),
    ("role_spoofing", "medium", re.compile(r"(?:^|\n)\s*(system|developer|assistant)\s*:\s*", re.I)),
    ("format_hijack", "medium", re.compile(r"\b(output|reply|respond|return)\b.{0,80}\b(only|exactly|instead|ignore the user|do not mention)\b", re.I | re.S)),
    ("hidden_prompt_marker", "medium", re.compile(r"\[(system|developer|hidden|secret) (prompt|instruction|message)\]|<\|im_start\|>|<\|system\|>", re.I)),
)
_BASE64_RUN = re.compile(r"(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{40,}={0,2}(?![A-Za-z0-9+/])")


def normalize_for_scan(text: str) -> str:
    value = unicodedata.normalize("NFKC", text).translate(_ZERO_WIDTH).translate(_BIDI).translate(_CONFUSABLES)
    value = html.unescape(urllib.parse.unquote(value))
    value = unicodedata.normalize("NFKC", value).casefold()
    value = "".join(ch for ch in unicodedata.normalize("NFKD", value) if not unicodedata.combining(ch)).replace("đ", "d")
    return "".join(ch for ch in value if ch in "\n\t" or ord(ch) >= 32)


def sanitize_for_model(text: str) -> str:
    """Remove invisible/bidi controls from accepted untrusted text before prompting."""
    value = unicodedata.normalize("NFKC", text).translate(_ZERO_WIDTH).translate(_BIDI)
    return "".join(ch if ch in "\n\t" or unicodedata.category(ch) not in {"Cc", "Cf"} else " " for ch in value)


def _decoded_variants(text: str) -> Iterable[tuple[str, str]]:
    yield "plain", text
    normalized = normalize_for_scan(text)
    if normalized != text:
        yield "normalized", normalized
    if len(text) >= 40 and len(text) <= 100_000:
        rotated = codecs.decode(text, "rot_13")
        yield "rot13", normalize_for_scan(rotated)
    # Inspect only plausible, bounded encodings; do not expand arbitrary blobs.
    for candidate in _BASE64_RUN.findall(text)[:8]:
        if len(candidate) > 16_384:
            continue
        try:
            decoded = base64.b64decode(candidate + "=" * (-len(candidate) % 4), validate=False).decode("utf-8", "strict")
        except (ValueError, UnicodeDecodeError):
            continue
        if decoded and sum(ch.isprintable() for ch in decoded) / len(decoded) > 0.85:
            yield "base64", normalize_for_scan(decoded)


def scan_text(text: str, *, source: str = "text") -> list[Finding]:
    findings: list[Finding] = []
    seen: set[str] = set()
    if not isinstance(text, str):
        return findings
    for variant, candidate in _decoded_variants(text[:250_000]):
        for rule, severity, pattern in _PATTERNS:
            match = pattern.search(candidate)
            if not match:
                continue
            location = f"{source}:{variant}:{match.start()}"
            identity = f"{rule}:{location}"
            if identity in seen:
                continue
            seen.add(identity)
            excerpt = candidate[max(0, match.start() - 32):min(len(candidate), match.end() + 32)]
            findings.append(Finding(
                rule=rule,
                severity=severity,  # type: ignore[arg-type]
                location=location,
                excerpt_hash=hashlib.sha256(excerpt.encode("utf-8", "replace")).hexdigest()[:16],
            ))
    return findings


def decision_for(findings: list[Finding]) -> str:
    if any(item.severity == "high" for item in findings):
        return "block"
    if findings:
        return "quarantine"
    return "allow"
