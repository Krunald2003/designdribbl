// Shared types for the screen library, the renderer and the scoring engine.

export type Difficulty = "Easy" | "Medium" | "Hard";
export type Weight = 400 | 500 | 600 | 700 | 800;

interface Base {
  id: string;
  /** Human-readable element name used in feedback, e.g. "Primary button". */
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RectEl extends Base {
  type: "rect";
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  radius?: number;
}

export interface TextEl extends Base {
  type: "text";
  text: string;
  size: number;
  weight: Weight;
  color: string;
  /** px. Defaults to round(size * 1.25). */
  lineHeight?: number;
  /** Alignment within the anchor box (x .. x + w). */
  align?: "left" | "center" | "right";
  letterSpacing?: number;
}

export type IconGlyph =
  | "back" | "close" | "search" | "bell" | "heart" | "home" | "user" | "settings"
  | "cart" | "star" | "menu" | "plus" | "chevron" | "check" | "play" | "pause"
  | "skip" | "prev" | "down" | "card" | "pin" | "chat" | "chart" | "mark" | "filter"
  | "lock" | "moon" | "globe" | "shield" | "logout" | "bookmark" | "more" | "status";

/** Icons and photos are rendered as placeholders and excluded from scoring. */
export interface IconEl extends Base {
  type: "icon";
  glyph: IconGlyph;
  color: string;
}

export interface ImageEl extends Base {
  type: "image";
  fill: string;
  radius?: number;
  /** Draw as a circle (avatars). */
  round?: boolean;
}

export type El = RectEl | TextEl | IconEl | ImageEl;
export type ScorableEl = RectEl | TextEl;

export interface Screen {
  id: string;
  app: string;
  category: string;
  screen: string;
  platform: "iOS" | "Android";
  width: number;
  height: number;
  difficulty: Difficulty;
  background: string;
  elements: El[];
}

export interface Box { x: number; y: number; w: number; h: number }

/** What the AI vision model returns for one reference element. */
export interface AiElement {
  id: string;
  present: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  text_as_written: string | null;
}

export interface AiExtraction {
  elements: AiElement[];
  model: string;
}

export type Category = "layout" | "spacing" | "typography" | "color";

export interface FeedbackPoint {
  tone: "good" | "warn" | "bad";
  text: string;
  /** Element boxes (reference coordinates) to highlight in the compare view. */
  boxes?: Box[];
}

export interface CategoryResult {
  score: number;
  checks: number;
  feedback: FeedbackPoint[];
}

export interface ScoreResult {
  overall: number;
  band: string;
  categories: Record<Category, CategoryResult>;
  mode: "ai+pixel" | "pixel";
  durationMs: number;
}
