interface StatusBarProps {
  words: number
  chars: number
  readMinutes: number
  saveStatus: 'idle' | 'saving' | 'saved'
}

export function StatusBar({ words, chars, readMinutes, saveStatus }: StatusBarProps) {
  return (
    <footer className="statusbar">
      <div className="statusbar-left">
        <span>{words.toLocaleString()} words</span>
        <span className="sep">·</span>
        <span>{chars.toLocaleString()} chars</span>
        <span className="sep">·</span>
        <span>{readMinutes} min read</span>
      </div>
      <div className="statusbar-right">
        {saveStatus === 'saving' && 'Saving…'}
        {saveStatus === 'saved' && 'All changes saved'}
      </div>
    </footer>
  )
}
