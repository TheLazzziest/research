import type { TtsPort, TtsResult } from "../domain/ports.ts";

// Adapter: ElevenLabs text-to-speech. Returns audio bytes for voice narration.
export class ElevenLabsTts implements TtsPort {
  constructor(
    private readonly apiKey: string,
    private readonly voiceId: string,
    private readonly model: string,
  ) {}

  async synthesize(text: string): Promise<TtsResult> {
    if (!this.apiKey) throw new Error("ELEVENLABS_API_KEY is not set");
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "content-type": "application/json",
        accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: this.model }),
    });
    if (!res.ok) throw new Error(`elevenlabs ${res.status}`);
    return {
      audio: new Uint8Array(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") ?? "audio/mpeg",
    };
  }
}
