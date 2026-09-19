import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const MAX_BYTES = 2 * 1024 * 1024 // 2 MB

export async function POST(req: NextRequest) {
  try {
    // Identify the calling user via their session cookie (anon client, respects RLS)
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (toSet) => {
            for (const { name, value, options } of toSet) {
              cookieStore.set(name, value, options)
            }
          },
        },
      },
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file field' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: JPEG, PNG, WebP, GIF' },
        { status: 400 },
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 2 MB limit' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Ensure bucket exists (idempotent)
    const { data: existing } = await admin.storage.getBucket('avatars')
    if (!existing) {
      const { error: bucketErr } = await admin.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ALLOWED_TYPES,
        fileSizeLimit: MAX_BYTES,
      })
      // Bucket already exists is fine
      if (bucketErr && !bucketErr.message.includes('already exists')) throw bucketErr
    }

    // Upload under user's own folder — admin key bypasses storage.objects RLS entirely
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`
    const arrayBuffer = await file.arrayBuffer()

    const { error: upErr } = await admin.storage
      .from('avatars')
      .upload(path, arrayBuffer, { upsert: true, contentType: file.type })
    if (upErr) throw upErr

    const { data: { publicUrl } } = admin.storage.from('avatars').getPublicUrl(path)
    // Cache-bust so the browser fetches the new image instead of the old one
    const url = `${publicUrl}?t=${Date.now()}`

    // Update avatar_url in profiles. If no row exists yet, insert with safe defaults.
    // Two-step to avoid overwriting display_name on conflict.
    const { data: updated, error: updErr } = await admin
      .from('profiles')
      .update({ avatar_url: url })
      .eq('user_id', user.id)
      .select('user_id')
    if (updErr) throw updErr
    if (!updated || updated.length === 0) {
      // Row didn't exist — insert it. display_name has a NOT NULL DEFAULT ''.
      const { error: insErr } = await admin
        .from('profiles')
        .insert({ user_id: user.id, avatar_url: url, display_name: '' })
      // Ignore duplicate key — another request may have inserted concurrently
      if (insErr && !insErr.message.includes('duplicate')) throw insErr
    }

    return NextResponse.json({ url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
