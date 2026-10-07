import { Phaste, SearchResponse } from './types';

const API_BASE = '/api';

function detectBrowserAndOS() {
  const ua = navigator.userAgent.toLowerCase();
  let browser = 'Unknown';
  let browserVersion = '';
  let os = 'Unknown';
  let deviceType = 'desktop';

  // OS detection
  if (/iphone|ipad|ipod/.test(ua)) {
    os = 'iOS';
    deviceType = /ipad/.test(ua) ? 'tablet' : 'mobile';
  } else if (/android/.test(ua)) {
    os = 'Android';
    deviceType = /tablet/.test(ua) ? 'tablet' : 'mobile';
  } else if (/mac os|macintosh/.test(ua)) {
    os = 'macOS';
  } else if (/windows/.test(ua)) {
    os = 'Windows';
  } else if (/linux/.test(ua)) {
    os = 'Linux';
  }

  // Browser detection
  if (/edg\//.test(ua)) {
    browser = 'Edge';
    browserVersion = ua.match(/edg\/([\d.]+)/)?.[1] || '';
  } else if (/chrome\//.test(ua) && !/chromium|crios/.test(ua)) {
    browser = 'Chrome';
    browserVersion = ua.match(/chrome\/([\d.]+)/)?.[1] || '';
  } else if (/crios\//.test(ua)) {
    browser = 'Chrome (iOS)';
    browserVersion = ua.match(/crios\/([\d.]+)/)?.[1] || '';
  } else if (/firefox\/|fxios\//.test(ua)) {
    browser = 'Firefox';
    browserVersion = ua.match(/(firefox|fxios)\/([\d.]+)/)?.[2] || '';
  } else if (/safari\//.test(ua) && /version\//.test(ua)) {
    browser = 'Safari';
    browserVersion = ua.match(/version\/([\d.]+)/)?.[1] || '';
  }

  return { browser, browserVersion, os, deviceType };
}

let cachedCoords: { latitude: number; longitude: number } | null = null;

try {
  const saved = typeof localStorage !== 'undefined'
    ? (localStorage.getItem('phaste_cached_coords') || (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('phaste_cached_coords') : null))
    : null;
  if (saved) cachedCoords = JSON.parse(saved);
} catch (_) {}

export function requestAndCacheLocation() {
  if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        try {
          localStorage.setItem('phaste_cached_coords', JSON.stringify(cachedCoords));
          sessionStorage.setItem('phaste_cached_coords', JSON.stringify(cachedCoords));
        } catch (_) {}
      },
      () => {},
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 300000 }
    );
  }
}

export function requestLocationPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      resolve(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        cachedCoords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        try {
          localStorage.setItem('phaste_cached_coords', JSON.stringify(cachedCoords));
          sessionStorage.setItem('phaste_cached_coords', JSON.stringify(cachedCoords));
        } catch (_) {}
        resolve(true);
      },
      () => {
        resolve(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

export async function getLocationStatus(): Promise<'granted' | 'prompt' | 'denied' | 'unsupported'> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return 'unsupported';
  }
  if ('permissions' in navigator && navigator.permissions.query) {
    try {
      const res = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return res.state;
    } catch (_) {}
  }
  return cachedCoords ? 'granted' : 'prompt';
}

export function getClientContext() {
  const { browser, browserVersion, os, deviceType } = detectBrowserAndOS();
  const screenResolution = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : undefined;

  const authorName = typeof localStorage !== 'undefined' ? (localStorage.getItem('phaste_author_name') || 'You') : 'You';
  const isOwner = typeof localStorage !== 'undefined' ? (localStorage.getItem('phaste_is_owner') !== 'false') : true;
  const deviceName = typeof localStorage !== 'undefined' ? (localStorage.getItem('phaste_device_name') || (
    os === 'macOS' ? 'Mac' : os === 'iOS' ? 'iPhone' : os === 'Android' ? 'Android Device' : 'Desktop'
  )) : 'Desktop';

  return {
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    platform: navigator.platform,
    user_agent: navigator.userAgent,
    language: navigator.language,
    browser,
    browser_version: browserVersion,
    os,
    device_type: deviceType,
    screen_resolution: screenResolution,
    author_name: authorName,
    is_owner: isOwner,
    device_name: deviceName,
    client_timestamp: new Date().toISOString(),
    latitude: cachedCoords?.latitude,
    longitude: cachedCoords?.longitude,
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
  formData.append('client_context', JSON.stringify(getClientContext()));

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
