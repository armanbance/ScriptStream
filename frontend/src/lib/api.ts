import axios from 'axios'
import { supabase } from './supabase'


export const api = axios.create({
  baseURL: '/api',
  timeout: 30000, 
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`
  }
  return config
})

export interface ChatMessagePayload {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatStreamEvent {
  type: 'token' | 'status' | 'done' | 'error'
  content?: string
  detail?: string
}


export async function chatStream(
  messages: ChatMessagePayload[],
  creatorUsername: string,
  opts: {
    editorContent?: string
    onToken: (text: string) => void
    onStatus?: (status: string) => void
    onDone: () => void
    onError: (detail: string) => void
  },
): Promise<AbortController> {
  const controller = new AbortController()

  const { data: { session } } = await supabase.auth.getSession()

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {}),
    },
    body: JSON.stringify({
      messages,
      creator_username: creatorUsername,
      editor_content: opts.editorContent,
    }),
    signal: controller.signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    opts.onError(text)
    return controller
  }

  const reader = res.body?.getReader()
  if (!reader) {
    opts.onError('No response body')
    return controller
  }

  const decoder = new TextDecoder()
  let buf = ''

  const processLines = () => {
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try {
        const evt: ChatStreamEvent = JSON.parse(line.slice(6))
        switch (evt.type) {
          case 'token':
            if (evt.content) opts.onToken(evt.content)
            break
          case 'status':
            if (evt.content) opts.onStatus?.(evt.content)
            break
          case 'done':
            opts.onDone()
            break
          case 'error':
            opts.onError(evt.detail ?? 'Unknown error')
            break
        }
      } catch { /* skip malformed lines */ }
    }
  }

  ;(async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        processLines()
      }
      buf += decoder.decode()
      processLines()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        opts.onError((err as Error).message)
      }
    }
  })()

  return controller
}

export interface GenerateScriptResponse {
  script: string
}

export interface DirectingScene {
  id: string
  scriptExcerpt: string
  visualGoal: string
  location: string
  shots: string[]
  performanceDirection: string
  props: string[]
}

export interface DirectingBRoll {
  moment: string
  shot: string
  purpose: string
}

export interface DirectingPlan {
  overview: string
  scenes: DirectingScene[]
  bRoll: DirectingBRoll[]
  shootingTips: string[]
  creativeIdeas: string[]
  editingNotes: string[]
}

export interface GenerateDirectingPlanOptions {
  platform?: string
  durationHint?: string
  style?: string
}

// sends the script generation request to the backend
export async function generateScript(
  topic: string,
  creatorUsername: string,
): Promise<string> {
  const { data } = await api.post<GenerateScriptResponse>('/generate-script', {
    topic,
    creator_username: creatorUsername,
  })
  return data.script
}

export async function generateDirectingPlan(
  script: string,
  creatorUsername: string,
  options: GenerateDirectingPlanOptions = {},
): Promise<DirectingPlan> {
  const { data } = await api.post<DirectingPlan>('/generate-directing-notes', {
    script,
    creator_username: creatorUsername,
    platform: options.platform,
    duration_hint: options.durationHint,
    style: options.style,
  }, {
    timeout: 45000,
  })
  return data
}

export interface UploadVideoResponse {
  message?: string
  [key: string]: unknown
}

export async function uploadMedia(
  file: File,
  creatorUsername: string,
): Promise<UploadVideoResponse> {
  // multipart form data for file upload
  const form = new FormData()
  form.append('file', file)
  form.append('creator_username', creatorUsername)

  const { data } = await api.post<UploadVideoResponse>('/upload-video', form, {
    headers: { 'Content-Type': undefined },
    timeout: 120000, // longer timeout for uploads since they take a while
  })
  return data
}

export interface IngestYoutubeResponse {
  message?: string
  video_title?: string
  video_id?: string
  [key: string]: unknown
}

export interface TrendingVideo {
  video_id: string
  title: string
  channel: string
  thumbnail_url: string
  view_count: number
  url: string
}

export interface TrendingResponse {
  videos: TrendingVideo[]
}

// returns the list of trending videos
export async function getTrending(categoryId?: number | null): Promise<TrendingVideo[]> {
  // pass category_id as a query param if we have one
  const params = categoryId != null ? { category_id: categoryId } : {}
  const { data } = await api.get<TrendingResponse>('/trending', { params })
  return data.videos
}

export async function ingestYoutube(
  url: string,
  creatorUsername: string,
): Promise<IngestYoutubeResponse> {
  const { data } = await api.post<IngestYoutubeResponse>(
    '/ingest-youtube',
    { url, creator_username: creatorUsername },
    { timeout: 60000 },
  )
  return data
}
