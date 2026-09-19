import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    const authIds = (data || []).map((contact: any) => contact.user_id).filter(Boolean);
    const { data: profiles } = authIds.length ? await supabase.from('user_profiles')
      .select('user_id,referred_by,referral_relationship').in('user_id', authIds) : { data: [] };
    const referrerIds = (profiles || []).map((profile: any) => profile.referred_by).filter(Boolean);
    const { data: referrers } = referrerIds.length ? await supabase.from('user_profiles')
      .select('id,full_name,nickname').in('id', referrerIds) : { data: [] };
    return NextResponse.json((data || []).map((contact: any) => {
      const profile = profiles?.find((item: any) => item.user_id === contact.user_id);
      const referrer = referrers?.find((item: any) => item.id === profile?.referred_by);
      return { ...contact, referrer_name: referrer?.nickname || referrer?.full_name || null, referral_relationship: profile?.referral_relationship || null };
    }));
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
