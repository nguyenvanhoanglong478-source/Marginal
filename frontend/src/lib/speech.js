// Thin wrapper around the browser's native Web Speech API.
// Text-to-speech (SpeechSynthesis) and speech-to-text (SpeechRecognition)
// both run entirely client-side — free, and no backend call needed.
// Support varies by browser: Chrome/Edge have both; Safari has TTS but
// limited STT; Firefox has neither reliably.

export function isTTSSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function isSTTSupported() {
  return (
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)
  )
}

let currentUtterance = null

export function speak(text, { lang = 'en-US', rate = 1 } = {}) {
  if (!isTTSSupported()) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang
  utter.rate = rate
  currentUtterance = utter
  window.speechSynthesis.speak(utter)
  return utter
}

export function stopSpeaking() {
  if (isTTSSupported()) window.speechSynthesis.cancel()
  currentUtterance = null
}

export function isSpeaking() {
  return isTTSSupported() && window.speechSynthesis.speaking
}

// Starts listening once and resolves with the recognized transcript.
// onInterim(text) is called with partial results as the user speaks.
export function listenOnce({ lang = 'en-US', onInterim } = {}) {
  return new Promise((resolve, reject) => {
    if (!isSTTSupported()) {
      reject(new Error('Trình duyệt này không hỗ trợ nhận diện giọng nói.'))
      return
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new Recognition()
    recognition.lang = lang
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    let finalTranscript = ''

    recognition.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interim += transcript
        }
      }
      if (onInterim) onInterim(interim || finalTranscript)
    }

    recognition.onerror = (event) => reject(new Error(event.error || 'Lỗi nhận diện giọng nói'))
    recognition.onend = () => resolve(finalTranscript.trim())

    recognition.start()
  })
}

// Simple word-level diff between what was expected and what was said,
// used to highlight matches/mismatches for pronunciation practice.
// This compares recognized words, not actual phoneme-level accuracy —
// a real accuracy score would need a dedicated pronunciation-scoring API.
export function diffWords(expected, actual) {
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[.,!?;:"'’“”]/g, '')
      .split(/\s+/)
      .filter(Boolean)

  const expWords = norm(expected)
  const actWords = norm(actual)

  return expWords.map((word, i) => ({
    word,
    matched: actWords[i] === word,
  }))
}
