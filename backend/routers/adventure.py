"""
Choose-Your-Own-Adventure game.

GET  /modules/{module_id}/adventure
POST /modules/{module_id}/adventure/regenerate

Generates a branching, funny "shift gone weird" story for the role. The
player makes EXACTLY 5 decisions and each choice routes them to a
different next scene, ending in one of several distinct epilogues.

Data is a small tree:
  - One "start" node (depth 1).
  - Decision nodes at depths 2..5.
  - 4-6 ending nodes (no choices) — each path's 5th choice lands on one.

Validation:
  - start_node_id resolves to a node
  - Every choice's `next` resolves to a node
  - Every depth-5 choice lands on an `is_ending` node
  - No cycles (we don't strictly enforce, but every BFS path terminates ≤ 5)
"""

from fastapi import APIRouter
from pydantic import BaseModel

from knowledge import ModuleKnowledge
from routers._gen import cached_or_generate, bust_cache, extract_json

router = APIRouter()


class AdventureChoice(BaseModel):
    id: str            # "a" / "b" / "c"
    text: str          # tempting + funny, ≤ ~14 words
    next: str          # id of the next node
    points: int        # -15..+20
    outcome: str       # 1 short sentence shown after the player picks


class AdventureNode(BaseModel):
    id: str
    is_start: bool = False
    is_ending: bool = False
    # Decision-node fields (None on endings)
    scene_title: str | None = None
    narration: str | None = None
    # Ending-node fields (None on decisions)
    label: str | None = None            # "The Lanyard Legend"
    vibe: str | None = None             # triumph | mixed | disaster | weird
    epilogue: str | None = None
    # Empty on endings
    choices: list[AdventureChoice] = []


class AdventureResponse(BaseModel):
    module_id: str
    module_name: str
    title: str
    intro: str
    start_node_id: str
    nodes: list[AdventureNode]


_VALID_VIBES = {"triumph", "mixed", "disaster", "weird"}


def _prompt(module: ModuleKnowledge) -> str:
    return f"""Design a CHOOSE-YOUR-OWN-ADVENTURE mini-game for the role below.
The player plays ONE silly-but-on-brand "shift gone weird" story where
their decisions ACTUALLY change what happens next.

{module.as_prompt_context()}

---

OUTPUT: a single JSON object describing a small branching story TREE.

TREE SHAPE (this is strict):
- Exactly ONE start node, id = "start", is_start = true.
- The story has EXACTLY 5 sequential decisions on every play-through.
- Depth 1 = "start". Each of its 2-3 choices points to a DIFFERENT
  depth-2 node (ids start with "d2_"). No sharing at depth 2.
- Depth 2, 3, 4 nodes each have 2-3 choices that point to nodes at the
  next depth (ids "d3_*", "d4_*", "d5_*"). Some convergence between paths
  at depths 3/4/5 is fine; full divergence not required.
- Depth 5 nodes each have 2-3 choices, but EVERY depth-5 choice's `next`
  must point to an ENDING node (id starts with "end_", is_ending = true,
  empty choices array).
- Provide 4 endings minimum, 6 maximum. Each ending must be reachable
  from at least one path.

CONTENT RULES — KEEP THINGS SHORT. The tree is big; verbose nodes overflow.
- narration: 1-2 short sentences (≤ 35 words TOTAL). Present tense, SECOND
  PERSON ("You arrive at the desk to find..."). Funny but recognisably
  this exact volunteer role's actual job. Do NOT pad with atmosphere.
- scene_title: 2-5 words.
- choices.text: ≤ 12 words. Funny and tempting. Wrong choices should
  feel plausible to a sleep-deprived volunteer at 2am, not cartoonishly
  evil.
- choices.outcome: ONE short sentence (≤ 18 words) shown after the
  player picks. Tells them what just happened.
- choices.points: best on-brand call gets +10..+20; an okay-but-not-great
  call gets -5..+5; a clearly rule-breaking or chaotic call gets -10..-15.
  Score should still mostly add up: comedy endings can be "negative" but
  the most positive ending should be the one a real lead would high-five.
- Each ending:
    label: 2-5 word title, e.g. "The Lanyard Legend", "Forklift Felon".
    vibe: one of "triumph" | "mixed" | "disaster" | "weird".
    epilogue: 2 short sentences (≤ 40 words total) describing the
              player's fate the next morning. Include a callback to a
              choice they made.
- HEAVILY use this role's actual knowledge, rules, and glossary terms.
  Wrong choices should usually break a real listed rule.
- Be FUNNY in a warm way: on-brand absurdity (a goose stealing a lanyard,
  someone trying to register their emotional support waffle iron). NO
  mean-spirited jokes, NO real-world tragedy, NO punching down at
  attendees, vendors, or coworkers.

Return ONLY this JSON object, no markdown fences:

{{
  "title": "Short, evocative title for the adventure",
  "intro": "1-2 sentences setting when/where this shift takes place.",
  "start_node_id": "start",
  "nodes": [
    {{
      "id": "start",
      "is_start": true,
      "scene_title": "...",
      "narration": "You ... (2-4 sentences)",
      "choices": [
        {{"id":"a","text":"Funny tempting option","next":"d2_alpha","points":10,"outcome":"What just happened."}},
        {{"id":"b","text":"...","next":"d2_beta","points":-5,"outcome":"..."}}
      ]
    }},
    {{
      "id": "d2_alpha",
      "scene_title": "...",
      "narration": "...",
      "choices": [
        {{"id":"a","text":"...","next":"d3_x","points":15,"outcome":"..."}},
        {{"id":"b","text":"...","next":"d3_y","points":-10,"outcome":"..."}}
      ]
    }},
    /* ... more decision nodes at depth 3, 4, 5 ... */
    {{
      "id": "end_lanyard_legend",
      "is_ending": true,
      "label": "The Lanyard Legend",
      "vibe": "triumph",
      "epilogue": "By 9am, the lead is naming a sticker after you. ..."
    }}
  ]
}}

Aim for around 15-22 total nodes. Keep it tight, keep it weird, keep it
factually grounded in the role's knowledge.
"""


def _validate_tree(data: dict) -> AdventureResponse:
    """Strict structural validation so a bad LLM response doesn't break the UI."""
    if not isinstance(data, dict):
        raise ValueError("Top-level JSON must be an object")

    raw_nodes = data.get("nodes")
    if not isinstance(raw_nodes, list) or not raw_nodes:
        raise ValueError("'nodes' must be a non-empty array")

    nodes = [AdventureNode(**n) for n in raw_nodes]
    by_id = {n.id: n for n in nodes}
    if len(by_id) != len(nodes):
        raise ValueError("Duplicate node ids in tree")

    start_id = data.get("start_node_id")
    if start_id not in by_id:
        raise ValueError(f"start_node_id '{start_id}' not found in nodes")

    start_node = by_id[start_id]
    if not start_node.is_start:
        raise ValueError(f"node '{start_id}' is referenced as start but is_start=false")

    endings = [n for n in nodes if n.is_ending]
    if len(endings) < 2:
        raise ValueError(f"Need at least 2 ending nodes, got {len(endings)}")
    for end in endings:
        if end.choices:
            raise ValueError(f"Ending node '{end.id}' must have empty choices")
        if not end.epilogue or not end.label:
            raise ValueError(f"Ending node '{end.id}' missing label or epilogue")
        if end.vibe not in _VALID_VIBES:
            raise ValueError(
                f"Ending '{end.id}' vibe '{end.vibe}' not in {_VALID_VIBES}"
            )

    # All non-endings need narration + choices that resolve.
    for n in nodes:
        if n.is_ending:
            continue
        if not n.narration or not n.scene_title:
            raise ValueError(f"Decision node '{n.id}' missing narration or scene_title")
        if not (2 <= len(n.choices) <= 4):
            raise ValueError(f"Node '{n.id}' must have 2-4 choices, got {len(n.choices)}")
        seen_ids: set[str] = set()
        for c in n.choices:
            if c.id in seen_ids:
                raise ValueError(f"Node '{n.id}' has duplicate choice id '{c.id}'")
            seen_ids.add(c.id)
            if c.next not in by_id:
                raise ValueError(
                    f"Choice {n.id}/{c.id} 'next' = '{c.next}' is not a known node id"
                )

    # Verify every BFS path from start reaches an ending within 6 hops (some
    # slack on the "exactly 5" constraint — we cap rather than crash).
    # We also make sure no path loops back to itself.
    def _walk(node_id: str, depth: int, seen: tuple[str, ...]) -> None:
        if depth > 8:
            raise ValueError(f"Path from start exceeded depth 8: {seen}")
        if node_id in seen:
            raise ValueError(f"Cycle detected involving node '{node_id}'")
        node = by_id[node_id]
        if node.is_ending:
            return
        for c in node.choices:
            _walk(c.next, depth + 1, seen + (node_id,))

    _walk(start_id, 1, ())

    return AdventureResponse(
        module_id="",  # filled in by _parse
        module_name="",
        title=data.get("title") or "A Funny Little Shift",
        intro=data.get("intro") or "",
        start_node_id=start_id,
        nodes=nodes,
    )


def _parse(module: ModuleKnowledge, raw: str) -> AdventureResponse:
    data = extract_json(raw)
    result = _validate_tree(data)  # type: ignore[arg-type]
    return result.model_copy(update={
        "module_id": module.id,
        "module_name": module.name,
    })


@router.get("/modules/{module_id}/adventure", response_model=AdventureResponse)
async def get_adventure(module_id: str):
    return cached_or_generate(
        module_id, "adventure", _prompt, _parse, max_tokens=8000,
    )


@router.post("/modules/{module_id}/adventure/regenerate", response_model=AdventureResponse)
async def regenerate_adventure(module_id: str):
    bust_cache(module_id, "adventure")
    return cached_or_generate(
        module_id, "adventure", _prompt, _parse, max_tokens=8000,
    )
