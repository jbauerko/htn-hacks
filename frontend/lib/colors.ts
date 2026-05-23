// Pastel theme map per module color.
//
// Source palette (from design):
//   green:  light #D2FFD1  dark #54C152
//   yellow: light #FEF3C7  dark #F59E0B
//   blue:   light #D9F3FF  dark #43AFDE
//   grey:   sidebar #F3F4F6   topbar #F6F8FA
//
// The other module colors (rose, pink, violet, indigo, orange, teal) follow
// the same recipe: very light pastel surface + a medium-saturated accent for
// text / CTAs / borders.
//
// IMPORTANT: every class string below must appear LITERALLY in this file so
// Tailwind v4's JIT picks it up. Do NOT build classes with template strings
// at runtime — concatenating bg-[ + hex + ] at runtime would not work.

import type { ModuleColor } from "./api";

export type Theme = {
  bgSoft: string;        // very light wash for cards / chips
  bgChip: string;        // a hair darker than bgSoft for pills
  bgAccent: string;      // slightly darker still — used for card headers
  bgSolid: string;       // primary CTA background (the dark accent)
  bgSolidHover: string;
  bgGradient: string;    // hero/header gradient (light → medium pastel)
  textStrong: string;    // dark accent text on light backgrounds
  textOnSolid: string;   // text colour on bgSolid (always white-ish)
  textMuted: string;     // softer accent for secondary text
  border: string;        // light pastel border
  borderStrong: string;  // dark accent border (used when selected)
  ring: string;
  glow: string;
};

const THEMES: Record<ModuleColor, Theme> = {
  // ── Green (from spec) ──────────────────────────────────────────
  emerald: {
    bgSoft: "bg-[#E8FFE7]",
    bgChip: "bg-[#D2FFD1]",
    bgAccent: "bg-[#A8F0A4]",
    bgSolid: "bg-[#54C152]",
    bgSolidHover: "hover:bg-[#3FA63D]",
    bgGradient: "bg-gradient-to-br from-[#E8FFE7] to-[#A8F0A4]",
    textStrong: "text-[#246B22]",
    textOnSolid: "text-white",
    textMuted: "text-[#54C152]",
    border: "border-[#D2FFD1]",
    borderStrong: "border-[#54C152]",
    ring: "ring-[#A8F0A4]",
    glow: "shadow-[#D2FFD1]",
  },
  teal: {
    bgSoft: "bg-[#E0FAF3]",
    bgChip: "bg-[#CCFBF1]",
    bgAccent: "bg-[#9BF1DE]",
    bgSolid: "bg-[#14B8A6]",
    bgSolidHover: "hover:bg-[#0F8E80]",
    bgGradient: "bg-gradient-to-br from-[#E0FAF3] to-[#9BF1DE]",
    textStrong: "text-[#085048]",
    textOnSolid: "text-white",
    textMuted: "text-[#14B8A6]",
    border: "border-[#CCFBF1]",
    borderStrong: "border-[#14B8A6]",
    ring: "ring-[#9BF1DE]",
    glow: "shadow-[#CCFBF1]",
  },

  // ── Yellow (from spec) ─────────────────────────────────────────
  amber: {
    bgSoft: "bg-[#FFF9E2]",
    bgChip: "bg-[#FEF3C7]",
    bgAccent: "bg-[#FDE89A]",
    bgSolid: "bg-[#F59E0B]",
    bgSolidHover: "hover:bg-[#C97F08]",
    bgGradient: "bg-gradient-to-br from-[#FFF9E2] to-[#FDE89A]",
    textStrong: "text-[#7C4E04]",
    textOnSolid: "text-white",
    textMuted: "text-[#C97F08]",
    border: "border-[#FEF3C7]",
    borderStrong: "border-[#F59E0B]",
    ring: "ring-[#FDE89A]",
    glow: "shadow-[#FEF3C7]",
  },
  orange: {
    bgSoft: "bg-[#FFF5E6]",
    bgChip: "bg-[#FFEDD5]",
    bgAccent: "bg-[#FFD4A1]",
    bgSolid: "bg-[#F97316]",
    bgSolidHover: "hover:bg-[#C75808]",
    bgGradient: "bg-gradient-to-br from-[#FFF5E6] to-[#FFD4A1]",
    textStrong: "text-[#7A3404]",
    textOnSolid: "text-white",
    textMuted: "text-[#C75808]",
    border: "border-[#FFEDD5]",
    borderStrong: "border-[#F97316]",
    ring: "ring-[#FFD4A1]",
    glow: "shadow-[#FFEDD5]",
  },

  // ── Blue (from spec) ───────────────────────────────────────────
  sky: {
    bgSoft: "bg-[#ECF8FF]",
    bgChip: "bg-[#D9F3FF]",
    bgAccent: "bg-[#A6E1FA]",
    bgSolid: "bg-[#43AFDE]",
    bgSolidHover: "hover:bg-[#2C90BC]",
    bgGradient: "bg-gradient-to-br from-[#ECF8FF] to-[#A6E1FA]",
    textStrong: "text-[#1A5670]",
    textOnSolid: "text-white",
    textMuted: "text-[#2C90BC]",
    border: "border-[#D9F3FF]",
    borderStrong: "border-[#43AFDE]",
    ring: "ring-[#A6E1FA]",
    glow: "shadow-[#D9F3FF]",
  },
  cyan: {
    bgSoft: "bg-[#ECF8FF]",
    bgChip: "bg-[#D9F3FF]",
    bgAccent: "bg-[#A6E1FA]",
    bgSolid: "bg-[#43AFDE]",
    bgSolidHover: "hover:bg-[#2C90BC]",
    bgGradient: "bg-gradient-to-br from-[#ECF8FF] to-[#A6E1FA]",
    textStrong: "text-[#1A5670]",
    textOnSolid: "text-white",
    textMuted: "text-[#2C90BC]",
    border: "border-[#D9F3FF]",
    borderStrong: "border-[#43AFDE]",
    ring: "ring-[#A6E1FA]",
    glow: "shadow-[#D9F3FF]",
  },

  // ── Indigo / violet (same recipe in a cooler hue) ─────────────
  indigo: {
    bgSoft: "bg-[#EEF1FF]",
    bgChip: "bg-[#E0E7FF]",
    bgAccent: "bg-[#C0CCFF]",
    bgSolid: "bg-[#6366F1]",
    bgSolidHover: "hover:bg-[#4346C5]",
    bgGradient: "bg-gradient-to-br from-[#EEF1FF] to-[#C0CCFF]",
    textStrong: "text-[#26277A]",
    textOnSolid: "text-white",
    textMuted: "text-[#4346C5]",
    border: "border-[#E0E7FF]",
    borderStrong: "border-[#6366F1]",
    ring: "ring-[#C0CCFF]",
    glow: "shadow-[#E0E7FF]",
  },
  violet: {
    bgSoft: "bg-[#F5F2FF]",
    bgChip: "bg-[#EDE9FE]",
    bgAccent: "bg-[#D4C7FE]",
    bgSolid: "bg-[#8B5CF6]",
    bgSolidHover: "hover:bg-[#6E3FE0]",
    bgGradient: "bg-gradient-to-br from-[#F5F2FF] to-[#D4C7FE]",
    textStrong: "text-[#3F2099]",
    textOnSolid: "text-white",
    textMuted: "text-[#6E3FE0]",
    border: "border-[#EDE9FE]",
    borderStrong: "border-[#8B5CF6]",
    ring: "ring-[#D4C7FE]",
    glow: "shadow-[#EDE9FE]",
  },

  // ── Pinks (extension of yellow/green/blue logic) ───────────────
  rose: {
    bgSoft: "bg-[#FFF0F1]",
    bgChip: "bg-[#FFE4E6]",
    bgAccent: "bg-[#FFC6CB]",
    bgSolid: "bg-[#F43F5E]",
    bgSolidHover: "hover:bg-[#C42942]",
    bgGradient: "bg-gradient-to-br from-[#FFF0F1] to-[#FFC6CB]",
    textStrong: "text-[#7A1622]",
    textOnSolid: "text-white",
    textMuted: "text-[#C42942]",
    border: "border-[#FFE4E6]",
    borderStrong: "border-[#F43F5E]",
    ring: "ring-[#FFC6CB]",
    glow: "shadow-[#FFE4E6]",
  },
  pink: {
    bgSoft: "bg-[#FFF1F8]",
    bgChip: "bg-[#FCE7F3]",
    bgAccent: "bg-[#F9CDE3]",
    bgSolid: "bg-[#EC4899]",
    bgSolidHover: "hover:bg-[#BE2F76]",
    bgGradient: "bg-gradient-to-br from-[#FFF1F8] to-[#F9CDE3]",
    textStrong: "text-[#7A1E4B]",
    textOnSolid: "text-white",
    textMuted: "text-[#BE2F76]",
    border: "border-[#FCE7F3]",
    borderStrong: "border-[#EC4899]",
    ring: "ring-[#F9CDE3]",
    glow: "shadow-[#FCE7F3]",
  },
};

export function theme(color: ModuleColor | string): Theme {
  return THEMES[(color as ModuleColor)] ?? THEMES.indigo;
}

// Neutral surface palette used outside per-module theming.
export const NEUTRAL = {
  topBar: "bg-[#F6F8FA]/90",   // sticky game top bar background
  sidebar: "bg-[#F3F4F6]",     // unused yet, reserved for a future side panel
  pageBg: "bg-[#F6F8FA]",      // base page background
} as const;
