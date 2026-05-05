import { useEffect, useState } from 'react'
import { getTrending, type TrendingVideo } from '../lib/api'

// props for the explore page
interface ExplorePageProps {
  categoryId: number | null
}

// helper to format view counts
function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`
  return `${n} views`
}

export function ExplorePage({ categoryId }: ExplorePageProps) {
  const [videos, setVideos] = useState<TrendingVideo[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  // re-fetch when the category changes
  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    getTrending(categoryId)
      .then((vs) => {
        if (cancelled) return
        setVideos(vs)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setErrorMsg(err instanceof Error ? err.message : 'Failed to load trending videos')
        setStatus('error')
      })

    // cancel the request if the component unmounts
    return () => { cancelled = true }
  }, [categoryId])

  return (
    <div className="explore-page">
      <header className="explore-header">
        <h1>Explore</h1>
        <p className="explore-subtitle">Trending on YouTube right now</p>
      </header>

      {status === 'loading' && <div className="explore-empty">Loading…</div>}
      {status === 'error' && <div className="explore-empty">Error: {errorMsg}</div>}
      {status === 'ready' && videos.length === 0 && (
        <div className="explore-empty">
          No trending videos yet. Run <code>python -m scripts.fetch_trending</code> in the backend.
        </div>
      )}

      {status === 'ready' && videos.length > 0 && (
        <div className="video-grid">
          {videos.map((v) => (
            <a
              key={v.video_id}
              href={v.url}
              target="_blank"
              rel="noopener noreferrer"
              className="video-card"
            >
              <div className="video-thumb-wrap">
                <img className="video-thumb" src={v.thumbnail_url} alt="" loading="lazy" />
              </div>
              <div className="video-meta">
                <div className="video-title">{v.title}</div>
                <div className="video-channel">{v.channel}</div>
                <div className="video-views">{formatViews(v.view_count)}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
