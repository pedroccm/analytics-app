import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getAttributeElements } from '@/lib/gooddata';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const attributeUri = searchParams.get('uri');
  const search = searchParams.get('q') || '';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  if (!attributeUri) {
    return NextResponse.json({ error: 'URI do atributo é obrigatório' }, { status: 400 });
  }

  try {
    const elements = await getAttributeElements(session.cookies, attributeUri, search, limit);
    return NextResponse.json({ elements });
  } catch (error) {
    console.error('[FILTER ELEMENTS ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao buscar elementos' },
      { status: 500 }
    );
  }
}
