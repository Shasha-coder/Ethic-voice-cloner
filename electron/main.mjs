import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// Electron's ESM loader cannot provide named exports from the "electron"
// module, so it must be required through the CJS interop path.
const require = createRequire(import.meta.url);
const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const ffmpegPath = require("ffmpeg-static");

// Avoid white/flashing windows on some Windows GPUs.
app.disableHardwareAcceleration();

const DASH_BASE = "https://dashscope-intl.aliyuncs.com";
const ENROLL_URL = `${DASH_BASE}/api/v1/services/audio/tts/customization`;
const GENERATE_URL = `${DASH_BASE}/api/v1/services/aigc/multimodal-generation/generation`;

const DATA = () => path.join(app.getPath("userData"), "ethic-voice-cloner");
const file = (name) => path.join(DATA(), name);

const DEFAULT_SETTINGS = {
  apiKey: "",
  ttsModel: "qwen3.5-omni-plus-realtime",
  cloneTargetModel: "qwen3.5-omni-flash-realtime",
};

function readJson(name, fallback) {
  try {
    const p = file(name);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(name, value) {
  fs.mkdirSync(DATA(), { recursive: true });
  fs.writeFileSync(file(name), JSON.stringify(value, null, 2), "utf8");
}

async function dashRequest(url, apiKey, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(120000),
  });
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.message || data.code)) ||
      `DashScope returned HTTP ${res.status}`;
    throw new Error(String(msg));
  }
  return data;
}

function detectAudioFormat(buf) {
  if (buf.length > 3 && buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return "wav";
  if (buf.length > 2 && ((buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) || (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33))) return "mp3";
  if (buf.length > 3 && buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return "ogg";
  if (buf.length > 3 && buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43) return "flac";
  return "mp3";
}

/** Convert any audio bytes to the requested format with ffmpeg. */
async function convert(buf, toFormat) {
  if (!ffmpegPath) throw new Error("ffmpeg binary not found");
  const tmpIn = path.join(app.getPath("temp"), `evc-in-${Date.now()}.${detectAudioFormat(buf)}`);
  const tmpOut = path.join(app.getPath("temp"), `evc-out-${Date.now()}.${toFormat}`);
  fs.writeFileSync(tmpIn, buf);
  await new Promise((resolve, reject) => {
    const { spawn } = require("node:child_process");
    const args =
      toFormat === "wav"
        ? ["-y", "-i", tmpIn, "-ar", "44100", "-ac", "2", "-c:a", "pcm_s16le", tmpOut]
        : ["-y", "-i", tmpIn, "-codec:a", "libmp3lame", "-b:a", "192k", tmpOut];
    const child = spawn(ffmpegPath, args);
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}`))));
  });
  const out = fs.readFileSync(tmpOut);
  fs.rmSync(tmpIn, { force: true });
  fs.rmSync(tmpOut, { force: true });
  return out;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1120,
    height: 760,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: "#09090b",
    title: "Ethic Voice Cloner",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, "preload.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL;
  const distFile = path.join(import.meta.dirname, "..", "dist", "index.html");
  if (devUrl) win.loadURL(devUrl);
  else win.loadFile(distFile);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ---------- Settings ----------
ipcMain.handle("settings:get", () => ({ ...DEFAULT_SETTINGS, ...readJson("settings.json", {}) }));
ipcMain.handle("settings:save", (_e, s) => {
  writeJson("settings.json", { ...DEFAULT_SETTINGS, ...(s || {}) });
  return true;
});

// ---------- Clones library ----------
ipcMain.handle("clones:list", () => readJson("clones.json", []));
ipcMain.handle("clones:save", (_e, list) => {
  writeJson("clones.json", Array.isArray(list) ? list : []);
  return true;
});

// ---------- Dialogs ----------
ipcMain.handle("dialog:pickAudio", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choose a voice sample",
    properties: ["openFile"],
    filters: [
      { name: "Audio", extensions: ["mp3", "wav", "m4a", "ogg", "aac", "flac"] },
    ],
  });
  if (canceled || !filePaths.length) return null;
  return filePaths[0];
});

ipcMain.handle("file:readAudio", async (_e, p) => {
  const buf = fs.readFileSync(p);
  const ext = path.extname(p).slice(1).toLowerCase();
  const mime =
    ext === "wav" ? "audio/wav" : ext === "m4a" ? "audio/mp4" : ext === "ogg" ? "audio/ogg" : `audio/${ext}`;
  return { base64: buf.toString("base64"), mime, name: path.basename(p) };
});

// ---------- Voice cloning (Qwen enrollment) ----------
ipcMain.handle("dashscope:clone", async (_e, { apiKey, name, audioBase64, mime, targetModel }) => {
  if (!apiKey) throw new Error("Set your DashScope API key in Settings first.");
  if (!name || !audioBase64) throw new Error("A voice name and audio sample are required.");
  const data = await dashRequest(ENROLL_URL, apiKey, {
    model: "qwen-voice-enrollment",
    input: {
      action: "create",
      target_model: targetModel || DEFAULT_SETTINGS.cloneTargetModel,
      preferred_name: name,
      audio: { data: `data:${mime || "audio/mp3"};base64,${audioBase64}` },
    },
  });
  const output = data?.output || {};
  const voiceId = output.voice_id || output.voice || output.id;
  if (!voiceId) throw new Error("DashScope accepted the sample but returned no voice id.");
  return {
    voiceId: String(voiceId),
    displayName: output.display_name || output.name || name,
  };
});

// ---------- Text to speech (Qwen Omni) ----------
ipcMain.handle("dashscope:tts", async (_e, { apiKey, text, voiceId, model }) => {
  if (!apiKey) throw new Error("Set your DashScope API key in Settings first.");
  if (!text || !voiceId) throw new Error("Text and a voice are required.");
  const data = await dashRequest(GENERATE_URL, apiKey, {
    model: model || DEFAULT_SETTINGS.ttsModel,
    input: { text, voice: voiceId },
  });
  const audio = data?.output?.audio;
  const b64 = audio?.data || audio;
  if (!b64) throw new Error("DashScope returned no audio.");
  const buf = Buffer.from(String(b64), "base64");
  return { base64: buf.toString("base64"), format: detectAudioFormat(buf) };
});

// ---------- Save audio (mp3 / wav) ----------
ipcMain.handle("audio:save", async (_e, { base64, format, suggestedName }) => {
  const buf = Buffer.from(String(base64), "base64");
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save audio",
    defaultPath: suggestedName || `voice-${Date.now()}.${format}`,
    filters: [{ name: format.toUpperCase(), extensions: [format] }],
  });
  if (canceled || !filePath) return { canceled: true };
  const out = format === "wav" || format === "mp3" ? await convert(buf, format) : buf;
  fs.writeFileSync(filePath, out);
  return { canceled: false, path: filePath };
});

ipcMain.handle("shell:open", (_e, url) => shell.openExternal(String(url)));