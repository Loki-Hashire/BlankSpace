// ============================================================
// data.js — ALL the fake data for your prototype lives here.
//
// There is no database. Everything below is made up, and that is
// on purpose: never put real people's names, emails, phone numbers
// or addresses in this file.
//
// To change what appears on the Explore page, edit LISTINGS.
// Each item is one card. Keep the same fields (id, name, category,
// description) or ask Copilot to add new ones everywhere they're needed.
// ============================================================

const STARTUP = {
  name: "Blank Space",
  tagline: "One tool to rule them all",
  pitch: "For creative minds, busy schedules, and anyone in need of intuitive organization tools that aren't hidden behind a paywall."
};

const AD_CONFIG = {
  client: "",
  slotIds: new Array(20).fill("")
};

const LISTINGS = [
  { id: 1, name: "Conspiracy Board", category: "Free", description: "Throw your fresh ideas against the wall to make sense of them." },
  { id: 2, name: "Dual Layered Map", category: "Free", description: "You have your base map, and a second layer for specific points on your timeline." },
  { id: 3, name: "Timeline Grid", category: "Free", description: "Order and organize consecutive and concurrent events." },
  { id: 4, name: "Calendar Creator", category: "Free", description: "Use the Gregorian calendar for personal plans, or make your own." },
  { id: 5, name: "General Archives", category: "Free", description: "For writing interconnected notes that reference each other." },
  { id: 6, name: "Remove Ad", category: "$0.50/month", description: "Remove the one ad from the workspace." }
];
