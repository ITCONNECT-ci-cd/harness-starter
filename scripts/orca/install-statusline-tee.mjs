#!/usr/bin/env node
// install-statusline-tee.mjs — Claude 사용량 가드(선택)를 켜려고 statusline-tee를 사용자 설정에 건다.
//
// 하는 일: statusline-tee.mjs를 ~/.orchestrator/로 복사하고, ~/.claude/settings.json의 statusLine을
//          `node "<~/.orchestrator/statusline-tee.mjs>"`로 바꾼다. 원래 statusLine(없었으면 없음)은
//          ~/.orchestrator/statusline-orig.json에 그대로 남기고, tee가 그 명령을 계속 실행한다.
//          설정 파일은 바꾸기 전에 settings.json.bak-<시각>으로 복사한다.
// 되돌리기: --uninstall — 원래 statusLine으로 정확히 되돌린다(원래 없었으면 키를 지운다).
//
// 사용:  node scripts/orca/install-statusline-tee.mjs [--uninstall] [--dry-run]
// 경로:  CLAUDE_CONFIG_DIR(없으면 ~/.claude), HARNESS_ORCHESTRATOR_DIR(없으면 ~/.orchestrator)
// 종료 코드: 0 완료·이미 설치됨·이미 제거됨 / 1 설정 파일 오류
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { orchestratorDir } from "./limits.mjs";

const MARK = "statusline-tee.mjs";

export function settingsPath() {
  return join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "settings.json");
}

function readSettings(file) {
  if (!existsSync(file)) return {};
  const s = JSON.parse(readFileSync(file, "utf8"));
  if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error(`${file}이 JSON 객체가 아니다`);
  return s;
}

function writeSettings(file, s) {
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) copyFileSync(file, `${file}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  writeFileSync(file, `${JSON.stringify(s, null, 2)}\n`);
}

export function install({ dryRun = false } = {}) {
  const file = settingsPath();
  const dir = orchestratorDir();
  const s = readSettings(file);
  if (typeof s.statusLine?.command === "string" && s.statusLine.command.includes(MARK)) return "이미 설치됨";
  const teeDest = join(dir, MARK);
  const teeCmd = `node "${teeDest.split("\\").join("/")}"`;
  if (dryRun) return `설치 예정: ${teeCmd} (원래 statusLine: ${s.statusLine ? JSON.stringify(s.statusLine) : "없음"})`;
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(dirname(fileURLToPath(import.meta.url)), MARK), teeDest);
  writeFileSync(join(dir, "statusline-orig.json"), `${JSON.stringify({ statusLine: s.statusLine ?? null }, null, 2)}\n`);
  writeSettings(file, { ...s, statusLine: { ...(s.statusLine ?? {}), type: "command", command: teeCmd } });
  return `설치: ${teeCmd}`;
}

export function uninstall({ dryRun = false } = {}) {
  const file = settingsPath();
  const dir = orchestratorDir();
  const origFile = join(dir, "statusline-orig.json");
  const s = readSettings(file);
  if (!(typeof s.statusLine?.command === "string" && s.statusLine.command.includes(MARK))) return "설치돼 있지 않음";
  if (!existsSync(origFile)) throw new Error(`${origFile}이 없어 원래 statusLine을 모른다 — 손으로 되돌린다`);
  const orig = JSON.parse(readFileSync(origFile, "utf8")).statusLine ?? null;
  if (dryRun) return `되돌릴 값: ${orig ? JSON.stringify(orig) : "statusLine 없음"}`;
  const next = { ...s };
  if (orig) next.statusLine = orig;
  else delete next.statusLine;
  writeSettings(file, next);
  rmSync(origFile, { force: true });
  return `되돌림: ${orig ? JSON.stringify(orig) : "statusLine 제거"}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dryRun = process.argv.includes("--dry-run");
  try {
    console.log(`[statusline-tee] ${process.argv.includes("--uninstall") ? uninstall({ dryRun }) : install({ dryRun })}`);
  } catch (e) {
    console.error(`[statusline-tee] ${e.message}`);
    process.exit(1);
  }
}
