import { useState } from 'react'
import Header from './components/Header'
import ArticleReader from './components/ArticleReader'
import WritingPractice from './components/WritingPractice'
import PronunciationPractice from './components/PronunciationPractice'
import Settings from './components/Settings'

export default function App() {
  const [tab, setTab] = useState('reader')

  return (
    <div className="min-h-screen bg-paper">
      <Header active={tab} onChange={setTab} />
      <main>
        {tab === 'reader' && <ArticleReader />}
        {tab === 'writing' && <WritingPractice />}
        {tab === 'speaking' && <PronunciationPractice />}
        {tab === 'settings' && <Settings />}
      </main>
    </div>
  )
}
