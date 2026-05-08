import type { SaveStatus } from '../types'

interface StatusBarProps {
  words: number
  chars: number
  readMinutes: number
  saveStatus: SaveStatus
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
        {saveStatus === 'error' && 'Save failed'}
      </div>
    </footer>
  )
}
