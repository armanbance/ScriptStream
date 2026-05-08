import { supabase } from './supabase'

export type ChatRole = 'user' | 'assistant'

export interface ChatMessageRow {
  id: string
  role: ChatRole
  content: string
}

export async function loadChatMessages(scriptId: string): Promise<ChatMessageRow[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id,role,content')
    .eq('script_id', scriptId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function saveChatMessage(
  scriptId: string,
  role: ChatRole,
  content: string,
): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .insert({ script_id: scriptId, role, content })

  if (error) throw error
}

export async function deleteChatMessages(scriptId: string): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('script_id', scriptId)

  if (error) throw error
}
