import { env, supabase } from '@/lib/supabase'

export function subscribeToArticle(id: string, onUpdate: () => void): () => void {
  const channel = supabase
    .channel(`knowledge-article-live-${id}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'documents',
        filter: `id=eq.${id}`,
      },
      () => {
        onUpdate()
      }
    )
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function deleteKnowledgeArticle(id: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ is_deleted: true })
    .eq('id', id)

  if (error) throw error
}

export async function downloadStorageAsset(bucket: string, path: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(bucket).download(path)
  if (error || !data) return null
  return data
}

export async function getAuthAccessToken(): Promise<string | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data?.session?.access_token) return null
  return data.session.access_token
}

export async function fetchImageViaProxy(url: string, accessToken: string): Promise<Blob> {
  const res = await fetch(`${env.VITE_SUPABASE_URL}/functions/v1/image-proxy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ url }),
  })

  if (!res.ok) throw new Error(`Proxy image fetch failed with status: ${res.status}`)
  return await res.blob()
}
