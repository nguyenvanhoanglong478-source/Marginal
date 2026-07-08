// Splits a block of text into sentences for click-to-translate reading.
// A lightweight regex split is good enough for most academic prose;
// it intentionally avoids breaking on common abbreviations like "e.g."/"Fig.".
const ABBREVIATIONS = ['e.g.', 'i.e.', 'etc.', 'Fig.', 'fig.', 'vs.', 'Dr.', 'Mr.', 'Mrs.', 'al.']

export function splitSentences(paragraph) {
  let protected_ = paragraph
  ABBREVIATIONS.forEach((abbr, i) => {
    protected_ = protected_.split(abbr).join(`__ABBR${i}__`)
  })

  const rawSentences = protected_
    .split(/(?<=[.!?])\s+(?=[A-ZÀ-Ỹ0-9])/)
    .map((s) => s.trim())
    .filter(Boolean)

  return rawSentences.map((s) => {
    let restored = s
    ABBREVIATIONS.forEach((abbr, i) => {
      restored = restored.split(`__ABBR${i}__`).join(abbr)
    })
    return restored
  })
}

export function splitParagraphs(text) {
  return text
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim())
    .filter(Boolean)
}
