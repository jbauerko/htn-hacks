"""
Shared helpers for game-generation routers.

Every game endpoint follows the same pattern:
  1. Look up the module in the YAML knowledge cache
  2. Build a role-specific prompt that ends with a strict JSON schema
  3. Call Claude (anthropic) and pull a JSON array/object out of the response
  4. Cache the parsed result per (module_id, game_type) so we only pay for
     generation once per server lifetime
"""

import json
import logging
import re
from typing import Callable, TypeVar

import anthropic
from fastapi import HTTPException

from knowledge import get_module, ModuleKnowledge

logger = logging.getLogger(__name__)

# One client per process. The anthropic SDK reads ANTHROPIC_API_KEY from env.
client = anthropic.Anthropic()

# Game-generation cache. Key = (module_id, game_type). Value = already-parsed
# pydantic model. We don't want to regenerate on every request — Claude calls
# are slow and expensive.
_cache: dict[tuple[str, str], object] = {}

T = TypeVar("T")

SYSTEM_PROMPT = (
    "You are an expert instructional designer creating gamified training "
    "content for event volunteers. Always respond with valid JSON only — "
    "no markdown fences, no commentary, no preamble. The JSON must exactly "
    "match the schema given in the user prompt."
)


def cached_or_generate(
    module_id: str,
    game_type: str,
    prompt_builder: Callable[[ModuleKnowledge], str],
    parser: Callable[[ModuleKnowledge, str], T],
    *,
    max_tokens: int = 4096,
) -> T:
    """
    Returns a cached generation if one exists; otherwise calls Claude, parses,
    caches, and returns. Raises HTTPException on missing module / bad output.
    """
    cache_key = (module_id, game_type)
    if cache_key in _cache:
        logger.info("Cache hit: %s/%s", module_id, game_type)
        return _cache[cache_key]  # type: ignore[return-value]

    module = get_module(module_id)
    if module is None:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")

    logger.info("Generating %s for module '%s' via Claude...", game_type, module_id)
    prompt = prompt_builder(module)

    try:
        message = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=max_tokens,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text
    except anthropic.APIError as exc:
        logger.error("Anthropic API error generating %s for %s: %s", game_type, module_id, exc)
        raise HTTPException(status_code=502, detail=f"AI service error: {exc}") from exc

    try:
        result = parser(module, raw)
    except Exception as exc:
        logger.error("Parse failure for %s/%s: %s\nRaw (first 500 chars):\n%s",
                     module_id, game_type, exc, raw[:500])
        raise HTTPException(status_code=502, detail=f"Failed to parse AI output: {exc}") from exc

    _cache[cache_key] = result
    logger.info("Cached %s for module '%s'", game_type, module_id)
    return result


def bust_cache(module_id: str, game_type: str | None = None) -> None:
    """Drop cached generation(s) for a module. If game_type is None, drop all."""
    if game_type is None:
        for key in [k for k in _cache if k[0] == module_id]:
            _cache.pop(key, None)
    else:
        _cache.pop((module_id, game_type), None)


_JSON_FENCE_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def extract_json(raw: str) -> object:
    """
    Claude is usually well-behaved with json-only output, but occasionally
    wraps things in a ```json fence. Strip that, then json.loads.
    """
    cleaned = _JSON_FENCE_RE.sub("", raw).strip()
    return json.loads(cleaned)
