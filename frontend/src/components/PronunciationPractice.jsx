import { useState } from 'react'
import { speak, stopSpeaking, listenOnce, diffWords, isTTSSupported, isSTTSupported } from '../lib/speech'

const SAMPLES = [
  'The results demonstrate a statistically significant correlation between the two variables.',
  'Further research is required to confirm these preliminary findings.',
  'The proposed method outperforms the baseline across all evaluation metrics.',
]

export default function PronunciationPractice() {
  const [sentence, setSentence] = useState(SAMPLES[0])
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [diff, setDiff] = useState(null)
  const [error, setError] = useState('')

  function handleListenSample() {
    speak(sentence, { lang: 'en-US', rate: 0.9 })
  }

  async function handleRecord() {
    setError('')
    setDiff(null)
    setTranscript('')
    setListening(true)
    try {
      const result = await listenOnce({
        lang: 'en-US',
        onInterim: (text) => setTranscript(text),
      })
      setTranscript(result)
      setDiff(diffWords(sentence, result))
    } catch (err) {
      setError(err.message)
    } finally {
      setListening(false)
    }
  }

  const score = diff ? Math.round((diff.filter((d) => d.matched).length / diff.length) * 100) : null

  return (
    <div className="max-w-read mx-auto px-6 py-8">
      <h1 className="font-serif text-2xl mb-1">Luyện nói &amp; nghe</h1>
      <p className="text-sm text-inkSoft mb-6">
        Nghe câu mẫu, sau đó đọc lại để AI so khớp từng từ. Đây là so khớp từ nhận diện được, không
        phải chấm điểm phát âm theo âm vị — dùng để luyện phản xạ nói theo, không thay thế giáo viên.
      </p>

      {!isTTSSupported() && (
        <p className="text-sm text-bad mb-4">Trình duyệt này không hỗ trợ đọc văn bản (TTS).</p>
      )}
      {!isSTTSupported() && (
        <p className="text-sm text-bad mb-4">
          Trình duyệt này không hỗ trợ nhận diện giọng nói — hãy thử Chrome hoặc Edge.
        </p>
      )}

      <div className="mb-4">
        <label className="text-xs font-medium text-inkSoft block mb-2">Chọn câu mẫu</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {SAMPLES.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                setSentence(s)
                setDiff(null)
                setTranscript('')
              }}
              className={`text-xs px-3 py-1 rounded-md ${
                sentence === s ? 'bg-accent text-white' : 'bg-panel text-inkSoft'
              }`}
            >
              Mẫu {i + 1}
            </button>
          ))}
        </div>
        <textarea
          value={sentence}
          onChange={(e) => {
            setSentence(e.target.value)
            setDiff(null)
          }}
          rows={3}
          className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={handleListenSample}
          disabled={!isTTSSupported()}
          className="px-4 py-2 bg-panel text-sm rounded-md hover:bg-accentSoft disabled:opacity-50"
        >
          🔊 Nghe mẫu
        </button>
        <button
          onClick={handleRecord}
          disabled={!isSTTSupported() || listening}
          className="px-4 py-2 bg-accent text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {listening ? '🎙️ Đang nghe…' : '🎙️ Đọc theo'}
        </button>
      </div>

      {error && <p className="text-sm text-bad mb-4">{error}</p>}

      {transcript && (
        <div className="mb-4">
          <p className="text-xs font-medium text-inkSoft mb-1">Bạn đã nói</p>
          <p className="text-sm border border-line rounded-md p-3 bg-white">{transcript}</p>
        </div>
      )}

      {diff && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-inkSoft">Kết quả so khớp</p>
            <span className="text-sm font-semibold text-accent">{score}%</span>
          </div>
          <p className="text-lg leading-relaxed border border-line rounded-md p-4 bg-white font-serif">
            {diff.map((d, i) => (
              <span
                key={i}
                className={d.matched ? 'text-good' : 'text-bad underline decoration-wavy'}
              >
                {d.word}{' '}
              </span>
            ))}
          </p>
        </div>
      )}
    </div>
  )
}
