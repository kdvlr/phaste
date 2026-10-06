import { Phaste, SearchResponse } from './types';

const API_BASE = '/api';

export function getClientContext() {
  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
    user_agent: navigator.userAgent,
    language: navigator.language,
  };
}

export async function fetchPhastes(
  page: number = 1,
  limit: number = 30,
  kind?: string,
  pinned?: boolean
): Promise<{ items: Phaste[]; total: number }> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (kind && kind !== 'all') params.append('kind', kind);
  if (pinned !== undefined) params.append('pinned', String(pinned));

  const res = await fetch(`${API_BASE}/phastes?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch phastes');
  return res.json();
}

export async function searchPhastes(query: string, limit: number = 50): Promise<SearchResponse> {
  const params = new URLSearchParams({ q: query, limit: String(limit) });
  const res = await fetch(`${API_BASE}/search?${params.toString()}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function createPhasteText(
  content: string,
  kind?: string,
  title?: string
): Promise<Phaste> {
  const clientContext = getClientContext();
  const res = await fetch(`${API_BASE}/phastes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
      kind,
      title,
      client_context: clientContext,
    }),
  });
  if (!res.ok) throw new Error('Failed to create phaste');
  return res.json();
}

export async function uploadPhasteFile(file: File, title?: string): Promise<Phaste> {
  const formData = new FormData();
  formData.append('file', file);
  if (title) formData.append('title_form', title);

  const res = await fetch(`${API_BASE}/phastes`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload file');
  return res.json();
}

export async function updatePhaste(
  id: string,
  data: { title?: string; content?: string; is_pinned?: boolean; is_archived?: boolean }
): Promise<Phaste> {
  const res = await fetch(`${API_BASE}/phastes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update phaste');
  return res.json();
}

export async function deletePhaste(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/phastes/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete phaste');
}

export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  return `${API_BASE}/media/${path}`;
}
