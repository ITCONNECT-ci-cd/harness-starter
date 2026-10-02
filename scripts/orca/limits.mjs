// limits.mjs — 코디네이터 사용량 가드의 공용 설정(선택 기능). docs/agents/orca-rules.md §8.1.
//
// 사용량 한도는 계정 단위라 프로젝트가 아니라 사용자 폴더에 둔다: ~/.orchestrator/limits.json
// (HARNESS_ORCHESTRATOR_DIR로 바꿀 수 있다). 파일이 없으면 가드는 꺼져 있다 — 판정은 "off"이고 아무것도 막지 않는다.
// 키마다 따로 켠다: 키가 없으면 그 가드만 꺼진다.
//   claudeStopAtUsedPercent      Claude 주간 사용률이 이 값 이상이면 새 워커·인계를 멈춘다
//   claudeUsageMaxAgeMin         Claude 값이 이보다 오래되면 unknown (기본 60)
//   codexLightAtUsedPercent      Codex 주간 사용률이 이 값 이상이면 Codex 구현 자리를 대체 모델로
//   codexExhaustedAtUsedPercent  이 값 이상이면 Codex를 부르지 않는다
// 멈춤 파일: ~/.orchestrator/STOP(모든 코디네이터) 또는 STOP-<저장소 이름>(그 저장소만). 한도 파일과 무관하게 동작한다.
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const LIMIT_KEYS = ["claudeStopAtUsedPercent", "claudeUsageMaxAgeMin", "codexLightAtUsedPercent", "codexExhaustedAtUsedPercent"];

export function orchestratorDir() {
  return process.env.HARNESS_ORCHESTRATOR_DIR || join(homedir(), ".orchestrator");
}

/**
 * 한도 파일을 읽는다.
 * @returns {{ state: "off" } | { state: "error", why: string } | { state: "on", limits: Record<string, number> }}
 */
export function readLimits(dir = orchestratorDir()) {
  const file = join(dir, "limits.json");
  if (!existsSync(file)) return { state: "off" };
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    return { state: "error", why: `limits.json을 읽지 못함: ${e.message}` };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { state: "error", why: "limits.json이 객체가 아니다" };
  const limits = {};
  for (const k of LIMIT_KEYS) {
    if (raw[k] === undefined) continue;
    if (typeof raw[k] !== "number" || !Number.isFinite(raw[k]) || raw[k] < 0) return { state: "error", why: `${k}는 0 이상의 수여야 한다` };
    limits[k] = raw[k];
  }
  if (limits.codexLightAtUsedPercent !== undefined && limits.codexExhaustedAtUsedPercent !== undefined && limits.codexLightAtUsedPercent > limits.codexExhaustedAtUsedPercent) {
    return { state: "error", why: "codexLightAtUsedPercent가 codexExhaustedAtUsedPercent보다 크다" };
  }
  return { state: "on", limits };
}

/** 멈춤 파일 경로(있으면) — STOP 또는 STOP-<name>. */
export function stopFile(name, dir = orchestratorDir()) {
  const files = [join(dir, "STOP")];
  if (name) files.push(join(dir, `STOP-${name}`));
  return files.find((f) => existsSync(f)) ?? null;
}
