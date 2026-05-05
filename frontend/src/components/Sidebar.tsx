import { useRef, useState } from 'react'
import axios from 'axios'
import type { Doc } from '../types'
import { ingestYoutube, uploadMedia } from '../lib/api'

interface SidebarProps {
  docs: Doc[]
  currentDocId: string
  view: 'editor' | 'settings' | 'explore'
  creatorUsername: string
  onSelectDoc: (id: string) => void
  onNewDoc: () => void
  onOpenSettings: () => void
  onOpenExplore: () => void
}

type UploadStatus =
  | { state: 'idle' }
  | { state: 'uploading'; name: string }
  | { state: 'success'; name: string }
  | { state: 'error'; message: string }

export function Sidebar({
  docs,
  currentDocId,
  view,
  creatorUsername,
  onSelectDoc,
  onNewDoc,
  onOpenSettings,
  onOpenExplore,
}: SidebarProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [upload, setUpload] = useState<UploadStatus>({ state: 'idle' })
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const isBusy = upload.state === 'uploading'

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setUpload({ state: 'uploading', name: file.name })
    try {
      await uploadMedia(file, creatorUsername)
      setUpload({ state: 'success', name: file.name })
      setTimeout(() => setUpload({ state: 'idle' }), 2500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setUpload({ state: 'error', message })
      setTimeout(() => setUpload({ state: 'idle' }), 4000)
    }
  }

  const onYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const url = youtubeUrl.trim()
    if (!url || isBusy) return
    if (!creatorUsername.trim()) {
      setUpload({ state: 'error', message: 'Set a creator username in Settings first.' })
      setTimeout(() => setUpload({ state: 'idle' }), 4000)
      return
    }

    setUpload({ state: 'uploading', name: url })
    try {
      const res = await ingestYoutube(url, creatorUsername)
      const label = res.video_title || url
      setUpload({ state: 'success', name: label })
      setYoutubeUrl('')
      setTimeout(() => setUpload({ state: 'idle' }), 2500)
    } catch (err) {
      let message = 'YouTube ingest failed'
      if (axios.isAxiosError(err)) {
        const detail = (err.response?.data as { detail?: string } | undefined)?.detail
        message = detail || err.message || message
      } else if (err instanceof Error) {
        message = err.message
      }
      setUpload({ state: 'error', message })
      setTimeout(() => setUpload({ state: 'idle' }), 4000)
    }
  }

  return (
    <aside className="sidebar" aria-label="Documents">
      <div className="sidebar-header">
        <span className="brand">
          <span className="brand-dot" />
          ScriptStream
        </span>
      </div>

      <button className="sidebar-new" onClick={onNewDoc}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
        New script
      </button>

      <div className="sidebar-section-label">Scripts</div>

      <nav className="sidebar-list">
        {docs.map((doc) => {
          const isActive = view === 'editor' && doc.id === currentDocId
          const preview = doc.content.trim().split('\n')[0].slice(0, 40) || 'Empty'
          return (
            <button
              key={doc.id}
              className={`sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectDoc(doc.id)}
            >
              <span className="sidebar-item-title">{doc.title}</span>
              <span className="sidebar-item-preview">{preview}</span>
            </button>
          )
        })}
      </nav>

      <div className="sidebar-footer">
        <input
          ref={fileRef}
          type="file"
          hidden
          onChange={onFileChange}
          accept="audio/*,video/*,image/*"
        />
        <button
          className="sidebar-item sidebar-upload"
          onClick={() => fileRef.current?.click()}
          disabled={isBusy}
        >
          {upload.state === 'uploading' ? (
            <>
              <span className="upload-spinner" aria-hidden="true" />
              <span>Working…</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Upload media</span>
            </>
          )}
        </button>

        <form className="sidebar-youtube" onSubmit={onYoutubeSubmit}>
          <input
            type="url"
            className="sidebar-youtube-input"
            placeholder="Paste YouTube URL"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            disabled={isBusy}
            aria-label="YouTube URL"
          />
          <button
            type="submit"
            className="sidebar-youtube-submit"
            disabled={isBusy || !youtubeUrl.trim()}
            aria-label="Ingest YouTube video"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </form>

        {upload.state === 'success' && (
          <div className="upload-status upload-success" role="status">
            Added · {upload.name}
          </div>
        )}
        {upload.state === 'error' && (
          <div className="upload-status upload-error" role="status">
            {upload.message}
          </div>
        )}

        <button
          className={`sidebar-item sidebar-explore ${view === 'explore' ? 'active' : ''}`}
          onClick={onOpenExplore}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" />
          </svg>
          <span>Explore</span>
        </button>

        <button
          className={`sidebar-item sidebar-settings ${view === 'settings' ? 'active' : ''}`}
          onClick={onOpenSettings}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  )
}
