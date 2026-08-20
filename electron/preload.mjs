import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  saveSettings: (s) => ipcRenderer.invoke("settings:save", s),
  listClones: () => ipcRenderer.invoke("clones:list"),
  saveClones: (list) => ipcRenderer.invoke("clones:save", list),
  pickAudio: () => ipcRenderer.invoke("dialog:pickAudio"),
  readAudio: (p) => ipcRenderer.invoke("file:readAudio", p),
  cloneVoice: (opts) => ipcRenderer.invoke("dashscope:clone", opts),
  synthesize: (opts) => ipcRenderer.invoke("dashscope:tts", opts),
  saveAudio: (opts) => ipcRenderer.invoke("audio:save", opts),
  openExternal: (url) => ipcRenderer.invoke("shell:open", url),
});