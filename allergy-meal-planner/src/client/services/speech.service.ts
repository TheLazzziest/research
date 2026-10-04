export interface ListenHandlers {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export interface ListenSession {
  stop: () => void;
}

// Port: microphone (STT) + speech (TTS) behind one abstraction.
export interface SpeechService {
  canListen(): boolean;
  canSpeak(): boolean;
  listen(handlers: ListenHandlers): ListenSession | null;
  speak(text: string): void;
  stopSpeaking(): void;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionEventLike {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}

// Adapter: Web Speech API (SpeechSynthesis in every modern browser; SpeechRecognition
// in Chrome/Edge). Firefox can type and be answered aloud; only mic input is limited.
export class BrowserSpeechService implements SpeechService {
  private voice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (this.synth) {
      this.pickVoice();
      this.synth.onvoiceschanged = () => this.pickVoice();
    }
  }

  private get synth(): SpeechSynthesis | undefined {
    return typeof window !== "undefined" ? window.speechSynthesis : undefined;
  }

  private get Recognition(): (new () => SpeechRecognitionLike) | undefined {
    const w = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    return w.SpeechRecognition ?? w.webkitSpeechRecognition;
  }

  private pickVoice(): void {
    if (!this.synth) return;
    const voices = this.synth.getVoices();
    this.voice =
      voices.find((v) => /^en[-_]US/i.test(v.lang)) ?? voices.find((v) => /^en/i.test(v.lang)) ?? voices[0] ?? null;
  }

  canListen(): boolean {
    return this.Recognition !== undefined;
  }

  canSpeak(): boolean {
    return this.synth !== undefined;
  }

  listen(handlers: ListenHandlers): ListenSession | null {
    const Recognition = this.Recognition;
    if (!Recognition) return null;
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]!;
        if (result.isFinal) finalText += result[0].transcript;
        else interim += result[0].transcript;
      }
      if (finalText) handlers.onFinal(finalText);
      else if (interim) handlers.onPartial?.(interim);
    };
    recognition.onerror = (event) => handlers.onError?.(event.error);
    recognition.onend = () => handlers.onEnd?.();
    recognition.start();
    return { stop: () => recognition.stop() };
  }

  speak(text: string): void {
    if (!this.synth || !text) return;
    this.synth.cancel();
    for (const part of this.chunk(text)) {
      const utterance = new SpeechSynthesisUtterance(part);
      if (this.voice) utterance.voice = this.voice;
      utterance.lang = this.voice?.lang ?? "en-US";
      this.synth.speak(utterance);
    }
  }

  stopSpeaking(): void {
    this.synth?.cancel();
  }

  private chunk(text: string, max = 220): string[] {
    const sentences = text.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/);
    const out: string[] = [];
    let current = "";
    for (const sentence of sentences) {
      if ((current + " " + sentence).trim().length > max && current) {
        out.push(current.trim());
        current = sentence;
      } else {
        current = `${current} ${sentence}`.trim();
      }
    }
    if (current) out.push(current.trim());
    return out.length > 0 ? out : [text];
  }
}
