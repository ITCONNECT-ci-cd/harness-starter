#!/usr/bin/env node
// claude-usage.mjs — Claude 주간 사용률로 「멈춤」 판정을 낸다(선택 기능, docs/agents/orca-rules.md §8.1).
//
// Claude 사용률을 묻는 CLI는 없다. Claude Code는 Pro/Max 구독이면 statusline 입력 JSON에
// rate_limits.seven_day.used_percentage를 준다. statusline-tee.mjs가 그 값을 ~/.orchestrator/claude-usage.json으로
// 떨어뜨리고(설치: install-statusline-tee.mjs), 이 스크립트는 그 파일을 읽을 뿐이다.
//  - 값은 계정 전체 사용률이다(다른 PC·다른 세션 사용분 포함). 이 PC에서 여러 계정을 번갈아 쓰면 마지막으로
//    statusline을 그린 세션의 계정 값이 남는다.
//  - 값이 오래됐으면(기본 60분) unknown. 단 마지막 값이 이미 한도 이상이면 오래돼도 stop(쓰기만 늘었을 테니).
//  - 초기화 시각이 지난 값, 날짜·수치가 잘못된 기록, 미래 시각의 기록은 unknown.
//  - unknown은 **직전 판정을 잇는다**: 마지막 ok/stop 판정을 claude-verdict-last.json에 남기고, 직전이 stop이면
//    unknown도 stop으로 낸다(carried). 직전이 없거나 ok면 unknown 그대로(진행하되 기록에 적는다).
//  - 한도 파일이 깨졌으면 stop — 사용자가 가드를 켜려 한 것이니 고칠 때까지 안전한 쪽으로 멈춘다.
//
// 사용:  node scripts/orca/claude-usage.mjs [--json]
// 판정: off(한도 파일·claudeStopAtUsedPercent 없음 — 가드 꺼짐) / ok / stop / unknown
// 종료 코드: 0 off·ok / 3 stop / 2 unknown
import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { orchestratorDir, readLimits } from "./limits.mjs";

const FUTURE_SLACK_MS = 5 * 60_000;

export function claudeVerdict(rec, limits, now = Date.now()) {
  const stopAt = limits.claudeStopAtUsedPercent;
  const maxAge = limits.claudeUsageMaxAgeMin ?? 60;
  const unknown = (why, extra = {}) => ({ verdict: "unknown", why, stopAt, usedPercent: null, ...extra });
  if (!rec || typeof rec !== "object") return unknown("claude-usage.json 없음(statusline-tee 미설치이거나 아직 갱신 전)");
  if (typeof rec.usedPercent !== "number" || !Number.isFinite(rec.usedPercent) || rec.usedPercent < 0) return unknown("기록의 사용률이 수가 아니다");
  const at = typeof rec.at === "string" ? Date.parse(rec.at) : Number.NaN;
  if (!Number.isFinite(at)) return unknown("기록 시각이 날짜가 아니다");
  if (at > now + FUTURE_SLACK_MS) return unknown("기록 시각이 미래다");
  let resetsMs = null;
  if (rec.resetsAt !== null && rec.resetsAt !== undefined) {
    if (typeof rec.resetsAt !== "number" || !Number.isFinite(rec.resetsAt) || Math.abs(rec.resetsAt) > 1e11) return unknown("기록의 초기화 시각이 잘못됐다");
    resetsMs = rec.resetsAt * 1000;
  }
  const ageMin = Math.round((now - at) / 60_000);
  const base = { usedPercent: rec.usedPercent, stopAt, ageMin, resetsAt: resetsMs === null ? null : new Date(resetsMs).toISOString() };
  if (resetsMs !== null && resetsMs < now) return { ...base, verdict: "unknown", why: "기록의 창이 이미 초기화됨(새 창 미측정)" };
  if (rec.usedPercent >= stopAt) return { ...base, verdict: "stop", why: ageMin > maxAge ? "오래된 값이지만 이미 한도 이상" : "한도 이상" };
  if (ageMin > maxAge) return { ...base, verdict: "unknown", why: `값이 오래됨(${ageMin}분, 한도 ${maxAge}분)` };
  return { ...base, verdict: "ok", why: "한도 미만" };
}

/** unknown이면 직전 판정(last)을 잇는다 — 직전이 stop이면 stop. */
export function carryVerdict(r, last) {
  if (r.verdict === "unknown" && last?.verdict === "stop") return { ...r, verdict: "stop", carried: true, why: `${r.why} — 직전 판정 stop(${last.at})을 잇는다` };
  return r;
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

export function claudeUsage(dir = orchestratorDir(), now = Date.now()) {
  const l = readLimits(dir);
  if (l.state === "off") return { verdict: "off", why: "한도 파일 없음 — 가드 꺼짐" };
  if (l.state === "error") return { verdict: "stop", why: `${l.why} — 한도 파일을 고칠 때까지 멈춘다` };
  if (l.limits.claudeStopAtUsedPercent === undefined) return { verdict: "off", why: "claudeStopAtUsedPercent 없음 — Claude 가드 꺼짐" };
  const lastFile = join(dir, "claude-verdict-last.json");
  const r = carryVerdict(claudeVerdict(readJson(join(dir, "claude-usage.json")), l.limits, now), readJson(lastFile));
  if (!r.carried && (r.verdict === "ok" || r.verdict === "stop")) {
    try {
      writeFileSync(`${lastFile}.tmp`, JSON.stringify({ verdict: r.verdict, usedPercent: r.usedPercent, at: new Date(now).toISOString() }));
      renameSync(`${lastFile}.tmp`, lastFile);
    } catch {}
  }
  return r;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = claudeUsage();
  if (process.argv.includes("--json")) console.log(JSON.stringify(r));
  else if (r.verdict === "off") console.log(`[claude-usage] 판정 off — ${r.why}`);
  else console.log(`[claude-usage] 판정 ${r.verdict} — 주간 사용 ${r.usedPercent ?? "?"}% / 멈춤 ${r.stopAt ?? "?"}%${r.ageMin != null ? `, ${r.ageMin}분 전 값` : ""} (${r.why})`);
  process.exit(r.verdict === "ok" || r.verdict === "off" ? 0 : r.verdict === "stop" ? 3 : 2);
}
