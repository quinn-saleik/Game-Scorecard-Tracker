import { useState } from "react";
import { parseSpokenNumber } from "../data/voiceNumber";

const SpeechRecognition =
  typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

// Tap-to-speak a score. Feature-detected — renders nothing on browsers
// without Web Speech support (notably Firefox), so it's always safe to drop
// next to a number field. `onResult` receives a string, same as a text
// input's onChange value, so callers can wire it in identically to typing.
export default function VoiceInputButton({ onResult, disabled }) {
  const [listening, setListening] = useState(false);

  if (!SpeechRecognition) return null;

  function start() {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setListening(true);
    recognition.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      const num = parseSpokenNumber(transcript);
      if (num !== null) onResult(String(num));
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognition.start();
  }

  return (
    <button
      type="button"
      className="btn small"
      onClick={start}
      disabled={disabled || listening}
      title="Speak a number"
    >
      {listening ? "🎤…" : "🎤"}
    </button>
  );
}
