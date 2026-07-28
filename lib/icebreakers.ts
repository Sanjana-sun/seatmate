// Small talk is the hardest part of meeting a stranger, so we hand the group
// a ready-made opener. If they share a taste, we tailor it; otherwise we fall
// back to a movie-night classic.

import type { Interest } from "./types";

const BY_INTEREST: Partial<Record<Interest, string>> = {
  "A24 / indie": "What's the most underrated indie film you'd make someone watch?",
  Blockbusters: "Best popcorn blockbuster of the last few years, go.",
  Horror: "Do you cover your eyes or stare it down during the scary bits?",
  "Sci-fi": "Would you actually get on the spaceship, or nope out?",
  "Rom-com": "Which movie couple did you fully believe in?",
  Anime: "First anime that got you hooked?",
  Documentary: "Last documentary that changed how you see something?",
  Foodie: "What's the ideal snack smuggle for a movie?",
  Bookworm: "Book that was better than the movie?",
  Gamer: "What are you playing right now?",
  "Live music": "Best show you've ever been to?",
  Sports: "Who are you rooting for this season?",
};

const GENERIC = [
  "What made you pick this movie tonight?",
  "Last film that genuinely surprised you?",
  "Are you a stay-through-the-credits person?",
  "Comfort movie you rewatch every time?",
];

export function commonIceBreaker(shared: Interest[]): string {
  for (const tag of shared) {
    const q = BY_INTEREST[tag];
    if (q) return q;
  }
  // Deterministic pick so a given group always sees the same opener.
  const idx = shared.length % GENERIC.length;
  return GENERIC[idx];
}
