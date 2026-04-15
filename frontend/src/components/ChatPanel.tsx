import { forwardRef, useEffect, useRef, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType } from '../hooks/useChat'

interface ChatPanelProps {
  messages: ChatMessageType[]
  isThinking: boolean
  onSend: (content: string) => void
  onInsert: (content: string) => void
}

const SUGGESTIONS = [
  'Rewrite my intro to be punchier',
  'Give me 5 B-roll ideas',
  'Suggest a strong hook',
  'Tighten this script',
]

export const ChatPanel = forwardRef<HTMLTextAreaElement, ChatPanelProps>(
  function ChatPanel({ messages, isThinking, onSend, onInsert }, ref) {
    const [draft, setDraft] = useState('')
    const listRef = useRef<HTMLDivElement>(null)
    const localRef = useRef<HTMLTextAreaElement | null>(null)

    useEffect(() => {
      const el = listRef.current
      if (!el) return
      el.scrollTop = el.scrollHeight
    }, [messages, isThinking])

    useEffect(() => {
      const el = localRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${Math.min(el.scrollHeight, 160)}px`
    }, [draft])

    const setRefs = (el: HTMLTextAreaElement | null) => {
      localRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    }

    const submit = () => {
      const value = draft.trim()
      if (!value || isThinking) return
      onSend(value)
      setDraft('')
    }

    const handleSuggestion = (text: string) => {
      if (isThinking) return
      onSend(text)
    }

    return (
      <aside className="chat" aria-label="AI assistant">
        <div className="chat-header">
          <div className="chat-title">
            <span className="chat-dot" />
            AI Assistant
          </div>
          <span className="chat-hint">⌘J</span>
        </div>

        <div className="chat-list" ref={listRef}>
          {messages.length === 0 && !isThinking && (
            <div className="chat-empty">
              <p className="chat-empty-title">Need a second brain?</p>
              <p className="chat-empty-sub">
                Ask for B-roll ideas, hooks, rewrites, or feedback on what you've written.
              </p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    className="suggestion"
                    onClick={() => handleSuggestion(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <ChatMessage key={m.id} message={m} onInsert={onInsert} />
          ))}

          {isThinking && (
            <div className="msg msg-assistant msg-thinking">
              <div className="msg-role">Assistant</div>
              <div className="typing">
                <span /><span /><span />
              </div>
            </div>
          )}
        </div>

        <div className="composer">
          <textarea
            ref={setRefs}
            className="composer-input"
            placeholder="Ask anything — Cmd+Enter to send"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            disabled={isThinking}
          />
          <button
            className="send-btn"
            onClick={submit}
            disabled={!draft.trim() || isThinking}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </aside>
    )
  }
)
