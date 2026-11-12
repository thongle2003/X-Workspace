from __future__ import annotations

import re

from .config import MAX_OUTPUT_TOKENS
from .retrieval import estimate_tokens


def choose_output_budget(question: str, ceiling: int = MAX_OUTPUT_TOKENS) -> int:
    folded = question.casefold()
    if re.search(r"bao nhieu|liet ke|how many|list", folded):
        target = 128
    elif re.search(r"phan tich|so sanh|danh gia|due diligence", folded):
        target = 384
    else:
        target = 192
    return min(ceiling, target)


def remaining_context_budget(question: str, *, total_budget: int = 1200, output_budget: int | None = None) -> int:
    output = output_budget if output_budget is not None else choose_output_budget(question)
    # Reserve for system instructions, user question, context and provider framing.
    fixed = estimate_tokens(question) + 140
    return max(64, min(4000, total_budget - output - fixed))
