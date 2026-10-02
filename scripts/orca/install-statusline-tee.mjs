#!/usr/bin/env node
// install-statusline-tee.mjs — Claude 사용량 가드(선택)를 켜려고 statusline-tee를 사용자 설정에 건다.
//
// 하는 일: statusline-tee.mjs를 ~/.orchestrator/로 복사하고, Claude 설정(settings.json)의 statusLine을
//          `node "<~/.orchestrator/statusline-tee.mjs>" --settings "<그 settings.json>"`으로 바꾼다.
//          원래 statusLine(없었으면 없음)은 ~/.orchestrator/statusline-orig.json에 **설정 파일 경로별로** 남기고,
//          tee가 자기 설정의 원래 명령을 계속 실행한다. 설정 파일은 바꾸기 전에 settings.json.bak-<시각>으로 복사한다.
// 되돌리기: --uninstall — 그 설정 파일의 원래 statusLine으로 정확히 되돌린다(원래 없었으면 키를 지운다).
//
// 사용:  node scripts/orca/install-statusline-tee.mjs [--uninstall] [--dry-run]
// 경로:  CLAUDE_CONFIG_DIR(없으면 ~/.claude), HARNESS_ORCHESTRATOR_DIR(없으면 ~/.orchestrator)
// 종료 코드: 0 완료·이미 설치됨·설치돼 있지 않음 / 1 설정 파일 오류
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { orchestratorDir } from "./limits.mjs";

const MARK = "statusline-tee.mjs";
const fwd = (p) => p.split("\\").join("/");

export function settingsPath() {
  return resolve(join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), ".claude"), "settings.json"));
}

function readJsonObject(file, empty) {
  if (!existsSync(file)) return empty;
  const s = JSON.parse(readFileSync(file, "utf8"));
  if (!s || typeof s !== "object" || Array.isArray(s)) throw new Error(`${file}이 JSON 객체가 아니다`);
  return s;
}

function writeAtomic(file, obj) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(`${file}.tmp`, `${JSON.stringify(obj, null, 2)}\n`);
  renameSync(`${file}.tmp`, file);
}

function writeSettings(file, s) {
  if (existsSync(file)) copyFileSync(file, `${file}.bak-${new Date().toISOString().replace(/[:.]/g, "-")}`);
  writeAtomic(file, s);
}

/** 원본 저장소: { "<settings.json 절대 경로(/)>": { statusLine: <원래 값 또는 null> } } */
function origStore(dir) {
  return join(dir, "statusline-orig.json");
}

export function install({ dryRun = false } = {}) {
  const file = settingsPath();
  const key = fwd(file);
  const dir = orchestratorDir();
  const s = readJsonObject(file, {});
  if (typeof s.statusLine?.command === "string" && s.statusLine.command.includes(MARK)) return "이미 설치됨";
  const teeDest = join(dir, MARK);
  const teeCmd = `node "${fwd(teeDest)}" --settings "${key}"`;
  if (dryRun) return `설치 예정: ${teeCmd} (원래 statusLine: ${s.statusLine ? JSON.stringify(s.statusLine) : "없음"})`;
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(dirname(fileURLToPath(import.meta.url)), MARK), teeDest);
  const store = readJsonObject(origStore(dir), {});
  store[key] = { statusLine: s.statusLine ?? null };
  writeAtomic(origStore(dir), store);
  writeSettings(file, { ...s, statusLine: { ...(s.statusLine ?? {}), type: "command", command: teeCmd } });
  return `설치: ${teeCmd}`;
}

export function uninstall({ dryRun = false } = {}) {
  const file = settingsPath();
  const key = fwd(file);
  const dir = orchestratorDir();
  const s = readJsonObject(file, {});
  if (!(typeof s.statusLine?.command === "string" && s.statusLine.command.includes(MARK))) return "설치돼 있지 않음";
  const store = readJsonObject(origStore(dir), {});
  if (!Object.hasOwn(store, key)) throw new Error(`${origStore(dir)}에 ${key}의 원래 statusLine이 없다 — 손으로 되돌린다`);
  const orig = store[key].statusLine ?? null;
  if (dryRun) return `되돌릴 값: ${orig ? JSON.stringify(orig) : "statusLine 없음"}`;
  const next = { ...s };
  if (orig) next.statusLine = orig;
  else delete next.statusLine;
  writeSettings(file, next);
  delete store[key];
  writeAtomic(origStore(dir), store);
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
