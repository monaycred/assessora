import { NextRequest, NextResponse } from 'next/server';
import { getAccessUser } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const bucket = 'profile-avatars';
const maxBytes = 2 * 1024 * 1024;

function imageType(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: 'image/jpeg', extension: 'jpg' };
  }
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
    return { mime: 'image/png', extension: 'png' };
  }
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP') {
    return { mime: 'image/webp', extension: 'webp' };
  }
  return null;
}

function ownedPath(avatarUrl: string | null, profileId: string): string | null {
  if (!avatarUrl) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  try {
    const url = new URL(avatarUrl);
    const index = url.pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(url.pathname.slice(index + marker.length));
    return path.startsWith(`${profileId}/`) ? path : null;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const user = await getAccessUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  let file: File;
  try {
    const form = await request.formData();
    const value = form.get('photo');
    if (!(value instanceof File)) return NextResponse.json({ error: 'Escolha uma foto' }, { status: 400 });
    file = value;
  } catch { return NextResponse.json({ error: 'Arquivo inválido' }, { status: 400 }); }
  if (file.size === 0 || file.size > maxBytes) {
    return NextResponse.json({ error: 'A foto deve ter até 2 MB' }, { status: 400 });
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = imageType(bytes);
  if (!type || file.type !== type.mime) {
    return NextResponse.json({ error: 'Envie uma imagem JPG, PNG ou WebP' }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: profile } = await db.from('user_profiles').select('avatar_url').eq('id', user.id).single();
  const oldPath = ownedPath(profile?.avatar_url || null, user.id);
  const path = `${user.id}/${crypto.randomUUID()}.${type.extension}`;
  const { error: uploadError } = await db.storage.from(bucket).upload(path, bytes, {
    contentType: type.mime, cacheControl: '3600', upsert: false,
  });
  if (uploadError) return NextResponse.json({ error: 'Não foi possível enviar a foto' }, { status: 500 });
  const { data: publicUrl } = db.storage.from(bucket).getPublicUrl(path);
  const { error: updateError } = await db.from('user_profiles').update({ avatar_url: publicUrl.publicUrl }).eq('id', user.id);
  if (updateError) {
    await db.storage.from(bucket).remove([path]);
    return NextResponse.json({ error: 'Não foi possível salvar a foto' }, { status: 500 });
  }
  if (oldPath) await db.storage.from(bucket).remove([oldPath]);
  return NextResponse.json({ avatar_url: publicUrl.publicUrl });
}

export async function DELETE() {
  const user = await getAccessUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const db = createAdminClient();
  const { data: profile } = await db.from('user_profiles').select('avatar_url').eq('id', user.id).single();
  const oldPath = ownedPath(profile?.avatar_url || null, user.id);
  const { error } = await db.from('user_profiles').update({ avatar_url: null }).eq('id', user.id);
  if (error) return NextResponse.json({ error: 'Não foi possível remover a foto' }, { status: 500 });
  if (oldPath) await db.storage.from(bucket).remove([oldPath]);
  return NextResponse.json({ ok: true });
}
