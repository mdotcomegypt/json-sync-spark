import { getSupabaseClient } from "@/lib/supabaseClient";

export type MigrationStatus = "started" | "succeeded" | "failed" | "updated";

export interface MigrationRecord {
  id: string;
  source_system: string;
  source_id: string;
  source_id_secondary?: string | null;
  target_system: string | null;
  target_id: string | null;
  entity_type: string;
  operation: string;
  status: MigrationStatus;
  started_at: string; // ISO string
  finished_at: string | null; // ISO string
  duration_ms: number | null;
  payload: any | null;
  error_message: string | null;
  trace_id: string | null;
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface CreateMigrationInput {
  sourceSystem: string;
  sourceId: string;
  entityType: string;
  operation: string;
  targetSystem?: string;
  targetId?: string;
  payload?: unknown;
  traceId?: string;
}

export async function logMigrationStart(args: {
  sourceSystem: string;
  sourceId: string;
  sourceIdSecondary?: string;
  entityType: string;
  operation: string; // create | update | delete
  targetSystem?: string;
  targetId?: string;
  payload?: any;
  traceId?: string;
}) {
  const supabase = getSupabaseClient();

  // Try to find existing record by sourceId matching either primary or secondary
  const list = [args.sourceId].map((v) => String(v).split(',').join('\\,')).join(',');
  const { data: existingList, error: findErr } = await supabase
    .from("migration_mapping")
    .select("*")
    .eq("source_system", args.sourceSystem)
    .or(`source_id.in.(${list}),source_id_secondary.in.(${list})`)
    .limit(1);
  if (findErr) throw findErr;

  if (existingList && existingList.length > 0) {
    const existing = existingList[0] as MigrationRecord;
    const { data: updated, error: updErr } = await supabase
      .from("migration_mapping")
      .update({
        source_id: existing.source_id || args.sourceId,
        source_id_secondary: existing.source_id_secondary ?? args.sourceIdSecondary ?? null,
        entity_type: args.entityType,
        operation: args.operation,
        status: "started",
        payload: args.payload ?? null,
        started_at: new Date().toISOString(),
        target_system: args.targetSystem ?? existing.target_system ?? null,
        target_id: args.targetId ?? null,
        trace_id: args.traceId ?? null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (updErr) throw updErr;
    return updated as MigrationRecord;
  }

  const insert = {
    source_system: args.sourceSystem,
    source_id: args.sourceId,
    source_id_secondary: args.sourceIdSecondary ?? null,
    target_system: args.targetSystem ?? null,
    target_id: args.targetId ?? null,
    entity_type: args.entityType,
    operation: args.operation,
    status: "started" as MigrationStatus,
    payload: args.payload ?? null,
    started_at: new Date().toISOString(),
    trace_id: args.traceId ?? null,
  };

  const { data, error } = await supabase
    .from("migration_mapping")
    .insert(insert)
    .select("*")
    .single();
  if (error) throw error;
  return data as MigrationRecord;
}

export async function markMigrationSuccess(
  id: string,
  extra?: { targetId?: string; payload?: unknown }
) {
  const supabase = getSupabaseClient();
  const finishedAt = new Date();

  // Fetch started_at to compute duration
  const { data: existing, error: getErr } = await supabase
    .from("migration_mapping")
    .select("id, started_at")
    .eq("id", id)
    .single();
  if (getErr) throw getErr;

  const startedAt = existing?.started_at ? new Date(existing.started_at) : finishedAt;
  const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());

  const { data, error } = await supabase
    .from("migration_mapping")
    .update({
      status: "succeeded",
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      target_id: extra?.targetId ?? null,
      payload: extra?.payload ?? null,
      error_message: null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as MigrationRecord;
}

export async function markMigrationFailure(
  id: string,
  errorMessage: string,
  opts?: { payload?: unknown }
) {
  const supabase = getSupabaseClient();
  const finishedAt = new Date();

  // Fetch started_at to compute duration
  const { data: existing, error: getErr } = await supabase
    .from("migration_mapping")
    .select("id, started_at")
    .eq("id", id)
    .single();
  if (getErr) throw getErr;

  const startedAt = existing?.started_at ? new Date(existing.started_at) : finishedAt;
  const durationMs = Math.max(0, finishedAt.getTime() - startedAt.getTime());

  const { data, error } = await supabase
    .from("migration_mapping")
    .update({
      status: "failed",
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      error_message: errorMessage,
      payload: opts?.payload ?? null,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return data as MigrationRecord;
}

export async function getMigrationById(id: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("migration_mapping")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as MigrationRecord;
}

export async function findMigrationsBySource(sourceSystem: string, sourceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("migration_mapping")
    .select("*")
    .eq("source_system", sourceSystem)
    .eq("source_id", sourceId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MigrationRecord[];
}

export async function findMigrationsByTrace(traceId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("migration_mapping")
    .select("*")
    .eq("trace_id", traceId)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MigrationRecord[];
}

export async function findMigrationsBySourceIds(sourceSystem: string, sourceIds: string[]) {
  if (!sourceIds?.length) return [] as MigrationRecord[];
  const supabase = getSupabaseClient();
  const list = sourceIds.map((v) => String(v).split(',').join('\\,')).join(',');
  const { data, error } = await supabase
    .from("migration_mapping")
    .select("*")
    .eq("source_system", sourceSystem)
    .or(`source_id.in.(${list}),source_id_secondary.in.(${list})`)
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MigrationRecord[];
}

export function isMigrated(records: MigrationRecord[] | undefined | null) {
  return (records ?? []).some((r) => r.status === "succeeded");
}

export interface ListFilter {
  status?: MigrationStatus;
  entityType?: string;
  operation?: string;
  sourceSystem?: string;
  targetSystem?: string;
  from?: string; // ISO
  to?: string; // ISO
  search?: string;
}

export async function listMigrations(filter: ListFilter = {}, limit = 50, offset = 0) {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("migration_mapping")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + Math.max(0, limit - 1));

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.entityType) query = query.eq("entity_type", filter.entityType);
  if (filter.operation) query = query.eq("operation", filter.operation);
  if (filter.sourceSystem) query = query.eq("source_system", filter.sourceSystem);
  if (filter.targetSystem) query = query.eq("target_system", filter.targetSystem);
  if (filter.from) query = query.gte("started_at", filter.from);
  if (filter.to) query = query.lte("started_at", filter.to);
  if (filter.search && filter.search.trim()) {
    const term = `%${filter.search.trim()}%`;
    query = query.or(
      [
        `source_id.ilike.${term}`,
        `source_id_secondary.ilike.${term}`,
        `target_id.ilike.${term}`,
        `entity_type.ilike.${term}`,
        `operation.ilike.${term}`,
        `status.ilike.${term}`,
        `trace_id.ilike.${term}`,
      ].join(","),
    );
  }

  const { data, error, count } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as MigrationRecord[], count: count ?? 0 };
}
