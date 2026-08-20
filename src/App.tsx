import { useEffect, useRef, useState } from "react";
import { Mic, Settings, Speaker, Upload, Download, Plus, Trash2 } from "lucide-react";
import type { Settings as AppSettings, VoiceClone } from "./types";

const SAMPLE_SECONDS = 30;

export default function App() {
  const [settings, setSettings] = useState<AppSettings>({ apiKey: "", ttsModel: "qwen3.5-omni-plus-realtime", cloneTargetModel: "qwen3.5-omni-flash-realtime" });
  const [clones, setClones] = useState<VoiceClone[]>([]);
  const [tab, setTab] = useState<"clone" | "speak">("clone");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // clone tab
  const [sample, setSample] = useState<{ name: string; base64: string; mime: string } | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloning, setCloning] = useState(false);
  const [cloneError, setCloneError] = useState("");
  const [cloneSuccess, setCloneSuccess] = useState("");

  // speak tab
  const [text, setText] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [ttsBusy, setTtsBusy] = useState(false);
  const [audio, setAudio] = useState<{ base64: string; format: string; url: string } | null>(null);
  const [ttsError, setTtsError] = useState("");

  useEffect(() => {
    window.api.getSettings().then(setSettings);
    window.api.listClones().then(setClones);
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3200);
  }, [toast]);

  async function pickSample() {
    const path = await window.api.pickAudio();
    if (!path) return;
    const info = await window.api.readAudio(path);
    setSample({ name: info.name, base64: info.base64, mime: info.mime });
    setCloneSuccess("");
    setCloneError("");
    if (!cloneName) setCloneName(info.name.replace(/\.[^.]+$/, ""));
  }

  async function clone() {
    setCloneError("");
    setCloneSuccess("");
    if (!settings.apiKey) {
      setSettingsOpen(true);
      return;
    }
    if (!sample) return setCloneError("Choose an audio sample first.");
    const name = cloneName.trim();
    if (!name) return setCloneError("Give the voice a name.");
    setCloning(true);
    try {
      const res = await window.api.cloneVoice({
        apiKey: settings.apiKey,
        name,
        audioBase64: sample.base64,
        mime: sample.mime,
        targetModel: settings.cloneTargetModel,
      });
      const entry: VoiceClone = {
        id: crypto.randomUUID(),
        name: res.displayName || name,
        voiceId: res.voiceId,
        model: settings.cloneTargetModel,
        createdAt: new Date().toISOString(),
      };
      const next = [entry, ...clones];
      setClones(next);
      await window.api.saveClones(next);
      setCloneSuccess(`Voice cloned and saved automatically - ready to use in the Speak tab.`);
      setToast(`Cloned "${entry.name}" and saved to your library`);
      setVoiceId(entry.voiceId);
    } catch (e) {
      setCloneError(e instanceof Error ? e.message : String(e));
    } finally {
      setCloning(false);
    }
  }

  async function generate() {
    setTtsError("");
    setAudio(null);
    if (!settings.apiKey) {
      setSettingsOpen(true);
      return;
    }
    if (!text.trim()) return setTtsError("Write some text first.");
    if (!voiceId) return setTtsError("Choose a cloned voice from the list (clone one first if the list is empty).");
    setTtsBusy(true);
    try {
      const res = await window.api.synthesize({
        apiKey: settings.apiKey,
        text: text.trim(),
        voiceId,
        model: settings.ttsModel,
      });
      const blob = new Blob([Uint8Array.from(atob(res.base64), (c) => c.charCodeAt(0))], {
        type: res.format === "wav" ? "audio/wav" : "audio/mpeg",
      });
      setAudio({ base64: res.base64, format: res.format, url: URL.createObjectURL(blob) });
    } catch (e) {
      setTtsError(e instanceof Error ? e.message : String(e));
    } finally {
      setTtsBusy(false);
    }
  }

  async function save(format: "mp3" | "wav") {
    if (!audio) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const res = await window.api.saveAudio({
      base64: audio.base64,
      format,
      suggestedName: `ethic-voice-${stamp}.${format}`,
    });
    if (!res.canceled && res.path) setToast(`Saved ${format.toUpperCase()} to ${res.path}`);
  }

  function removeClone(id: string) {
    const next = clones.filter((c) => c.id !== id);
    setClones(next);
    window.api.saveClones(next);
    if (voiceId === id) setVoiceId("");
  }

  const selectedVoice = clones.find((c) => c.id === voiceId);

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-dot" />
          <div>
            Ethic Voice Cloner
            <small>Qwen Omni · bring your own API key</small>
          </div>
        </div>
        <button className="icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}>
          <Settings size={17} />
        </button>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === "clone" ? "active" : ""}`} onClick={() => setTab("clone")}>
          <Mic size={15} /> Clone a voice
        </button>
        <button className={`tab ${tab === "speak" ? "active" : ""}`} onClick={() => setTab("speak")}>
          <Speaker size={15} /> Speak
        </button>
      </nav>

      <main className="content">
        {tab === "clone" && (
          <div className="card">
            <h2>Clone a voice</h2>
            <p className="sub">
              Upload a clean sample ({SAMPLE_SECONDS}s of clear speech is plenty). The clone is saved to your
              library automatically and ready for text-to-speech.
            </p>

            <button type="button" className={`dropzone ${sample ? "has-file" : ""}`} onClick={() => void pickSample()}>
              <Upload size={20} />
              {sample ? <span>{sample.name}</span> : <span>Choose an audio sample</span>}
              <small>MP3 · WAV · M4A · OGG · AAC · FLAC</small>
            </button>

            <div className="field" style={{ marginTop: 16 }}>
              <label>Voice name</label>
              <input type="text" value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="e.g. My presentation voice" />
            </div>

            <button className="btn btn-primary" disabled={cloning || !sample} onClick={() => void clone()}>
              {cloning ? "Cloning…" : "Clone & save automatically"}
            </button>
            {cloneError && <p className="error">{cloneError}</p>}
            {cloneSuccess && <p className="success">{cloneSuccess}</p>}
          </div>
        )}

        {tab === "speak" && (
          <>
            <div className="card">
              <h2>Text to speech</h2>
              <p className="sub">Pick one of your saved clones and generate speech in the best available quality.</p>

              <div className="field">
                <label>Voice</label>
                <select value={voiceId} onChange={(e) => setVoiceId(e.target.value)}>
                  <option value="">Choose a cloned voice…</option>
                  {clones.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="hint">
                  {clones.length === 0
                    ? "No voices yet - clone one in the Clone tab and it will appear here instantly."
                    : `${clones.length} voice${clones.length > 1 ? "s" : ""} in your library.`}
                </p>
              </div>

              <div className="field">
                <label>Text</label>
                <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type what your cloned voice should say…" />
              </div>

              <button className="btn btn-primary" disabled={ttsBusy} onClick={() => void generate()}>
                {ttsBusy ? "Generating…" : "Generate speech"}
              </button>
              {ttsError && <p className="error">{ttsError}</p>}
            </div>

            {audio && (
              <div className="card player">
                <h2>Preview & download</h2>
                <audio src={audio.url} controls autoPlay />
                <div className="downloads">
                  <button className="btn btn-ghost" onClick={() => void save("mp3")}>
                    <Download size={15} /> Download MP3
                  </button>
                  <button className="btn btn-ghost" onClick={() => void save("wav")}>
                    <Download size={15} /> Download WAV
                  </button>
                </div>
                {selectedVoice && <p className="hint">Spoken by {selectedVoice.name} · {audio.format.toUpperCase()}</p>}
              </div>
            )}
          </>
        )}
      </main>

      <footer style={{ padding: "0 22px 16px" }}>
        <div className="card" style={{ padding: 16 }}>
          <h2 style={{ fontSize: 13 }}>Voice library</h2>
          {clones.length === 0 ? (
            <p className="empty">No cloned voices yet.</p>
          ) : (
            clones.map((c) => (
              <div className="voice-row" key={c.id}>
                <div>
                  <b>{c.name}</b>
                  <span> · {c.voiceId.slice(0, 22)}… · {new Date(c.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="voice-actions">
                  <button className="mini-btn" onClick={() => { setTab("speak"); setVoiceId(c.id); }}>Use</button>
                  <button className="mini-btn danger" onClick={() => removeClone(c.id)}><Trash2 size={12} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </footer>

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={async (next) => {
            setSettings(next);
            await window.api.saveSettings(next);
            setToast("Settings saved");
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function SettingsModal({
  settings,
  onClose,
  onSave,
}: {
  settings: AppSettings;
  onClose: () => void;
  onSave: (s: AppSettings) => Promise<void>;
}) {
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof AppSettings) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Settings</h2>
        <p className="sub">
          Bring your own DashScope key. Get one at{" "}
          <span className="link" onClick={() => window.api.openExternal("https://bailian.console.aliyun.com/")}>
            Alibaba Cloud Model Studio
          </span>
          . Your key stays on this device.
        </p>
        <div className="field">
          <label>DashScope API key (Qwen Omni)</label>
          <input type="password" value={form.apiKey} onChange={set("apiKey")} placeholder="sk-…" />
        </div>
        <div className="row">
          <div className="field">
            <label>TTS model</label>
            <input type="text" value={form.ttsModel} onChange={set("ttsModel")} />
          </div>
          <div className="field">
            <label>Clone target model</label>
            <input type="text" value={form.cloneTargetModel} onChange={set("cloneTargetModel")} />
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy} onClick={async () => { setBusy(true); await onSave(form); setBusy(false); onClose(); }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}