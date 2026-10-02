#!/usr/bin/env node
// codex-usage.mjs — Codex 주간 사용률로 판정을 낸다(선택 기능, docs/agents/orca-rules.md §8.1).
//
// Codex CLI에는 사용량을 묻는 명령이 없다. 대신 대화 기록(rollout) $CODEX_HOME/sessions/YYYY/MM/DD/*.jsonl의
// token_count 이벤트에 rate_limits.primary(used_percent·window_minutes·resets_at)가 실린다.
//  - 기본은 기록을 남기는 아주 작은 탐침 호출 하나를 하고, **그 탐침의 세션 ID로 찾은 rollout**의, 탐침 뒤 시각 이벤트로만
//    판정한다(다른 세션의 옛 값을 집지 않는다). 탐침이 사용량 한도로 거부되면 exhausted.
//  - --no-probe는 가장 새 rollout만 읽는다(누구의·언제 값인지 보장 없음 — 「묵은 값」 표시).
//  - Orca가 띄운 Codex는 Orca의 CODEX_HOME을 쓸 수 있다. 같은 계정의 값을 읽으려면 그 경로를 CODEX_HOME으로 준다.
//  - 초기화 시각이 지난 값은 옛 창의 값이라 unknown.
//
// 사용:  node scripts/orca/codex-usage.mjs [--no-probe] [--json]
// 판정: off(한도 파일·codex 키 없음) / ok / light(≥ codexLightAtUsedPercent) / exhausted(≥ codexExhaustedAtUsedPercent) / unknown
// 종료 코드: 0 판정 냄(off·ok·light·exhausted) / 2 unknown
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readLimits } from "./limits.mjs";

const LIMIT_RE = /hit your usage limit|usage limit (?:reached|exceeded)|weekly (?:usage )?limit/i;

/** 사용률·한도 거부 여부 → 판정. light·exhausted 키 중 없는 것은 그 경계를 쓰지 않는다. */
export function codexVerdict(used, limits, limitHit = false) {
  const light = limits.codexLightAtUsedPercent;
  const exhausted = limits.codexExhaustedAtUsedPercent;
  if (limitHit) return "exhausted";
  if (used === null || used === undefined) return "unknown";
  if (exhausted !== undefined && used >= exhausted) return "exhausted";
  if (light !== undefined && used >= light) return "light";
  return "ok";
}

/** rollout 한 파일의 마지막 rate_limits(primary 포함). */
export function lastLimits(text) {
  const lines = text.split("\n");
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (!lines[i].includes('"rate_limits"')) continue;
    try {
      const o = JSON.parse(lines[i]);
      const rl = o?.payload?.rate_limits ?? o?.rate_limits ?? o?.msg?.rate_limits;
      if (rl?.primary && typeof rl.primary.used_percent === "number") return { at: o.timestamp ?? null, ...rl };
    } catch {}
  }
  return null;
}

function sessionsDir() {
  return join(process.env.CODEX_HOME || join(homedir(), ".codex"), "sessions");
}

/** sessions 아래 rollout 파일을 수정 시각 역순으로(최근 폴더만 — 전부 훑으면 느리다). */
function recentRollouts(sinceMs) {
  const out = [];
  const walk = (dir, depth) => {
    let names;
    try {
      names = readdirSync(dir);
    } catch {
      return;
    }
    const sorted = names.sort().reverse();
    for (const n of depth < 3 ? sorted.slice(0, 3) : sorted) {
      const p = join(dir, n);
      if (depth < 3) walk(p, depth + 1);
      else if (n.endsWith(".jsonl")) {
        const m = statSync(p).mtimeMs;
        if (m >= sinceMs) out.push({ p, m });
      }
    }
  };
  walk(sessionsDir(), 0);
  return out.sort((x, y) => y.m - x.m);
}

function readText(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return "";
  }
}

export function codexUsage({ probe = true } = {}) {
  const l = readLimits();
  if (l.state === "off") return { verdict: "off", why: "한도 파일 없음 — 가드 꺼짐" };
  if (l.state === "error") return { verdict: "unknown", why: l.why };
  if (l.limits.codexLightAtUsedPercent === undefined && l.limits.codexExhaustedAtUsedPercent === undefined) return { verdict: "off", why: "codex 키 없음 — Codex 가드 꺼짐" };

  const started = Date.now();
  let note = "없음(--no-probe)";
  let session = null;
  let limitHit = false;
  if (probe) {
    const r = spawnSync(
      "codex",
      ["exec", "--dangerously-bypass-approvals-and-sandbox", "--skip-git-repo-check", "-c", 'model_reasoning_effort="low"', "--color", "never", "-C", tmpdir(), "-"],
      { input: "Reply with the single word OK. Do not run any command.", encoding: "utf8", timeout: 180_000, windowsHide: true },
    );
    note = r.error ? `실패(${r.error.code ?? r.error.message})` : `종료 ${r.status}`;
    const err = `${r.stderr ?? ""}\n${r.stdout ?? ""}`;
    session = /session id:\s*([0-9a-f-]{36})/i.exec(err)?.[1] ?? null;
    // 명시적인 사용량 한도 거부 문구만 인정한다 — 넓은 말(quota·rate limit)은 일시적 제한에도 나온다.
    limitHit = r.status !== 0 && LIMIT_RE.test(err);
  }

  let found = null;
  if (probe) {
    const mine = session ? recentRollouts(started - 60_000).find((f) => f.p.includes(session)) : null;
    const rl = mine ? lastLimits(readText(mine.p)) : null;
    const at = rl?.at ? Date.parse(rl.at) : Number.NaN;
    if (rl && Number.isFinite(at) && at >= started - 5_000) found = { ...rl, file: mine.p };
    if (!found) note += session ? ` · 탐침 기록(${session})에서 사용률을 찾지 못함` : " · 탐침 세션 ID를 읽지 못함";
  } else {
    for (const f of recentRollouts(0)) {
      const rl = lastLimits(readText(f.p));
      if (rl) {
        found = { ...rl, file: f.p, stale: true };
        break;
      }
    }
  }
  const resetsAt = found?.primary?.resets_at ? new Date(found.primary.resets_at * 1000) : null;
  const expired = Boolean(found && resetsAt && resetsAt.getTime() < Date.now());
  if (expired) note += " · 기록의 창이 이미 초기화됨(새 창 미측정)";
  const used = found && !expired ? found.primary.used_percent : null;
  if (found) limitHit = false; // 측정값이 있으면 그것이 우선
  return {
    verdict: codexVerdict(used, l.limits, limitHit),
    usedPercent: found ? found.primary.used_percent : null,
    stale: Boolean(found?.stale) || expired,
    limitHit,
    resetsAt: resetsAt ? resetsAt.toISOString() : null,
    light: l.limits.codexLightAtUsedPercent ?? null,
    exhausted: l.limits.codexExhaustedAtUsedPercent ?? null,
    probe: note,
    source: found?.file ?? null,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const r = codexUsage({ probe: !process.argv.includes("--no-probe") });
  if (process.argv.includes("--json")) console.log(JSON.stringify(r));
  else if (r.verdict === "off") console.log(`[codex-usage] 판정 off — ${r.why}`);
  else if (r.why) console.log(`[codex-usage] 판정 ${r.verdict} — ${r.why}`);
  else {
    const pct = r.usedPercent === null ? "?" : `${r.usedPercent}%`;
    console.log(`[codex-usage] 판정 ${r.verdict} — 주간 사용 ${pct}${r.stale ? "(묵은 값)" : ""} (light ${r.light ?? "-"}%·exhausted ${r.exhausted ?? "-"}%), 초기화 ${r.resetsAt ?? "?"}, 탐침 ${r.probe}`);
  }
  process.exit(r.verdict === "unknown" ? 2 : 0);
}
