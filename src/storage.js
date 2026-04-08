const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;
const LOCAL_KEY = 'trading_discipline_v1';

export const defaultState = {
  trades: [],
  openTrades: [],
  weeklyPlans: [],
  dailyLogs: [],
  cooldownUntil: null,
};

export function loadLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return null;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch { return null; }
}

export function saveLocal(data) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); } catch {}
}

async function sbFetch(method, body) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/journal_data?id=eq.main`,
    {
      method,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': method === 'PATCH' ? 'return=minimal' : 'return=representation',
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  if (!res.ok) throw new Error(`Supabase ${method} failed: ${res.status}`);
  if (method === 'PATCH') return null;
  return await res.json();
}

export async function loadFromCloud() {
  try {
    const rows = await sbFetch('GET');
    if (!rows || rows.length === 0) return null;
    return { ...defaultState, ...rows[0].data };
  } catch (e) {
    console.warn('Cloud load failed, using local:', e.message);
    return null;
  }
}

export async function saveToCloud(data) {
  try {
    await sbFetch('PATCH', { data, updated_at: new Date().toISOString() });
  } catch (e) {
    console.warn('Cloud save failed:', e.message);
  }
}

export async function loadData() {
  const cloud = await loadFromCloud();
  if (cloud) {
    saveLocal(cloud);
    return cloud;
  }
  const local = loadLocal();
  return local || defaultState;
}

export function saveData(data) {
  saveLocal(data);
  saveToCloud(data);
}

export function exportData(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trading-journal-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      onSuccess({ ...defaultState, ...parsed });
    } catch {
      onError('קובץ לא תקין');
    }
  };
  reader.readAsText(file);
}
