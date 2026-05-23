from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from knowledge import load_all_modules, get_module, reload_modules

router = APIRouter()


class ModuleSummary(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    color: str
    knowledge_item_count: int
    rule_count: int


class ModuleDetail(ModuleSummary):
    knowledge: list[dict]
    rules: list[str]
    glossary: list[dict]


@router.get("/modules", response_model=list[ModuleSummary])
async def list_modules():
    """List all available volunteer modules (loaded from YAML files)."""
    modules = load_all_modules()
    return [
        ModuleSummary(
            id=m.id,
            name=m.name,
            description=m.description,
            icon=m.icon,
            color=m.color,
            knowledge_item_count=len(m.knowledge),
            rule_count=len(m.rules),
        )
        for m in modules.values()
    ]


@router.get("/modules/{module_id}", response_model=ModuleDetail)
async def get_module_detail(module_id: str):
    """Get full knowledge content for a single module."""
    module = get_module(module_id)
    if module is None:
        raise HTTPException(status_code=404, detail=f"Module '{module_id}' not found")

    return ModuleDetail(
        id=module.id,
        name=module.name,
        description=module.description,
        icon=module.icon,
        color=module.color,
        knowledge_item_count=len(module.knowledge),
        rule_count=len(module.rules),
        knowledge=[k.model_dump() for k in module.knowledge],
        rules=module.rules,
        glossary=[g.model_dump() for g in module.glossary],
    )


@router.post("/modules/reload", status_code=200)
async def reload():
    """Reload all YAML files from disk (clears the module cache)."""
    modules = reload_modules()
    return {"reloaded": list(modules.keys())}
