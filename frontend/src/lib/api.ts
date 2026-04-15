import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export interface GenerateScriptResponse {
  script: string
}

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
  const form = new FormData()
  form.append('file', file)
  form.append('creator_username', creatorUsername)
  const { data } = await api.post<UploadVideoResponse>('/upload-video', form, {
    headers: { 'Content-Type': undefined },
    timeout: 120000,
  })
  return data
}
