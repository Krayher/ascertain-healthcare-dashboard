from __future__ import annotations

from app.services.summarizer.base import SummaryResult, Summarizer
from app.services.summarizer.claude import ClaudeSummarizer
from app.services.summarizer.template import TemplateSummarizer
from app.settings import get_settings


def build_summarizer() -> Summarizer:
    settings = get_settings()
    template = TemplateSummarizer()
    if settings.anthropic_api_key:
        return ClaudeSummarizer(settings.anthropic_api_key, template)
    return template


__all__ = ["SummaryResult", "Summarizer", "build_summarizer"]
