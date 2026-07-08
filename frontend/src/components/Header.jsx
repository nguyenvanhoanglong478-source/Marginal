const TABS = [
  { id: 'reader', label: 'Đọc' },
  { id: 'writing', label: 'Luyện viết' },
  { id: 'speaking', label: 'Luyện nói' },
  { id: 'settings', label: 'Cài đặt' },
]

export default function Header({ active, onChange }) {
  return (
    <header className="border-b border-line bg-paper/95 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-xl italic tracking-tight">Marginal</span>
          <span className="hidden sm:inline text-xs text-inkSoft font-sans">
            đọc · dịch · học
          </span>
        </div>
        <nav className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`px-3 py-2 text-sm rounded-md font-medium transition-colors ${
                active === tab.id
                  ? 'bg-accent text-white'
                  : 'text-inkSoft hover:bg-panel hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
