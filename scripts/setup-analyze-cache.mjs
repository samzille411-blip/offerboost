#!/usr/bin/env node
/**
 * 创建 analyze_cache 表（免费诊断结果哈希缓存）
 *
 * 用法 A（推荐）：Supabase Personal Access Token
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/setup-analyze-cache.mjs
 *
 * 用法 B：Postgres 连接串（Settings → Database → Connection string）
 *   DATABASE_URL='postgresql://postgres.xxx:PASSWORD@aws-1-ap-south-1.pooler.supabase.com:6543/postgres' node scripts/setup-analyze-cache.mjs
 */

const PROJECT_REF = "ycugybkevugtirfemken";

const SQL = `
create table if not exists analyze_cache (
  content_hash text primary key,
  score integer not null check (score between 0 and 100),
  issues jsonb not null,
  summary text not null default '',
  created_at timestamptz not null default now()
);
alter table analyze_cache enable row level security;
`.trim();

async function viaManagementApi(token) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: SQL }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`Management API ${res.status}: ${text}`);
  return text || "OK";
}

async function viaDatabaseUrl(dbUrl) {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(SQL);
    return "OK";
  } finally {
    await client.end();
  }
}

async function verifyTable() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || `https://${PROJECT_REF}.supabase.co`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return "skip verify (no service role key)";
  const res = await fetch(`${url}/rest/v1/analyze_cache?select=content_hash&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  return res.status === 200 ? "analyze_cache REST OK" : `verify failed HTTP ${res.status}`;
}

async function main() {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  const dbUrl = process.env.DATABASE_URL;

  if (token) {
    console.log("Running via Supabase Management API...");
    console.log(await viaManagementApi(token));
  } else if (dbUrl) {
    console.log("Running via DATABASE_URL...");
    console.log(await viaDatabaseUrl(dbUrl));
  } else {
    console.error(
      "Need SUPABASE_ACCESS_TOKEN (sbp_...) or DATABASE_URL.\n" +
        "Token: https://supabase.com/dashboard/account/tokens"
    );
    process.exit(1);
  }

  console.log(await verifyTable());
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
