import { forwardRef, useEffect, useRef } from 'react'

interface EditorProps {
  value: string
  onChange: (next: string) => void
}

export const Editor = forwardRef<HTMLTextAreaElement, EditorProps>(
  function Editor({ value, onChange }, ref) {
    const localRef = useRef<HTMLTextAreaElement | null>(null)

    useEffect(() => {
      const el = localRef.current
      if (!el) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }, [value])

    const setRefs = (el: HTMLTextAreaElement | null) => {
      localRef.current = el
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    }

    return (
      <div className="editor-wrap">
        <div className="editor-inner">
          <textarea
            ref={setRefs}
            className="editor-body"
            placeholder="Start writing your script…  Or ask the AI on the right for help."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            spellCheck
          />
        </div>
      </div>
    )
  }
)
