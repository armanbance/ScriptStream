import { useCallback, useEffect, useRef, useState } from 'react'
import { chatStream, type ChatMessagePayload } from '../lib/api'
import {
  loadChatMessages,
  saveChatMessage,
  deleteChatMessages,
} from '../lib/chatMessages'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

export function useChat(creatorUsername: string, scriptId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const scriptIdRef = useRef(scriptId)

  useEffect(() => {
    scriptIdRef.current = scriptId
  }, [scriptId])

  useEffect(() => {
    if (!scriptId) {
      setMessages([])
      return
    }

    let cancelled = false
    setIsLoading(true)

    loadChatMessages(scriptId)
      .then((rows) => {
        if (cancelled) return
        setMessages(rows.map((r) => ({ id: r.id, role: r.role, content: r.content })))
      })
      .catch(() => {
        if (!cancelled) setMessages([])
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [scriptId])

  const send = useCallback(async (content: string, editorContent?: string) => {
    const trimmed = content.trim()
    if (!trimmed || isStreaming) return

    const currentScriptId = scriptIdRef.current

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }

    const assistantId = crypto.randomUUID()
    let assistantContent = ''

    setMessages((prev) => [
      ...prev,
      userMessage,
      { id: assistantId, role: 'assistant', content: '' },
    ])
    setIsStreaming(true)

    const history: ChatMessagePayload[] = [
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: trimmed },
    ]

    try {
      const controller = await chatStream(history, creatorUsername, {
        editorContent,
        onToken(token) {
          assistantContent += token
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: m.content + token } : m,
            ),
          )
        },
        onDone() {
          setIsStreaming(false)
          if (currentScriptId) {
            saveChatMessage(currentScriptId, 'user', trimmed).catch(() => {})
            if (assistantContent) {
              saveChatMessage(currentScriptId, 'assistant', assistantContent).catch(() => {})
            }
          }
        },
        onError(detail) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: m.content || `Something went wrong.\n\n${detail}` }
                : m,
            ),
          )
          setIsStreaming(false)
        },
      })
      abortRef.current = controller
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: `Couldn't reach the assistant.\n\n${detail}` }
            : m,
        ),
      )
      setIsStreaming(false)
    }
  }, [creatorUsername, isStreaming, messages])

  const clearMessages = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setIsStreaming(false)
    if (scriptIdRef.current) {
      deleteChatMessages(scriptIdRef.current).catch(() => {})
    }
  }, [])

  return { messages, isStreaming, isLoading, send, clearMessages }
}
