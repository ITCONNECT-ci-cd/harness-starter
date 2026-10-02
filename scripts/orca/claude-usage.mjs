#!/usr/bin/env node
// claude-usage.mjs — Claude 주간 사용률로 「멈춤」 판정을 낸다(선택 기능, docs/agents/orca-rules.md §8.1).
//
// Claude 사용률을 묻는 CLI는 없다. Claude Code는 Pro/Max 구독이면 statusline 입력 JSON에
// rate_limits.seven_day.used_percentage를 준다. statusline-tee.mjs가 그 값을 ~/.orchestrator/claude-usage.json으로
// 떨어뜨리고(설치: install-statusline-tee.mjs), 이 스크립트는 그 파일을 읽을 뿐이다.
//  - 값은 계정 전체 사용률이다(다른 PC·다른 세션 사용분 포함). 이 PC에서 여러 계정을 번갈아 쓰면 마지막으로
//    statusline을 그린 세션의 계정 값이 남는다.
//  - 값이 오래됐으면(기본 60분) unknown. 단 마지막 값이 이미 한도 이상이면 오래돼도 stop(쓰기만 늘었을 테니).
//  - 초기화 시각이 지난 값은 옛 창의 값이라 unknown(새 창은 아직 안 쟀다).
//
// 사용:  node scripts/orca/claude-usage.mjs [--json]
// 판정: off(한도 파일·claudeStopAtUsedPercent 없음 — 가드 꺼짐) / ok / stop / unknown
// 종료 코드: 0 off·ok / 3 stop / 2 unknown
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { orchestratorDir, readLimits } from "./limits.mjs";

export function claudeVerdict(rec, limits, now = Date.now()) {
  const stopAt = limits.claudeStopAtUsedPercent;
  const maxAge = limits.claudeUsageMaxAgeMin ?? 60;
  if (!rec || typeof rec.usedPercent !== "number") return { verdict: "unknown", why: "claude-usage.json 없음(statusline-tee 미설치이거나 아직 갱신 전)", stopAt, usedPercent: null };
  const at = Date.parse(rec.at);
  const ageMin = Number.isFinite(at) ? Math.round((now - at) / 60_000) : null;
  const expired = typeof rec.resetsAt === "number" && rec.resetsAt * 1000 < now;
  const base = { usedPercent: rec.usedPercent, stopAt, ageMin, resetsAt: typeof rec.resetsAt === "number" ? new Date(rec.resetsAt * 1000).toISOString() : null };
  if (expired) return { ...base, verdict: "unknown", why: "기록의 창이 이미 초기화됨(새 창 미측정)" };
  if (rec.usedPercent >= stopAt) return { ...base, verdict: "stop", why: ageMin === null || ageMin > maxAge ? "오래된 값이지만 이미 한도 이상" : "한도 이상" };
  if (ageMin === null || ageMin > maxAge) return { ...base, verdict: "unknown", why: `값이 오래됨(${ageMin ?? "?"}분, 한도 ${maxAge}분)` };
  return { ...base, verdict: "ok", why: "한도 미만" };
}

export function claudeUsage(dir = orchestratorDir(), now = Date.now()) {
  const l = readLimits(dir);
  if (l.state === "off") return { verdict: "off", why: "한도 파일 없음 — 가드 꺼짐" };
  if (l.state === "error") return { verdict: "unknown", why: l.why };
  if (l.limits.claudeStopAtUsedPercent === undefined) return { verdict: "off", why: "claudeStopAtUsedPercent 없음 — Claude 가드 꺼짐" };
  let rec = null;
  try {
    rec = JSON.parse(readFileSync(join(dir, "claude-usage.json"), "utf8"));
  } catch {}
  return claudeVerdict(rec, l.limits, now);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = claudeUsage();
  if (process.argv.includes("--json")) console.log(JSON.stringify(r));
  else if (r.verdict === "off") console.log(`[claude-usage] 판정 off — ${r.why}`);
  else console.log(`[claude-usage] 판정 ${r.verdict} — 주간 사용 ${r.usedPercent ?? "?"}% / 멈춤 ${r.stopAt ?? "?"}%${r.ageMin != null ? `, ${r.ageMin}분 전 값` : ""} (${r.why})`);
  process.exit(r.verdict === "ok" || r.verdict === "off" ? 0 : r.verdict === "stop" ? 3 : 2);
}
