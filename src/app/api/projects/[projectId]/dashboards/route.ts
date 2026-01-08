import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDashboards } from '@/lib/gooddata';

type RouteParams = { params: Promise<{ projectId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { projectId } = await params;

  try {
    const dashboards = await getDashboards(session.cookies, projectId);
    return NextResponse.json({ dashboards });
  } catch (error) {
    console.error('[DASHBOARDS ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar dashboards' },
      { status: 500 }
    );
  }
}
