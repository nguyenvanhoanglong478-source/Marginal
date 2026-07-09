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

// ---- Voice selection ----------------------------------------------------
const VOICE_STORAGE_KEY = 'marginal:voiceName'

export function getVoices() {
  return isTTSSupported() ? window.speechSynthesis.getVoices() : []
}

export function onVoicesReady(callback) {
  if (!isTTSSupported()) return
  const existing = window.speechSynthesis.getVoices()
  if (existing.length) callback(existing)
  window.speechSynthesis.onvoiceschanged = () => callback(window.speechSynthesis.getVoices())
}

export function getSavedVoiceName() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem(VOICE_STORAGE_KEY) || '' : ''
}

export function setSavedVoiceName(name) {
  if (typeof localStorage === 'undefined') return
  if (name) localStorage.setItem(VOICE_STORAGE_KEY, name)
  else localStorage.removeItem(VOICE_STORAGE_KEY)
}

function voiceQualityScore(voice) {
  const name = voice.name.toLowerCase()
  let score = 0
  if (name.includes('online')) score += 3
  if (name.includes('natural')) score += 3
  if (name.includes('neural')) score += 3
  if (name.includes('google')) score += 2
  if (voice.localService === false) score += 1
  return score
}

function pickBestVoice(lang) {
  const prefix = lang.slice(0, 2).toLowerCase()
  const candidates = getVoices().filter((v) => v.lang.toLowerCase().startsWith(prefix))
  if (!candidates.length) return null
  return [...candidates].sort((a, b) => voiceQualityScore(b) - voiceQualityScore(a))[0]
}

function getActiveVoice(lang) {
  const savedName = getSavedVoiceName()
  if (savedName) {
    const match = getVoices().find((v) => v.name === savedName)
    if (match) return match
  }
  return pickBestVoice(lang)
}

let currentUtterance = null

export function speak(text, { lang = 'en-US', rate = 1 } = {}) {
  if (!isTTSSupported()) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  const voice = getActiveVoice(lang)
  if (voice) {
    utter.voice = voice
    utter.lang = voice.lang
  } else {
    utter.lang = lang
  }
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