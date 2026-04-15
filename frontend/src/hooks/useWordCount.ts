import { useMemo } from 'react'

export function useWordCount(text: string) {
  return useMemo(() => {
    const trimmed = text.trim()
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length
    const chars = text.length
    const readMinutes = Math.max(1, Math.round(words / 200))
    return { words, chars, readMinutes }
  }, [text])
}
