'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

type Project = { id: string; name: string };
type Dashboard = { id: string; title: string; summary: string };

// Componente de Dropdown com busca
function SearchableSelect<T extends { id: string }>({
  label,
  placeholder,
  items,
  value,
  onChange,
  displayKey,
  disabled = false,
}: {
  label: string;
  placeholder: string;
  items: T[];
  value: string;
  onChange: (id: string) => void;
  displayKey: keyof T;
  disabled?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => item.id === value);
  const filteredItems = items.filter((item) =>
    String(item[displayKey]).toLowerCase().includes(search.toLowerCase())
  );

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full px-3 py-2 text-left border border-gray-300 rounded-md bg-white flex justify-between items-center ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'
        }`}
      >
        <span className={selectedItem ? 'text-gray-900' : 'text-gray-500'}>
          {selectedItem ? String(selectedItem[displayKey]) : placeholder}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <ul className="max-h-60 overflow-auto">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <li
                  key={item.id}
                  onClick={() => {
                    onChange(item.id);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`px-3 py-2 cursor-pointer hover:bg-blue-50 ${
                    item.id === value ? 'bg-blue-100 text-blue-900' : ''
                  }`}
                >
                  {String(item[displayKey])}
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-gray-500 text-sm">Nenhum resultado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [dashboards, setDashboards] = useState<Dashboard[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [selectedDashboard, setSelectedDashboard] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Carrega projetos ao montar
  useEffect(() => {
    async function loadProjects() {
      try {
        const res = await fetch('/api/projects');
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setProjects(data.projects || []);
      } catch {
        setError('Erro ao carregar projetos');
      } finally {
        setLoading(false);
      }
    }
    loadProjects();
  }, [router]);

  // Carrega dashboards quando projeto muda
  useEffect(() => {
    if (!selectedProject) {
      setDashboards([]);
      return;
    }

    async function loadDashboards() {
      try {
        const res = await fetch(`/api/projects/${selectedProject}/dashboards`);
        const data = await res.json();
        setDashboards(data.dashboards || []);
      } catch {
        setError('Erro ao carregar dashboards');
      }
    }
    loadDashboards();
  }, [selectedProject]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Analytics Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>
        )}

        {/* Seletores */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <SearchableSelect
            label="Projeto"
            placeholder="Selecione um projeto"
            items={projects}
            value={selectedProject}
            onChange={(id) => {
              setSelectedProject(id);
              setSelectedDashboard('');
            }}
            displayKey="name"
          />

          <SearchableSelect
            label="Dashboard"
            placeholder="Selecione um dashboard"
            items={dashboards}
            value={selectedDashboard}
            onChange={setSelectedDashboard}
            displayKey="title"
            disabled={!selectedProject}
          />
        </div>

        {/* Área do Dashboard */}
        {selectedDashboard ? (
          <DashboardContent projectId={selectedProject} dashboardId={selectedDashboard} />
        ) : (
          <div className="text-center text-gray-500 py-12">
            Selecione um projeto e dashboard para visualizar
          </div>
        )}
      </main>
    </div>
  );
}

function DashboardContent({ projectId, dashboardId }: { projectId: string; dashboardId: string }) {
  const [tabs, setTabs] = useState<{ identifier: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/dashboards/${dashboardId}`);
        const data = await res.json();

        // Extrai tabs da estrutura
        const rawTabs = data.tabs || [];
        const formattedTabs = rawTabs.map((t: Record<string, unknown>) => ({
          identifier: t.identifier || '',
          title: t.title || 'Sem título',
        }));
        setTabs(formattedTabs);
      } catch {
        console.error('Erro ao carregar dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId, dashboardId]);

  if (loading) {
    return <div className="text-center py-8 text-gray-500">Carregando dashboard...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Abas do Dashboard</h2>

      {tabs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {tabs.map((tab) => (
            <div
              key={tab.identifier}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 cursor-pointer"
            >
              <h3 className="font-medium">{tab.title}</h3>
              <p className="text-sm text-gray-500">{tab.identifier}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-gray-500">Nenhuma aba encontrada</div>
      )}
    </div>
  );
}
