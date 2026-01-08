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
    const rawFilters = (content?.filters as Array<Record<string, unknown>>) || [];

    // Formata tabs com identifier, title e items (KPIs/reports)
    const tabs = rawTabs.map((tab) => {
      const items = (tab.items as Array<Record<string, unknown>>) || [];

      // Extrai apenas reportItemView (KPIs)
      const kpis = items
        .filter((item) => item.reportItemView)
        .map((item) => {
          const report = item.reportItemView as Record<string, unknown>;
          return {
            label: report.label || '',
            description: report.description || '',
            obj: report.obj || '',
          };
        });

      return {
        identifier: tab.identifier || '',
        title: tab.title || 'Sem título',
        kpis,
      };
    });

    // Formata filtros globais do dashboard
    const filters = rawFilters.map((f) => {
      const filter = f.filterItemContentView as Record<string, unknown>;
      return {
        id: filter?.id || '',
        label: filter?.label || filter?.defaultLabel || '',
        type: filter?.type || 'list',
        attributeUri: filter?.attributeDFUri || '',
        multiple: filter?.multiple === 1,
      };
    });

    console.log('[DASHBOARD VIEW] Found', tabs.length, 'tabs,', filters.length, 'filters');

    return NextResponse.json({ tabs, filters });
  } catch (error) {
    console.error('[DASHBOARD VIEW ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar dashboard' },
      { status: 500 }
    );
  }
}
