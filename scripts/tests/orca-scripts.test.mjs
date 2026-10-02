// node --test scripts/tests/orca-scripts.test.mjs
// Orca 코디네이터 보조 스크립트(scripts/orca/)의 판정 함수 시험. Orca·Claude·Codex 없이 돈다.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { claudeUsage, claudeVerdict } from "../orca/claude-usage.mjs";
import { codexVerdict, lastLimits } from "../orca/codex-usage.mjs";
import { install, settingsKey as installKey, uninstall } from "../orca/install-statusline-tee.mjs";
import { readLimits, stopFile } from "../orca/limits.mjs";
import { bannerModel, briefState, expectModelOf, handoffLine, modelMatches, parseChain, predecessorDone, READY } from "../orca/session-rollover.mjs";
import { originalCommand, settingsKey as teeKey, usageRecord } from "../orca/statusline-tee.mjs";

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
  // 잘못된 기록은 예외나 ok가 아니라 unknown
  assert.equal(claudeVerdict({ at: "2026-10-01T23:59:00Z", usedPercent: 10, resetsAt: 1e30 }, lim, now).verdict, "unknown");
  assert.equal(claudeVerdict({ at: "2099-01-01T00:00:00Z", usedPercent: 10 }, lim, now).verdict, "unknown");
  assert.equal(claudeVerdict({ at: "2026-10-01T23:59:00Z", usedPercent: Number.NaN }, lim, now).verdict, "unknown");
  assert.equal(claudeVerdict({ at: "2026-10-01T23:59:00Z", usedPercent: "10" }, lim, now).verdict, "unknown");
});

test("claudeUsage — unknown은 직전 stop을 잇고, 한도 파일이 깨지면 stop", () => {
  const d = freshDir();
  const now = Date.parse("2026-10-02T00:00:00Z");
  writeFileSync(join(d, "limits.json"), JSON.stringify({ claudeStopAtUsedPercent: 80 }));
  writeFileSync(join(d, "claude-usage.json"), JSON.stringify({ at: "2026-10-01T23:59:00Z", usedPercent: 90 }));
  assert.equal(claudeUsage(d, now).verdict, "stop");
  writeFileSync(join(d, "claude-usage.json"), "{");
  const carried = claudeUsage(d, now);
  assert.equal(carried.verdict, "stop");
  assert.equal(carried.carried, true);
  writeFileSync(join(d, "claude-usage.json"), JSON.stringify({ at: "2026-10-01T23:59:00Z", usedPercent: 50 }));
  assert.equal(claudeUsage(d, now).verdict, "ok"); // 새 ok가 직전 stop을 바꾼다
  writeFileSync(join(d, "claude-usage.json"), "{");
  assert.equal(claudeUsage(d, now).verdict, "unknown"); // 직전이 ok면 unknown 그대로
  writeFileSync(join(d, "limits.json"), "{");
  assert.equal(claudeUsage(d, now).verdict, "stop");
  // 한도 파일 오류의 stop도 이어진다: 파일을 고쳤는데 값이 아직 없으면(unknown) stop
  writeFileSync(join(d, "limits.json"), JSON.stringify({ claudeStopAtUsedPercent: 80 }));
  rmSync(join(d, "claude-usage.json"));
  assert.equal(claudeUsage(d, now).verdict, "stop");
});

test("settingsKey·originalCommand — 같은 설정 파일의 다른 표기(역슬래시·대소문자)를 같은 키로 본다", () => {
  assert.equal(teeKey("C:\\Users\\A\\.claude\\settings.json", "win32"), teeKey("c:/users/a/.claude/SETTINGS.json", "win32"));
  assert.equal(installKey("C:\\Users\\A\\.claude\\settings.json", "win32"), teeKey("C:/Users/A/.claude/settings.json", "win32"));
  assert.notEqual(teeKey("/home/a/.claude/settings.json", "linux"), teeKey("/home/A/.claude/settings.json", "linux"));
  const store = { "c:/users/a/.claude/settings.json": { statusLine: { command: "echo A" } }, "c:/users/b/.claude/settings.json": { statusLine: { command: "echo B" } } };
  assert.equal(originalCommand(store, "C:\\Users\\A\\.claude\\settings.json", "win32"), "echo A");
  assert.equal(originalCommand(store, "C:\\Users\\C\\.claude\\settings.json", "win32"), null);
  assert.equal(originalCommand({ k: { statusLine: { command: 'node "statusline-tee.mjs"' } } }, "k", "linux"), null);
  // 옛 표기 키와 정규 키가 함께 있으면 정규 키를 고른다
  const both = { "C:/Users/A/.claude/settings.json": { statusLine: { command: "echo LEGACY" } }, [teeKey("C:/Users/A/.claude/settings.json", "win32")]: { statusLine: { command: "echo CURRENT" } } };
  assert.equal(originalCommand(both, "C:\\Users\\A\\.claude\\settings.json", "win32"), "echo CURRENT");
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

test("lastLimits — 주간 창(10080분)만 읽는다: primary든 secondary든, 없으면 null", () => {
  const ev = (rl, ts) => JSON.stringify({ timestamp: ts, payload: { type: "token_count", rate_limits: rl } });
  const week = (pct) => ({ used_percent: pct, window_minutes: 10080, resets_at: 1 });
  const text = [ev({ primary: week(10) }, "a"), "garbage", JSON.stringify({ x: 1 }), ev({ primary: week(42) }, "b"), ""].join("\n");
  assert.equal(lastLimits(text).weekly.used_percent, 42);
  assert.equal(lastLimits(text).at, "b");
  // 5시간 창이 primary, 주간이 secondary — 주간 값으로 판정해야 한다(5시간 10%로 ok가 나면 안 된다)
  const split = ev({ primary: { used_percent: 10, window_minutes: 300 }, secondary: week(99) }, "c");
  assert.equal(lastLimits(split).weekly.used_percent, 99);
  assert.equal(codexVerdict(lastLimits(split).weekly.used_percent, { codexExhaustedAtUsedPercent: 95 }), "exhausted");
  // 주간 창이 없는 기록은 건너뛰고 앞의 주간 기록을 쓴다, 아무 데도 없으면 null
  assert.equal(lastLimits([ev({ primary: week(30) }, "d"), ev({ primary: { used_percent: 5, window_minutes: 300 } }, "e")].join("\n")).weekly.used_percent, 30);
  assert.equal(lastLimits(ev({ primary: { used_percent: 5, window_minutes: 300 } }, "f")), null);
  assert.equal(lastLimits("no limits here"), null);
});

test("usageRecord — statusline 입력에서 주간 사용률만 뽑는다", () => {
  const r = usageRecord(JSON.stringify({ session_id: "s", rate_limits: { seven_day: { used_percentage: 33, resets_at: 9 }, five_hour: { used_percentage: 5 } } }), new Date(0));
  assert.deepEqual(r, { at: "1970-01-01T00:00:00.000Z", usedPercent: 33, resetsAt: 9, fiveHour: 5, sessionId: "s" });
  assert.equal(usageRecord(JSON.stringify({ model: {} })), null);
  assert.equal(usageRecord("not json"), null);
});

test("statusline-tee 실행 — 사용률을 기록하고, --settings로 고른 원래 명령의 출력을 그대로 낸다", () => {
  const orchDir = freshDir();
  const key = "/x/settings.json";
  writeFileSync(join(orchDir, "statusline-orig.json"), JSON.stringify({ [key]: { statusLine: { type: "command", command: "echo ORIG-LINE" } }, "/y/settings.json": { statusLine: { command: "echo WRONG" } } }));
  const tee = fileURLToPath(new URL("../orca/statusline-tee.mjs", import.meta.url));
  const r = spawnSync(process.execPath, [tee, "--settings", key], {
    input: JSON.stringify({ session_id: "s", rate_limits: { seven_day: { used_percentage: 12, resets_at: 9 } } }),
    encoding: "utf8",
    env: { ...process.env, HARNESS_ORCHESTRATOR_DIR: orchDir },
  });
  assert.match(r.stdout, /ORIG-LINE/);
  assert.doesNotMatch(r.stdout, /WRONG/);
  assert.equal(JSON.parse(readFileSync(join(orchDir, "claude-usage.json"), "utf8")).usedPercent, 12);
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

    // 설정 폴더가 둘이어도 원본을 섞지 않는다: A·B에 설치 → A 제거는 A의 원본, B 제거는 B의 원본
    const claudeB = freshDir();
    const settingsB = join(claudeB, "settings.json");
    const origA = { statusLine: { type: "command", command: "echo A" } };
    const origB = { statusLine: { type: "command", command: "echo B" } };
    writeFileSync(settings, JSON.stringify(origA));
    writeFileSync(settingsB, JSON.stringify(origB));
    install();
    process.env.CLAUDE_CONFIG_DIR = claudeB;
    install();
    assert.match(JSON.parse(readFileSync(settingsB, "utf8")).statusLine.command, /--settings ".*settings\.json"/);
    process.env.CLAUDE_CONFIG_DIR = claudeDir;
    uninstall();
    assert.deepEqual(JSON.parse(readFileSync(settings, "utf8")), origA);
    process.env.CLAUDE_CONFIG_DIR = claudeB;
    uninstall();
    assert.deepEqual(JSON.parse(readFileSync(settingsB, "utf8")), origB);

    // 옛 표기 키(정규화 전 형식)로 남은 원본도 찾아 되돌리고, 재설치하면 키가 하나로 합쳐진다
    const store = join(orchDir, "statusline-orig.json");
    process.env.CLAUDE_CONFIG_DIR = claudeDir;
    writeFileSync(settings, JSON.stringify(origA));
    install();
    const canonical = Object.keys(JSON.parse(readFileSync(store, "utf8")))[0];
    const legacyKey = settings.split("\\").join("/");
    if (legacyKey !== canonical) {
      writeFileSync(store, JSON.stringify({ [legacyKey]: { statusLine: origA.statusLine } }));
      uninstall();
      assert.deepEqual(JSON.parse(readFileSync(settings, "utf8")), origA);
      assert.deepEqual(JSON.parse(readFileSync(store, "utf8")), {});
      writeFileSync(store, JSON.stringify({ [legacyKey]: { statusLine: { command: "echo OLD" } } }));
      install();
      assert.deepEqual(Object.keys(JSON.parse(readFileSync(store, "utf8"))), [canonical]);
    }
    uninstall();

    // Windows: 같은 폴더를 대소문자만 바꿔 가리켜도 제거된다
    if (process.platform === "win32") {
      process.env.CLAUDE_CONFIG_DIR = claudeDir;
      install();
      process.env.CLAUDE_CONFIG_DIR = claudeDir.toUpperCase();
      uninstall();
      assert.deepEqual(JSON.parse(readFileSync(settings, "utf8")), origA);
    }
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
  assert.equal(parseChain("0/0"), null);
  assert.equal(parseChain("1/0"), null);
  assert.equal(parseChain(`1/${"9".repeat(20)}`), null);
  const line = handoffLine({ relBrief: "state/orca/handoff/epic-1-2.md", unattended: true, runId: "run_1", predecessor: "term_x" });
  assert.match(line, /인계문 state\/orca\/handoff\/epic-1-2\.md/);
  assert.match(line, /run-use --id run_1/);
  assert.match(line, /무인 진행/);
  assert.match(line, /--close-predecessor term_x/);
  assert.ok(!/\n/.test(line));
  assert.doesNotMatch(handoffLine({ relBrief: "b.md" }), /무인|run-use|close-predecessor/);
});
