import { useState, useMemo, useEffect, useRef } from 'react'
import { fetchArticleFromUrl, translateSentences } from '../lib/api'
import { splitParagraphs, splitSentences } from '../lib/text'
import { speak, stopSpeaking, isTTSSupported, isSpeaking } from '../lib/speech'
import ChatPanel from './ChatPanel'

const LANGS = [
  { code: 'vi', label: 'Tiếng Việt' },
  { code: 'en', label: 'English' },
]

export default function ArticleReader() {
  const [inputMode, setInputMode] = useState('paste') // 'paste' | 'url'
  const [rawInput, setRawInput] = useState('')
  const [articleTitle, setArticleTitle] = useState('')
  const [articleText, setArticleText] = useState('')
  const [loadingArticle, setLoadingArticle] = useState(false)
  const [articleError, setArticleError] = useState('')

  const [targetLang, setTargetLang] = useState('vi')
  const [activeId, setActiveId] = useState(null)
  const [clickedIds, setClickedIds] = useState([]) // order in which sentences were opened
  const [translations, setTranslations] = useState(null) // id -> translation, once batch call resolves
  const [translating, setTranslating] = useState(false)
  const [translateError, setTranslateError] = useState('')
  const [railTab, setRailTab] = useState('notes') // 'notes' | 'chat'
  const [speaking, setSpeaking] = useState(false)
  const translateRunRef = useRef(0) // guards against a stale in-flight call overwriting a newer one

  const paragraphs = useMemo(() => {
    if (!articleText) return []
    return splitParagraphs(articleText).map((p) => splitSentences(p))
  }, [articleText])

  // Flat list of every sentence with a stable id, used for the one-shot
  // batch translation call.
  const flatSentences = useMemo(() => {
    const flat = []
    paragraphs.forEach((sentences, pIdx) => {
      sentences.forEach((sentence, sIdx) => {
        flat.push({ id: `p${pIdx}-s${sIdx}`, sentence })
      })
    })
    return flat
  }, [paragraphs])

  // A new article, or a different target language, invalidates any
  // translations we already fetched.
  useEffect(() => {
    setTranslations(null)
    setTranslateError('')
    setClickedIds([])
    setActiveId(null)
  }, [articleText, targetLang])

  async function ensureTranslations() {
    if (translations || translating || flatSentences.length === 0) return
    const runId = ++translateRunRef.current
    setTranslating(true)
    setTranslateError('')
    try {
      const list = await translateSentences(
        flatSentences.map((f) => f.sentence),
        targetLang,
      )
      if (runId !== translateRunRef.current) return // article/language changed mid-flight
      const map = {}
      flatSentences.forEach((f, i) => {
        map[f.id] = list[i]
      })
      setTranslations(map)
    } catch (err) {
      if (runId !== translateRunRef.current) return
      setTranslateError(err.message)
    } finally {
      if (runId === translateRunRef.current) setTranslating(false)
    }
  }

  async function handleLoadArticle(e) {
    e.preventDefault()
    setArticleError('')
    if (!rawInput.trim()) return

    if (inputMode === 'paste') {
      setArticleTitle('')
      setArticleText(rawInput.trim())
      return
    }

    setLoadingArticle(true)
    try {
      const { title, text } = await fetchArticleFromUrl(rawInput.trim())
      setArticleTitle(title || '')
      setArticleText(text)
    } catch (err) {
      setArticleError(err.message)
    } finally {
      setLoadingArticle(false)
    }
  }

  function handleSentenceClick(id) {
    setActiveId(id)
    setRailTab('notes')
    setClickedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    ensureTranslations() // no-op if already loaded/loading; one call covers the whole article
  }

  function handleToggleListen() {
    if (isSpeaking()) {
      stopSpeaking()
      setSpeaking(false)
      return
    }
    const utter = speak(articleText, { lang: targetLang === 'vi' ? 'en-US' : 'en-US', rate: 0.95 })
    setSpeaking(true)
    if (utter) utter.onend = () => setSpeaking(false)
  }

  // Look up a sentence's text by id, for rendering the margin rail.
  const sentenceById = useMemo(() => {
    const map = {}
    flatSentences.forEach((f) => {
      map[f.id] = f.sentence
    })
    return map
  }, [flatSentences])

  const orderedClickedIds = [...clickedIds].reverse()

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
      {/* Reading column */}
      <div>
        {!articleText && (
          <div className="max-w-read mx-auto">
            <h1 className="font-serif text-2xl mb-1">Dán bài báo để bắt đầu</h1>
            <p className="text-sm text-inkSoft mb-6">
              Dán trực tiếp văn bản, hoặc dán URL để Marginal tự tải nội dung bài báo.
            </p>

            <div className="flex gap-1 mb-3">
              {['paste', 'url'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setInputMode(mode)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium ${
                    inputMode === mode
                      ? 'bg-accent text-white'
                      : 'bg-panel text-inkSoft hover:text-ink'
                  }`}
                >
                  {mode === 'paste' ? 'Dán văn bản' : 'Dán URL'}
                </button>
              ))}
            </div>

            <form onSubmit={handleLoadArticle}>
              {inputMode === 'paste' ? (
                <textarea
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  rows={10}
                  placeholder="Dán nội dung bài báo khoa học vào đây…"
                  className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              ) : (
                <input
                  type="url"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  placeholder="https://www.nature.com/articles/…"
                  className="w-full border border-line rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              )}
              <button
                type="submit"
                disabled={loadingArticle}
                className="mt-3 px-4 py-2 bg-accent text-white text-sm rounded-md hover:opacity-90 disabled:opacity-50"
              >
                {loadingArticle ? 'Đang tải…' : 'Mở bài báo'}
              </button>
              {articleError && <p className="mt-2 text-sm text-bad">{articleError}</p>}
              {inputMode === 'url' && (
                <p className="mt-2 text-xs text-inkSoft">
                  Một số trang chặn tải nội dung tự động (paywall, chống bot) — nếu lỗi, hãy dán
                  trực tiếp văn bản thay vào.
                </p>
              )}
            </form>
          </div>
        )}

        {articleText && (
          <div className="max-w-read mx-auto">
            <div className="flex items-center justify-between mb-4 gap-3">
              <button
                onClick={() => {
                  setArticleText('')
                  setRawInput('')
                  stopSpeaking()
                }}
                className="text-xs text-inkSoft hover:text-ink"
              >
                ← Bài khác
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="text-xs border border-line rounded-md px-2 py-1 bg-white"
                >
                  {LANGS.map((l) => (
                    <option key={l.code} value={l.code}>
                      Dịch sang {l.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={ensureTranslations}
                  disabled={translating || !!translations}
                  className="text-xs px-3 py-1 rounded-md bg-panel hover:bg-accentSoft font-medium disabled:opacity-50"
                >
                  {translating ? 'Đang dịch…' : translations ? '✓ Đã dịch toàn bài' : '📖 Dịch toàn bài'}
                </button>
                {isTTSSupported() && (
                  <button
                    onClick={handleToggleListen}
                    className="text-xs px-3 py-1 rounded-md bg-panel hover:bg-accentSoft font-medium"
                  >
                    {speaking ? '⏹ Dừng' : '🔊 Nghe toàn bài'}
                  </button>
                )}
              </div>
            </div>

            {articleTitle && <h1 className="font-serif text-2xl mb-4">{articleTitle}</h1>}

            <div className="prose-read">
              {paragraphs.map((sentences, pIdx) => (
                <p key={pIdx} className="mb-5">
                  {sentences.map((sentence, sIdx) => {
                    const id = `p${pIdx}-s${sIdx}`
                    return (
                      <span
                        key={id}
                        onClick={() => handleSentenceClick(id)}
                        className={`sentence ${activeId === id ? 'is-active' : ''}`}
                      >
                        {sentence}{' '}
                      </span>
                    )
                  })}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Margin rail */}
      {articleText && (
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="flex gap-1 mb-3">
            {[
              { id: 'notes', label: 'Chú thích' },
              { id: 'chat', label: 'Hỏi AI' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setRailTab(t.id)}
                className={`px-3 py-1.5 text-xs rounded-md font-medium ${
                  railTab === t.id ? 'bg-accent text-white' : 'bg-panel text-inkSoft'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {railTab === 'notes' && (
            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
              {orderedClickedIds.length === 0 && (
                <p className="text-xs text-inkSoft italic px-1">
                  Nhấn vào một câu trong bài (hoặc "Dịch toàn bài" ở trên) để xem bản dịch ở đây.
                </p>
              )}
              {translateError && <p className="text-sm text-bad px-1">{translateError}</p>}
              {orderedClickedIds.map((id) => (
                <div key={id} className="margin-note rounded-md p-3">
                  <p className="text-xs text-inkSoft mb-1 line-clamp-2">{sentenceById[id]}</p>
                  {translating && !translations && <p className="text-sm text-inkSoft">Đang dịch…</p>}
                  {translations && translations[id] && (
                    <p className="text-sm font-medium">{translations[id]}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {railTab === 'chat' && (
            <div className="h-[70vh]">
              <ChatPanel articleText={articleText} />
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
