import { useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { Editor } from './components/Editor'
import { ChatPanel } from './components/ChatPanel'
import { StatusBar } from './components/StatusBar'
import { ResizeHandle } from './components/ResizeHandle'
import { SettingsPage } from './components/SettingsPage'
import { useWordCount } from './hooks/useWordCount'
import { useChat } from './hooks/useChat'
import { appendToText } from './lib/insertAtCursor'
import type { Doc } from './types'
import './App.css'

const MIN_CHAT = 320
const MAX_CHAT = 520

const INITIAL_DOCS: Doc[] = [
  {
    id: crypto.randomUUID(),
    title: 'Morning routine script',
    content: "What if everything you knew about morning routines was wrong?\n\nIn the next 60 seconds, I'll show you why the 5am grind culture is broken — and what actually works.",
  },
  {
    id: crypto.randomUUID(),
    title: 'Untitled script',
    content: '',
  },
]

function App() {
  const [docs, setDocs] = useState<Doc[]>(INITIAL_DOCS)
  const [currentDocId, setCurrentDocId] = useState<string>(INITIAL_DOCS[0].id)
  const [view, setView] = useState<'editor' | 'settings'>('editor')
  const [chatWidth, setChatWidth] = useState(400)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')

  const currentDoc = useMemo(
    () => docs.find((d) => d.id === currentDocId) ?? docs[0],
    [docs, currentDocId]
  )

  const { words, chars, readMinutes } = useWordCount(currentDoc?.content ?? '')
  const { messages, isThinking, send } = useChat()

  const editorRef = useRef<HTMLTextAreaElement>(null)
  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const firstChange = useRef(true)

  useEffect(() => {
    if (firstChange.current) {
      firstChange.current = false
      return
    }
    setSaveStatus('saving')
    const t = setTimeout(() => setSaveStatus('saved'), 600)
    return () => clearTimeout(t)
  }, [docs])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && e.key.toLowerCase() === 'j') {
        e.preventDefault()
        chatInputRef.current?.focus()
      }
      if (e.key === 'Escape' && document.activeElement === chatInputRef.current) {
        editorRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const updateCurrentDoc = (patch: Partial<Doc>) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === currentDocId ? { ...d, ...patch } : d))
    )
  }

  const handleNewDoc = () => {
    const newDoc: Doc = {
      id: crypto.randomUUID(),
      title: 'Untitled script',
      content: '',
    }
    setDocs((prev) => [newDoc, ...prev])
    setCurrentDocId(newDoc.id)
    setView('editor')
  }

  const handleSelectDoc = (id: string) => {
    setCurrentDocId(id)
    setView('editor')
  }

  const handleInsert = (content: string) => {
    updateCurrentDoc({ content: appendToText(currentDoc.content, content) })
    editorRef.current?.focus()
  }

  const handleResize = (delta: number) => {
    setChatWidth((w) => Math.min(MAX_CHAT, Math.max(MIN_CHAT, w - delta)))
  }

  return (
    <div className="app">
      <Sidebar
        docs={docs}
        currentDocId={currentDocId}
        view={view}
        onSelectDoc={handleSelectDoc}
        onNewDoc={handleNewDoc}
        onOpenSettings={() => setView('settings')}
      />

      <div className="app-main">
        {view === 'editor' ? (
          <>
            <TopBar
              title={currentDoc.title}
              onTitleChange={(t) => updateCurrentDoc({ title: t })}
              saveStatus={saveStatus}
            />
            <div className="workspace">
              <main className="editor-col">
                <Editor
                  ref={editorRef}
                  value={currentDoc.content}
                  onChange={(content) => updateCurrentDoc({ content })}
                />
              </main>

              <ResizeHandle onResize={handleResize} />

              <div className="chat-col" style={{ width: chatWidth }}>
                <ChatPanel
                  ref={chatInputRef}
                  messages={messages}
                  isThinking={isThinking}
                  onSend={send}
                  onInsert={handleInsert}
                />
              </div>
            </div>
            <StatusBar
              words={words}
              chars={chars}
              readMinutes={readMinutes}
              saveStatus={saveStatus}
            />
          </>
        ) : (
          <SettingsPage />
        )}
      </div>
    </div>
  )
}

export default App
