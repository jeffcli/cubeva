import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const WCA_PERSON_API_BASE =
  Deno.env.get("WCA_REST_API_BASE") ??
  "https://raw.githubusercontent.com/robiningelbrecht/wca-rest-api/refs/heads/v1/persons";

const WCA_ID_PATTERN = /^[0-9]{4}[A-Z]{4}[0-9]{2}$/;

const EVENT_NAMES: Record<string, string> = {
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

type SupabaseClient = ReturnType<typeof createClient>;

type ImportPayload = {
  all?: boolean;
  wcaId?: string;
  wcaIds?: string[];
};

type RankEntry = {
  eventId?: string;
  best?: number;
  rank?: {
    world?: number;
    country?: number;
    continent?: number;
  };
};

type WcaPerson = {
  rank?: {
    singles?: RankEntry[];
    averages?: RankEntry[];
  };
};

type PersonalBestRow = {
  wca_id: string;
  event_id: string;
  event_name: string;
  best_single: number | null;
  best_average: number | null;
  world_rank_single: number | null;
  country_rank_single: number | null;
  continent_rank_single: number | null;
  world_rank_average: number | null;
  country_rank_average: number | null;
  continent_rank_average: number | null;
  updated_at: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Use POST for WCA imports." }, 405);
  }

  const importSecret = Deno.env.get("IMPORT_WCA_SECRET");
  if (importSecret && request.headers.get("x-import-secret") !== importSecret) {
    return jsonResponse({ error: "Unauthorized import request." }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY." },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const payload = await readJsonPayload(request);
  const wcaIds = payload.all
    ? await fetchLinkedWcaIds(supabase)
    : normalizeRequestedWcaIds(payload);

  if (wcaIds.length === 0) {
    return jsonResponse({ importedCount: 0, results: [] });
  }

  const results = [];
  let importedCount = 0;

  for (const wcaId of wcaIds) {
    try {
      const rows = await fetchPersonalBestRows(wcaId);

      if (rows.length === 0) {
        results.push({ wcaId, importedRows: 0, status: "empty" });
        continue;
      }

      const { error } = await supabase
        .from("wca_personal_bests")
        .upsert(rows, { onConflict: "wca_id,event_id" });

      if (error) throw error;

      importedCount += rows.length;
      results.push({ wcaId, importedRows: rows.length, status: "imported" });
    } catch (error) {
      results.push({
        wcaId,
        importedRows: 0,
        status: "error",
        error: errorMessage(error),
      });
    }
  }

  return jsonResponse({ importedCount, results });
});

async function readJsonPayload(request: Request): Promise<ImportPayload> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

async function fetchLinkedWcaIds(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("profiles")
    .select("wca_id")
    .not("wca_id", "is", null);

  if (error) throw error;

  return [
    ...new Set(
      (data ?? [])
        .map((profile) => normalizeWcaId(profile.wca_id))
        .filter(isValidWcaId),
    ),
  ];
}

function normalizeRequestedWcaIds(payload: ImportPayload) {
  const values = payload.wcaIds ?? (payload.wcaId ? [payload.wcaId] : []);
  return [...new Set(values.map(normalizeWcaId).filter(isValidWcaId))];
}

async function fetchPersonalBestRows(wcaId: string) {
  const response = await fetch(`${WCA_PERSON_API_BASE}/${wcaId}.json`);

  if (response.status === 404) {
    throw new Error("WCA ID was not found.");
  }

  if (!response.ok) {
    throw new Error(`WCA person API returned ${response.status}.`);
  }

  const person = (await response.json()) as WcaPerson;
  const byEvent = new Map<string, PersonalBestRow>();

  for (const single of person.rank?.singles ?? []) {
    if (!single.eventId) continue;
    const row = getOrCreateEventRow(byEvent, wcaId, single.eventId);
    row.best_single = numberOrNull(single.best);
    row.world_rank_single = numberOrNull(single.rank?.world);
    row.country_rank_single = numberOrNull(single.rank?.country);
    row.continent_rank_single = numberOrNull(single.rank?.continent);
  }

  for (const average of person.rank?.averages ?? []) {
    if (!average.eventId) continue;
    const row = getOrCreateEventRow(byEvent, wcaId, average.eventId);
    row.best_average = numberOrNull(average.best);
    row.world_rank_average = numberOrNull(average.rank?.world);
    row.country_rank_average = numberOrNull(average.rank?.country);
    row.continent_rank_average = numberOrNull(average.rank?.continent);
  }

  return [...byEvent.values()];
}

function getOrCreateEventRow(
  byEvent: Map<string, PersonalBestRow>,
  wcaId: string,
  eventId: string,
) {
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

  return byEvent.get(eventId) as PersonalBestRow;
}

function normalizeWcaId(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function isValidWcaId(value: string) {
  return WCA_ID_PATTERN.test(value);
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}
