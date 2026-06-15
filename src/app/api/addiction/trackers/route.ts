// ============================================================
// API - Addiction Trackers
// GET /api/addiction/trackers
// POST /api/addiction/trackers
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  createTracker,
  getUserTrackers,
} from '@/lib/addiction/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/addiction/trackers
 * Retorna todos os trackers do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from session
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

    const trackers = await getUserTrackers(user.id);

    return NextResponse.json({ trackers }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/addiction/trackers:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar trackers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/addiction/trackers
 * Cria um novo tracker
 * Body: { name, description?, goal_days?, custom_milestones? }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { name, description, goal_days, custom_milestones } = body;

    // Validação básica
    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Nome do tracker é obrigatório' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Nome não pode ter mais de 100 caracteres' },
        { status: 400 }
      );
    }

    // Obter workspace padrão do usuário (se existir)
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let workspaceId: string | undefined;
    if (userProfile) {
      const { data: workspace } = await supabase
        .from('workspaces')
        .select('id')
        .eq('owner_id', userProfile.id)
        .limit(1)
        .single();

      workspaceId = workspace?.id;
    }

    const tracker = await createTracker(user.id, workspaceId, {
      name,
      description,
      goal_days,
      custom_milestones,
    });

    if (!tracker) {
      return NextResponse.json(
        { error: 'Erro ao criar tracker' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { tracker, message: 'Tracker criado com sucesso!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/addiction/trackers:', error);
    return NextResponse.json(
      { error: 'Erro ao criar tracker' },
      { status: 500 }
    );
  }
}
