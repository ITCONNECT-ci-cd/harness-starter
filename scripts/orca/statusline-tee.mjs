#!/usr/bin/env node
// statusline-tee.mjs — Claude Code statusline 입력(JSON)에서 주간 사용률만 ~/.orchestrator/claude-usage.json으로
// 떨어뜨리고, 원래 statusline 명령을 같은 입력으로 그대로 실행한다(선택 기능, docs/agents/orca-rules.md §8.1).
// install-statusline-tee.mjs가 이 파일을 ~/.orchestrator/로 복사해 statusLine.command로 건다 — 프로젝트를 지워도 남게.
// 이 스크립트가 실패해도 원래 statusline은 돈다(기록 부분은 조용히 넘어간다).
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const dir = process.env.HARNESS_ORCHESTRATOR_DIR || dirname(fileURLToPath(import.meta.url));

/** statusline 입력 → 기록할 값(없으면 null). */
export function usageRecord(input, now = new Date()) {
  let d;
  try {
    d = JSON.parse(input);
  } catch {
    return null;
  }
  const s = d?.rate_limits?.seven_day;
  if (!s || typeof s.used_percentage !== "number") return null;
  return { at: now.toISOString(), usedPercent: s.used_percentage, resetsAt: s.resets_at ?? null, fiveHour: d?.rate_limits?.five_hour?.used_percentage ?? null, sessionId: d?.session_id ?? null };
}

/** 설정 파일 경로 → 원본 저장소 키. install-statusline-tee.mjs의 settingsKey와 같은 규칙(이 파일은 홀로 복사되어 import하지 않는다). */
export function settingsKey(p, platform = process.platform) {
  const s = resolve(p).split("\\").join("/");
  return platform === "win32" ? s.toLowerCase() : s;
}

/** 원본 저장소에서 그 설정의 원래 명령을 찾는다 — 저장소 키도 같은 규칙으로 맞춰 비교한다. */
export function originalCommand(store, settingsArg, platform = process.platform) {
  if (!store || typeof store !== "object" || !settingsArg) return null;
  const want = settingsKey(settingsArg, platform);
  for (const [k, v] of Object.entries(store)) {
    if (settingsKey(k, platform) !== want) continue;
    const c = v?.statusLine?.command;
    return typeof c === "string" && c && !c.includes("statusline-tee.mjs") ? c : null;
  }
  return null;
}

/** 원래 statusLine 명령을 Claude Code처럼 셸로 실행한다(Windows는 Git Bash). */
function runOriginal(command, input) {
  const shell = process.platform === "win32" ? "bash" : "/bin/sh";
  const r = spawnSync(shell, ["-c", command], { input, encoding: "utf8", windowsHide: true, timeout: 10_000 });
  return r.stdout ?? "";
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let input = "";
  try {
    input = readFileSync(0, "utf8");
  } catch {}
  try {
    const rec = usageRecord(input);
    if (rec) {
      const out = join(dir, "claude-usage.json");
      writeFileSync(`${out}.tmp`, JSON.stringify(rec));
      renameSync(`${out}.tmp`, out);
    }
  } catch {}
  try {
    // 어느 설정에서 불렸는지는 설치기가 붙인 --settings로 안다 — 설정마다 원래 명령이 다를 수 있다.
    const i = process.argv.indexOf("--settings");
    const arg = i > 0 ? process.argv[i + 1] : null;
    const origFile = join(dir, "statusline-orig.json");
    if (arg && existsSync(origFile)) {
      const command = originalCommand(JSON.parse(readFileSync(origFile, "utf8")), arg);
      if (command) process.stdout.write(runOriginal(command, input));
    }
  } catch {}
}
