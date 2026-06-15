// ============================================================
// API - Tracker Entries (Notas/Diário)
// GET /api/addiction/trackers/[id]/entries
// POST /api/addiction/trackers/[id]/entries
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  getTracker,
  createEntry,
  getTrackerEntries,
} from '@/lib/addiction/database';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/addiction/trackers/[id]/entries
 * Busca entradas (notas) do tracker
 */
export async function GET(
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

    const tracker = await getTracker(params.id);

    if (!tracker) {
      return NextResponse.json(
        { error: 'Tracker não encontrado' },
        { status: 404 }
      );
    }

    if (tracker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const entries = await getTrackerEntries(params.id, 100);

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    console.error('Error in GET entries:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar entradas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/addiction/trackers/[id]/entries
 * Cria uma nova entrada (nota/diário)
 */
export async function POST(
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

    const tracker = await getTracker(params.id);

    if (!tracker) {
      return NextResponse.json(
        { error: 'Tracker não encontrado' },
        { status: 404 }
      );
    }

    if (tracker.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Sem permissão' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { entry_date, notes, metrics, mood } = body;

    // Validações
    if (!entry_date) {
      return NextResponse.json(
        { error: 'entry_date é obrigatório' },
        { status: 400 }
      );
    }

    // Validar formato de data (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry_date)) {
      return NextResponse.json(
        { error: 'Formato de data inválido (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (notes && notes.length > 500) {
      return NextResponse.json(
        { error: 'Notas não podem ter mais de 500 caracteres' },
        { status: 400 }
      );
    }

    if (mood && (mood < 1 || mood > 5)) {
      return NextResponse.json(
        { error: 'Humor deve ser entre 1 e 5' },
        { status: 400 }
      );
    }

    const entry = await createEntry(params.id, {
      entry_date,
      notes,
      metrics,
      mood,
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Erro ao criar entrada' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { entry, message: 'Nota salva com sucesso!' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST entries:', error);
    return NextResponse.json(
      { error: 'Erro ao criar entrada' },
      { status: 500 }
    );
  }
}
