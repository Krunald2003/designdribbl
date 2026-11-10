// Pilot screen library: 15 mobile screens (5 easy, 5 medium, 5 hard).
//
// Each screen is an original rebuild with fictional brand names. The spec below is
// the single source of truth: it is rendered into the reference image users see,
// and it is the reference spec the scoring engine compares submissions against.
// Text boxes are given as an anchor (x, y, optional w + align); the renderer
// resolves them to tight boxes once fonts have loaded.

import type { El, IconEl, IconGlyph, ImageEl, RectEl, Screen, TextEl, Weight } from "./types";

let iconSeq = 0;

function R(
  id: string, name: string, x: number, y: number, w: number, h: number,
  fill?: string, o: { stroke?: string; sw?: number; r?: number } = {},
): RectEl {
  return { type: "rect", id, name, x, y, w, h, fill, stroke: o.stroke, strokeWidth: o.stroke ? (o.sw ?? 1) : undefined, radius: o.r ?? 0 };
}

function T(
  id: string, name: string, x: number, y: number, text: string, size: number, weight: Weight, color: string,
  o: { w?: number; align?: "left" | "center" | "right"; lh?: number; ls?: number } = {},
): TextEl {
  const lh = o.lh ?? Math.round(size * 1.25);
  const lines = text.split("\n").length;
  return { type: "text", id, name, x, y, w: o.w ?? 0, h: lines * lh, text, size, weight, color, lineHeight: lh, align: o.align ?? "left", letterSpacing: o.ls };
}

/** Text centered inside the horizontal anchor x .. x + w. */
function C(id: string, name: string, x: number, y: number, w: number, text: string, size: number, weight: Weight, color: string, lh?: number): TextEl {
  return T(id, name, x, y, text, size, weight, color, { w, align: "center", lh });
}

/** Text right-aligned to x + w. */
function RA(id: string, name: string, x: number, y: number, w: number, text: string, size: number, weight: Weight, color: string): TextEl {
  return T(id, name, x, y, text, size, weight, color, { w, align: "right" });
}

function I(glyph: IconGlyph, x: number, y: number, s: number, color: string): IconEl {
  iconSeq += 1;
  return { type: "icon", id: `icon_${glyph}_${iconSeq}`, name: `${glyph} icon`, glyph, x, y, w: s, h: s, color };
}

function P(id: string, name: string, x: number, y: number, w: number, h: number, fill: string, o: { r?: number; round?: boolean } = {}): ImageEl {
  return { type: "image", id, name, x, y, w, h, fill, radius: o.r ?? 0, round: o.round };
}

function status(color: string): IconEl {
  return { ...I("status", 0, 0, 0, color), w: 390, h: 47, name: "Status bar" };
}

/** A centered label inside a button rect. */
function button(id: string, name: string, x: number, y: number, w: number, h: number, fill: string | undefined, label: string, size: number, weight: Weight, color: string, o: { stroke?: string; sw?: number; r?: number } = {}): El[] {
  const lh = Math.round(size * 1.25);
  return [
    R(id, name, x, y, w, h, fill, o),
    C(`${id}_label`, `${name} label`, x, y + Math.round((h - lh) / 2), w, label, size, weight, color),
  ];
}

const W = 390;
const H = 844;

// ───────────────────────────── EASY ─────────────────────────────

const rideLogin: Screen = {
  id: "ride-login", app: "Rydo", category: "Ride-hailing", screen: "Phone login", platform: "iOS",
  width: W, height: H, difficulty: "Easy", background: "#FFFFFF",
  elements: [
    status("#000000"),
    T("logo", "Wordmark", 24, 72, "Rydo", 28, 800, "#000000"),
    T("title", "Title", 24, 140, "What's your phone number?", 24, 700, "#000000", { lh: 30 }),
    T("subtitle", "Subtitle", 24, 178, "We'll text a code to verify your phone.", 15, 400, "#5E5E5E", { lh: 20 }),
    R("country", "Country picker", 24, 222, 96, 52, "#F3F3F3", { r: 8 }),
    T("country_code", "Country code", 40, 238, "+1", 16, 500, "#000000"),
    I("down", 96, 240, 16, "#000000"),
    R("phone", "Phone input", 132, 222, 234, 52, "#F3F3F3", { r: 8 }),
    T("phone_ph", "Phone placeholder", 148, 238, "Mobile number", 16, 400, "#8A8A8A"),
    ...button("continue", "Continue button", 24, 298, 342, 52, "#000000", "Continue", 16, 600, "#FFFFFF", { r: 8 }),
    R("div_l", "Left divider", 24, 386, 140, 1, "#E2E2E2"),
    C("or", "Divider label", 164, 376, 62, "or", 14, 400, "#5E5E5E"),
    R("div_r", "Right divider", 226, 386, 140, 1, "#E2E2E2"),
    ...button("google", "Google button", 24, 414, 342, 52, "#FFFFFF", "Continue with Google", 16, 500, "#000000", { stroke: "#E2E2E2", r: 8 }),
    I("mark", 40, 428, 24, "#5E5E5E"),
    T("legal", "Legal text", 24, 760, "By continuing, you agree to calls, including by\nautodialer, from Rydo and its affiliates.", 12, 400, "#5E5E5E", { lh: 16 }),
  ],
};

const musicSplash: Screen = {
  id: "music-splash", app: "Tunely", category: "Music streaming", screen: "Splash", platform: "iOS",
  width: W, height: H, difficulty: "Easy", background: "#121212",
  elements: [
    status("#FFFFFF"),
    R("logo_bg", "Logo circle", 155, 292, 80, 80, "#1ED760", { r: 40 }),
    I("play", 181, 316, 32, "#121212"),
    C("name", "App name", 0, 396, W, "Tunely", 32, 800, "#FFFFFF"),
    C("tagline", "Tagline", 0, 444, W, "Millions of songs. Free on Tunely.", 16, 500, "#B3B3B3"),
    ...button("signup", "Sign up button", 24, 640, 342, 52, "#1ED760", "Sign up free", 16, 700, "#121212", { r: 26 }),
    ...button("google", "Google button", 24, 704, 342, 52, undefined, "Continue with Google", 16, 700, "#FFFFFF", { stroke: "#727272", r: 26 }),
    C("login", "Log in link", 0, 780, W, "Log in", 16, 700, "#FFFFFF"),
  ],
};

const bankOtp: Screen = {
  id: "bank-otp", app: "Ledgerly", category: "Banking", screen: "OTP verification", platform: "iOS",
  width: W, height: H, difficulty: "Easy", background: "#F7F8FA",
  elements: [
    status("#111827"),
    I("back", 24, 60, 24, "#111827"),
    T("title", "Title", 24, 112, "Enter verification code", 26, 700, "#111827", { lh: 32 }),
    T("subtitle", "Subtitle", 24, 154, "We sent a 4-digit code to\n+1 (415) 555-0132", 15, 400, "#6B7280", { lh: 22 }),
    R("d1", "Digit box 1", 24, 220, 72, 72, "#FFFFFF", { stroke: "#2563EB", sw: 2, r: 12 }),
    C("d1_t", "Digit 1", 24, 238, 72, "4", 28, 600, "#111827"),
    R("d2", "Digit box 2", 114, 220, 72, 72, "#FFFFFF", { stroke: "#D1D5DB", r: 12 }),
    C("d2_t", "Digit 2", 114, 238, 72, "8", 28, 600, "#111827"),
    R("d3", "Digit box 3", 204, 220, 72, 72, "#FFFFFF", { stroke: "#D1D5DB", r: 12 }),
    C("d3_t", "Digit 3", 204, 238, 72, "2", 28, 600, "#111827"),
    R("d4", "Digit box 4", 294, 220, 72, 72, "#FFFFFF", { stroke: "#D1D5DB", r: 12 }),
    T("resend", "Resend timer", 24, 316, "Resend code in 0:24", 14, 500, "#2563EB"),
    ...button("verify", "Verify button", 24, 746, 342, 54, "#2563EB", "Verify", 16, 600, "#FFFFFF", { r: 12 }),
  ],
};

const foodWelcome: Screen = {
  id: "food-welcome", app: "Munchbox", category: "Food delivery", screen: "Welcome", platform: "iOS",
  width: W, height: H, difficulty: "Easy", background: "#FFFFFF",
  elements: [
    P("hero", "Hero photo", 0, 0, W, 430, "#FFE3D3"),
    status("#1C1C1C"),
    T("title", "Headline", 24, 462, "Hungry? Food at\nyour door in 30 min.", 30, 800, "#1C1C1C", { lh: 36 }),
    T("subtitle", "Subtitle", 24, 552, "Order from 5,000+ local restaurants and\ntrack your delivery in real time.", 15, 400, "#6F6F6F", { lh: 22 }),
    R("dot1", "Active page dot", 24, 624, 24, 8, "#FF5A1F", { r: 4 }),
    R("dot2", "Page dot 2", 56, 624, 8, 8, "#F0D5C9", { r: 4 }),
    R("dot3", "Page dot 3", 72, 624, 8, 8, "#F0D5C9", { r: 4 }),
    ...button("cta", "Get started button", 24, 700, 342, 56, "#FF5A1F", "Get started", 17, 700, "#FFFFFF", { r: 16 }),
    C("signin", "Sign-in link", 0, 782, W, "I already have an account", 15, 600, "#FF5A1F"),
  ],
};

const notesEmpty: Screen = {
  id: "notes-empty", app: "Jotter", category: "Notes", screen: "Empty state", platform: "iOS",
  width: W, height: H, difficulty: "Easy", background: "#FFFDF7",
  elements: [
    status("#1F1F1F"),
    T("title", "Large title", 24, 64, "Notes", 34, 800, "#1F1F1F", { lh: 42 }),
    R("search", "Search bar", 24, 122, 342, 44, "#F1EEE4", { r: 12 }),
    I("search", 38, 134, 20, "#8C8778"),
    T("search_ph", "Search placeholder", 66, 134, "Search notes", 16, 400, "#8C8778", { lh: 20 }),
    P("illus", "Illustration", 115, 300, 160, 160, "#F6E7B8", { round: true }),
    C("empty_title", "Empty-state title", 0, 488, W, "No notes yet", 22, 700, "#1F1F1F"),
    C("empty_body", "Empty-state body", 0, 524, W, "Tap the + button to capture your first idea.", 15, 400, "#77736A"),
    R("fab", "Add button", 310, 740, 56, 56, "#F5B400", { r: 28 }),
    I("plus", 326, 756, 24, "#1F1F1F"),
  ],
};

// ───────────────────────────── MEDIUM ─────────────────────────────

function goalOption(i: number, y: number, title: string, sub: string, glyph: IconGlyph, selected: boolean): El[] {
  return [
    R(`opt${i}`, `Option card ${i}`, 24, y, 342, 72, "#1A1D24", selected ? { stroke: "#C6FF3D", sw: 2, r: 16 } : { r: 16 }),
    I(glyph, 44, y + 24, 24, selected ? "#C6FF3D" : "#9AA0AB"),
    T(`opt${i}_t`, `Option ${i} title`, 84, y + 15, title, 16, 600, "#FFFFFF"),
    T(`opt${i}_s`, `Option ${i} caption`, 84, y + 39, sub, 13, 400, "#9AA0AB"),
    selected
      ? R(`opt${i}_r`, `Option ${i} radio`, 326, y + 26, 20, 20, "#C6FF3D", { r: 10 })
      : R(`opt${i}_r`, `Option ${i} radio`, 326, y + 26, 20, 20, undefined, { stroke: "#3A3F4A", sw: 2, r: 10 }),
  ];
}

const fitOnboarding: Screen = {
  id: "fit-onboarding", app: "Pulsefit", category: "Fitness", screen: "Onboarding: goal", platform: "iOS",
  width: W, height: H, difficulty: "Medium", background: "#0F1115",
  elements: [
    status("#FFFFFF"),
    I("back", 24, 63, 24, "#FFFFFF"),
    R("track", "Progress track", 64, 72, 262, 6, "#2A2E37", { r: 3 }),
    R("progress", "Progress fill", 64, 72, 175, 6, "#C6FF3D", { r: 3 }),
    RA("step", "Step counter", 330, 66, 36, "2/3", 14, 600, "#9AA0AB"),
    T("title", "Title", 24, 118, "What's your main\nfitness goal?", 30, 800, "#FFFFFF", { lh: 36 }),
    T("subtitle", "Subtitle", 24, 200, "We'll build a plan around it.", 15, 400, "#9AA0AB"),
    ...goalOption(1, 248, "Lose weight", "Burn fat, feel lighter", "heart", false),
    ...goalOption(2, 332, "Build muscle", "Get stronger every week", "chart", true),
    ...goalOption(3, 416, "Improve endurance", "Run longer, recover faster", "star", false),
    ...goalOption(4, 500, "Stay active", "Keep a healthy routine", "check", false),
    ...button("cta", "Continue button", 24, 740, 342, 56, "#C6FF3D", "Continue", 17, 700, "#0F1115", { r: 28 }),
  ],
};

const gridFills = ["#E9D5FF", "#FDE68A", "#BFDBFE", "#FBCFE8", "#BBF7D0", "#FED7AA", "#C7D2FE", "#FECACA", "#A5F3FC"];

const socialProfile: Screen = {
  id: "social-profile", app: "Snapgram", category: "Social", screen: "Profile", platform: "iOS",
  width: W, height: H, difficulty: "Medium", background: "#FFFFFF",
  elements: [
    status("#111111"),
    T("handle", "Username", 24, 60, "alex.rivera", 20, 700, "#111111"),
    I("menu", 342, 61, 24, "#111111"),
    P("avatar", "Avatar", 24, 108, 88, 88, "#D9C7F5", { round: true }),
    C("posts_n", "Posts count", 136, 124, 72, "248", 18, 700, "#111111"),
    C("posts_l", "Posts label", 136, 150, 72, "Posts", 13, 400, "#6E6E6E"),
    C("fol_n", "Followers count", 212, 124, 72, "12.4K", 18, 700, "#111111"),
    C("fol_l", "Followers label", 212, 150, 72, "Followers", 13, 400, "#6E6E6E"),
    C("ing_n", "Following count", 288, 124, 72, "381", 18, 700, "#111111"),
    C("ing_l", "Following label", 288, 150, 72, "Following", 13, 400, "#6E6E6E"),
    T("name", "Display name", 24, 210, "Alex Rivera", 15, 600, "#111111"),
    T("bio", "Bio", 24, 232, "Product designer in Lisbon.\nShooting film on weekends.", 14, 400, "#111111", { lh: 20 }),
    ...button("edit", "Edit profile button", 24, 290, 166, 36, "#EFEFEF", "Edit profile", 14, 600, "#111111", { r: 8 }),
    ...button("share", "Share profile button", 200, 290, 166, 36, "#EFEFEF", "Share profile", 14, 600, "#111111", { r: 8 }),
    C("tab1", "Posts tab", 0, 344, 195, "Posts", 14, 600, "#111111"),
    C("tab2", "Tagged tab", 195, 344, 195, "Tagged", 14, 600, "#8E8E8E"),
    R("tab_line", "Tab divider", 0, 370, W, 1, "#DBDBDB"),
    R("tab_active", "Active tab indicator", 0, 369, 195, 2, "#111111"),
    ...gridFills.map((f, i) => P(`g${i}`, `Grid photo ${i + 1}`, (i % 3) * 130.5, 372 + Math.floor(i / 3) * 130, 129, 129, f)),
    R("nav", "Tab bar", 0, 762, W, 82, "#FFFFFF"),
    R("nav_line", "Tab bar border", 0, 762, W, 1, "#DBDBDB"),
    I("home", 35, 782, 26, "#111111"),
    I("search", 110, 782, 26, "#111111"),
    I("plus", 182, 782, 26, "#111111"),
    I("heart", 254, 782, 26, "#111111"),
    I("user", 329, 782, 26, "#111111"),
  ],
};

function settingsRow(id: string, y: number, glyph: IconGlyph, label: string): El[] {
  return [I(glyph, 40, y + 16, 24, "#6B5CA5"), T(id, `${label} label`, 76, y + 18, label, 16, 500, "#2B2A28", { lh: 20 })];
}

const meditationSettings: Screen = {
  id: "meditation-settings", app: "Stillness", category: "Meditation", screen: "Settings", platform: "iOS",
  width: W, height: H, difficulty: "Medium", background: "#F4F2EE",
  elements: [
    status("#2B2A28"),
    I("back", 24, 58, 24, "#2B2A28"),
    T("title", "Large title", 24, 96, "Settings", 32, 700, "#2B2A28", { lh: 40 }),
    R("profile", "Profile card", 24, 156, 342, 76, "#FFFFFF", { r: 16 }),
    P("avatar", "Avatar", 40, 170, 48, 48, "#E8D9C4", { round: true }),
    T("pname", "Profile name", 100, 174, "Maya Chen", 16, 600, "#2B2A28", { lh: 20 }),
    T("pplan", "Membership label", 100, 198, "Premium member", 13, 400, "#8A857D", { lh: 16 }),
    I("chevron", 334, 186, 16, "#B5B0A7"),
    T("sec1", "Preferences header", 24, 260, "PREFERENCES", 12, 600, "#8A857D", { ls: 1, lh: 16 }),
    R("group1", "Preferences card", 24, 284, 342, 168, "#FFFFFF", { r: 16 }),
    ...settingsRow("row_rem", 284, "bell", "Daily reminder"),
    R("tog1", "Reminder toggle", 310, 300, 40, 24, "#6B5CA5", { r: 12 }),
    R("tog1_k", "Reminder toggle knob", 328, 302, 20, 20, "#FFFFFF", { r: 10 }),
    R("sep1", "Row divider 1", 76, 339, 290, 1, "#EEEAE4"),
    ...settingsRow("row_dark", 340, "moon", "Dark mode"),
    R("tog2", "Dark mode toggle", 310, 356, 40, 24, "#DAD6CF", { r: 12 }),
    R("tog2_k", "Dark mode toggle knob", 312, 358, 20, 20, "#FFFFFF", { r: 10 }),
    R("sep2", "Row divider 2", 76, 395, 290, 1, "#EEEAE4"),
    ...settingsRow("row_lang", 396, "globe", "Language"),
    RA("lang_val", "Language value", 240, 415, 90, "English", 15, 400, "#8A857D"),
    I("chevron", 338, 416, 16, "#B5B0A7"),
    T("sec2", "Account header", 24, 480, "ACCOUNT", 12, 600, "#8A857D", { ls: 1, lh: 16 }),
    R("group2", "Account card", 24, 504, 342, 112, "#FFFFFF", { r: 16 }),
    ...settingsRow("row_priv", 504, "shield", "Privacy"),
    I("chevron", 338, 524, 16, "#B5B0A7"),
    R("sep3", "Row divider 3", 76, 559, 290, 1, "#EEEAE4"),
    ...settingsRow("row_help", 560, "chat", "Help & support"),
    I("chevron", 338, 580, 16, "#B5B0A7"),
    ...button("logout", "Log out button", 24, 644, 342, 52, "#FFFFFF", "Log out", 16, 600, "#C2410C", { r: 16 }),
    C("version", "Version label", 0, 718, W, "Version 4.2.0", 13, 400, "#A8A39A"),
  ],
};

const travelSearch: Screen = {
  id: "travel-search", app: "Skyhop", category: "Travel", screen: "Flight search", platform: "iOS",
  width: W, height: H, difficulty: "Medium", background: "#FFFFFF",
  elements: [
    R("header", "Header", 0, 0, W, 250, "#0B5FFF"),
    status("#FFFFFF"),
    T("hi", "Greeting", 24, 62, "Hi Sam,", 16, 500, "#CFE0FF", { lh: 20 }),
    T("title", "Title", 24, 86, "Where to next?", 28, 800, "#FFFFFF", { lh: 34 }),
    R("seg", "Trip type control", 24, 136, 342, 40, "#0A4FD6", { r: 20 }),
    ...button("seg1", "Selected trip type", 28, 140, 110, 32, "#FFFFFF", "One way", 14, 600, "#0B5FFF", { r: 16 }),
    C("seg2", "Round trip option", 138, 148, 114, "Round trip", 14, 600, "#CFE0FF"),
    C("seg3", "Multi-city option", 252, 148, 114, "Multi-city", 14, 600, "#CFE0FF"),
    R("card", "Search card", 24, 200, 342, 276, "#FFFFFF", { stroke: "#E3E8F2", r: 20 }),
    T("from_l", "From label", 44, 220, "From", 12, 500, "#7A8499", { lh: 16 }),
    T("from_v", "From value", 44, 240, "San Francisco (SFO)", 17, 600, "#10182B", { lh: 22 }),
    R("sep1", "Field divider 1", 44, 278, 302, 1, "#EEF1F6"),
    R("swap", "Swap button", 306, 260, 36, 36, "#EEF3FF", { r: 18 }),
    I("filter", 314, 268, 20, "#0B5FFF"),
    T("to_l", "To label", 44, 294, "To", 12, 500, "#7A8499", { lh: 16 }),
    T("to_v", "To value", 44, 314, "Lisbon (LIS)", 17, 600, "#10182B", { lh: 22 }),
    R("sep2", "Field divider 2", 44, 352, 302, 1, "#EEF1F6"),
    T("dep_l", "Depart label", 44, 368, "Depart", 12, 500, "#7A8499", { lh: 16 }),
    T("dep_v", "Depart value", 44, 386, "Fri, 14 Mar", 16, 600, "#10182B", { lh: 20 }),
    T("pax_l", "Passengers label", 206, 368, "Passengers", 12, 500, "#7A8499", { lh: 16 }),
    T("pax_v", "Passengers value", 206, 386, "1 adult", 16, 600, "#10182B", { lh: 20 }),
    ...button("search", "Search button", 44, 416, 302, 44, "#0B5FFF", "Search flights", 16, 700, "#FFFFFF", { r: 12 }),
    T("recent", "Recent searches title", 24, 504, "Recent searches", 18, 700, "#10182B"),
    R("r1", "Recent search 1", 24, 540, 342, 64, "#F5F7FB", { r: 14 }),
    I("pin", 40, 560, 24, "#0B5FFF"),
    T("r1_t", "Recent 1 route", 76, 551, "SFO to LIS", 15, 600, "#10182B", { lh: 20 }),
    T("r1_s", "Recent 1 details", 76, 573, "14 Mar · 1 adult", 13, 400, "#7A8499", { lh: 16 }),
    R("r2", "Recent search 2", 24, 616, 342, 64, "#F5F7FB", { r: 14 }),
    I("pin", 40, 636, 24, "#0B5FFF"),
    T("r2_t", "Recent 2 route", 76, 627, "SFO to NRT", 15, 600, "#10182B", { lh: 20 }),
    T("r2_s", "Recent 2 details", 76, 649, "2 Apr · 2 adults", 13, 400, "#7A8499", { lh: 16 }),
    R("nav", "Tab bar", 0, 770, W, 74, "#FFFFFF"),
    R("nav_line", "Tab bar border", 0, 770, W, 1, "#E3E8F2"),
    I("home", 45, 788, 26, "#0B5FFF"),
    I("search", 136, 788, 26, "#7A8499"),
    I("bookmark", 228, 788, 26, "#7A8499"),
    I("user", 319, 788, 26, "#7A8499"),
  ],
};

const podcastPlayer: Screen = {
  id: "podcast-player", app: "Earshot", category: "Podcasts", screen: "Now playing", platform: "iOS",
  width: W, height: H, difficulty: "Medium", background: "#1B1530",
  elements: [
    status("#FFFFFF"),
    I("back", 24, 60, 24, "#FFFFFF"),
    C("top", "Screen label", 0, 62, W, "Now playing", 15, 600, "#FFFFFF"),
    I("more", 342, 60, 24, "#FFFFFF"),
    P("art", "Cover art", 45, 116, 300, 300, "#FF8A5B", { r: 24 }),
    T("title", "Episode title", 24, 452, "The Art of Slow Design", 22, 700, "#FFFFFF", { lh: 28 }),
    T("show", "Show name", 24, 486, "Episode 42 · Field Notes", 15, 400, "#A99FC7", { lh: 20 }),
    I("heart", 342, 462, 24, "#FF8A5B"),
    R("track", "Scrubber track", 24, 536, 342, 4, "#3A3156", { r: 2 }),
    R("played", "Scrubber progress", 24, 536, 128, 4, "#FFFFFF", { r: 2 }),
    R("knob", "Scrubber knob", 146, 532, 12, 12, "#FFFFFF", { r: 6 }),
    T("elapsed", "Elapsed time", 24, 554, "12:48", 12, 500, "#A99FC7", { lh: 16 }),
    RA("remain", "Remaining time", 24, 554, 342, "-21:06", 12, 500, "#A99FC7"),
    I("prev", 84, 620, 32, "#FFFFFF"),
    R("play", "Play button", 155, 596, 80, 80, "#FF8A5B", { r: 40 }),
    I("pause", 179, 620, 32, "#1B1530"),
    I("skip", 274, 620, 32, "#FFFFFF"),
    ...button("speed", "Speed chip", 24, 724, 64, 32, "#2A2244", "1.5x", 13, 600, "#FFFFFF", { r: 16 }),
    ...button("sleep", "Sleep timer chip", 290, 724, 76, 32, "#2A2244", "Sleep", 13, 600, "#FFFFFF", { r: 16 }),
  ],
};

// ───────────────────────────── HARD ─────────────────────────────

const categories = ["Pizza", "Burgers", "Sushi", "Salads"];

const foodHome: Screen = {
  id: "food-home", app: "Munchbox", category: "Food delivery", screen: "Home feed", platform: "iOS",
  width: W, height: H, difficulty: "Hard", background: "#FFFFFF",
  elements: [
    status("#1C1C1C"),
    T("deliver_l", "Deliver-to label", 24, 56, "Deliver to", 12, 500, "#8C8C8C", { lh: 16 }),
    T("deliver_v", "Address", 24, 74, "221B Baker Street", 16, 700, "#1C1C1C", { lh: 20 }),
    I("cart", 342, 64, 24, "#1C1C1C"),
    R("search", "Search bar", 24, 112, 342, 48, "#F4F4F4", { r: 14 }),
    I("search", 40, 126, 20, "#8C8C8C"),
    T("search_ph", "Search placeholder", 70, 126, "Search dishes, restaurants", 15, 400, "#8C8C8C", { lh: 20 }),
    R("promo", "Promo banner", 24, 176, 342, 120, "#FF5A1F", { r: 20 }),
    T("promo_t", "Promo headline", 44, 196, "50% off your\nfirst order", 20, 800, "#FFFFFF", { lh: 26 }),
    T("promo_s", "Promo code", 44, 256, "Use code HELLO50", 13, 500, "#FFE3D3", { lh: 18 }),
    P("promo_img", "Promo photo", 262, 194, 84, 84, "#FFB08A", { round: true }),
    T("cat_t", "Categories title", 24, 320, "Categories", 18, 700, "#1C1C1C"),
    RA("cat_all", "See all link", 266, 322, 100, "See all", 14, 600, "#FF5A1F"),
    ...categories.flatMap((c, i) => [
      R(`cat${i}`, `${c} tile`, 24 + i * 92, 354, 66, 66, "#FFF1EA", { r: 33 }),
      C(`cat${i}_l`, `${c} label`, 24 + i * 92 - 7, 428, 80, c, 13, 500, "#1C1C1C"),
    ]),
    T("pop_t", "Popular title", 24, 466, "Popular near you", 18, 700, "#1C1C1C"),
    P("rest_img", "Restaurant photo", 24, 500, 342, 150, "#F2D3B8", { r: 16 }),
    T("rest_n", "Restaurant name", 24, 662, "Bella Napoli", 17, 700, "#1C1C1C", { lh: 22 }),
    T("rest_m", "Restaurant details", 24, 688, "Italian · 20-30 min · $1.99 delivery", 13, 400, "#8C8C8C", { lh: 18 }),
    ...button("rating", "Rating chip", 310, 661, 56, 24, "#FFF1EA", "4.8", 13, 700, "#FF5A1F", { r: 12 }),
    R("nav", "Tab bar", 0, 762, W, 82, "#FFFFFF"),
    R("nav_line", "Tab bar border", 0, 762, W, 1, "#EFEFEF"),
    I("home", 45, 782, 26, "#FF5A1F"),
    I("search", 136, 782, 26, "#8C8C8C"),
    I("bookmark", 228, 782, 26, "#8C8C8C"),
    I("user", 319, 782, 26, "#8C8C8C"),
  ],
};

const bars = [40, 62, 30, 74, 52, 24, 46];
const actions: [string, IconGlyph][] = [["Send", "logout"], ["Request", "plus"], ["Top up", "card"], ["More", "more"]];

const financeDashboard: Screen = {
  id: "finance-dashboard", app: "Ledgerly", category: "Banking", screen: "Dashboard", platform: "iOS",
  width: W, height: H, difficulty: "Hard", background: "#F7F8FA",
  elements: [
    status("#111827"),
    P("avatar", "Avatar", 24, 58, 40, 40, "#C7D2FE", { round: true }),
    T("greet", "Greeting", 76, 58, "Good morning,", 13, 400, "#6B7280", { lh: 16 }),
    T("uname", "User name", 76, 76, "Jordan", 17, 700, "#111827", { lh: 22 }),
    I("bell", 342, 66, 24, "#111827"),
    R("balance", "Balance card", 24, 122, 342, 168, "#111827", { r: 24 }),
    T("bal_l", "Balance label", 44, 144, "Total balance", 13, 500, "#9CA3AF", { lh: 16 }),
    T("bal_v", "Balance amount", 44, 166, "$24,562.80", 34, 800, "#FFFFFF", { lh: 42 }),
    ...button("chip", "Growth chip", 44, 218, 132, 26, "#1F3B2D", "+2.4% this month", 12, 600, "#4ADE80", { r: 13 }),
    T("card_no", "Card number", 44, 258, "Visa •••• 4821", 13, 500, "#9CA3AF", { lh: 16 }),
    ...actions.flatMap(([label, glyph], i) => [
      R(`act${i}`, `${label} action`, 24 + i * 90, 314, 72, 64, "#FFFFFF", { stroke: "#E5E7EB", r: 18 }),
      I(glyph, 24 + i * 90 + 24, 334, 24, "#2563EB"),
      C(`act${i}_l`, `${label} label`, 24 + i * 90 - 4, 386, 80, label, 12, 500, "#374151"),
    ]),
    R("spend", "Spending card", 24, 424, 342, 154, "#FFFFFF", { r: 20 }),
    T("spend_l", "Spending title", 44, 442, "Spending this week", 15, 600, "#111827", { lh: 20 }),
    T("spend_v", "Spending amount", 44, 464, "$642.15", 22, 800, "#111827", { lh: 28 }),
    ...bars.map((h, i) => R(`bar${i}`, `Bar ${i + 1}`, 44 + i * 44 + 12, 560 - h, 20, h, i === 3 ? "#2563EB" : "#DBEAFE", { r: 6 })),
    T("tx_t", "Transactions title", 24, 602, "Recent transactions", 17, 700, "#111827", { lh: 22 }),
    RA("tx_all", "See all link", 266, 605, 100, "See all", 14, 600, "#2563EB"),
    R("tx1_i", "Groceries icon tile", 24, 640, 44, 44, "#FEF3C7", { r: 12 }),
    I("cart", 34, 650, 24, "#B45309"),
    T("tx1_n", "Groceries name", 80, 642, "Groceries", 15, 600, "#111827", { lh: 20 }),
    T("tx1_d", "Groceries time", 80, 664, "Today, 9:24 AM", 13, 400, "#6B7280", { lh: 16 }),
    RA("tx1_a", "Groceries amount", 266, 652, 100, "-$54.20", 15, 700, "#111827"),
    R("tx2_i", "Salary icon tile", 24, 700, 44, 44, "#DCFCE7", { r: 12 }),
    I("card", 34, 710, 24, "#15803D"),
    T("tx2_n", "Salary name", 80, 702, "Salary", 15, 600, "#111827", { lh: 20 }),
    T("tx2_d", "Salary time", 80, 724, "Yesterday", 13, 400, "#6B7280", { lh: 16 }),
    RA("tx2_a", "Salary amount", 266, 712, 100, "+$3,200.00", 15, 700, "#16A34A"),
    R("nav", "Tab bar", 0, 770, W, 74, "#FFFFFF"),
    R("nav_line", "Tab bar border", 0, 770, W, 1, "#E5E7EB"),
    I("home", 45, 788, 26, "#2563EB"),
    I("chart", 136, 788, 26, "#9CA3AF"),
    I("card", 228, 788, 26, "#9CA3AF"),
    I("user", 319, 788, 26, "#9CA3AF"),
  ],
};

const shopCheckout: Screen = {
  id: "shop-checkout", app: "Threadly", category: "E-commerce", screen: "Checkout", platform: "iOS",
  width: W, height: H, difficulty: "Hard", background: "#FFFFFF",
  elements: [
    status("#171717"),
    I("back", 24, 60, 24, "#171717"),
    C("title", "Screen title", 0, 62, W, "Checkout", 17, 700, "#171717"),
    ...button("s1", "Step 1 circle", 56, 108, 24, 24, "#171717", "1", 12, 700, "#FFFFFF", { r: 12 }),
    R("l1", "Step connector 1", 88, 119, 87, 2, "#171717"),
    ...button("s2", "Step 2 circle", 183, 108, 24, 24, "#171717", "2", 12, 700, "#FFFFFF", { r: 12 }),
    R("l2", "Step connector 2", 215, 119, 87, 2, "#E5E5E5"),
    ...button("s3", "Step 3 circle", 310, 108, 24, 24, "#FFFFFF", "3", 12, 700, "#A3A3A3", { stroke: "#E5E5E5", sw: 2, r: 12 }),
    C("s1_l", "Cart step label", 28, 140, 80, "Cart", 12, 500, "#171717"),
    C("s2_l", "Shipping step label", 155, 140, 80, "Shipping", 12, 500, "#171717"),
    C("s3_l", "Payment step label", 282, 140, 80, "Payment", 12, 500, "#A3A3A3"),
    T("addr_t", "Address title", 24, 180, "Shipping address", 17, 700, "#171717", { lh: 22 }),
    R("addr", "Address card", 24, 214, 342, 86, "#FAFAFA", { stroke: "#E5E5E5", r: 14 }),
    I("pin", 40, 230, 20, "#171717"),
    T("addr_n", "Address label", 72, 230, "Home", 15, 600, "#171717", { lh: 20 }),
    T("addr_v", "Address lines", 72, 252, "48 Oak Avenue, Apt 3\nBrooklyn, NY 11201", 13, 400, "#737373", { lh: 18 }),
    RA("addr_e", "Edit link", 290, 231, 60, "Edit", 13, 600, "#171717"),
    T("del_t", "Delivery title", 24, 324, "Delivery", 17, 700, "#171717", { lh: 22 }),
    R("opt1", "Standard option", 24, 358, 342, 56, "#FFFFFF", { stroke: "#171717", sw: 2, r: 14 }),
    R("opt1_r", "Standard radio", 40, 376, 20, 20, undefined, { stroke: "#171717", sw: 2, r: 10 }),
    R("opt1_d", "Standard radio dot", 45, 381, 10, 10, "#171717", { r: 5 }),
    T("opt1_t", "Standard name", 72, 366, "Standard", 15, 600, "#171717", { lh: 20 }),
    T("opt1_s", "Standard timing", 72, 386, "3-5 business days", 12, 400, "#737373", { lh: 16 }),
    RA("opt1_p", "Standard price", 286, 376, 64, "Free", 15, 600, "#171717"),
    R("opt2", "Express option", 24, 426, 342, 56, "#FFFFFF", { stroke: "#E5E5E5", r: 14 }),
    R("opt2_r", "Express radio", 40, 444, 20, 20, undefined, { stroke: "#D4D4D4", sw: 2, r: 10 }),
    T("opt2_t", "Express name", 72, 434, "Express", 15, 600, "#171717", { lh: 20 }),
    T("opt2_s", "Express timing", 72, 454, "1-2 business days", 12, 400, "#737373", { lh: 16 }),
    RA("opt2_p", "Express price", 286, 444, 64, "$9.99", 15, 600, "#171717"),
    T("sum_t", "Summary title", 24, 506, "Order summary", 17, 700, "#171717", { lh: 22 }),
    T("sub_l", "Subtotal label", 24, 542, "Subtotal (2 items)", 14, 400, "#737373", { lh: 18 }),
    RA("sub_v", "Subtotal value", 266, 542, 100, "$148.00", 14, 500, "#171717"),
    T("ship_l", "Shipping label", 24, 570, "Shipping", 14, 400, "#737373", { lh: 18 }),
    RA("ship_v", "Shipping value", 266, 570, 100, "Free", 14, 500, "#171717"),
    T("tax_l", "Tax label", 24, 598, "Tax", 14, 400, "#737373", { lh: 18 }),
    RA("tax_v", "Tax value", 266, 598, 100, "$11.84", 14, 500, "#171717"),
    R("sum_div", "Summary divider", 24, 630, 342, 1, "#E5E5E5"),
    T("tot_l", "Total label", 24, 646, "Total", 17, 700, "#171717", { lh: 22 }),
    RA("tot_v", "Total value", 266, 646, 100, "$159.84", 17, 800, "#171717"),
    ...button("pay", "Continue to payment button", 24, 740, 342, 56, "#171717", "Continue to payment", 16, 600, "#FFFFFF", { r: 28 }),
  ],
};

function bubble(id: string, name: string, x: number, y: number, w: number, text: string, mine: boolean): El[] {
  const lines = text.split("\n").length;
  const h = lines * 20 + 20;
  return [
    R(id, name, x, y, w, h, mine ? "#6C47FF" : "#F1F1F3", { r: 18 }),
    T(`${id}_t`, `${name} text`, x + 14, y + 10, text, 15, 400, mine ? "#FFFFFF" : "#111111", { lh: 20 }),
  ];
}

const chatThread: Screen = {
  id: "chat-thread", app: "Chirp", category: "Messaging", screen: "Conversation", platform: "iOS",
  width: W, height: H, difficulty: "Hard", background: "#FFFFFF",
  elements: [
    status("#111111"),
    I("back", 16, 62, 24, "#111111"),
    P("avatar", "Contact avatar", 52, 56, 36, 36, "#FBCFE8", { round: true }),
    T("cname", "Contact name", 100, 55, "Priya Shah", 16, 700, "#111111", { lh: 20 }),
    T("cstatus", "Presence label", 100, 76, "Active now", 12, 400, "#22A06B", { lh: 16 }),
    I("search", 306, 62, 24, "#111111"),
    I("more", 346, 62, 24, "#111111"),
    R("hdr_line", "Header border", 0, 104, W, 1, "#EDEDED"),
    C("date", "Date label", 0, 122, W, "Today 10:12", 12, 500, "#9A9A9A"),
    ...bubble("m1", "Incoming message 1", 16, 152, 228, "Hey! Are we still on for\nthe design review at 3?", false),
    ...bubble("m2", "Outgoing message 1", 172, 222, 202, "Yes! Sharing the file now.", true),
    P("m3", "Shared image", 194, 272, 180, 120, "#E4DEFF", { r: 18 }),
    ...bubble("m4", "Incoming message 2", 16, 404, 158, "Perfect, thank you!", false),
    ...bubble("m5", "Incoming message 3", 16, 452, 204, "Can you also add the\nmobile breakpoints?", false),
    ...bubble("m6", "Outgoing message 2", 302, 522, 72, "On it!", true),
    RA("seen", "Read receipt", 274, 568, 100, "Seen", 11, 500, "#9A9A9A"),
    R("typing", "Typing indicator", 16, 600, 64, 36, "#F1F1F3", { r: 18 }),
    R("dot1", "Typing dot 1", 30, 614, 8, 8, "#9A9A9A", { r: 4 }),
    R("dot2", "Typing dot 2", 44, 614, 8, 8, "#9A9A9A", { r: 4 }),
    R("dot3", "Typing dot 3", 58, 614, 8, 8, "#9A9A9A", { r: 4 }),
    R("composer", "Composer bar", 0, 764, W, 80, "#FFFFFF"),
    R("comp_line", "Composer border", 0, 764, W, 1, "#EDEDED"),
    I("plus", 16, 786, 24, "#6C47FF"),
    R("input", "Message input", 52, 776, 274, 44, "#F1F1F3", { r: 22 }),
    T("input_ph", "Input placeholder", 70, 788, "Message...", 15, 400, "#9A9A9A", { lh: 20 }),
    R("send", "Send button", 338, 776, 44, 44, "#6C47FF", { r: 22 }),
    I("play", 350, 788, 20, "#FFFFFF"),
  ],
};

const hotelDetails: Screen = {
  id: "hotel-details", app: "Staywise", category: "Travel", screen: "Stay details", platform: "iOS",
  width: W, height: H, difficulty: "Hard", background: "#FFFFFF",
  elements: [
    P("hero", "Hero photo", 0, 0, W, 330, "#BFD8D2"),
    status("#1A1A1A"),
    R("back_btn", "Back button", 20, 54, 40, 40, "#FFFFFF", { r: 20 }),
    I("back", 28, 62, 24, "#1A1A1A"),
    R("fav_btn", "Save button", 330, 54, 40, 40, "#FFFFFF", { r: 20 }),
    I("heart", 338, 62, 24, "#E11D48"),
    R("sheet", "Content sheet", 0, 300, W, 544, "#FFFFFF", { r: 28 }),
    T("name", "Listing title", 24, 326, "Seaside Villa Retreat", 24, 800, "#1A1A1A", { lh: 30 }),
    I("pin", 24, 366, 16, "#6B7280"),
    T("loc", "Location", 46, 364, "Cascais, Portugal", 14, 400, "#6B7280", { lh: 20 }),
    ...button("rating", "Rating chip", 290, 328, 76, 28, "#ECFDF5", "4.92", 13, 700, "#047857", { r: 14 }),
    ...button("am1", "Guests chip", 24, 402, 100, 36, "#F3F4F6", "2 guests", 13, 500, "#374151", { r: 18 }),
    ...button("am2", "Bedroom chip", 132, 402, 100, 36, "#F3F4F6", "1 bedroom", 13, 500, "#374151", { r: 18 }),
    ...button("am3", "Wi-Fi chip", 240, 402, 100, 36, "#F3F4F6", "Free Wi-Fi", 13, 500, "#374151", { r: 18 }),
    T("about_t", "About title", 24, 462, "About this place", 17, 700, "#1A1A1A", { lh: 22 }),
    T("about", "Description", 24, 492, "Wake up to ocean views in a sunlit villa with a\nprivate terrace, five minutes from the beach\nand the old town.", 14, 400, "#6B7280", { lh: 21 }),
    R("div1", "Divider 1", 24, 578, 342, 1, "#EEEEEE"),
    P("host", "Host avatar", 24, 594, 44, 44, "#FDE2C8", { round: true }),
    T("host_n", "Host name", 80, 596, "Hosted by Ines", 15, 600, "#1A1A1A", { lh: 20 }),
    T("host_s", "Host details", 80, 618, "Superhost · 6 years hosting", 13, 400, "#6B7280", { lh: 18 }),
    I("chat", 342, 604, 24, "#1A1A1A"),
    R("div2", "Divider 2", 24, 654, 342, 1, "#EEEEEE"),
    R("dates", "Dates card", 24, 670, 342, 58, "#F9FAFB", { stroke: "#EEEEEE", r: 14 }),
    T("in_l", "Check-in label", 40, 679, "Check-in", 12, 500, "#6B7280", { lh: 16 }),
    T("in_v", "Check-in date", 40, 697, "12 Jun", 15, 600, "#1A1A1A", { lh: 20 }),
    R("dates_sep", "Dates divider", 195, 683, 1, 32, "#E5E7EB"),
    T("out_l", "Check-out label", 211, 679, "Check-out", 12, 500, "#6B7280", { lh: 16 }),
    T("out_v", "Check-out date", 211, 697, "17 Jun", 15, 600, "#1A1A1A", { lh: 20 }),
    R("bar", "Booking bar", 0, 744, W, 100, "#FFFFFF"),
    R("bar_line", "Booking bar border", 0, 744, W, 1, "#EEEEEE"),
    T("price", "Nightly price", 24, 764, "€186 night", 22, 800, "#1A1A1A", { lh: 28 }),
    T("total", "Stay total", 24, 794, "5 nights · €930 total", 13, 400, "#6B7280", { lh: 18 }),
    ...button("reserve", "Reserve button", 216, 758, 150, 52, "#0F766E", "Reserve", 16, 700, "#FFFFFF", { r: 26 }),
  ],
};

export const SCREENS: Screen[] = [
  rideLogin, musicSplash, bankOtp, foodWelcome, notesEmpty,
  fitOnboarding, socialProfile, meditationSettings, travelSearch, podcastPlayer,
  foodHome, financeDashboard, shopCheckout, chatThread, hotelDetails,
];

export function getScreen(id: string): Screen | undefined {
  return SCREENS.find((s) => s.id === id);
}

export function isScorable(el: El): el is RectEl | TextEl {
  return el.type === "rect" || el.type === "text";
}
