// All AI calls go through a small Cloudflare Worker backend so the
// Gemini API key never touches the browser. The Worker's URL is set
// once in Cài đặt (Settings) and stored in localStorage.

const STORAGE_KEY = 'marginal:workerUrl'

export function getWorkerUrl() {
  return localStorage.getItem(STORAGE_KEY) || ''
}

export function setWorkerUrl(url) {
  localStorage.setItem(STORAGE_KEY, url.trim().replace(/\/+$/, ''))
}

async function callApi(path, body) {
  const base = getWorkerUrl()
  if (!base) {
    throw new Error(
      'Chưa cấu hình địa chỉ backend. Vào mục Cài đặt để nhập URL Cloudflare Worker.',
    )
  }
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Lỗi máy chủ (${res.status}): ${text || 'không rõ nguyên nhân'}`)
  }
  return res.json()
}

// Fetches a URL server-side (avoids browser CORS limits) and extracts
// a best-effort main-text version of the article.
export function fetchArticleFromUrl(url) {
  return callApi('/api/fetch-article', { url })
}

// Translates a piece of text (a sentence, paragraph, or full article).
export function translateText(text, targetLang = 'vi') {
  return callApi('/api/translate', { text, targetLang })
}

// Translates a whole article's sentences in as few backend calls as
// possible (chunked only if the article is very long), instead of one
// call per sentence — this is what keeps reading from burning through
// Gemini's free-tier per-minute request limit.
const BATCH_CHUNK_MAX_CHARS = 6000
const BATCH_CHUNK_MAX_SENTENCES = 60

export async function translateSentences(sentences, targetLang = 'vi') {
  const chunks = []
  let current = []
  let currentChars = 0

  for (const sentence of sentences) {
    const wouldOverflow =
      current.length >= BATCH_CHUNK_MAX_SENTENCES ||
      currentChars + sentence.length > BATCH_CHUNK_MAX_CHARS
    if (wouldOverflow && current.length > 0) {
      chunks.push(current)
      current = []
      currentChars = 0
    }
    current.push(sentence)
    currentChars += sentence.length
  }
  if (current.length > 0) chunks.push(current)

  const allTranslations = []
  for (const chunk of chunks) {
    const { translations } = await callApi('/api/translate-batch', { sentences: chunk, targetLang })
    allTranslations.push(...translations)
  }
  return allTranslations
}

// Sends free-form writing for spelling/grammar review.
export function checkWriting(text, language = 'en') {
  return callApi('/api/grammar', { text, language })
}

// Asks a question about the article (or a related topic), with the
// article text passed along as context and a rolling chat history.
export function askAboutArticle(question, articleText, history = []) {
  return callApi('/api/chat', { question, articleText, history })
}
