import type { ChatMessage as ChatMessageType } from '../hooks/useChat'

interface ChatMessageProps {
  message: ChatMessageType
  onInsert: (content: string) => void
}

export function ChatMessage({ message, onInsert }: ChatMessageProps) {
  const isUser = message.role === 'user'
  return (
    <div className={`msg ${isUser ? 'msg-user' : 'msg-assistant'}`}>
      <div className="msg-role">{isUser ? 'You' : 'Assistant'}</div>
      <div className="msg-content">{message.content}</div>
      {!isUser && (
        <button
          className="msg-insert"
          onClick={() => onInsert(message.content)}
          aria-label="Insert into document"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Insert
        </button>
      )}
    </div>
  )
}
