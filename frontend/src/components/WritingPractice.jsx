import { useState, useMemo } from 'react'
import { checkWriting } from '../lib/api'

const LANGS = [
  { code: 'en', label: 'Tiếng Anh' },
  { code: 'vi', label: 'Tiếng Việt' },
]

// Breaks the original text into plain/flagged segments so each issue's
// exact phrase can be underlined inline, in the order the backend found them.
function buildSegments(text, issues) {
  if (!issues || issues.length === 0) return [{ text, issue: null }]

  const segments = []
  let cursor = 0
  const sorted = [...issues]
    .map((issue) => ({ issue, index: text.indexOf(issue.original, cursor) }))
    .filter((x) => x.index !== -1)
    .sort((a, b) => a.index - b.index)

  for (const { issue, index } of sorted) {
    if (index < cursor) continue
    if (index > cursor) segments.push({ text: text.slice(cursor, index), issue: null })
    segments.push({ text: issue.original, issue })
    cursor = index + issue.original.length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), issue: null })
  return segments
}

export default function WritingPractice() {
  const [language, setLanguage] = useState('en')
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeIssue, setActiveIssue] = useState(null)

  const segments = useMemo(
    () => (result ? buildSegments(text, result.issues) : []),
    [result, text],
  )

  async function handleCheck(e) {
    e.preventDefault()
    if (!text.trim() || loading) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const data = await checkWriting(text, language)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-read mx-auto px-6 py-8">
      <h1 className="font-serif text-2xl mb-1">Luyện viết</h1>
      <p className="text-sm text-inkSoft mb-6">
        Viết một đoạn văn, AI sẽ chỉ ra lỗi chính tả và ngữ pháp kèm giải thích.
      </p>

      <form onSubmit={handleCheck}>
        <div className="flex justify-between items-center mb-2">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="text-xs border border-line rounded-md px-2 py-1 bg-white"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-inkSoft">{text.length} ký tự</span>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          placeholder="Viết vài câu bằng ngôn ngữ bạn đang học…"
          className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-3 px-4 py-2 bg-accent text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'Đang chấm…' : 'Chấm bài'}
        </button>
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
      </form>

      {result && (
        <div className="mt-8 space-y-6">
          <div>
            <p className="text-xs font-medium text-inkSoft mb-2">
              Bài viết của bạn ({result.issues.length} lỗi được tìm thấy)
            </p>
            <div className="prose-read text-base leading-relaxed border border-line rounded-md p-4 bg-white">
              {segments.map((seg, i) =>
                seg.issue ? (
                  <mark
                    key={i}
                    className="correction cursor-pointer"
                    onClick={() => setActiveIssue(seg.issue)}
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                ),
              )}
            </div>
          </div>

          {result.issues.length > 0 && (
            <div>
              <p className="text-xs font-medium text-inkSoft mb-2">Chi tiết lỗi</p>
              <ul className="space-y-2">
                {result.issues.map((issue, i) => (
                  <li
                    key={i}
                    className={`border rounded-md p-3 text-sm ${
                      activeIssue === issue ? 'border-accent bg-accentSoft' : 'border-line bg-white'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 mb-1">
                      <span className="line-through text-bad">{issue.original}</span>
                      <span className="text-inkSoft">→</span>
                      <span className="font-medium text-good">{issue.suggestion}</span>
                      <span className="text-[10px] uppercase tracking-wide text-inkSoft ml-auto">
                        {issue.type}
                      </span>
                    </div>
                    <p className="text-inkSoft">{issue.explanation}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-inkSoft mb-2">Bản đã sửa hoàn chỉnh</p>
            <p className="prose-read border border-line rounded-md p-4 bg-panel">
              {result.corrected}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
