import { NextRequest, NextResponse } from 'next/server';
import { getAccessUser } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const user = await getAccessUser('addiction');
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const form = await request.formData();
  const file = form.get('image');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Selecione uma imagem' }, { status: 400 });
  if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || file.size > 5 * 1024 * 1024)
    return NextResponse.json({ error: 'Use JPG, PNG, WEBP ou GIF de até 5 MB' }, { status: 400 });
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${user.id}/${crypto.randomUUID()}.${extension}`;
  const db = createAdminClient();
  const { error } = await db.storage.from('community-posts').upload(path, file, { contentType: file.type, upsert: false });
  if (error) return NextResponse.json({ error: 'Não foi possível enviar a foto' }, { status: 500 });
  const { data } = db.storage.from('community-posts').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
