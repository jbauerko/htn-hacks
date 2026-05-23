// Static Tailwind class maps per module color. Tailwind v4's JIT scans source
// files for literal class strings, so we must spell them all out here — do
// NOT generate them with template strings at runtime.

import type { ModuleColor } from "./api";

export type Theme = {
  // backgrounds
  bgSoft: string;       // light wash for cards
  bgChip: string;       // chip / pill background
  bgSolid: string;      // primary CTA background
  bgSolidHover: string;
  bgGradient: string;   // big hero gradient
  // text
  textStrong: string;   // dark text on light bg
  textOnSolid: string;  // always white-ish
  textMuted: string;    // softer accent text
  // borders
  border: string;
  borderStrong: string;
  // misc
  ring: string;
  glow: string;
};

const THEMES: Record<ModuleColor, Theme> = {
  indigo: {
    bgSoft: "bg-indigo-50", bgChip: "bg-indigo-100", bgSolid: "bg-indigo-500", bgSolidHover: "hover:bg-indigo-600",
    bgGradient: "bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-500",
    textStrong: "text-indigo-700", textOnSolid: "text-white", textMuted: "text-indigo-500",
    border: "border-indigo-200", borderStrong: "border-indigo-400",
    ring: "ring-indigo-300", glow: "shadow-indigo-200",
  },
  emerald: {
    bgSoft: "bg-emerald-50", bgChip: "bg-emerald-100", bgSolid: "bg-emerald-500", bgSolidHover: "hover:bg-emerald-600",
    bgGradient: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-500",
    textStrong: "text-emerald-700", textOnSolid: "text-white", textMuted: "text-emerald-500",
    border: "border-emerald-200", borderStrong: "border-emerald-400",
    ring: "ring-emerald-300", glow: "shadow-emerald-200",
  },
  amber: {
    bgSoft: "bg-amber-50", bgChip: "bg-amber-100", bgSolid: "bg-amber-500", bgSolidHover: "hover:bg-amber-600",
    bgGradient: "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500",
    textStrong: "text-amber-700", textOnSolid: "text-white", textMuted: "text-amber-600",
    border: "border-amber-200", borderStrong: "border-amber-400",
    ring: "ring-amber-300", glow: "shadow-amber-200",
  },
  rose: {
    bgSoft: "bg-rose-50", bgChip: "bg-rose-100", bgSolid: "bg-rose-500", bgSolidHover: "hover:bg-rose-600",
    bgGradient: "bg-gradient-to-br from-rose-400 via-rose-500 to-pink-500",
    textStrong: "text-rose-700", textOnSolid: "text-white", textMuted: "text-rose-500",
    border: "border-rose-200", borderStrong: "border-rose-400",
    ring: "ring-rose-300", glow: "shadow-rose-200",
  },
  violet: {
    bgSoft: "bg-violet-50", bgChip: "bg-violet-100", bgSolid: "bg-violet-500", bgSolidHover: "hover:bg-violet-600",
    bgGradient: "bg-gradient-to-br from-violet-400 via-violet-500 to-fuchsia-500",
    textStrong: "text-violet-700", textOnSolid: "text-white", textMuted: "text-violet-500",
    border: "border-violet-200", borderStrong: "border-violet-400",
    ring: "ring-violet-300", glow: "shadow-violet-200",
  },
  cyan: {
    bgSoft: "bg-cyan-50", bgChip: "bg-cyan-100", bgSolid: "bg-cyan-500", bgSolidHover: "hover:bg-cyan-600",
    bgGradient: "bg-gradient-to-br from-cyan-400 via-cyan-500 to-sky-500",
    textStrong: "text-cyan-700", textOnSolid: "text-white", textMuted: "text-cyan-600",
    border: "border-cyan-200", borderStrong: "border-cyan-400",
    ring: "ring-cyan-300", glow: "shadow-cyan-200",
  },
  orange: {
    bgSoft: "bg-orange-50", bgChip: "bg-orange-100", bgSolid: "bg-orange-500", bgSolidHover: "hover:bg-orange-600",
    bgGradient: "bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500",
    textStrong: "text-orange-700", textOnSolid: "text-white", textMuted: "text-orange-500",
    border: "border-orange-200", borderStrong: "border-orange-400",
    ring: "ring-orange-300", glow: "shadow-orange-200",
  },
  sky: {
    bgSoft: "bg-sky-50", bgChip: "bg-sky-100", bgSolid: "bg-sky-500", bgSolidHover: "hover:bg-sky-600",
    bgGradient: "bg-gradient-to-br from-sky-400 via-sky-500 to-blue-500",
    textStrong: "text-sky-700", textOnSolid: "text-white", textMuted: "text-sky-600",
    border: "border-sky-200", borderStrong: "border-sky-400",
    ring: "ring-sky-300", glow: "shadow-sky-200",
  },
  teal: {
    bgSoft: "bg-teal-50", bgChip: "bg-teal-100", bgSolid: "bg-teal-500", bgSolidHover: "hover:bg-teal-600",
    bgGradient: "bg-gradient-to-br from-teal-400 via-teal-500 to-emerald-500",
    textStrong: "text-teal-700", textOnSolid: "text-white", textMuted: "text-teal-600",
    border: "border-teal-200", borderStrong: "border-teal-400",
    ring: "ring-teal-300", glow: "shadow-teal-200",
  },
  pink: {
    bgSoft: "bg-pink-50", bgChip: "bg-pink-100", bgSolid: "bg-pink-500", bgSolidHover: "hover:bg-pink-600",
    bgGradient: "bg-gradient-to-br from-pink-400 via-pink-500 to-rose-500",
    textStrong: "text-pink-700", textOnSolid: "text-white", textMuted: "text-pink-500",
    border: "border-pink-200", borderStrong: "border-pink-400",
    ring: "ring-pink-300", glow: "shadow-pink-200",
  },
};

export function theme(color: ModuleColor | string): Theme {
  return THEMES[(color as ModuleColor)] ?? THEMES.indigo;
}
