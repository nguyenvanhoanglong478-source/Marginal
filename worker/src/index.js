// Marginal — backend Worker
//
// Purpose: the frontend is a static site (GitHub Pages) with no server of
// its own, so this tiny Worker does two things a static site can't:
//   1. Calls the Gemini API without ever exposing GEMINI_API_KEY to the browser.
//   2. Fetches article URLs server-side, sidestepping browser CORS limits.
//
// Required secret:  GEMINI_API_KEY   (npx wrangler secret put GEMINI_API_KEY)
// Optional var:     GEMINI_MODEL     (defaults to "gemini-2.5-flash")
// Optional var:     ALLOWED_ORIGIN   (defaults to "*")

const MAX_INPUT_CHARS = 30000

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': (env && env.ALLOWED_ORIGIN) || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function jsonResponse(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(env) },
  })
}

function errorResponse(message, env, status = 400) {
  return new Response(message, { status, headers: corsHeaders(env) })
}

// ---- Gemini -----------------------------------------------------------

async function callGemini(env, { systemInstruction, contents, jsonMode = false }) {
  if (!env.GEMINI_API_KEY) {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trên Worker (xem README).')
  }
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash'
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`

  const body = {
    contents,
    ...(systemInstruction
      ? { systemInstruction: { parts: [{ text: systemInstruction }] } }
      : {}),
    generationConfig: jsonMode ? { responseMimeType: 'application/json' } : {},
  }

  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Gemini API lỗi (${res.status}): ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
  if (!text) throw new Error('Gemini không trả về nội dung (có thể do bộ lọc an toàn chặn).')
  return text
}

async function handleTranslate(request, env) {
  const { text, targetLang } = await request.json()
  if (!text || !text.trim()) return errorResponse('Thiếu nội dung cần dịch.', env)

  const langName = targetLang === 'en' ? 'English' : 'Vietnamese'
  const systemInstruction = `You are a precise academic translator. Translate the given text into ${langName}, preserving technical and scientific terminology accurately and keeping an academic register. Return ONLY the translation — no notes, no quotation marks, no preamble.`

  const translation = await callGemini(env, {
    systemInstruction,
    contents: [{ role: 'user', parts: [{ text: text.slice(0, MAX_INPUT_CHARS) }] }],
  })

  return jsonResponse({ translation: translation.trim() }, env)
}

async function handleGrammar(request, env) {
  const { text, language } = await request.json()
  if (!text || !text.trim()) return errorResponse('Thiếu nội dung cần chấm.', env)

  const langName = language === 'vi' ? 'Vietnamese' : 'English'
  const systemInstruction = `You are a ${langName} writing tutor for a Vietnamese student learning the language. Review the student's text for spelling, grammar, and word-choice errors.

Return ONLY valid JSON with this exact shape and nothing else:
{
  "corrected": "the full corrected version of the text",
  "issues": [
    {
      "original": "exact verbatim substring from the student's original text",
      "suggestion": "the corrected version of that substring",
      "explanation": "short explanation IN VIETNAMESE of the error and why the fix is better",
      "type": "spelling|grammar|vocabulary|punctuation"
    }
  ]
}

Rules: "original" must be an exact substring that appears in the student's text (needed to highlight it). Only include real errors — do not invent stylistic nitpicks. If there are no errors, return an empty issues array and set "corrected" equal to the original text.`

  const raw = await callGemini(env, {
    systemInstruction,
    contents: [{ role: 'user', parts: [{ text: text.slice(0, MAX_INPUT_CHARS) }] }],
    jsonMode: true,
  })

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Không đọc được phản hồi từ AI, vui lòng thử lại.')
  }
  return jsonResponse(parsed, env)
}

async function handleChat(request, env) {
  const { question, articleText, history } = await request.json()
  if (!question || !question.trim()) return errorResponse('Thiếu câu hỏi.', env)

  const systemInstruction = `You are a knowledgeable study assistant helping a Vietnamese student understand an academic article they are reading. Answer clearly and concisely, in Vietnamese unless the student writes in English. Use the article text below as context when relevant, and feel free to bring in outside knowledge about the topic when the question goes beyond what the article covers — just be clear when you're doing so.

ARTICLE (may be partial):
"""
${(articleText || '').slice(0, 12000)}
"""`

  const contents = (history || [])
    .slice(-12)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))

  const answer = await callGemini(env, { systemInstruction, contents })
  return jsonResponse({ answer: answer.trim() }, env)
}

// ---- Article extraction ------------------------------------------------

const ENTITY_MAP = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  rsquo: '\u2019', lsquo: '\u2018', rdquo: '\u201D', ldquo: '\u201C',
  mdash: '\u2014', ndash: '\u2013', hellip: '\u2026',
}

function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => (ENTITY_MAP[name] !== undefined ? ENTITY_MAP[name] : m))
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? decodeEntities(m[1]).replace(/\s+/g, ' ').trim() : ''
}

// Runs one HTMLRewriter pass over the HTML, collecting text found under
// `selector`, with paragraph breaks inserted at each matched element's
// closing tag. Cheap to re-run since it's driven from the same in-memory
// HTML string, not a new network request.
async function extractWithSelector(html, selector) {
  const parts = []
  const rewriter = new HTMLRewriter()
    .on('script, style, nav, header, footer, aside, noscript, form, iframe, svg, button', {
      element(el) {
        el.remove()
      },
    })
    .on(selector, {
      element(el) {
        el.onEndTag(() => {
          parts.push('\n\n')
        })
      },
      text(t) {
        parts.push(t.text)
      },
    })

  const res = new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
  const transformed = rewriter.transform(res)
  await transformed.text() // draining the stream is what triggers the handlers above

  return parts
    .join('')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

async function handleFetchArticle(request, env) {
  const { url } = await request.json()
  if (!url) return errorResponse('Thiếu URL.', env)

  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return errorResponse('URL không hợp lệ.', env)
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return errorResponse('URL không hợp lệ.', env)
  }

  const res = await fetch(parsedUrl.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })
  if (!res.ok) {
    return errorResponse(`Không tải được trang (mã ${res.status}).`, env, 502)
  }

  const html = await res.text()
  const title = extractTitle(html)

  // Try progressively broader selectors until we get something substantial.
  let text = await extractWithSelector(html, 'article p')
  if (text.length < 200) text = await extractWithSelector(html, 'main p')
  if (text.length < 200) text = await extractWithSelector(html, 'body p')
  if (text.length < 200) text = await extractWithSelector(html, 'body')

  if (text.length < 50) {
    return errorResponse(
      'Không trích xuất được nội dung bài viết từ trang này (có thể do chặn bot hoặc nội dung tải bằng JavaScript). Hãy thử dán trực tiếp văn bản.',
      env,
      422,
    )
  }

  return jsonResponse({ title, text: decodeEntities(text) }, env)
}

// ---- Router -------------------------------------------------------------

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders(env) })
    }

    const { pathname } = new URL(request.url)

    try {
      if (request.method === 'POST' && pathname === '/api/translate') {
        return await handleTranslate(request, env)
      }
      if (request.method === 'POST' && pathname === '/api/grammar') {
        return await handleGrammar(request, env)
      }
      if (request.method === 'POST' && pathname === '/api/chat') {
        return await handleChat(request, env)
      }
      if (request.method === 'POST' && pathname === '/api/fetch-article') {
        return await handleFetchArticle(request, env)
      }
      return errorResponse('Không tìm thấy endpoint.', env, 404)
    } catch (err) {
      return errorResponse(err.message || 'Đã có lỗi xảy ra.', env, 500)
    }
  },
}
