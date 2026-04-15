import { useCallback, useEffect, useRef } from 'react'

interface ResizeHandleProps {
  onResize: (deltaX: number) => void
}

export function ResizeHandle({ onResize }: ResizeHandleProps) {
  const draggingRef = useRef(false)
  const lastXRef = useRef(0)

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    draggingRef.current = true
    lastXRef.current = e.clientX
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const delta = e.clientX - lastXRef.current
      lastXRef.current = e.clientX
      onResize(delta)
    }
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onResize])

  return (
    <div
      className="resize-handle"
      role="separator"
      aria-orientation="vertical"
      onMouseDown={onMouseDown}
    />
  )
}
