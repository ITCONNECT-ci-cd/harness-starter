#!/usr/bin/env node
// touch-epic-context.mjs — 새 워크트리에서 epic-<N>-context.md의 수정 시각을 현재로 올린다(docs/agents/orca-rules.md §3, ADR-004).
//
// bmad-build-auto는 epic-<N>-context.md를 「planning-artifacts의 어떤 파일보다 새것」일 때만 유효한 캐시로 쓴다(수정 시각 비교).
// Git은 checkout할 때 파일 수정 시각을 그 시점으로 찍으므로, 새 워크트리에서는 컨텍스트 파일이 기획 문서보다 먼저 써져
// 「낡은 캐시」로 판정될 수 있다. 그러면 워커가 컨텍스트를 다시 만들어 추적 파일을 바꾸고 병합이 충돌한다.
// orca.yaml의 scripts.setup이 이 스크립트를 실행해 checkout 직후 수정 시각을 올린다. 내용은 바꾸지 않는다.
//
// 사용:  node scripts/orca/touch-epic-context.mjs [디렉터리]   (기본: _bmad-output/implementation-artifacts)
// 종료 코드: 0 (대상이 없어도 0 — 모노레포 초기화 전이나 컨텍스트 파일이 아직 없는 Epic에서 워크트리 준비를 막지 않는다)
import { existsSync, readdirSync, utimesSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_DIR = "_bmad-output/implementation-artifacts";
const CONTEXT_FILE = /^epic-\d+-context\.md$/;

export function touchEpicContext(dir = DEFAULT_DIR, now = new Date()) {
  if (!existsSync(dir)) return [];
  const touched = [];
  for (const name of readdirSync(dir)) {
    if (!CONTEXT_FILE.test(name)) continue;
    utimesSync(join(dir, name), now, now);
    touched.push(name);
  }
  return touched;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const touched = touchEpicContext(process.argv[2]);
  console.log(touched.length ? `touched: ${touched.join(", ")}` : "SKIP: epic-<N>-context.md 없음");
}
