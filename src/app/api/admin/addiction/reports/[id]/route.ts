// ============================================================
// API - Admin: Processar Denúncia
// PATCH /api/admin/addiction/reports/[id]
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { deletePost } from '@/lib/addiction/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PATCH /api/admin/addiction/reports/[id]
 * Processa denúncia (deleta post ou marca como falsa)
 * Body: { action: 'delete' | 'false_report' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // TODO: Verificar se é admin
    // const userProfile = await getUserProfile(user.id);
    // if (userProfile.role !== 'admin') {
    //   return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    // }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'action é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar denúncia
    const { data: report, error: reportError } = await supabase
      .from('community_reports')
      .select('*')
      .eq('id', params.id)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Denúncia não encontrada' },
        { status: 404 }
      );
    }

    if (action === 'delete') {
      // Deletar post/comentário
      if (report.post_id) {
        await deletePost(
          report.post_id,
          user.id,
          'Deletado por moderação (denúncia: ' + report.reason + ')'
        );
      } else if (report.comment_id) {
        // TODO: Implementar delete comment
        console.log('Deleting comment:', report.comment_id);
      }

      // Marcar denúncia como revisada
      const { error: updateError } = await supabase
        .from('community_reports')
        .update({
          status: 'deleted',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      return NextResponse.json(
        { message: 'Conteúdo deletado e denúncia marcada como processada' },
        { status: 200 }
      );
    } else if (action === 'false_report') {
      // Marcar como denúncia falsa
      const { error: updateError } = await supabase
        .from('community_reports')
        .update({
          status: 'false_report',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      if (updateError) throw updateError;

      return NextResponse.json(
        { message: 'Denúncia marcada como falsa' },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Ação inválida' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error in PATCH report:', error);
    return NextResponse.json(
      { error: 'Erro ao processar denúncia' },
      { status: 500 }
    );
  }
}
