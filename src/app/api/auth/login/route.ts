import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/gooddata';
import { setSession } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username e password são obrigatórios' },
        { status: 400 }
      );
    }

    // Autentica no GoodData
    const { cookies, profileId } = await authenticate(username, password);

    // Salva sessão
    await setSession({ cookies, profileId, username });

    return NextResponse.json({
      user: { username, profileId },
      message: 'Login realizado com sucesso',
    });
  } catch (error) {
    console.error('[LOGIN ERROR]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao fazer login' },
      { status: 401 }
    );
  }
}
