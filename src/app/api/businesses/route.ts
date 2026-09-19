import {NextRequest,NextResponse} from 'next/server';
import {getAccessUser} from '@/lib/access';
import {createAdminClient} from '@/lib/supabase/server';

const clean=(value:unknown,max=500)=>String(value||'').trim().slice(0,max);
function validCnpj(value:string){if(!/^\d{14}$/.test(value)||/^(\d)\1+$/.test(value))return false;const digit=(base:string,weights:number[])=>{const sum=base.split('').reduce((n,v,i)=>n+Number(v)*weights[i],0),rest=sum%11;return rest<2?0:11-rest};return digit(value.slice(0,12),[5,4,3,2,9,8,7,6,5,4,3,2])===Number(value[12])&&digit(value.slice(0,13),[6,5,4,3,2,9,8,7,6,5,4,3,2])===Number(value[13])}
export async function GET(){
  const user=await getAccessUser('addiction');if(!user)return NextResponse.json({error:'Não autenticado'},{status:401});
  const db=createAdminClient();
  const[{data:published},{data:mine}]=await Promise.all([
    db.from('business_profiles').select('*').eq('status','published').order('trade_name'),
    db.from('business_profiles').select('*').eq('owner_profile_id',user.id).order('created_at',{ascending:false}),
  ]);
  return NextResponse.json({businesses:published||[],mine:mine||[]});
}
export async function POST(request:NextRequest){
  const user=await getAccessUser('addiction');if(!user)return NextResponse.json({error:'Não autenticado'},{status:401});
  const b=await request.json(),cnpj=clean(b.cnpj,18).replace(/\D/g,''),services=Array.isArray(b.services)?b.services.map((s:unknown)=>clean(s,100)).filter(Boolean).slice(0,30):[];
  const required=['legal_name','trade_name','description','cep','street','street_number','district','city','state'];
  if(!validCnpj(cnpj)||required.some(k=>!clean(b[k],k==='description'?1500:160))||!services.length)return NextResponse.json({error:'Informe um CNPJ válido, os dados da empresa, o endereço e ao menos um serviço'},{status:400});
  const urls=['website_url','google_url','instagram_url','facebook_url','linkedin_url','whatsapp_url'];
  if(urls.some(k=>b[k]&&!/^https:\/\//i.test(clean(b[k],500))))return NextResponse.json({error:'Links devem começar com https://'},{status:400});
  const db=createAdminClient();
  const{data:existing}=await db.from('business_profiles').select('owner_profile_id').eq('cnpj',cnpj).maybeSingle();
  if(existing&&existing.owner_profile_id!==user.id)return NextResponse.json({error:'Este CNPJ já pertence a outro cadastro'},{status:409});
  const row={owner_profile_id:user.id,cnpj,legal_name:clean(b.legal_name,160),trade_name:clean(b.trade_name,160),description:clean(b.description,1500),phone:clean(b.phone,30)||null,email:clean(b.email,180)||null,website_url:clean(b.website_url)||null,google_url:clean(b.google_url)||null,instagram_url:clean(b.instagram_url)||null,facebook_url:clean(b.facebook_url)||null,linkedin_url:clean(b.linkedin_url)||null,whatsapp_url:clean(b.whatsapp_url)||null,cep:clean(b.cep,10),street:clean(b.street,180),street_number:clean(b.street_number,30),complement:clean(b.complement,100)||null,district:clean(b.district,100),city:clean(b.city,100),state:clean(b.state,2).toUpperCase(),services,logo_url:clean(b.logo_url)||null,banner_url:clean(b.banner_url)||null,status:'pending',updated_at:new Date().toISOString()};
  const{data,error}=await db.from('business_profiles').upsert(row,{onConflict:'cnpj'}).select('*').single();
  if(error)return NextResponse.json({error:error.code==='23505'?'Este CNPJ já está cadastrado':error.message},{status:400});
  const{data:admins}=await db.from('user_profiles').select('id').eq('role','admin').eq('is_active',true);
  if(admins?.length)await db.from('app_notifications').insert(admins.map((a:any)=>({recipient_profile_id:a.id,type:'business_submission',title:'Empresa aguardando análise',message:`${row.trade_name} foi cadastrada`,entity_type:'business',entity_id:data.id,dedupe_key:`business:${data.id}:${a.id}`})));
  return NextResponse.json({business:data,message:'Empresa enviada para análise'},{status:201});
}
