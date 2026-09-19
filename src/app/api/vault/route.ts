import { NextRequest, NextResponse } from 'next/server';
import { getAccessUser } from '@/lib/access';
import { createAdminClient } from '@/lib/supabase/server';
import { decryptSecret, encryptSecret } from '@/lib/vault';

export async function GET() {
  const user=await getAccessUser(); if(!user)return NextResponse.json({error:'Não autenticado'},{status:401});
  const db=createAdminClient();
  const {data:owned}=await db.from('family_vault_items').select('id,service_name,account_login,notes,owner_profile_id,updated_at').eq('owner_profile_id',user.id);
  const {data:grants}=await db.from('family_vault_access').select('item_id').eq('user_profile_id',user.id).eq('can_view',true);
  const ids=(grants||[]).map((g:any)=>g.item_id);
  const {data:shared}=ids.length?await db.from('family_vault_items').select('id,service_name,account_login,notes,owner_profile_id,updated_at').in('id',ids):{data:[]};
  return NextResponse.json({items:[...(owned||[]),...(shared||[]).filter((item:any)=>!(owned||[]).some((own:any)=>own.id===item.id))]});
}
export async function POST(request:NextRequest){
  const user=await getAccessUser(); if(!user)return NextResponse.json({error:'Não autenticado'},{status:401});
  const body=await request.json().catch(()=>null); const db=createAdminClient();
  if(body?.action==='reveal'){
    const {data:item}=await db.from('family_vault_items').select('*').eq('id',body.id).maybeSingle();
    const {data:grant}=item?.owner_profile_id===user.id?{data:{can_view:true}}:await db.from('family_vault_access').select('can_view').eq('item_id',body.id).eq('user_profile_id',user.id).maybeSingle();
    if(!item||!grant?.can_view)return NextResponse.json({error:'Sem permissão'},{status:403});
    try{return NextResponse.json({secret:decryptSecret(item.encrypted_secret)});}catch{return NextResponse.json({error:'Não foi possível abrir o cofre'},{status:500});}
  }
  if(body?.action==='share'){
    const {data:item}=await db.from('family_vault_items').select('id').eq('id',body.id).eq('owner_profile_id',user.id).maybeSingle();
    if(!item)return NextResponse.json({error:'Item não encontrado'},{status:404});
    const recipient=String(body.share_with||'').trim();
    const digits=recipient.replace(/\D/g,'');
    const query=digits.length===11?`email.eq.${recipient},cpf.eq.${digits}`:`email.eq.${recipient}`;
    const {data:profile}=await db.from('user_profiles').select('id,nickname,email').or(query).eq('is_active',true).maybeSingle();
    if(!profile||profile.id===user.id)return NextResponse.json({error:'Pessoa ativa não encontrada'},{status:404});
    const {error}=await db.from('family_vault_access').upsert({item_id:item.id,user_profile_id:profile.id,can_view:true},{onConflict:'item_id,user_profile_id'});
    return error?NextResponse.json({error:'Não foi possível compartilhar'},{status:500}):NextResponse.json({ok:true,recipient:profile.nickname||profile.email});
  }
  const service=String(body?.service_name||'').trim(),login=String(body?.account_login||'').trim(),secret=String(body?.secret||'');
  if(service.length<2||!login||secret.length<4)return NextResponse.json({error:'Preencha serviço, login e senha'},{status:400});
  try{const {data,error}=await db.from('family_vault_items').insert({owner_profile_id:user.id,service_name:service,account_login:login,encrypted_secret:encryptSecret(secret),notes:String(body?.notes||'').trim()||null}).select('id,service_name,account_login,notes,owner_profile_id,updated_at').single();return error?NextResponse.json({error:'Não foi possível salvar'},{status:500}):NextResponse.json({item:data},{status:201});}
  catch{return NextResponse.json({error:'Cofre não configurado'},{status:503});}
}
