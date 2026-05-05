import axios from 'axios'

// base axios instance, all requests go through this
export const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // timeout is 30s which should be enough
  headers: { 'Content-Type': 'application/json' },
})

export interface GenerateScriptResponse {
  script: string
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
