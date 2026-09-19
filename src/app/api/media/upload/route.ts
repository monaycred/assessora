import {NextRequest,NextResponse} from 'next/server';
import {getAccessUser} from '@/lib/access';
import {createAdminClient} from '@/lib/supabase/server';

export async function POST(request:NextRequest){
  const user=await getAccessUser('addiction');
  if(!user)return NextResponse.json({error:'Não autenticado'},{status:401});
  const form=await request.formData();
  const file=form.get('image');
  const category=String(form.get('category')||'general').replace(/[^a-z0-9-]/gi,'').slice(0,30)||'general';
  if(!(file instanceof File))return NextResponse.json({error:'Escolha uma imagem'},{status:400});
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))return NextResponse.json({error:'Use JPG, PNG ou WEBP'},{status:400});
  if(file.size>8*1024*1024)return NextResponse.json({error:'A imagem pode ter até 8 MB'},{status:400});
  const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
  const path=`${category}/${user.id}/${crypto.randomUUID()}.${ext}`;
  const db=createAdminClient();
  const{error}=await db.storage.from('community-posts').upload(path,file,{contentType:file.type,upsert:false});
  if(error)return NextResponse.json({error:'Não foi possível enviar a imagem'},{status:500});
  const{data}=db.storage.from('community-posts').getPublicUrl(path);
  return NextResponse.json({url:data.publicUrl});
}
