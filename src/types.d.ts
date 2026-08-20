export type Settings = {
  apiKey: string;
  ttsModel: string;
  cloneTargetModel: string;
};

export type VoiceClone = {
  id: string;
  name: string;
  voiceId: string;
  model: string;
  createdAt: string;
};

declare global {
  interface Window {
    api: {
      getSettings(): Promise<Settings>;
      saveSettings(s: Settings): Promise<boolean>;
      listClones(): Promise<VoiceClone[]>;
      saveClones(list: VoiceClone[]): Promise<boolean>;
      pickAudio(): Promise<string | null>;
      readAudio(p: string): Promise<{ base64: string; mime: string; name: string }>;
      cloneVoice(opts: {
        apiKey: string;
        name: string;
        audioBase64: string;
        mime: string;
        targetModel: string;
      }): Promise<{ voiceId: string; displayName: string }>;
      synthesize(opts: {
        apiKey: string;
        text: string;
        voiceId: string;
        model: string;
      }): Promise<{ base64: string; format: string }>;
      saveAudio(opts: {
        base64: string;
        format: "mp3" | "wav";
        suggestedName: string;
      }): Promise<{ canceled: boolean; path?: string }>;
      openExternal(url: string): Promise<void>;
    };
  }
}

export {};