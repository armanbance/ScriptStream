import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
})

export interface ScriptGeneratorResponse {
  response: string
}

export async function generateScript(query: string): Promise<string> {
  const { data } = await api.post<ScriptGeneratorResponse>('/script_generator', {
    query,
  })
  return data.response
}

export interface MediaProcessorResponse {
  message?: string
  [key: string]: unknown
}

export async function uploadMedia(file: File): Promise<MediaProcessorResponse> {
  const form = new FormData()
  form.append('file', file)
  const { data } = await api.post<MediaProcessorResponse>('/media_processor', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
  return data
}
