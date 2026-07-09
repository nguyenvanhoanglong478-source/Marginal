import { useState, useEffect } from 'react'
import { getWorkerUrl, setWorkerUrl } from '../lib/api'
import {
  isTTSSupported,
  onVoicesReady,
  getSavedVoiceName,
  setSavedVoiceName,
  speak,
  stopSpeaking,
} from '../lib/speech'

const PREVIEW_TEXT =
  'This is a preview of the selected voice, used for reading articles aloud.'

export default function Settings() {
  const [url, setUrl] = useState(getWorkerUrl())
  const [saved, setSaved] = useState(false)

  const [voices, setVoices] = useState([])
  const [voiceName, setVoiceName] = useState(getSavedVoiceName())

  useEffect(() => {
    onVoicesReady((list) => {
      const english = list.filter((v) => v.lang.toLowerCase().startsWith('en'))
      setVoices(english.length ? english : list)
    })
    return () => stopSpeaking()
  }, [])

  function handleSave(e) {
    e.preventDefault()
    setWorkerUrl(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function handleVoiceChange(e) {
    const name = e.target.value
    setVoiceName(name)
    setSavedVoiceName(name)
  }

  function handlePreview() {
    speak(PREVIEW_TEXT, { lang: 'en-US', rate: 0.95 })
  }

  return (
    <div className="max-w-read mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl mb-1">Cài đặt</h1>
      <p className="text-sm text-inkSoft mb-8">
        Marginal cần một backend nhỏ (Cloudflare Worker) để gọi AI mà không lộ API key. Xem file{' '}
        <code className="font-mono text-xs bg-panel px-1 py-0.5 rounded">worker/README.md</code>{' '}
        để triển khai, sau đó dán URL Worker vào đây.
      </p>

      <form onSubmit={handleSave} className="space-y-3">
        <label className="block text-sm font-medium">Địa chỉ Worker</label>
        <input
          type="url"
          required
          placeholder="https://marginal-api.ten-cua-ban.workers.dev"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-accent text-white text-sm rounded-md hover:opacity-90"
        >
          Lưu
        </button>
        {saved && <span className="ml-3 text-sm text-good">Đã lưu.</span>}
      </form>

      <div className="mt-10 border-t border-line pt-6">
        <h2 className="font-serif text-lg mb-1">Giọng đọc</h2>
        <p className="text-sm text-inkSoft mb-4">
          Áp dụng cho tính năng nghe (đọc toàn bài, nghe câu mẫu ở Luyện nói). Chất lượng giọng phụ
          thuộc vào trình duyệt/hệ điều hành — Edge và Chrome thường có sẵn vài giọng "Online
          (Natural)" nghe tự nhiên hơn hẳn giọng mặc định.
        </p>

        {!isTTSSupported() && (
          <p className="text-sm text-bad">Trình duyệt này không hỗ trợ đọc văn bản (TTS).</p>
        )}

        {isTTSSupported() && voices.length === 0 && (
          <p className="text-sm text-inkSoft italic">Đang tải danh sách giọng đọc…</p>
        )}

        {isTTSSupported() && voices.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={voiceName}
              onChange={handleVoiceChange}
              className="text-sm border border-line rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-accent max-w-full"
            >
              <option value="">Tự động (mặc định trình duyệt chọn)</option>
              {voices.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} ({v.lang}){v.localService === false ? ' — online' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handlePreview}
              className="px-3 py-2 bg-panel text-sm rounded-md hover:bg-accentSoft font-medium"
            >
              🔊 Nghe thử
            </button>
          </div>
        )}
      </div>

      <div className="mt-10 text-sm text-inkSoft space-y-2 border-t border-line pt-6">
        <p className="font-medium text-ink">Ghi chú</p>
        <p>
          URL Worker và giọng đọc đã chọn được lưu trong trình duyệt của bạn (localStorage), không
          gửi lên đâu khác. Nếu bạn dùng máy/trình duyệt khác, cần cài đặt lại ở đây.
        </p>
      </div>
    </div>
  )
}