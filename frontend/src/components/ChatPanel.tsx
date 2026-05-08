import { forwardRef, useEffect, useRef, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import type { ChatMessage as ChatMessageType } from '../hooks/useChat'

interface ChatPanelProps {
  messages: ChatMessageType[]
  isStreaming: boolean
  onSend: (content: string) => void
  onInsert: (content: string) => void
  onClear: () => void
}

export const ChatPanel = forwardRef<HTMLTextAreaElement, ChatPanelProps>(
  function ChatPanel({ messages, isStreaming, onSend, onInsert, onClear }, ref) {
    const [draft, setDraft] = useState('')
    const listRef = useRef<HTMLDivElement>(null)
    const localRef = useRef<HTMLTextAreaElement | null>(null)

    useEffect(() => {
      const el = listRef.current
      if (!el) return
      el.scrollTop = el.scrollHeight
    }, [messages, isStreaming])

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
      if (!value || isStreaming) return
      onSend(value)
      setDraft('')
    }

    const lastMessage = messages[messages.length - 1]
    const showTyping = isStreaming && lastMessage?.role === 'assistant' && !lastMessage.content

    return (
      <aside className="chat" aria-label="AI assistant">
        <div className="chat-header">
          <div className="chat-title">
            <span className="chat-dot" />
            AI Assistant
          </div>
          <div className="chat-header-actions">
            {messages.length > 0 && (
              <button
                className="chat-clear-btn"
                onClick={onClear}
                disabled={isStreaming}
                aria-label="Clear conversation"
                title="Clear conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
              </button>
            )}
            <span className="chat-hint">⌘J</span>
          </div>
        </div>

        <div className="chat-list" ref={listRef}>
          {messages.length === 0 && !isStreaming && (
            <div className="chat-empty">
              <p className="chat-empty-title">Need help with your script?</p>
              <p className="chat-empty-sub">
                Ask for ideas, hooks, rewrites, feedback, or say &ldquo;generate a script about...&rdquo; to create one.
              </p>
            </div>
          )}

          {messages.map((m) =>
            m.role === 'assistant' && !m.content ? null : (
              <ChatMessage key={m.id} message={m} onInsert={onInsert} />
            ),
          )}

          {showTyping && (
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
            placeholder="Ask anything — Enter to send"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            disabled={isStreaming}
          />
          <button
            className="send-btn"
            onClick={submit}
            disabled={!draft.trim() || isStreaming}
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
