import { useState, useRef, useEffect } from 'react'
import { askAboutArticle } from '../lib/api'

export default function ChatPanel({ articleText }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(e) {
    e.preventDefault()
    const question = input.trim()
    if (!question || loading) return

    const nextMessages = [...messages, { role: 'user', content: question }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    setError('')

    try {
      const { answer } = await askAboutArticle(question, articleText, nextMessages)
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pb-2 mb-2 border-b border-line">
        <p className="text-xs text-inkSoft">
          Hỏi thêm về chủ đề, thuật ngữ, hoặc bối cảnh liên quan đến bài đang đọc.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <p className="text-sm text-inkSoft italic">
            Chưa có câu hỏi nào. Thử hỏi: "Thuật ngữ này nghĩa là gì?" hoặc "Có nghiên cứu nào liên
            quan không?"
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`text-sm rounded-lg px-3 py-2 max-w-[92%] ${
              m.role === 'user'
                ? 'bg-accent text-white ml-auto'
                : 'bg-panel text-ink mr-auto'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-sm text-inkSoft">Đang trả lời…</p>}
        {error && <p className="text-sm text-bad">{error}</p>}
      </div>

      <form onSubmit={handleSend} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Đặt câu hỏi…"
          className="flex-1 border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 bg-accent text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50"
        >
          Gửi
        </button>
      </form>
    </div>
  )
}
