#!/usr/bin/env node
/**
 * session-rollover.mjs — 코디네이터가 안전한 경계에서 **후임 코디네이터를 Orca 탭으로 띄워 인계**한다
 * (docs/agents/orca-rules.md §11). 사람이 「이어서 하기」 프롬프트를 치던 일을 자동으로 한다.
 *
 * 왜:
 *  - 코디네이터는 Epic 내내 켜져 있는 역할이라 매 턴 옛 맥락을 다시 읽는다. 세션이 길어질수록 비용이 급증하고 앞 판단을
 *    잘못 기억한다(실측: 한 세션이 한 묶음의 마감에 209턴·약 630만 토큰). 그래서 Story 몇 개마다 새 맥락으로 넘긴다.
 *  - 인계문은 **파일**로 두고 후임에게는 **한 줄**만 보낸다 — 여러 줄을 TUI에 보내면 첫 줄바꿈에서 조기 전송될 수 있다.
 *  - 준비 판정은 **화면**으로 한다: `terminal create --command` → 화면에 Claude 입력 줄(`❯`)과 상태줄이 뜰 때까지
 *    `terminal read --screen` 폴링(준비 전 입력은 유실된다). `terminal wait --for tui-idle`은 Claude가 뜨기 전 빈 화면에서도
 *    satisfied라 쓰지 않는다.
 *  - 후임이 실제로 어떤 모델로 떴는지 배너로 대조하고, 다르면 보내지 않는다.
 *  - 전송은 Orca 영수증(`accepted`)으로 확정하고, 불분명하면 같은 요청 ID로 멱등 재전송한다. 그래도 불확실하면 다시 보내지
 *    않는다 — 중복 인계(코디네이터 둘)가 인계 실패보다 나쁘다.
 *
 * 사용:
 *   인계:  node scripts/orca/session-rollover.mjs --worktree <코디네이터 체크아웃 절대 경로> --brief-file <인계문.md>
 *            --title "<프로젝트> 코디네이터 Epic <N> #<k>" --chain <n>/<max> --model <코디네이터 모델 ID> [--effort medium]
 *            [--run-id <Orca Run ID>] [--unattended] [--skip-permissions] [--agent-cmd "<직접 지정>"] [--stop-name <이름>] [--wait-ms 90000]
 *            [--no-predecessor] [--dry-run]
 *   정리:  node scripts/orca/session-rollover.mjs --close-predecessor <terminal handle> [--wait-ms 1800000]
 *            — 후임이 시작 직후 **백그라운드로** 부른다. 앞 탭 화면에 작업 표시가 없는 상태가 15초 간격 두 번일 때만 닫는다.
 *
 *   --unattended    무인 진행(orca-rules §4.2): templates/orca-unattended-system-prompt.md를 첫 요청부터 시스템 프롬프트에
 *                   붙이고, 인계 줄에 무인 진행을 적는다. 권한 모드는 바꾸지 않는다.
 *   --skip-permissions 후임을 `--dangerously-skip-permissions`로 띄운다. **따로 고른다** — 무인 진행에서 권한 확인 창이
 *                   뜨면 아무도 답하지 않아 멈추므로 필요할 수 있지만, hook(위험 명령 차단)은 돌아도 push·merge·외부 발송의
 *                   승인 범위는 검사하지 않는다. 대안은 Claude Code 설정의 허용 목록(permissions.allow)을 좁게 두는 것.
 *   --chain         실제 인계에는 필수(1 이상의 정수 n/max). 시험(--dry-run)만 생략할 수 있다.
 *   --run-id        후임이 `orca orchestration run-use --id <id>`로 같은 Run에 붙도록 인계 줄에 넣는다.
 *   --no-predecessor 사람과의 대화 탭·시험에서 띄울 때 — 후임이 이 탭을 「앞 세션」으로 닫지 않게 한다.
 *   --dry-run       탭을 열고 준비·모델을 확인한 뒤 인계문 대신 계산 문제를 보내 답(ROLLOVER-5555)을 보고 탭을 닫는다.
 *   --stop-name     멈춤 파일 STOP-<이름>의 이름. 기본은 저장소 폴더 이름(워크트리면 원본 저장소 이름).
 *
 * 기록: <worktree>/state/orca/rollover.jsonl(state/orca/는 .gitignore 대상) — 단계마다 한 줄(created → send → sent).
 * 종료 코드: 0 인계 완료 / 1 인자 오류 / 4 체인 상한 / 5 같은 제목의 탭 또는 같은 인계문의 후임이 이미 열려 있음
 *            / 6 후임 TUI 준비 안 됨(인계문 미전송, 탭은 남김)·정리 모드에서 앞 탭이 끝나지 않음 / 7 전송 확정 실패
 *            / 8 Orca CLI 실패 / 9 후임 모델이 기대와 다름(탭 닫음) / 10 멈춤 파일 / 11 Claude 사용량 멈춤(가드를 켠 경우만)
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { claudeUsage } from "./claude-usage.mjs";
import { stopFile } from "./limits.mjs";

// ── 판정 함수(시험 대상) ───────────────────────────────────────────────────────────

/**
 * 입력 줄(`❯`)과 하단 상태줄이 둘 다 보여야 준비다. 상태줄 문구는 권한 모드마다 다르다(Claude Code 2.1.287부터 기본이
 * auto mode — 「⏵⏵ auto mode on」). 모드 이름이 늘어도 잡도록 공통 표시 `⏵⏵`도 본다.
 */
export const READY = (s) => /^❯/m.test(s) && /⏵⏵|bypass permissions|for shortcuts|accept edits|plan mode|auto mode/i.test(s);

/** 작업 중 표시: 도구 실행·스피너, 백그라운드 에이전트·셸, 에이전트 목록의 진행 중 줄. */
export const BUSY = /esc to interrupt|Running…|Waiting for \d+ background|still running|· \d+ shells?\b|^\s*◯ /m;
export const predecessorDone = (s) => /^❯/m.test(s) && !BUSY.test(s);

/** 모델 인자(별칭 sonnet 또는 ID claude-sonnet-5-5)에서 배너와 대조할 기대값(「sonnet」·「sonnet 5.5」). */
export function expectModelOf(model) {
  const id = model.toLowerCase();
  const fam = ["opus", "sonnet", "fable", "haiku"].find((x) => id.includes(x)) ?? id;
  const ver = /(\d+)(?:[-.](\d+))?/.exec(id.slice(id.indexOf(fam) + fam.length));
  return ver ? `${fam} ${ver[1]}${ver[2] ? `.${ver[2]}` : ""}` : fam;
}

/** 배너 모델(「Sonnet 5.5 (1M context)」)이 기대와 맞나. 버전은 경계까지 본다(「opus 5」 기대에 「Opus 5.5」는 다르다). */
export function modelMatches(banner, expect) {
  const m = banner.toLowerCase().trim();
  if (!m.startsWith(expect)) return false;
  return !/^[.\d]/.test(m.slice(expect.length));
}

export function bannerModel(screen) {
  return (/\b((?:Opus|Sonnet|Fable|Haiku)[^\n·]*?)\s*(?:·|with |$)/m.exec(screen)?.[1] ?? "").trim() || null;
}

/** "n/max" → {n,max}; 형식이 틀리거나 1 미만·안전한 정수 밖이면 null. */
export function parseChain(s) {
  const m = /^(\d+)\/(\d+)$/.exec(s ?? "");
  if (!m) return null;
  const n = Number(m[1]);
  const max = Number(m[2]);
  return Number.isSafeInteger(n) && Number.isSafeInteger(max) && n >= 1 && max >= 1 ? { n, max } : null;
}

/**
 * 후임 화면에서 인계 줄의 상태: submitted(입력 줄 위에 있다) / typed(입력란에만) / fresh(새 세션 배너만, 받은 흔적 없음)
 * / uncertain(판정 불가 — 다시 보내지 않는다).
 */
export function briefState(screen, marker) {
  const lines = screen.split("\n");
  let prompt = -1;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    if (/^❯/.test(lines[i])) {
      prompt = i;
      break;
    }
  }
  const hits = lines.map((l, i) => (l.includes(marker) ? i : -1)).filter((i) => i >= 0);
  if (hits.some((i) => prompt < 0 || i < prompt)) return "submitted";
  if (hits.length) return "typed";
  const submittedPrompt = lines.some((l, i) => i < prompt && /^❯\s+\S/.test(l));
  if (/Claude Code v\d/.test(screen) && !/⎿/.test(screen) && !submittedPrompt) return "fresh";
  return "uncertain";
}

/** 후임에게 보낼 한 줄. */
export function handoffLine({ relBrief, unattended, runId, predecessor }) {
  let s = `Orca 코디네이터로 Epic 작업을 이어서 한다 — 인계문 ${relBrief} 를 먼저 끝까지 읽고 그대로 따른다(AGENTS.md의 Orca 개발 루틴, docs/agents/orca-rules.md §11).`;
  if (runId) s += ` 먼저 \`orca orchestration run-use --id ${runId}\`로 같은 Run에 붙는다.`;
  if (unattended) s += " 무인 진행이다 — 질문으로 턴을 끝내지 말고 orca-rules §4.2대로 추천안을 적용해 owner-digest에 남긴다.";
  if (predecessor) s += ` 앞 코디네이터 탭 ${predecessor}는 인계문 확인 뒤 \`node scripts/orca/session-rollover.mjs --close-predecessor ${predecessor}\`를 백그라운드로 실행해 닫는다.`;
  return s;
}

// ── 실행 ────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const a = { worktree: null, briefFile: null, title: null, chain: null, agentCmd: null, model: null, effort: "medium", runId: null, unattended: false, stopName: null, waitMs: 90_000, waitMsSet: false, dryRun: false, noPredecessor: false, closePredecessor: null };
  const valued = { "--worktree": "worktree", "--brief-file": "briefFile", "--title": "title", "--chain": "chain", "--agent-cmd": "agentCmd", "--model": "model", "--effort": "effort", "--run-id": "runId", "--stop-name": "stopName", "--close-predecessor": "closePredecessor" };
  for (let i = 0; i < argv.length; i += 1) {
    const k = argv[i];
    if (valued[k]) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Error(`${k}에 값이 없다`);
      a[valued[k]] = v;
      i += 1;
    } else if (k === "--wait-ms") {
      a.waitMs = Number(argv[++i]);
      if (!Number.isFinite(a.waitMs) || a.waitMs <= 0) throw new Error("--wait-ms는 양수");
      a.waitMsSet = true;
    } else if (k === "--unattended") a.unattended = true;
    else if (k === "--skip-permissions") a.skipPermissions = true;
    else if (k === "--no-predecessor") a.noPredecessor = true;
    else if (k === "--dry-run") a.dryRun = true;
    else throw new Error(`알 수 없는 인자: ${k}`);
  }
  return a;
}

function orca(args) {
  const r = spawnSync("orca", [...args, "--json"], { encoding: "utf8", maxBuffer: 1 << 26, windowsHide: true });
  let json = null;
  try {
    json = JSON.parse(r.stdout ?? "");
  } catch {}
  return { status: r.status, json, text: `${r.stdout ?? ""}`, stderr: r.stderr ?? "" };
}

function findHandle(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (typeof obj.handle === "string" && obj.handle.startsWith("term_")) return obj.handle;
  for (const v of Object.values(obj)) {
    const h = findHandle(v);
    if (h) return h;
  }
  return null;
}

function hasTrue(obj, key) {
  if (!obj || typeof obj !== "object") return false;
  if (obj[key] === true) return true;
  return Object.values(obj).some((v) => hasTrue(v, key));
}

/** 터미널 목록을 훑는다. 목록 조회가 실패했거나 응답이 객체가 아니면 false(호출자는 「없다」로 보면 안 된다). */
function walkTerminals(fn) {
  const r = orca(["terminal", "list"]);
  if (r.status !== 0 || !r.json || typeof r.json !== "object" || r.json.ok === false) return false;
  const walk = (o) => {
    if (!o || typeof o !== "object") return;
    if (typeof o.handle === "string" && o.handle.startsWith("term_")) fn(o);
    for (const v of Object.values(o)) walk(v);
  };
  walk(r.json);
  return true;
}

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function screenTail(handle) {
  const r = orca(["terminal", "read", "--terminal", handle, "--screen"]);
  const tail = r.json?.result?.terminal?.tail;
  return Array.isArray(tail) ? tail.join("\n") : r.text;
}

function waitScreen(handle, ms, test) {
  const until = Date.now() + ms;
  while (Date.now() < until) {
    const s = screenTail(handle);
    if (test(s)) return s;
    sleep(2000);
  }
  return null;
}

function repoName(worktree) {
  const r = spawnSync("git", ["-C", worktree, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8", windowsHide: true });
  const common = r.status === 0 ? r.stdout.trim() : "";
  return common ? basename(dirname(common)) : basename(worktree);
}

function closePredecessor(a) {
  const h = a.closePredecessor;
  if (h === process.env.ORCA_TERMINAL_HANDLE) {
    console.error("자기 자신의 탭은 닫지 않는다.");
    return 1;
  }
  // 「끝났다」는 tui-idle로 판정하지 않는다 — 명령을 실행 중인 세션도 idle로 잡힌다. 턴이 끝난 뒤에도 백그라운드 셸·에이전트가
  // 돌 수 있다. 입력 줄이 보이고 작업 표시가 하나도 없는 화면이 15초 간격으로 두 번 연속일 때만 닫는다.
  const waitMs = a.waitMsSet ? a.waitMs : 30 * 60_000;
  const until = Date.now() + waitMs;
  let quiet = 0;
  let last = "";
  while (Date.now() < until && quiet < 2) {
    last = screenTail(h);
    quiet = predecessorDone(last) ? quiet + 1 : 0;
    if (quiet < 2) sleep(15_000);
  }
  if (quiet < 2) {
    console.log(`[rollover] 앞 탭 ${h}가 ${Math.round(waitMs / 60_000)}분 안에 끝나지 않았다(마지막 작업 표시: ${BUSY.exec(last)?.[0] ?? "판정 불가"}) — 닫지 않는다.`);
    return 6;
  }
  const r = orca(["terminal", "close", "--terminal", h]);
  console.log(r.status === 0 ? `[rollover] 앞 탭 ${h}를 닫았다.` : `[rollover] 닫기 실패: ${r.text.slice(0, 200)}`);
  return r.status === 0 ? 0 : 8;
}

function handoff(a) {
  if (!a.worktree || !a.briefFile || !a.title || !a.model) {
    console.error("필수: --worktree <경로> --brief-file <파일> --title <탭 제목> --model <코디네이터 모델 ID>");
    return 1;
  }
  a.worktree = resolve(a.worktree);
  a.briefFile = resolve(a.briefFile);
  if (!existsSync(a.briefFile) || readFileSync(a.briefFile, "utf8").trim() === "") {
    console.error(`인계문이 없거나 비었다: ${a.briefFile}`);
    return 1;
  }
  // 시험(--dry-run)은 인계문 대신 계산 문제를 보내므로 규칙 파일이 없어도 된다.
  if (!a.dryRun && !existsSync(join(a.worktree, "docs", "agents", "orca-rules.md"))) {
    console.error(`후임이 읽을 규칙(docs/agents/orca-rules.md)이 그 체크아웃에 없다: ${a.worktree}`);
    return 1;
  }
  // 체인 상한은 폭주를 막는 장치라 실제 인계에는 필수다(시험은 생략 가능).
  const chain = a.chain ? parseChain(a.chain) : null;
  if ((a.chain && !chain) || (!a.dryRun && !chain)) {
    console.error("--chain n/max가 필요하다(1 이상의 정수) — 실제 인계는 체인 상한 없이 하지 않는다");
    return 1;
  }
  if (chain && chain.n > chain.max) {
    console.log(`[rollover] 인계 체인 상한 도달(${a.chain}) — 인계하지 않는다. 보고하고 멈춘다.`);
    return 4;
  }
  const stopName = a.stopName ?? repoName(a.worktree);
  // 멈춤 파일·사용량은 탭을 만들기 전과 **첫 전송 직전**에 두 번 본다(준비를 기다리는 동안 생길 수 있다).
  const gate = () => {
    if (a.dryRun) return 0;
    const stop = stopFile(stopName);
    if (stop) {
      console.log(`[rollover] 멈춤 파일이 있다(${stop}) — 인계하지 않는다. 파일을 지우고 「이어서 하기」로 재개한다.`);
      return 10;
    }
    const cu = claudeUsage();
    if (cu.verdict === "stop") {
      console.log(`[rollover] Claude 사용량 멈춤(${cu.usedPercent ?? "?"}% / 한도 ${cu.stopAt ?? "?"}% — ${cu.why}) — 인계하지 않는다. ~/.orchestrator/limits.json을 고치거나 올리고, 또는 초기화 뒤 재개한다.`);
      return 11;
    }
    if (cu.verdict === "unknown") console.log(`[rollover] Claude 사용량 미확인(${cu.why}) — 직전 판정이 stop이 아니어서 인계한다. 인계문·보고에 적는다.`);
    return 0;
  };
  const g0 = gate();
  if (g0) return g0;

  const unattendedPrompt = join(a.worktree, "templates", "orca-unattended-system-prompt.md");
  if (!a.agentCmd) {
    const parts = ["claude"];
    // 권한 확인 생략은 따로 고른다 — 무인 진행과 묶지 않는다(hook은 돌지만 push·merge 승인 범위는 검사하지 않는다).
    if (a.skipPermissions) parts.push("--dangerously-skip-permissions");
    parts.push("--model", a.model, "--effort", a.effort);
    if (a.unattended && existsSync(unattendedPrompt)) parts.push("--append-system-prompt-file", `"${unattendedPrompt}"`);
    a.agentCmd = parts.join(" ");
  }
  const expect = expectModelOf(a.model);

  const logDir = join(a.worktree, "state", "orca");
  const logFile = join(logDir, "rollover.jsonl");
  const log = (event, extra) => {
    mkdirSync(logDir, { recursive: true });
    appendFileSync(logFile, `${JSON.stringify({ at: new Date().toISOString(), event, brief: a.briefFile, title: a.title, chain: a.chain, dryRun: a.dryRun, ...extra })}\n`);
  };
  // 중복 판정은 제목만으로 못 한다 — Claude가 뜨면서 탭 제목을 바꾼다. 같은 인계문으로 이미 띄운 후임이 열려 있는지도 본다.
  const open = new Set();
  const sameTitle = [];
  // 목록을 못 읽으면 「열린 후임이 없다」로 보지 않는다 — 중복 코디네이터가 인계 실패보다 나쁘다.
  if (
    !walkTerminals((t) => {
      open.add(t.handle);
      if (t.title === a.title) sameTitle.push(t.handle);
    })
  ) {
    console.log("[rollover] Orca 터미널 목록을 읽지 못했다 — 열린 후임을 확인할 수 없어 인계하지 않는다.");
    return 8;
  }
  const prior = existsSync(logFile)
    ? readFileSync(logFile, "utf8")
        .split(/\r?\n/)
        .filter(Boolean)
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter((r) => r && !r.dryRun && r.brief === a.briefFile && open.has(r.successor))
    : [];
  const sentTo = prior.filter((r) => r.event === "sent" && r.accepted).map((r) => r.successor);
  // dry-run은 실작업 후임 탭을 재사용하지 않는다(계산 문제를 실작업 탭에 보내고 닫는 사고를 막는다).
  const unsent = a.dryRun ? [] : prior.filter((r) => r.event === "created" && !sentTo.includes(r.successor)).map((r) => r.successor);
  const dup = [...new Set([...sameTitle.filter((h) => !unsent.includes(h)), ...sentTo])];
  if (dup.length) {
    console.log(`[rollover] 같은 제목의 탭 또는 같은 인계문을 받은 후임이 이미 열려 있다(${dup.join(", ")}) — 다시 띄우지 않는다.`);
    return 5;
  }

  const predecessor = a.noPredecessor ? null : (process.env.ORCA_TERMINAL_HANDLE ?? null);
  let handle = unsent.at(-1) ?? null;
  let createdNow = false;
  if (handle) console.log(`[rollover] 인계문을 아직 받지 못한 후임 탭 ${handle}이 열려 있다 — 그 탭에 이어 보낸다.`);
  else {
    const created = orca(["terminal", "create", "--worktree", `path:${a.worktree}`, "--title", a.title, "--command", a.agentCmd]);
    handle = findHandle(created.json);
    if (!handle) {
      const again = [];
      walkTerminals((t) => t.title === a.title && again.push(t.handle));
      handle = again[0] ?? null;
    }
    if (!handle) {
      const hint = /selector_not_found/.test(created.text) ? " — 이 체크아웃이 Orca에 등록된 저장소·워크트리가 아니다(코디네이터가 도는 Orca 체크아웃을 --worktree로 준다)" : "";
      console.error(`[rollover] 후임 탭을 만들지 못했다${hint}: ${created.text.slice(0, 300)} ${created.stderr.slice(0, 200)}`);
      return 8;
    }
    createdNow = true;
    log("created", { worktree: a.worktree, predecessor, successor: handle, agentCmd: a.agentCmd });
  }

  const relBrief = relative(a.worktree, a.briefFile).split("\\").join("/");
  const marker = `인계문 ${relBrief}`;
  const send = (text, retryId) => {
    const args = ["terminal", "send", "--terminal", handle, "--text", text, "--enter", "--wait-submit", "60"];
    if (retryId) args.push("--retry-request", retryId);
    const r = orca(args);
    const p = r.json?.result?.send?.prompt ?? {};
    return { accepted: hasTrue(r.json, "accepted"), requestId: p.requestId ?? r.json?.result?.mutation?.requestId ?? null, replayed: r.json?.result?.mutation?.replayed === true, stages: p.stages ?? [], text: r.text };
  };

  const attempted = prior.filter((r) => r.successor === handle && (r.event === "send-attempted" || r.event === "send-result"));
  if (attempted.length) {
    // 앞선 실행이 이 탭에 보내려 했다 — 새로 보내기 전에 결과부터 확정한다.
    const last = [...attempted].reverse().find((r) => r.requestId && r.line) ?? null;
    if (last) {
      const r = send(last.line, last.requestId);
      log("send-result", { successor: handle, line: last.line, requestId: last.requestId, accepted: r.accepted, replayed: r.replayed, via: "retry-request" });
      if (r.accepted) {
        log("sent", { successor: handle, accepted: true, via: "retry-request" });
        console.log(`[rollover] 앞선 전송을 같은 요청 ID로 확정했다 — 후임 ${handle}.`);
        return 0;
      }
    }
    const st = briefState(screenTail(handle), marker);
    if (st === "submitted") {
      log("sent", { successor: handle, accepted: true, via: "screen-submitted" });
      console.log(`[rollover] 후임 ${handle} 화면에 제출된 인계 줄이 있다 — 다시 보내지 않는다.`);
      return 0;
    }
    if (st === "typed") {
      const r = orca(["terminal", "send", "--terminal", handle, "--enter"]);
      log("sent", { successor: handle, accepted: hasTrue(r.json, "accepted"), via: "enter-only" });
      return hasTrue(r.json, "accepted") ? 0 : 7;
    }
    if (st !== "fresh" || attempted.some((r) => r.event === "send-attempted")) {
      log("uncertain", { successor: handle });
      console.log(`[rollover] 후임 ${handle}이 인계를 받았는지 확정할 수 없다 — 중복을 피하려고 다시 보내지 않는다. 보고에 남기고 멈춘다.`);
      return 7;
    }
  }

  const ready = waitScreen(handle, a.waitMs, READY);
  if (!ready) {
    console.log(`[rollover] 후임 ${handle}의 TUI가 준비되지 않았다 — 인계문을 보내지 않는다(준비 전 입력은 유실). 탭은 남겨 둔다.`);
    return 6;
  }
  const model = bannerModel(ready);
  if (!model || !modelMatches(model, expect)) {
    log("model-mismatch", { successor: handle, model, expect });
    console.log(`[rollover] 후임 ${handle}의 모델이 기대(${expect})와 다르다: ${model ?? "(배너에서 못 읽음)"} — 보내지 않고 탭을 닫는다.`);
    orca(["terminal", "close", "--terminal", handle]);
    return 9;
  }
  // 준비를 기다리는 동안 멈춤 파일·사용량 멈춤이 생겼을 수 있다 — 첫 전송 직전에 다시 본다. 아직 아무것도 보내지
  // 않았으므로, 이번 실행이 만든 탭이면 닫고 끝낸다(남겨 두면 다음 실행이 「미전송 후임」으로 이어 보낸다).
  const g1 = gate();
  if (g1) {
    log("gated", { successor: handle, code: g1 });
    if (createdNow) orca(["terminal", "close", "--terminal", handle]);
    return g1;
  }
  // 시험 문장은 기대 답을 글자로 담지 않는다 — 담으면 입력 에코만으로 화면이 일치해 거짓 성공이 된다.
  const line = a.dryRun
    ? "인계 시험이다. 아무 도구도 쓰지 말고, 1234 더하기 4321의 값을 N이라 할 때 ROLLOVER-N 형식의 한 줄만 답하라."
    : handoffLine({ relBrief, unattended: a.unattended, runId: a.runId, predecessor });
  log("send-attempted", { successor: handle, line });
  let res = send(line, null);
  log("send-result", { successor: handle, line, requestId: res.requestId, accepted: res.accepted, stages: res.stages });
  if (!res.accepted && res.requestId) {
    sleep(3000);
    res = send(line, res.requestId);
    log("send-result", { successor: handle, line, requestId: res.requestId, accepted: res.accepted, replayed: res.replayed, via: "retry-request" });
  }
  let accepted = res.accepted;
  if (!accepted && !a.dryRun) {
    sleep(3000);
    if (briefState(screenTail(handle), marker) === "submitted") accepted = true;
  }
  log("sent", { worktree: a.worktree, predecessor, successor: handle, model, accepted, stages: res.stages });
  if (!accepted) {
    console.log(`[rollover] 전송 영수증이 accepted가 아니다: ${res.text.slice(0, 300)}`);
    return 7;
  }
  console.log(`[rollover] 인계 완료 — 후임 ${handle} (${a.title})${a.chain ? ` 체인 ${a.chain}` : ""}. 이 세션은 턴을 끝낸다(탭은 후임이 닫는다).`);
  if (a.dryRun) {
    const answered = waitScreen(handle, a.waitMs, (s) => /ROLLOVER-5555/.test(s));
    console.log(`[rollover] 시험 응답: ${answered ? "ROLLOVER-5555 확인" : "없음(시간 초과)"}`);
    orca(["terminal", "close", "--terminal", handle]);
    return answered ? 0 : 7;
  }
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let a;
  try {
    a = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`[rollover] ${e.message}`);
    process.exit(1);
  }
  process.exit(a.closePredecessor ? closePredecessor(a) : handoff(a));
}
