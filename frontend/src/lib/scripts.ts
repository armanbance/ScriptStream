import { supabase } from './supabase'
import type { Doc } from '../types'

type ScriptRow = {
  id: string
  title: string
  content: string
}

function toDoc(row: ScriptRow): Doc {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
  }
}

async function ensureProfile(userId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId }, { onConflict: 'id' })

  if (error && error.code !== '42501') throw error
}

export async function loadScripts(): Promise<Doc[]> {
  const { data, error } = await supabase
    .from('scripts')
    .select('id,title,content')
    .order('updated_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(toDoc)
}

export async function createScript(userId: string): Promise<Doc> {
  await ensureProfile(userId)

  const { data, error } = await supabase
    .from('scripts')
    .insert({ user_id: userId, title: 'Untitled script', content: '' })
    .select('id,title,content')
    .single()

  if (error) throw error
  return toDoc(data)
}

export async function saveScript(doc: Doc): Promise<void> {
  const { error } = await supabase
    .from('scripts')
    .update({
      title: doc.title,
      content: doc.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', doc.id)

  if (error) throw error
}

export async function deleteScript(id: string): Promise<void> {
  const { error } = await supabase
    .from('scripts')
    .delete()
    .eq('id', id)

  if (error) throw error
}
