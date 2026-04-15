import { useCallback, useState } from 'react'
import { generateScript } from '../lib/api'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isThinking, setIsThinking] = useState(false)

  const send = useCallback(async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }
    setMessages((prev) => [...prev, userMessage])
    setIsThinking(true)

    try {
      const reply = await generateScript(trimmed)
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: reply },
      ])
    } catch (err) {
      const detail =
        err instanceof Error ? err.message : 'Unknown error'
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Couldn't reach the script generator.\n\n${detail}`,
        },
      ])
    } finally {
      setIsThinking(false)
    }
  }, [])

  return { messages, isThinking, send }
}
