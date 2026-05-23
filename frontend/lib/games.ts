// Catalogue of mini-games we expose in the per-module game picker.
// Adding a new game here + a /play/<id> page is all it takes to show up.

export type GameId = "scenario" | "matching" | "triage" | "radio" | "violations" | "adventure";

export type GameMeta = {
  id: GameId;
  title: string;
  tagline: string;       // one-liner shown on the picker card
  emoji: string;
  badge: string;         // short pill: "TIMED", "DRAG", "TAP", etc.
};

export const GAMES: GameMeta[] = [
  {
    id: "scenario",
    title: "Decision Drill",
    tagline: "Real-shift situations. Pick the right move.",
    emoji: "🎯",
    badge: "STORY",
  },
  {
    id: "matching",
    title: "Match-Up",
    tagline: "Connect every term with its definition.",
    emoji: "🧠",
    badge: "MEMORY",
  },
  {
    id: "triage",
    title: "Triage Rush",
    tagline: "Sort incoming cards into the right bucket — fast.",
    emoji: "📥",
    badge: "TIMED",
  },
  {
    id: "radio",
    title: "Radio Dispatch",
    tagline: "Listen up. Choose the right call before the clock runs out.",
    emoji: "📻",
    badge: "ARCADE",
  },
  {
    id: "violations",
    title: "Spot the Slip",
    tagline: "Read the shift. Tap every rule that got broken.",
    emoji: "🕵️",
    badge: "OBSERVE",
  },
  {
    id: "adventure",
    title: "Pick-Your-Path",
    tagline: "One shift, five decisions, weird endings. Your call.",
    emoji: "📖",
    badge: "BRANCHING",
  },
];
