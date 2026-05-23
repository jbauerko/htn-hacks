"""
Loads volunteer module YAML files from backend/data/modules/.
Validates against module_schema.json at load time.
"""

import json
import pathlib
from functools import lru_cache

import yaml
from pydantic import BaseModel, ValidationError

DATA_DIR = pathlib.Path(__file__).parent / "data" / "modules"
SCHEMA_PATH = pathlib.Path(__file__).parent / "data" / "module_schema.json"


# ---------------------------------------------------------------------------
# Pydantic models matching module_schema.json
# ---------------------------------------------------------------------------

class GlossaryTerm(BaseModel):
    term: str
    definition: str


class KnowledgeItem(BaseModel):
    title: str
    content: str
    tags: list[str] = []


class ModuleKnowledge(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    color: str
    knowledge: list[KnowledgeItem]
    rules: list[str] = []
    glossary: list[GlossaryTerm] = []

    def as_prompt_context(self) -> str:
        """Render the module knowledge as a structured text block for Claude."""
        lines: list[str] = [
            f"# Volunteer Role: {self.name}",
            f"{self.description}",
            "",
            "## Core Knowledge",
        ]
        for item in self.knowledge:
            tag_str = f" [{', '.join(item.tags)}]" if item.tags else ""
            lines.append(f"\n### {item.title}{tag_str}")
            lines.append(item.content.strip())

        if self.rules:
            lines.append("\n## Non-Negotiable Rules")
            for rule in self.rules:
                lines.append(f"- {rule}")

        if self.glossary:
            lines.append("\n## Glossary")
            for term in self.glossary:
                lines.append(f"- **{term.term}**: {term.definition}")

        return "\n".join(lines)


# ---------------------------------------------------------------------------
# Loader
# ---------------------------------------------------------------------------

class ModuleLoadError(Exception):
    pass


def _load_one(path: pathlib.Path) -> ModuleKnowledge:
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise ModuleLoadError(f"YAML parse error in {path.name}: {exc}") from exc

    try:
        module = ModuleKnowledge.model_validate(raw)
    except ValidationError as exc:
        raise ModuleLoadError(f"Schema validation failed for {path.name}:\n{exc}") from exc

    # Warn if filename stem doesn't match id
    if path.stem != module.id:
        import warnings
        warnings.warn(
            f"{path.name}: filename stem '{path.stem}' doesn't match id '{module.id}'",
            stacklevel=2,
        )

    return module


@lru_cache(maxsize=1)
def load_all_modules() -> dict[str, ModuleKnowledge]:
    """Load and cache all YAML files from the modules directory."""
    modules: dict[str, ModuleKnowledge] = {}
    for path in sorted(DATA_DIR.glob("*.yaml")):
        try:
            m = _load_one(path)
            modules[m.id] = m
        except ModuleLoadError as exc:
            # Log but don't crash — bad file shouldn't take down the whole app
            import logging
            logging.warning("Skipping module file: %s", exc)
    return modules


def get_module(module_id: str) -> ModuleKnowledge | None:
    return load_all_modules().get(module_id)


def reload_modules() -> dict[str, ModuleKnowledge]:
    """Clear the cache and reload — useful in development."""
    load_all_modules.cache_clear()
    return load_all_modules()
