#!/usr/bin/env node
// chatclip: copy a fenced code block Claude already wrote in this chat, read
// from the session transcript, so it never has to be retyped.
//
//   chatclip                 list recent blocks (newest = 1)
//   chatclip 1               print block 1 (the newest)
//   chatclip -g "word"       print the newest block containing "word"
//   chatclip 2 -o out.md     write block 2 to a file instead
//   chatclip 1 -o            write to the temp folder's chatclip.txt, print path
//   chatclip 1 --add a.md    append a.md (repeatable), e.g. a style
//   chatclip -u              blocks from the user's messages instead;
//                            a message without fences is one block
//   --session <id>           another session (default: current)
//   --all                    list every block, not just the last 15

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
let index = null, grep = null, out = null, all = false, user = false;
const extras = [];
let session = process.env.CLAUDE_CODE_SESSION_ID;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "-g" || a === "--grep") grep = args[++i];
  else if (a === "-o" || a === "--out") {
    out = args[i + 1] && !args[i + 1].startsWith("-") ? args[++i]
      : path.join(os.tmpdir(), "chatclip.txt");
  }
  else if (a === "--add") extras.push(args[++i]);
  else if (a === "-u" || a === "--user") user = true;
  else if (a === "-h" || a === "--help") {
    const src = fs.readFileSync(new URL(import.meta.url), "utf8");
    const lines = src.split("\n").slice(1);
    const end = lines.findIndex((l) => !l.startsWith("//"));
    console.log(lines.slice(0, end).join("\n").replace(/^\/\/ ?/gm, ""));
    process.exit(0);
  }
  else if (a === "--session") session = args[++i];
  else if (a === "--all") all = true;
  else if (/^\d+$/.test(a)) index = Number(a);
  else fail(`unknown argument: ${a}`);
}
if (!session) fail("no session: CLAUDE_CODE_SESSION_ID is unset, pass --session <id>");

const transcript = findTranscript(session);
const blocks = readBlocks(transcript);
if (blocks.length === 0) fail("no code blocks in this chat yet");

if (index === null && grep === null) {
  const shown = all ? blocks : blocks.slice(-15);
  for (let i = shown.length - 1; i >= 0; i--) {
    const b = shown[i];
    const n = blocks.length - blocks.indexOf(b);
    const first = b.code.split("\n").find((l) => l.trim()) ?? "";
    const lines = b.code.split("\n").length;
    console.log(`${n}\t${b.lang || "-"}\t${lines} lines\t${first.slice(0, 70)}`);
  }
  process.exit(0);
}

let block;
if (grep !== null) {
  const needle = grep.toLowerCase();
  block = [...blocks].reverse().find((b) => b.code.toLowerCase().includes(needle));
  if (!block) fail(`no block contains "${grep}"`);
} else {
  block = blocks[blocks.length - index];
  if (!block) fail(`only ${blocks.length} blocks in this chat`);
}

const text = [block.code, ...extras.map((f) => fs.readFileSync(f, "utf8").trim())]
  .join("\n\n") + "\n";
if (out) { fs.writeFileSync(out, text, "utf8"); console.log(out); }
else process.stdout.write(text);

function findTranscript(id) {
  const config = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), ".claude");
  const root = path.join(config, "projects");
  for (const dir of fs.readdirSync(root)) {
    const file = path.join(root, dir, `${id}.jsonl`);
    if (fs.existsSync(file)) return file;
  }
  fail(`transcript for session ${id} not found under ${root}`);
}

// Fenced blocks from the assistant's (or, with -u, the user's) chat text,
// oldest first.
function readBlocks(file) {
  const role = user ? "user" : "assistant";
  const result = [];
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    if (!line.includes(`"${role}"`)) continue;
    let entry;
    try { entry = JSON.parse(line); } catch { continue; }
    if (entry.type !== role || entry.isSidechain || entry.isMeta) continue;
    let content = entry.message?.content;
    if (typeof content === "string") content = [{ type: "text", text: content }];
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part.type !== "text") continue;
      if (!user) { result.push(...parseFences(expandMarkers(part.text, entry.cwd))); continue; }
      const msg = part.text.replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, "").trim();
      if (!msg) continue;
      const fences = parseFences(msg);
      result.push(...(fences.length ? fences : [{ lang: "", code: msg }]));
    }
  }
  return result;
}

// A reply line holding only {{show: <path>}} is drawn by the copy-paste plugin
// as the file's current text; put that text here as a fenced block, a
// relative path read from the folder the reply was written in.
function expandMarkers(text, cwd) {
  let fence = null;
  return text.split("\n").map((line) => {
    if (fence) {
      const close = line.match(/^\s*(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = null;
      return line;
    }
    const open = line.match(/^\s*(`{3,}|~{3,})/);
    if (open) { fence = open[1]; return line; }
    const marker = line.match(/^\s*\{\{show:\s*([^}\n]+?)\s*\}\}\s*$/);
    if (!marker) return line;
    const file = path.resolve(cwd ?? process.cwd(), marker[1]);
    let body;
    try { body = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").trimEnd(); }
    catch { return line; }
    const longest = Math.max(0, ...(body.match(/`+/g) ?? []).map((run) => run.length));
    const tick = "`".repeat(Math.max(3, longest + 1));
    const ext = file.match(/\.([^.]+)$/)?.[1] ?? "";
    return `${tick}${ext}\n${body}\n${tick}`;
  }).join("\n");
}

function parseFences(text) {
  const found = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const open = lines[i].match(/^\s*(`{3,}|~{3,})\s*([^\s`]*)/);
    if (!open) continue;
    const fence = open[1];
    const body = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const close = lines[j].match(/^\s*(`{3,}|~{3,})\s*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) break;
      body.push(lines[j]);
    }
    found.push({ lang: open[2], code: body.join("\n").replace(/\r$/gm, "") });
    i = j;
  }
  return found;
}

function fail(msg) {
  console.error(`chatclip: ${msg}`);
  process.exit(1);
}
