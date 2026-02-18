import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Simple in-memory rate limiting per IP
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 5_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Rate limit by IP
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  const now = Date.now();
  const lastRequest = rateLimitMap.get(ip);
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return new Response(JSON.stringify({ error: "Rate limited" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    // Expect { snapshots: [...] }
    const snapshots = body.snapshots;
    if (!Array.isArray(snapshots) || snapshots.length === 0 || snapshots.length > 50) {
      return new Response(
        JSON.stringify({ error: "snapshots must be an array of 1-50 items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and sanitize each snapshot
    const rows = snapshots.map((s: Record<string, unknown>) => ({
      session_id: String(s.session_id || ""),
      snapshot_type: s.snapshot_type === "summary" ? "summary" : "periodic",
      level: clampInt(s.level, 0, 100),
      difficulty: sanitizeStr(s.difficulty, 20),
      game_mode: sanitizeStr(s.game_mode, 20),
      avg_fps: clampFloat(s.avg_fps, 0, 240),
      min_fps: clampFloat(s.min_fps, 0, 240),
      quality_level: sanitizeStr(s.quality_level, 10),
      ball_count: clampInt(s.ball_count, 0, 100),
      brick_count: clampInt(s.brick_count, 0, 1000),
      enemy_count: clampInt(s.enemy_count, 0, 100),
      particle_count: clampInt(s.particle_count, 0, 5000),
      explosion_count: clampInt(s.explosion_count, 0, 500),
      ccd_total_ms: clampFloat(s.ccd_total_ms, 0, 1000),
      ccd_substeps: clampInt(s.ccd_substeps, 0, 500),
      ccd_collisions: clampInt(s.ccd_collisions, 0, 500),
      toi_iterations: clampInt(s.toi_iterations, 0, 5000),
      wall_collisions: clampInt(s.wall_collisions, 0, 10000),
      brick_collisions: clampInt(s.brick_collisions, 0, 10000),
      paddle_collisions: clampInt(s.paddle_collisions, 0, 10000),
      boss_collisions: clampInt(s.boss_collisions, 0, 10000),
      boss_active: Boolean(s.boss_active),
      boss_type: sanitizeStr(s.boss_type, 30),
      duration_seconds: clampFloat(s.duration_seconds, 0, 86400),
      final_score: clampInt(s.final_score, 0, 100000000),
      total_quality_changes: clampInt(s.total_quality_changes, 0, 10000),
      user_agent: sanitizeStr(s.user_agent, 300),
    }));

    // Validate session_id looks like a UUID
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const row of rows) {
      if (!uuidRe.test(row.session_id)) {
        return new Response(
          JSON.stringify({ error: "Invalid session_id format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("game_telemetry").insert(rows);

    if (error) {
      console.error("Telemetry insert error:", error);
      return new Response(JSON.stringify({ error: "Insert failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update rate limit
    rateLimitMap.set(ip, now);
    // Cleanup old entries periodically
    if (rateLimitMap.size > 1000) {
      for (const [k, v] of rateLimitMap) {
        if (now - v > 60_000) rateLimitMap.delete(k);
      }
    }

    return new Response(JSON.stringify({ success: true, count: rows.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Telemetry error:", e);
    return new Response(JSON.stringify({ error: "Bad request" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function clampInt(val: unknown, min: number, max: number): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampFloat(val: unknown, min: number, max: number): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  if (!Number.isFinite(n)) return null;
  return Math.max(min, Math.min(max, n));
}

function sanitizeStr(val: unknown, maxLen: number): string | null {
  if (val === null || val === undefined) return null;
  return String(val).slice(0, maxLen);
}
