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

    // Extrai tabs da estrutura do dashboard (projectDashboardView.content.tabs)
    const dashboardView = (view as Record<string, unknown>).projectDashboardView as Record<string, unknown> | undefined;
    const content = dashboardView?.content as Record<string, unknown> | undefined;
    const rawTabs = (content?.tabs as Array<Record<string, unknown>>) || [];

    // Formata tabs com identifier e title
    const tabs = rawTabs.map((tab) => ({
      identifier: tab.identifier || '',
      title: tab.title || 'Sem título',
    }));

    console.log('[DASHBOARD VIEW] Found', tabs.length, 'tabs');

    return NextResponse.json({ dashboard: view, tabs });
  } catch (error) {
    console.error('[DASHBOARD VIEW ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar dashboard' },
      { status: 500 }
    );
  }
}
