import { useState } from 'react'
import { getWorkerUrl, setWorkerUrl } from '../lib/api'

export default function Settings() {
  const [url, setUrl] = useState(getWorkerUrl())
  const [saved, setSaved] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    setWorkerUrl(url)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
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

      <div className="mt-10 text-sm text-inkSoft space-y-2 border-t border-line pt-6">
        <p className="font-medium text-ink">Ghi chú</p>
        <p>
          URL này được lưu trong trình duyệt của bạn (localStorage), không gửi lên đâu khác.
          Nếu bạn dùng máy/trình duyệt khác, cần nhập lại URL ở đây.
        </p>
      </div>
    </div>
  )
}
