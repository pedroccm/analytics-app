import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getProjects } from '@/lib/gooddata';

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  try {
    const projects = await getProjects(session.cookies, session.profileId);
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('[PROJECTS ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar projetos' },
      { status: 500 }
    );
  }
}
