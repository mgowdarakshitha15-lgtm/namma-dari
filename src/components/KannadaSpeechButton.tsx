import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface KannadaSpeechButtonProps {
  kannadaText: string;
  transliteration: string;
}

export const KannadaSpeechButton: React.FC<KannadaSpeechButtonProps> = ({
  kannadaText,
  transliteration,
}) => {
  const [kannadaVoice, setKannadaVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [voiceChecked, setVoiceChecked] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setVoiceChecked(true);
      setKannadaVoice(null);
      return;
    }

    const findKannadaVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      const matched = voices.find(
        (v) =>
          v.lang.toLowerCase().startsWith('kn') ||
          v.name.toLowerCase().includes('kannada')
      );
      setKannadaVoice(matched || null);
      setVoiceChecked(true);
    };

    findKannadaVoice();
    window.speechSynthesis.addEventListener('voiceschanged', findKannadaVoice);

    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', findKannadaVoice);
    };
  }, []);

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatusMessage('Kannada voice not available on this device.');
      return;
    }

    if (!kannadaVoice) {
      setStatusMessage('Kannada voice not available on this device.');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setStatusMessage('Stopped audio playback.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(kannadaText);
    utterance.voice = kannadaVoice;
    utterance.lang = kannadaVoice.lang || 'kn-IN';
    utterance.rate = 0.9;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStatusMessage(`Playing Kannada phrase: ${transliteration}`);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStatusMessage('');
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setStatusMessage('Kannada voice playback could not start on this device.');
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="inline-flex flex-col items-end">
      {voiceChecked && !kannadaVoice ? (
        <span
          className="text-xs text-[#8E0F18] bg-[#FFF0C7] border border-[#F4B400] px-2.5 py-1 rounded-xs font-medium"
          role="status"
        >
          Kannada voice not available on this device.
        </span>
      ) : (
        <button
          type="button"
          onClick={handleSpeak}
          aria-label={`Listen to Kannada phrase: ${transliteration}`}
          aria-pressed={isSpeaking}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xs border transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isSpeaking
              ? 'bg-[#B3141F] text-[#FFF6DC] border-[#F4B400]'
              : 'bg-[#FFF0C7] text-[#8E0F18] border-[#F4B400] hover:bg-[#B3141F] hover:text-[#FFF6DC]'
          }`}
        >
          {isSpeaking ? (
            <>
              <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Speaking… (Stop)</span>
            </>
          ) : (
            <>
              <Volume2 className="w-3.5 h-3.5 text-[#B3141F]" aria-hidden="true" />
              <span>Listen</span>
            </>
          )}
        </button>
      )}
      {statusMessage && (
        <span className="sr-only" role="status" aria-live="polite">
          {statusMessage}
        </span>
      )}
    </div>
  );
};
