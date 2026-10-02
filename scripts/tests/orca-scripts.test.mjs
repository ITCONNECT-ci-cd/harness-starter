// node --test scripts/tests/orca-scripts.test.mjs
// Orca 코디네이터 보조 스크립트(scripts/orca/)의 판정 함수 시험. Orca·Claude·Codex 없이 돈다.
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { claudeUsage, claudeVerdict } from "../orca/claude-usage.mjs";
import { codexVerdict, lastLimits } from "../orca/codex-usage.mjs";
import { install, uninstall } from "../orca/install-statusline-tee.mjs";
import { readLimits, stopFile } from "../orca/limits.mjs";
import { bannerModel, briefState, expectModelOf, handoffLine, modelMatches, parseChain, predecessorDone, READY } from "../orca/session-rollover.mjs";
import { usageRecord } from "../orca/statusline-tee.mjs";

const TMP = mkdtempSync(join(tmpdir(), "orca-scripts-"));
after(() => rmSync(TMP, { recursive: true, force: true }));
let n = 0;
const freshDir = () => {
  const d = join(TMP, `d${(n += 1)}`);
  mkdirSync(d, { recursive: true });
  return d;
};

test("readLimits — 파일이 없으면 off, 키가 없으면 그 가드만 꺼진다, 잘못된 값은 error", () => {
  const d = freshDir();
  assert.equal(readLimits(d).state, "off");
  writeFileSync(join(d, "limits.json"), JSON.stringify({ _설명: "x", claudeStopAtUsedPercent: 80 }));
  assert.deepEqual(readLimits(d), { state: "on", limits: { claudeStopAtUsedPercent: 80 } });
  writeFileSync(join(d, "limits.json"), JSON.stringify({ claudeStopAtUsedPercent: "80" }));
  assert.equal(readLimits(d).state, "error");
  writeFileSync(join(d, "limits.json"), JSON.stringify({ codexLightAtUsedPercent: 90, codexExhaustedAtUsedPercent: 80 }));
  assert.equal(readLimits(d).state, "error");
  writeFileSync(join(d, "limits.json"), "{");
  assert.equal(readLimits(d).state, "error");
});

test("stopFile — STOP은 모두, STOP-<이름>은 그 저장소만", () => {
  const d = freshDir();
  assert.equal(stopFile("app", d), null);
  writeFileSync(join(d, "STOP-other"), "");
  assert.equal(stopFile("app", d), null);
  writeFileSync(join(d, "STOP-app"), "");
  assert.match(stopFile("app", d), /STOP-app$/);
  writeFileSync(join(d, "STOP"), "");
  assert.match(stopFile(null, d), /STOP$/);
});

test("claudeUsage — 가드가 꺼져 있으면 off, 켜져 있으면 값으로 판정", () => {
  const d = freshDir();
  assert.equal(claudeUsage(d).verdict, "off");
  writeFileSync(join(d, "limits.json"), JSON.stringify({ codexLightAtUsedPercent: 70 }));
  assert.equal(claudeUsage(d).verdict, "off");
  writeFileSync(join(d, "limits.json"), JSON.stringify({ claudeStopAtUsedPercent: 80 }));
  assert.equal(claudeUsage(d).verdict, "unknown"); // 기록 없음
  const now = Date.parse("2026-10-02T00:00:00Z");
  writeFileSync(join(d, "claude-usage.json"), JSON.stringify({ at: "2026-10-01T23:50:00Z", usedPercent: 50, resetsAt: now / 1000 + 86_400 }));
  assert.equal(claudeUsage(d, now).verdict, "ok");
});

test("claudeVerdict — 한도 이상은 오래돼도 stop, 한도 미만이 오래되면 unknown, 초기화가 지났으면 unknown", () => {
  const now = Date.parse("2026-10-02T00:00:00Z");
  const lim = { claudeStopAtUsedPercent: 80 };
  const old = "2026-10-01T20:00:00Z";
  assert.equal(claudeVerdict({ at: old, usedPercent: 85 }, lim, now).verdict, "stop");
  assert.equal(claudeVerdict({ at: old, usedPercent: 50 }, lim, now).verdict, "unknown");
  assert.equal(claudeVerdict({ at: "2026-10-01T23:59:00Z", usedPercent: 85, resetsAt: now / 1000 - 1 }, lim, now).verdict, "unknown");
  assert.equal(claudeVerdict({ at: "not-a-date", usedPercent: 50 }, lim, now).verdict, "unknown");
  assert.equal(claudeVerdict({ at: "2026-10-01T23:59:00Z", usedPercent: 80 }, lim, now).verdict, "stop");
});

test("codexVerdict — 경계와 한쪽 키만 있는 경우, 한도 거부는 exhausted", () => {
  const lim = { codexLightAtUsedPercent: 70, codexExhaustedAtUsedPercent: 95 };
  assert.equal(codexVerdict(69, lim), "ok");
  assert.equal(codexVerdict(70, lim), "light");
  assert.equal(codexVerdict(95, lim), "exhausted");
  assert.equal(codexVerdict(null, lim), "unknown");
  assert.equal(codexVerdict(null, lim, true), "exhausted");
  assert.equal(codexVerdict(99, { codexLightAtUsedPercent: 70 }), "light");
  assert.equal(codexVerdict(99, { codexExhaustedAtUsedPercent: 95 }), "exhausted");
});

test("lastLimits — rollout의 마지막 rate_limits.primary를 읽는다", () => {
  const ev = (pct, ts) => JSON.stringify({ timestamp: ts, payload: { type: "token_count", rate_limits: { primary: { used_percent: pct, window_minutes: 10080, resets_at: 1 } } } });
  const text = [ev(10, "a"), "garbage", JSON.stringify({ x: 1 }), ev(42, "b"), ""].join("\n");
  const l = lastLimits(text);
  assert.equal(l.primary.used_percent, 42);
  assert.equal(l.at, "b");
  assert.equal(lastLimits("no limits here"), null);
});

test("usageRecord — statusline 입력에서 주간 사용률만 뽑는다", () => {
  const r = usageRecord(JSON.stringify({ session_id: "s", rate_limits: { seven_day: { used_percentage: 33, resets_at: 9 }, five_hour: { used_percentage: 5 } } }), new Date(0));
  assert.deepEqual(r, { at: "1970-01-01T00:00:00.000Z", usedPercent: 33, resetsAt: 9, fiveHour: 5, sessionId: "s" });
  assert.equal(usageRecord(JSON.stringify({ model: {} })), null);
  assert.equal(usageRecord("not json"), null);
});

test("install/uninstall — 원래 statusLine을 보존하고 정확히 되돌린다(없었으면 키를 지운다)", () => {
  const claudeDir = freshDir();
  const orchDir = freshDir();
  const prev = { c: process.env.CLAUDE_CONFIG_DIR, o: process.env.HARNESS_ORCHESTRATOR_DIR };
  process.env.CLAUDE_CONFIG_DIR = claudeDir;
  process.env.HARNESS_ORCHESTRATOR_DIR = orchDir;
  try {
    const settings = join(claudeDir, "settings.json");
    const original = { theme: "dark", statusLine: { type: "command", command: "bash ~/sl.sh", padding: 1 } };
    writeFileSync(settings, JSON.stringify(original));
    assert.match(install(), /설치/);
    const after1 = JSON.parse(readFileSync(settings, "utf8"));
    assert.match(after1.statusLine.command, /statusline-tee\.mjs/);
    assert.equal(after1.statusLine.padding, 1);
    assert.equal(after1.theme, "dark");
    assert.ok(existsSync(join(orchDir, "statusline-tee.mjs")));
    assert.equal(install(), "이미 설치됨");
    uninstall();
    assert.deepEqual(JSON.parse(readFileSync(settings, "utf8")), original);
    assert.equal(uninstall(), "설치돼 있지 않음");

    writeFileSync(settings, JSON.stringify({ theme: "light" }));
    install();
    uninstall();
    assert.deepEqual(JSON.parse(readFileSync(settings, "utf8")), { theme: "light" });
  } finally {
    if (prev.c === undefined) delete process.env.CLAUDE_CONFIG_DIR;
    else process.env.CLAUDE_CONFIG_DIR = prev.c;
    if (prev.o === undefined) delete process.env.HARNESS_ORCHESTRATOR_DIR;
    else process.env.HARNESS_ORCHESTRATOR_DIR = prev.o;
  }
});

test("rollover — 모델 기대값과 배너 대조는 버전 경계까지 본다", () => {
  assert.equal(expectModelOf("sonnet"), "sonnet");
  assert.equal(expectModelOf("claude-sonnet-5-5"), "sonnet 5.5");
  assert.equal(expectModelOf("claude-opus-5-5"), "opus 5.5");
  assert.ok(modelMatches("Sonnet 5.5 (1M context)", "sonnet 5.5"));
  assert.ok(modelMatches("Sonnet 5.5", "sonnet"));
  assert.ok(!modelMatches("Opus 5.5", "opus 5"));
  assert.ok(!modelMatches("Opus 5", "opus 5.5"));
  assert.equal(bannerModel(" ▐▛███▜▌   Claude Code v2.1.285\n▝▜█████▛▘  Sonnet 5.5 with medium effort · Claude Max"), "Sonnet 5.5");
});

test("rollover — 준비·작업 중 판정은 화면으로", () => {
  assert.ok(READY("❯ \n  ⏵⏵ bypass permissions on (shift+tab to cycle)"));
  assert.ok(READY("❯ \n  ? for shortcuts"));
  assert.ok(READY('❯ Try "refactor <filepath>"\n  ⏵⏵ auto mode on (shift+tab to cycle) · ← for agents'));
  assert.ok(!READY("loading..."));
  assert.ok(predecessorDone("done\n❯ \n  ? for shortcuts"));
  assert.ok(!predecessorDone("❯ \n  · 1 shell still running"));
  assert.ok(!predecessorDone("✻ Working… (esc to interrupt)\n❯ "));
});

test("rollover — 인계 줄 상태: 제출됨·입력만·새 세션·불확실", () => {
  const m = "인계문 state/orca/handoff/epic-1-2.md";
  assert.equal(briefState(`Claude Code v2\n❯ Orca … ${m} …\n● 읽는 중\n❯ `, m), "submitted");
  assert.equal(briefState(`Claude Code v2\n❯ Orca … ${m}`, m), "typed");
  assert.equal(briefState("Claude Code v2.1\n❯ ", m), "fresh");
  assert.equal(briefState("● 무언가\n  ⎿ 결과\n❯ ", m), "uncertain");
});

test("rollover — 체인 형식과 인계 줄", () => {
  assert.deepEqual(parseChain("3/5"), { n: 3, max: 5 });
  assert.equal(parseChain("3"), null);
  const line = handoffLine({ relBrief: "state/orca/handoff/epic-1-2.md", unattended: true, runId: "run_1", predecessor: "term_x" });
  assert.match(line, /인계문 state\/orca\/handoff\/epic-1-2\.md/);
  assert.match(line, /run-use --id run_1/);
  assert.match(line, /무인 진행/);
  assert.match(line, /--close-predecessor term_x/);
  assert.ok(!/\n/.test(line));
  assert.doesNotMatch(handoffLine({ relBrief: "b.md" }), /무인|run-use|close-predecessor/);
});
