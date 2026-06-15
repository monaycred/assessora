// ============================================================
// API - Admin: Denúncias
// GET /api/admin/addiction/reports
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/addiction/reports
 * Busca denúncias pendentes (admin only)
 * Query: status=pending (padrão)
 */
export async function GET(request: NextRequest) {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // TODO: Verificar se usuário é admin
    // const userProfile = await getUserProfile(user.id);
    // if (userProfile.role !== 'admin') {
    //   return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    // }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';

    const { data: reports, error } = await supabase
      .from('community_reports')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error('Error in GET reports:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar denúncias' },
      { status: 500 }
    );
  }
}
