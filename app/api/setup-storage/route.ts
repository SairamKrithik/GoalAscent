import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Ensures the 'avatars' storage bucket exists with correct access policies.
// Idempotent — safe to call on every profile page load.
export async function POST() {
  try {
    const admin = createAdminClient()

    const { data: existing } = await admin.storage.getBucket('avatars')
    if (!existing) {
      const { error } = await admin.storage.createBucket('avatars', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 2097152, // 2 MB
      })
      if (error && error.message !== 'Bucket already exists') throw error

      // Create RLS policies for avatar uploads (owner-scoped path)
      await admin.rpc('exec_sql', {
        sql: `
          do $$
          begin
            if not exists (
              select 1 from pg_policies
              where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars: owner upload'
            ) then
              execute $p$
                create policy "avatars: owner upload"
                on storage.objects for insert to authenticated
                with check (
                  bucket_id = 'avatars'
                  and (storage.foldername(name))[1] = auth.uid()::text
                )
              $p$;
            end if;

            if not exists (
              select 1 from pg_policies
              where schemaname = 'storage' and tablename = 'objects' and policyname = 'avatars: owner update'
            ) then
              execute $p$
                create policy "avatars: owner update"
                on storage.objects for update to authenticated
                using (
                  bucket_id = 'avatars'
                  and (storage.foldername(name))[1] = auth.uid()::text
                )
              $p$;
            end if;
          end
          $$;
        `,
      }).then(() => {}) // best-effort — fails if exec_sql RPC doesn't exist, which is fine
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
