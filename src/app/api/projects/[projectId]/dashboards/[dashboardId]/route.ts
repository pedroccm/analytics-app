import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getDashboardView } from '@/lib/gooddata';

type RouteParams = { params: Promise<{ projectId: string; dashboardId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { projectId, dashboardId } = await params;

  try {
    const view = await getDashboardView(session.cookies, projectId, dashboardId);

    // Extrai tabs da estrutura do dashboard
    const content = (view as Record<string, unknown>).projectDashboard as Record<string, unknown> | undefined;
    const tabs = ((content?.content as Record<string, unknown>)?.tabs as unknown[]) || [];

    return NextResponse.json({ dashboard: view, tabs });
  } catch (error) {
    console.error('[DASHBOARD VIEW ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar dashboard' },
      { status: 500 }
    );
  }
}
