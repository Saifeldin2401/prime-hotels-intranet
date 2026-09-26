/**
 * The signed-in member's own profile: the fields they may edit and their
 * photo. Everything organizational (job title, staff ID, hotel, manager) is
 * set by admins and is read-only here.
 */

import { supabase } from '@/lib/supabase'

export interface OwnProfileFields {
  full_name: string
  phone: string
  nationality: string
  bio: string | null
  phone_extension: string | null
}

export async function updateOwnProfile(userId: string, fields: OwnProfileFields): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) throw error
}

export async function setOwnAvatarUrl(userId: string, url: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
  if (error) throw error
}

/** Uploads a photo to the public `avatars` bucket and points the profile at it. */
export async function uploadOwnAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Only image files are allowed.')
  if (file.size > 5 * 1024 * 1024) throw new Error('Image must be smaller than 5 MB.')
  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar-${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError
  // eslint-disable-next-line no-restricted-properties -- 'avatars' is one of the two intentionally public buckets; avatar_url is read as a plain <img src> in ~42 places and must be durable.
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  await setOwnAvatarUrl(userId, data.publicUrl)
  return data.publicUrl
}
