

# Fix Documentation Inconsistencies

## Findings

| Location | What it says | What's actually implemented | Fix |
|---|---|---|---|
| **About** (MainMenu.tsx line 323) | "8 powerful power-ups" | 12 power-up types exist | Change to "12 power-ups" |
| **Homepage** (Home.tsx) | "13 Power-Ups" heading | Grid only shows 12 items; there are 12 types in code | Change heading to "12 Power-Ups" |
| **Homepage** (Home.tsx) | Imports `powerupSecondchance` | Never used in the displayed grid | Remove unused import |
| **Homepage** Godlike description | "1 life, faster speed, higher caps" | Also: no extra life power-ups, no bonus life on boss defeat | Add "no extra lives" to description |
| **Instructions** Godlike description (MainMenu.tsx line 609) | "No extra life power-ups" | Now also no extra life on boss defeat | Update to "No extra lives (power-ups or boss defeat)" |

## Files to Change

### 1. `src/components/MainMenu.tsx`

**Line 323** — About section:
- Change "8 powerful power-ups" to "12 power-ups"

**Line 609** — Instructions, Godlike description:
- Change "No extra life power-ups, speed cap 175%, faster enemies, more enemy fire"
- To: "No extra lives (power-ups or boss defeat), 1 life, speed cap 175%, faster enemies, more enemy fire"

### 2. `src/pages/Home.tsx`

**Line 5 area** — Remove unused `import powerupSecondchance`

**Power-ups heading** — Change "13 Power-Ups" to "12 Power-Ups"

**Godlike description** — Change from "1 life, faster speed, higher caps" to "1 life, no extra lives, faster speed, higher caps"

---

No logic or gameplay changes -- documentation text only.

