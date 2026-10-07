/**
 * ZenGreenStyles.test.tsx
 * STYLE-01: Design token CSS variables, typography, and spacing scale.
 * STYLE-02: WCAG AA (>= 4.5:1) contrast verification for all 8 ticket status
 *            badges and 4 priority badges.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCSSVars(css: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    vars[`--${m[1]}`] = m[2].trim();
  }
  return vars;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace(/^#/, "");
  let r: number, g: number, b: number;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16);
    g = parseInt(clean[1] + clean[1], 16);
    b = parseInt(clean[2] + clean[2], 16);
  } else {
    r = parseInt(clean.slice(0, 2), 16);
    g = parseInt(clean.slice(2, 4), 16);
    b = parseInt(clean.slice(4, 6), 16);
  }
  return [r, g, b];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Load theme.css once
// ---------------------------------------------------------------------------
const themePath = path.resolve(__dirname, "../../src/styles/theme.css");
const themeCSS = fs.readFileSync(themePath, "utf-8");
const cssVars = parseCSSVars(themeCSS);

// ---------------------------------------------------------------------------
// STYLE-01: Design Tokens & Typography
// ---------------------------------------------------------------------------
describe("STYLE-01: Zen Green Design Tokens & Typography (ui-spec.md S1)", () => {
  it("--color-primary-green is #006B3C", () => {
    expect(cssVars["--color-primary-green"]).toBe("#006B3C");
  });

  it("--color-secondary-green is #0B7A46", () => {
    expect(cssVars["--color-secondary-green"]).toBe("#0B7A46");
  });

  it("--color-pale-green is #EAF6EF", () => {
    expect(cssVars["--color-pale-green"]).toBe("#EAF6EF");
  });

  it("--color-page-bg is #F5F7F6", () => {
    expect(cssVars["--color-page-bg"]).toBe("#F5F7F6");
  });

  it("--color-surface-card is #FFFFFF", () => {
    expect(cssVars["--color-surface-card"]).toBe("#FFFFFF");
  });

  it("--color-text-main is #1C2A22", () => {
    expect(cssVars["--color-text-main"]).toBe("#1C2A22");
  });

  it("--color-text-muted is #5C6F64", () => {
    expect(cssVars["--color-text-muted"]).toBe("#5C6F64");
  });

  it("--color-border-neutral is #D8E2DC", () => {
    expect(cssVars["--color-border-neutral"]).toBe("#D8E2DC");
  });

  it("--color-error is #C53030", () => {
    expect(cssVars["--color-error"]).toBe("#C53030");
  });

  it("--color-warning is #975A16 (WCAG AA compliant)", () => {
    expect(cssVars["--color-warning"]).toBe("#975A16");
  });

  it("--color-warning-bg is #FEFCBF", () => {
    expect(cssVars["--color-warning-bg"]).toBe("#FEFCBF");
  });

  it("--color-success is #22543D", () => {
    expect(cssVars["--color-success"]).toBe("#22543D");
  });

  it("font-family includes system-ui, -apple-system, Segoe UI, Roboto in body rule", () => {
    expect(themeCSS).toContain("system-ui");
    expect(themeCSS).toContain("-apple-system");
    expect(themeCSS).toContain("Segoe UI");
    expect(themeCSS).toContain("Roboto");
  });

  it("focus ring uses box-shadow with rgba(0, 107, 60, 0.25)", () => {
    expect(themeCSS).toContain("rgba(0, 107, 60, 0.25)");
  });
});

describe("STYLE-01: CSS custom property completeness", () => {
  const requiredVars = [
    "--color-primary-green",
    "--color-secondary-green",
    "--color-pale-green",
    "--color-page-bg",
    "--color-surface-card",
    "--color-text-main",
    "--color-text-muted",
    "--color-border-neutral",
    "--color-input-bg-editable",
    "--color-input-bg-readonly",
    "--color-error",
    "--color-error-bg",
    "--color-warning",
    "--color-warning-bg",
    "--color-success",
    "--color-success-bg",
  ];

  for (const varName of requiredVars) {
    it(`${varName} is defined in theme.css`, () => {
      expect(cssVars[varName], `${varName} missing in theme.css`).toBeDefined();
    });
  }
});

// ---------------------------------------------------------------------------
// STYLE-02: WCAG AA contrast for ticket status badges (ui-spec.md S1.5)
// ---------------------------------------------------------------------------
const ticketStatusBadges: [string, string, string][] = [
  ["NEW",                   "#EBF8FF", "#2B6CB0"],
  ["OPEN",                  "#E6FFFA", "#234E52"],
  ["IN_PROGRESS",           "#FEEBC8", "#7B341E"],
  ["WAITING_FOR_REQUESTER", "#FAF5FF", "#553C9A"],
  ["RESOLVED",              "#C6F6D5", "#22543D"],
  ["CLOSED",                "#EDF2F7", "#4A5568"],
  ["REOPENED",              "#FFEDD5", "#9A3412"],
  ["CANCELLED",             "#FED7D7", "#9B2C2C"],
];

const priorityBadges: [string, string, string][] = [
  ["LOW",    "#EDF2F7", "#4A5568"],
  ["MEDIUM", "#FEFCBF", "#744210"],
  ["HIGH",   "#FEEBC8", "#7B341E"],
  ["URGENT", "#FED7D7", "#9B2C2C"],
];

describe("STYLE-02: Ticket Status Badge WCAG AA Contrast (>=4.5:1) (ui-spec.md S1.5)", () => {
  for (const [status, bg, text] of ticketStatusBadges) {
    it(`${status} badge: text ${text} on bg ${bg} meets WCAG AA`, () => {
      const ratio = contrastRatio(text, bg);
      expect(ratio, `${status} contrast ${ratio.toFixed(2)} < 4.5`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("STYLE-02: Priority Badge WCAG AA Contrast (>=4.5:1) (ui-spec.md S1.5)", () => {
  for (const [priority, bg, text] of priorityBadges) {
    it(`${priority} priority badge: text ${text} on bg ${bg} meets WCAG AA`, () => {
      const ratio = contrastRatio(text, bg);
      expect(ratio, `${priority} contrast ${ratio.toFixed(2)} < 4.5`).toBeGreaterThanOrEqual(4.5);
    });
  }
});

describe("STYLE-02: Warning badge WCAG AA Contrast (>=4.5:1) (ui-spec.md S1.1)", () => {
  it("--color-warning #975A16 on --color-warning-bg #FEFCBF meets WCAG AA >= 4.5:1", () => {
    const ratio = contrastRatio("#975A16", "#FEFCBF");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
