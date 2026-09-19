import { createAdminClient } from '@/lib/supabase/server';

export async function notify(recipientProfileId:string,input:{type:string;title:string;message:string;entityType:string;entityId?:string|null;dedupeKey?:string}){
  const db=createAdminClient();
  const {error}=await db.from('app_notifications').insert({recipient_profile_id:recipientProfileId,type:input.type,title:input.title,message:input.message,entity_type:input.entityType,entity_id:input.entityId||null,dedupe_key:input.dedupeKey||null});
  if(error&&!String(error.message).includes('duplicate')) console.error('notification:',error.message);
}

export async function notifyAdmins(input:{type:string;title:string;message:string;entityType:string;entityId?:string|null;dedupeKey?:string}){
  const db=createAdminClient(); const {data}=await db.from('user_profiles').select('id').eq('role','admin').eq('is_active',true);
  await Promise.all((data||[]).map((admin:any)=>notify(admin.id,{...input,dedupeKey:input.dedupeKey?`${input.dedupeKey}:${admin.id}`:undefined})));
}
