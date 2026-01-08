/**
 * Cliente GoodData para Next.js
 * Portado de Python para TypeScript
 */

const GOODDATA_BASE_URL = process.env.GOODDATA_API_URL || 'https://analytics.totvs.com.br';

export class GoodDataAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoodDataAuthError';
  }
}

interface GoodDataSession {
  cookies: string;
  profileId: string;
}

type FilterItem = {
  uri: string;
  constraint?: { type: string; from: string; to: string };
};

/**
 * Autentica no GoodData e retorna cookies de sessão
 */
export async function authenticate(username: string, password: string): Promise<GoodDataSession> {
  const loginUrl = `${GOODDATA_BASE_URL}/gdc/account/login`;

  const payload = {
    postUserLogin: {
      login: username,
      password: password,
      remember: 1,
    },
  };

  const response = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[AUTH] Login failed:', response.status, text);
    throw new GoodDataAuthError(`Falha no login: Status ${response.status}`);
  }

  const data = await response.json();

  // Captura cookies - funciona tanto em Node.js quanto em Edge
  let cookies = '';
  const setCookieHeader = response.headers.getSetCookie?.();
  if (setCookieHeader && setCookieHeader.length > 0) {
    // Node.js 18+ tem getSetCookie()
    cookies = setCookieHeader.map(c => c.split(';')[0]).join('; ');
  } else {
    // Fallback para headers raw
    const rawCookies = response.headers.get('set-cookie');
    if (rawCookies) {
      cookies = rawCookies.split(/,(?=\s*\w+=)/).map(c => c.split(';')[0].trim()).join('; ');
    }
  }

  console.log('[AUTH] Cookies captured:', cookies ? 'Yes' : 'No');

  // Extrai profile ID
  let profileId = '';
  const userLogin = data?.userLogin;
  if (typeof userLogin === 'object' && userLogin?.profile) {
    profileId = userLogin.profile.split('/').pop() || '';
  }

  console.log('[AUTH] Profile ID:', profileId);

  return { cookies, profileId };
}

/**
 * Faz requisição autenticada ao GoodData
 */
async function gdRequest<T>(
  path: string,
  cookies: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${GOODDATA_BASE_URL}${path}`;

  console.log('[GD_REQUEST]', options.method || 'GET', path);

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Cookie: cookies,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[GD_REQUEST] Error:', response.status, text.substring(0, 200));
    throw new GoodDataAuthError(`Erro ${response.status}: ${response.statusText}`);
  }

  // Algumas respostas podem ser vazias (204)
  const text = await response.text();
  if (!text) return {} as T;

  return JSON.parse(text);
}

/**
 * Lista projetos do usuário
 */
export async function getProjects(cookies: string, profileId: string) {
  const data = await gdRequest<{ projects: Array<{ project: { meta: { title: string; identifier: string }; links?: { self: string } } }> }>(
    `/gdc/account/profile/${profileId}/projects`,
    cookies
  );

  return (data.projects || []).map((item) => {
    const project = item.project;
    const meta = project.meta || {};
    const uri = project.links?.self || '';
    const id = uri.split('/').pop() || meta.identifier || '';

    return {
      id,
      name: meta.title || 'Sem nome',
      uri,
    };
  });
}

/**
 * Lista dashboards de um projeto
 */
export async function getDashboards(cookies: string, projectId: string) {
  const data = await gdRequest<{ query: { entries: Array<{ title: string; link: string; summary?: string }> } }>(
    `/gdc/md/${projectId}/query/projectdashboards?showAll=0`,
    cookies
  );

  return (data.query?.entries || []).map((entry) => {
    const id = entry.link.split('/').pop() || '';
    return {
      id,
      title: entry.title,
      summary: entry.summary || '',
      uri: entry.link,
    };
  });
}

/**
 * Busca estrutura do dashboard (tabs e items)
 */
export async function getDashboardView(cookies: string, projectId: string, dashboardId: string) {
  return gdRequest<Record<string, unknown>>(
    `/gdc/md/${projectId}/obj/${dashboardId}/view`,
    cookies
  );
}

/**
 * Busca elementos de um atributo (para filtros)
 */
export async function getAttributeElements(
  cookies: string,
  attributeUri: string,
  search = '',
  limit = 50
) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (search) params.set('filter', search);

  const data = await gdRequest<{ attributeElements: { elements: Array<{ title: string; uri: string }> } }>(
    `${attributeUri}/elements?${params}`,
    cookies
  );

  return (data.attributeElements?.elements || []).map((el) => ({
    title: el.title,
    uri: el.uri,
  }));
}

/**
 * Executa relatório com filtros e polling
 */
export async function executeReport(
  cookies: string,
  reportUri: string,
  dashboardUri: string,
  filters: FilterItem[],
  maxRetries = 30,
  pollInterval = 2000
): Promise<Record<string, unknown>> {
  // Extrai project ID do report URI
  const match = reportUri.match(/\/gdc\/md\/([^/]+)\//);
  const projectId = match ? match[1] : '';

  const executeUrl = `/gdc/app/projects/${projectId}/execute`;

  const payload = {
    report_req: {
      report: reportUri,
      context: {
        filters,
        dashboard: dashboardUri,
        report: reportUri,
      },
    },
  };

  const execResult = await gdRequest<{ execResult: { dataResult?: string; poll?: string } }>(
    executeUrl,
    cookies,
    { method: 'POST', body: JSON.stringify(payload) }
  );

  const resultData = execResult.execResult || {};

  // Caso 1: Resultado imediato
  if (resultData.dataResult) {
    let dataResponse = await gdRequest<{ xtab_data?: Record<string, unknown> }>(
      resultData.dataResult,
      cookies
    );

    // Polling se ainda processando
    let retries = maxRetries;
    while (!dataResponse.xtab_data && retries > 0) {
      await new Promise((r) => setTimeout(r, pollInterval));
      dataResponse = await gdRequest<{ xtab_data?: Record<string, unknown> }>(
        resultData.dataResult,
        cookies
      );
      retries--;
    }

    return dataResponse.xtab_data || {};
  }

  // Caso 2: Polling necessário
  if (resultData.poll) {
    for (let i = 0; i < maxRetries; i++) {
      await new Promise((r) => setTimeout(r, pollInterval));

      const pollResult = await gdRequest<{ xtab_data?: Record<string, unknown> }>(
        resultData.poll,
        cookies
      );

      if (pollResult.xtab_data) {
        return pollResult.xtab_data;
      }
    }

    throw new Error(`Timeout após ${maxRetries} tentativas`);
  }

  return {};
}

/**
 * Batch de metadados
 */
export async function getObjects(cookies: string, projectId: string, uris: string[]) {
  if (!uris.length) return { objects: [] };

  return gdRequest<{ objects: unknown[] }>(
    `/gdc/md/${projectId}/objects/get`,
    cookies,
    { method: 'POST', body: JSON.stringify({ get: { items: uris } }) }
  );
}

/**
 * Bootstrap da conta
 */
export async function getBootstrap(cookies: string, projectId: string) {
  return gdRequest<Record<string, unknown>>(
    `/gdc/app/account/bootstrap?projectUri=/gdc/projects/${projectId}`,
    cookies
  );
}
