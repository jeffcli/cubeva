import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const WCA_PERSON_API_BASE =
  process.env.WCA_REST_API_BASE ??
  "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/persons";
const WCA_PERSON_PAGE_BASE = "https://www.worldcubeassociation.org/persons";

const EVENT_NAMES = {
  "222": "2x2x2 Cube",
  "333": "3x3x3 Cube",
  "444": "4x4x4 Cube",
  "555": "5x5x5 Cube",
  "666": "6x6x6 Cube",
  "777": "7x7x7 Cube",
  "333bf": "3x3x3 Blindfolded",
  "333fm": "3x3x3 Fewest Moves",
  "333mbf": "3x3x3 Multi-Blind",
  "333oh": "3x3x3 One-Handed",
  "444bf": "4x4x4 Blindfolded",
  "555bf": "5x5x5 Blindfolded",
  clock: "Clock",
  minx: "Megaminx",
  pyram: "Pyraminx",
  skewb: "Skewb",
  sq1: "Square-1",
};

loadEnvFile(".env");
loadEnvFile(".env.local");

const args = process.argv.slice(2);
const importAll = args.includes("--all");
const helpRequested = args.includes("--help") || args.includes("-h");
const requestedWcaIds = args.filter((arg) => !arg.startsWith("--")).map(normalizeWcaId);

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (helpRequested || (!importAll && requestedWcaIds.length === 0)) {
  fail("Usage: npm run import:wca -- 2019SMIT01\n   or: npm run import:wca -- --all");
}

if (!supabaseUrl || !serviceRoleKey) {
  fail(
    "Missing Supabase credentials. Add VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const wcaIds = importAll ? await fetchLinkedWcaIds() : requestedWcaIds;

if (wcaIds.length === 0) {
  console.log("No WCA IDs to import.");
  process.exit(0);
}

let importedCount = 0;

for (const wcaId of wcaIds) {
  try {
    const rows = await fetchPersonalBestRows(wcaId);

    if (rows.length === 0) {
      console.log(`${wcaId}: no ranked WCA results found.`);
      continue;
    }

    const { error } = await supabase
      .from("wca_personal_bests")
      .upsert(rows, { onConflict: "wca_id,event_id" });

    if (error) throw error;

    importedCount += rows.length;
    console.log(`${wcaId}: imported ${rows.length} event PB rows.`);
  } catch (error) {
    console.error(`${wcaId}: ${errorMessage(error)}`);
  }
}

console.log(`Done. Upserted ${importedCount} WCA PB rows.`);

async function fetchLinkedWcaIds() {
  const { data, error } = await supabase
    .from("profiles")
    .select("wca_id")
    .not("wca_id", "is", null);

  if (error) throw error;

  return [
    ...new Set(
      (data ?? [])
        .map((profile) => normalizeWcaId(profile.wca_id))
        .filter(Boolean),
    ),
  ];
}

async function fetchPersonalBestRows(wcaId) {
  const apiRows = await fetchPersonalBestRowsFromApi(wcaId);
  if (apiRows) return apiRows;

  return fetchPersonalBestRowsFromProfilePage(wcaId);
}

async function fetchPersonalBestRowsFromApi(wcaId) {
  const response = await fetch(`${WCA_PERSON_API_BASE}/${wcaId}.json`);
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`WCA person API returned ${response.status}`);
  }

  const person = await response.json();
  const byEvent = new Map();

  for (const single of person.rank?.singles ?? []) {
    const row = getOrCreateEventRow(byEvent, wcaId, single.eventId);
    row.best_single = numberOrNull(single.best);
    row.world_rank_single = numberOrNull(single.rank?.world);
    row.country_rank_single = numberOrNull(single.rank?.country);
    row.continent_rank_single = numberOrNull(single.rank?.continent);
  }

  for (const average of person.rank?.averages ?? []) {
    const row = getOrCreateEventRow(byEvent, wcaId, average.eventId);
    row.best_average = numberOrNull(average.best);
    row.world_rank_average = numberOrNull(average.rank?.world);
    row.country_rank_average = numberOrNull(average.rank?.country);
    row.continent_rank_average = numberOrNull(average.rank?.continent);
  }

  return [...byEvent.values()];
}

async function fetchPersonalBestRowsFromProfilePage(wcaId) {
  const response = await fetch(`${WCA_PERSON_PAGE_BASE}/${wcaId}`);

  if (response.status === 404) {
    throw new Error("not found on WCA profile page");
  }

  if (!response.ok) {
    throw new Error(`WCA profile page returned ${response.status}`);
  }

  const html = await response.text();
  const tableMatch = html.match(
    /<h3[^>]*>\s*Current Personal Records\s*<\/h3>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/i,
  );

  if (!tableMatch) return [];

  const rows = [];
  const rowMatches = tableMatch[1].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

  for (const rowMatch of rowMatches) {
    const cells = [...rowMatch[1].matchAll(/<td\b([^>]*)>([\s\S]*?)<\/td>/gi)];
    if (cells.length < 9) continue;

    const eventId = extractAttribute(cells[0][1], "data-event");
    if (!eventId) continue;

    rows.push({
      wca_id: wcaId,
      event_id: eventId,
      event_name: cleanHtml(cells[0][2]),
      country_rank_single: parseIntegerCell(cells[1][2]),
      continent_rank_single: parseIntegerCell(cells[2][2]),
      world_rank_single: parseIntegerCell(cells[3][2]),
      best_single: parseWcaProfileResult(eventId, cleanHtml(cells[4][2])),
      best_average: parseWcaProfileResult(eventId, cleanHtml(cells[5][2])),
      world_rank_average: parseIntegerCell(cells[6][2]),
      continent_rank_average: parseIntegerCell(cells[7][2]),
      country_rank_average: parseIntegerCell(cells[8][2]),
      updated_at: new Date().toISOString(),
    });
  }

  return rows;
}

function getOrCreateEventRow(byEvent, wcaId, eventId) {
  if (!byEvent.has(eventId)) {
    byEvent.set(eventId, {
      wca_id: wcaId,
      event_id: eventId,
      event_name: EVENT_NAMES[eventId] ?? eventId,
      best_single: null,
      best_average: null,
      world_rank_single: null,
      country_rank_single: null,
      continent_rank_single: null,
      world_rank_average: null,
      country_rank_average: null,
      continent_rank_average: null,
      updated_at: new Date().toISOString(),
    });
  }

  return byEvent.get(eventId);
}

function loadEnvFile(fileName) {
  const path = resolve(fileName);
  if (!existsSync(path)) return;

  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function normalizeWcaId(value) {
  return String(value ?? "").trim().toUpperCase();
}

function numberOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function parseWcaProfileResult(eventId, value) {
  const cleanValue = value.trim();
  if (!cleanValue || cleanValue === "DNF" || cleanValue === "DNS") return null;

  if (eventId === "333mbf") {
    return Number.parseInt(cleanValue.replace(/\D/g, ""), 10) || null;
  }

  if (eventId === "333fm") {
    const moves = Number.parseFloat(cleanValue);
    return Number.isFinite(moves) ? Math.round(moves * 100) : null;
  }

  const parts = cleanValue.split(":").map((part) => part.trim());
  let seconds = 0;

  for (const part of parts) {
    const parsed = Number.parseFloat(part);
    if (!Number.isFinite(parsed)) return null;
    seconds = seconds * 60 + parsed;
  }

  return Math.round(seconds * 100);
}

function parseIntegerCell(html) {
  const value = Number.parseInt(cleanHtml(html).replace(/,/g, ""), 10);
  return Number.isFinite(value) ? value : null;
}

function extractAttribute(attributes, name) {
  const match = attributes.match(new RegExp(`${name}=["']([^"']+)["']`, "i"));
  return match?.[1] ?? "";
}

function cleanHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
