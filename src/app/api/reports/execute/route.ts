import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { executeReport } from '@/lib/gooddata';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const { reportUri, dashboardUri, filters = [] } = await request.json();

    if (!reportUri || !dashboardUri) {
      return NextResponse.json(
        { error: 'reportUri e dashboardUri são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await executeReport(session.cookies, reportUri, dashboardUri, filters);
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[EXECUTE REPORT ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao executar relatório' },
      { status: 500 }
    );
  }
}
