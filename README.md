# Ethic Voice Cloner

A clean, installable **desktop app** for voice cloning and text-to-speech, powered by Alibaba Cloud's Qwen Omni models (DashScope). Clone a voice from any audio sample, keep it in a local library, and generate speech in that voice — then download it as high-quality **MP3** or **WAV**.

**Stack:** Electron · Vite · React · TypeScript · ffmpeg (bundled) · DashScope Qwen Omni API

---

## Features

- **Clone a voice** from an audio sample (MP3, WAV, M4A, OGG, AAC, FLAC)
- **Auto-saved library** — every clone is stored locally and instantly available in a dropdown
- **Text to speech** with any of your cloned voices
- **Download MP3 and WAV** at best quality (44.1 kHz / 16-bit WAV, 192 kbps MP3)
- In-app audio preview before downloading
- Clean, minimal, dark interface (zinc + indigo)
- **Bring your own API key** — your key never leaves your device

## Requirements

- Node.js 18+ and npm
- A DashScope API key (Qwen Omni) — see below
- Windows for the one-click installer (dev mode works on macOS/Linux too)

## Get your API key (Qwen3.5-Omni-Plus)

The app uses Alibaba Cloud's DashScope API. **You provide your own key.**

1. Create an account at [Alibaba Cloud Model Studio](https://bailian.console.aliyun.com/) (DashScope).
2. Create an API key (format `sk-...`).
3. In the app, open **Settings** (gear icon) and paste the key.
4. Defaults (editable in Settings):
   - TTS model: `qwen3.5-omni-plus-realtime`
   - Clone target model: `qwen3.5-omni-flash-realtime`

The key is stored only on your device (in the app's user data folder).

## Run on desktop (development)

```bash
npm install
npm run dev
```

This starts the Vite renderer and launches Electron. The window opens with the Clone tab — pick a sample, name the voice, and clone. The voice appears in the library and in the Speak dropdown instantly.

## Build a release (installable .exe)

```bash
npm run dist
```

electron-builder produces a Windows installer (NSIS) in the `release/` folder: **Ethic Voice Cloner Setup 1.0.0.exe**. Run it to install the app with a desktop shortcut. No Node.js needed on the target machine.

To run the built app without installing:

```bash
npm run build
npm start
```

## How it works

- **Cloning** calls DashScope's voice-enrollment endpoint (`qwen-voice-enrollment`) with the sample encoded as base64 and a preferred name. The returned voice id is saved into your local library automatically.
- **Speech** calls the multimodal generation endpoint with your text + chosen voice id. The returned audio is decoded, detected (MP3/WAV), and converted with the bundled ffmpeg for both download formats.
- All API calls run in the Electron main process, so there are no CORS issues.

## Project layout

```
electron/          # Main process + preload bridge (settings, library, API, ffmpeg)
src/               # React renderer (clone, speak, settings, library)
legacy/            # Original Python/Tkinter prototype (reference, keys removed)
samples/           # Put your own voice samples here (git-ignored)
dist/              # Vite build output
release/           # electron-builder installers
```

## Notes & ethics

- Only clone voices you have permission to use.
- The app never uploads your samples anywhere except to the DashScope API you configured.
- The legacy Python scripts are included as reference only and have had all API keys stripped.