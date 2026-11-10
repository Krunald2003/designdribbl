// The reference screen library. Each screen lives in its own file in /screens
// (see screens/README.md for how to add one). A screen file is both the reference
// image users see (it is rendered in the browser) and the spec the scoring engine
// compares submissions against.

import type { El, RectEl, Screen, TextEl } from "./types";

import rideLogin from "../../screens/ride-login.json";
import musicSplash from "../../screens/music-splash.json";
import bankOtp from "../../screens/bank-otp.json";
import foodWelcome from "../../screens/food-welcome.json";
import notesEmpty from "../../screens/notes-empty.json";
import fitOnboarding from "../../screens/fit-onboarding.json";
import socialProfile from "../../screens/social-profile.json";
import meditationSettings from "../../screens/meditation-settings.json";
import travelSearch from "../../screens/travel-search.json";
import podcastPlayer from "../../screens/podcast-player.json";
import foodHome from "../../screens/food-home.json";
import financeDashboard from "../../screens/finance-dashboard.json";
import shopCheckout from "../../screens/shop-checkout.json";
import chatThread from "../../screens/chat-thread.json";
import hotelDetails from "../../screens/hotel-details.json";

/** Every screen is drawn on this frame. Users build their recreation at the same size. */
export const FRAME = { width: 360, height: 800 } as const;

export const SCREENS = [
  rideLogin, musicSplash, bankOtp, foodWelcome, notesEmpty,
  fitOnboarding, socialProfile, meditationSettings, travelSearch, podcastPlayer,
  foodHome, financeDashboard, shopCheckout, chatThread, hotelDetails,
] as unknown as Screen[];

export function getScreen(id: string): Screen | undefined {
  return SCREENS.find((s) => s.id === id);
}

/** Only shapes and text are scored. Images, illustrations, mascots, patterns and icons are not. */
export function isScorable(el: El): el is RectEl | TextEl {
  return el.type === "rect" || el.type === "text";
}

/** Problems in a screen file, so a bad entry is caught before it reaches users. */
export function validateScreen(s: Screen): string[] {
  const issues: string[] = [];
  if (s.width !== FRAME.width || s.height !== FRAME.height) issues.push(`frame is ${s.width}×${s.height}, expected ${FRAME.width}×${FRAME.height}`);
  const ids = new Set<string>();
  for (const e of s.elements) {
    if (ids.has(e.id)) issues.push(`duplicate element id "${e.id}"`);
    ids.add(e.id);
    if (e.x < 0 || e.y < 0 || e.x + e.w > s.width || e.y + e.h > s.height) issues.push(`"${e.id}" is outside the frame`);
  }
  return issues;
}
