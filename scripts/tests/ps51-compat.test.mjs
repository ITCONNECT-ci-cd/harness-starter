// node --test scripts/tests/ps51-compat.test.mjs
// scripts/**/*.ps1이 Windows PowerShell 5.1에서도 돌게 하는 두 가지 규칙을 검사한다. PowerShell 7만 쓰는 CI는 둘 다 잡지 못한다.
// 근거: docs/changelog/2026-10-03-ps51-compat.md
//
// 1. 한글 등 비ASCII가 든 .ps1은 UTF-8 BOM으로 시작한다.
//    BOM이 없으면 5.1이 파일을 시스템 코드 페이지(한국어 Windows는 CP949)로 읽어 한글이 깨지고,
//    깨진 글자가 문자열의 닫는 따옴표를 삼켜 파싱 오류가 난다. PowerShell 7은 BOM 없이도 UTF-8로 읽는다.
// 2. 「없는 것이 정상 경로인」 git 존재 확인은 stderr에 아무것도 쓰지 않는 형태로 쓴다.
//    스크립트는 $ErrorActionPreference = "Stop"이다. 5.1은 네이티브 명령이 stderr에 쓰면 `*> $null`·`2> $null`로 버려도
//    예외를 던지고, PowerShell 7은 던지지 않는다. 그래서 `git rev-parse --verify <없는 ref>`나 `git remote get-url origin`
//    (origin 없음)이 5.1에서만 스크립트를 죽인다.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPTS = fileURLToPath(new URL("../", import.meta.url));
const BOM = [0xef, 0xbb, 0xbf];

export function hasBom(bytes) {
  return BOM.every((b, i) => bytes[i] === b);
}

export function hasNonAscii(bytes) {
  return bytes.some((b) => b > 0x7f);
}

// stderr를 버리는 git 존재 확인 중 5.1에서 예외가 나는 형태. 고치는 방법을 함께 돌려준다.
const RISKY = [
  { re: /git\s+rev-parse\s+--verify\s+(?!--quiet\b)\S.*(\*>|2>)\s*\$null/, fix: "`git rev-parse --verify --quiet <ref>`로 쓴다" },
  { re: /git\s+remote\s+get-url\b.*(\*>|2>)\s*\$null/, fix: "`git config --get remote.origin.url`로 쓴다" },
];

export function riskyGitProbes(text) {
  return text
    .split("\n")
    .flatMap((line, i) => RISKY.filter((r) => r.re.test(line)).map((r) => ({ line: i + 1, text: line.trim(), fix: r.fix })));
}

function ps1Files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return ps1Files(p);
    return e.name.endsWith(".ps1") ? [p] : [];
  });
}

test("ps51 호환 — 한글 등 비ASCII가 든 .ps1은 UTF-8 BOM으로 시작한다", () => {
  const files = ps1Files(SCRIPTS);
  assert.ok(files.length > 0, "scripts/ 아래에서 .ps1을 하나도 찾지 못했다 — 경로 계산이 틀렸다");
  const missing = files
    .filter((f) => {
      const bytes = readFileSync(f);
      return hasNonAscii(bytes) && !hasBom(bytes);
    })
    .map((f) => f.slice(SCRIPTS.length));
  assert.deepEqual(missing, [], `BOM이 없는 비ASCII .ps1: ${missing.join(", ")} — Windows PowerShell 5.1에서 파싱 오류가 난다`);
});

test("ps51 호환 — stderr를 버리는 git 존재 확인은 5.1에서 예외가 나지 않는 형태다", () => {
  const found = ps1Files(SCRIPTS).flatMap((f) =>
    riskyGitProbes(readFileSync(f, "utf8")).map((r) => `${f.slice(SCRIPTS.length)}:${r.line} ${r.text}  → ${r.fix}`),
  );
  assert.deepEqual(found, [], `5.1에서 예외가 나는 git 호출:\n${found.join("\n")}`);
});

test("ps51 호환 — BOM·비ASCII 판정", () => {
  assert.equal(hasBom(Buffer.from([0xef, 0xbb, 0xbf, 0x23])), true);
  assert.equal(hasBom(Buffer.from([0x23, 0xef, 0xbb, 0xbf])), false);
  assert.equal(hasBom(Buffer.from([0xef, 0xbb])), false);
  assert.equal(hasNonAscii(Buffer.from("plain ascii", "utf8")), false);
  assert.equal(hasNonAscii(Buffer.from("한글", "utf8")), true);
});

test("ps51 호환 — 위험한 git 호출 형태를 잡고 안전한 형태는 통과시킨다", () => {
  // 수정 전에 실제로 있던 줄은 잡아야 한다
  assert.equal(riskyGitProbes("      & git rev-parse --verify $ref *> $null").length, 1);
  assert.equal(riskyGitProbes("& git rev-parse --verify develop *> $null").length, 1);
  assert.equal(riskyGitProbes("  & git rev-parse --verify $BranchName 2> $null").length, 1);
  assert.equal(riskyGitProbes("& git remote get-url origin *> $null").length, 1);
  // 고친 형태와 stderr를 버리지 않는 호출은 통과해야 한다
  assert.equal(riskyGitProbes("& git rev-parse --verify --quiet $ref *> $null").length, 0);
  assert.equal(riskyGitProbes("& git config --get remote.origin.url *> $null").length, 0);
  assert.equal(riskyGitProbes("$sha = & git rev-parse --verify HEAD").length, 0);
  assert.equal(riskyGitProbes("& git remote get-url origin").length, 0);
});
