import { previewResourceData } from './util_preview.js';

function setActiveTab(tabName) {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
  document.querySelectorAll('.tabpanel').forEach(p => p.classList.toggle('active', p.dataset.panel === tabName));
}

function makeAbsoluteUrl(base, relative) {
  try { return new URL(relative, base).toString(); } catch { return relative; }
}

function showNodeDetails(nodeData) {
  const el = document.getElementById('details-content');
  const schema = nodeData.schema || {};
  const fields = Array.isArray(schema.fields) ? schema.fields : [];
  const pk = schema.primaryKey ? [].concat(schema.primaryKey) : [];
  el.classList.remove('empty');
  el.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'kv';
  h.innerHTML = `<div>Name</div><div>${nodeData.label}</div>`;
  el.appendChild(h);

  if (pk.length) {
    const p = document.createElement('div');
    p.className = 'kv';
    p.innerHTML = `<div>Primary key</div><div>${pk.join(', ')}</div>`;
    el.appendChild(p);
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr><th>Field</th><th>Type</th><th>Constraints</th></tr></thead>
    <tbody></tbody>
  `;
  const tbody = table.querySelector('tbody');
  for (const f of fields) {
    const constraints = f.constraints ? Object.entries(f.constraints).map(([k,v]) => `${k}: ${Array.isArray(v)?v.join(', '):v}`).join('; ') : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${f.name}</td><td>${f.type || ''}</td><td>${constraints}</td>`;
    tbody.appendChild(tr);
  }
  el.appendChild(table);

  // Data preview
  const resources = window.__lastPackage?.resources || [];
  const res = resources.find(r => (r.name || r.path) === nodeData.label || r.name === nodeData.label);
  if (res && res.path) {
    const baseUrl = window.__lastBaseUrl || location.href;
    const url = makeAbsoluteUrl(baseUrl, res.path);
    previewResourceData(url, el);
  }
}

function showEdgeDetails(edgeData) {
  const el = document.getElementById('details-content');
  el.classList.remove('empty');
  const fk = edgeData.fk || {};
  const ref = fk.reference || {};
  el.innerHTML = `
    <div class="kv"><div>Relation</div><div>${edgeData.label}</div></div>
    <div class="kv"><div>From</div><div>${edgeData.source}</div></div>
    <div class="kv"><div>To</div><div>${edgeData.target}</div></div>
  `;
  const table = document.createElement('table');
  const left = [].concat(fk.fields || []);
  const right = [].concat(ref.fields || []);
  table.innerHTML = '<thead><tr><th>Child field</th><th>Parent field</th></tr></thead><tbody></tbody>';
  const tbody = table.querySelector('tbody');
  const n = Math.max(left.length, right.length);
  for (let i=0;i<n;i++) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${left[i] || ''}</td><td>${right[i] || ''}</td>`;
    tbody.appendChild(tr);
  }
  el.appendChild(table);
}

export function setupUI({ onPackageLoaded }) {
  // Tabs
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => setActiveTab(b.dataset.tab)));

  // File loader
  document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const pkg = JSON.parse(text);
      window.__lastPackage = pkg;
      window.__lastBaseUrl = location.href; // file has no base; use site origin
      await onPackageLoaded(pkg, window.__lastBaseUrl);
    } catch (err) {
      alert(`Failed to load file: ${err.message}`);
    }
  });

  // Paste loader
  document.getElementById('btn-load-paste').addEventListener('click', async () => {
    const text = document.getElementById('paste-input').value;
    try {
      const pkg = JSON.parse(text);
      window.__lastPackage = pkg;
      window.__lastBaseUrl = location.href;
      await onPackageLoaded(pkg, window.__lastBaseUrl);
    } catch (err) {
      alert(`Invalid JSON: ${err.message}`);
    }
  });

  // URL loader
  document.getElementById('btn-load-url').addEventListener('click', async () => {
    const url = document.getElementById('url-input').value.trim();
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const pkg = await res.json();
      window.__lastPackage = pkg;
      window.__lastBaseUrl = url;
      await onPackageLoaded(pkg, url);
    } catch (err) {
      alert(`Failed to fetch: ${err.message}. If this is GitHub, use the raw URL and ensure CORS.`);
    }
  });

  // Details from graph selection
  window.addEventListener('graph:selected', (e) => {
    const d = e.detail;
    if (d.type === 'node') showNodeDetails(d.data);
    else showEdgeDetails(d.data);
  });
}


