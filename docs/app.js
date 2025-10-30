import { setupUI } from './ui.js';
import { validateDataPackage, loadSchemasIfNeeded } from './validation.js';
import { initGraph, buildGraph, fitGraph, layoutDagre, layoutCose, updateGraphTheme } from './graph.js';

const state = {
  datapackage: null,
  baseUrl: null,
  cy: null,
  theme: 'dark'
};

async function handlePackageLoaded(pkg, baseUrl) {
  state.datapackage = pkg;
  state.baseUrl = baseUrl;
  const validation = await validateDataPackage(pkg);
  renderValidation(validation);
  if (!validation.valid) return;
  const cy = state.cy || initGraph(document.getElementById('cy'), state.theme);
  state.cy = cy;
  buildGraph(cy, pkg);
  fitGraph(cy);
}

function renderValidation(result) {
  const status = document.getElementById('validation-status');
  const list = document.getElementById('validation-errors');
  list.innerHTML = '';
  if (result.valid) {
    status.textContent = 'Valid data package';
    status.style.color = 'var(--accent)';
  } else {
    status.textContent = 'Invalid data package';
    status.style.color = 'var(--danger)';
    for (const err of result.errors) {
      const li = document.createElement('li');
      li.textContent = `${err.instancePath || err.dataPath || ''} ${err.message}`.trim();
      list.appendChild(li);
    }
  }
}

function setupGlobalActions() {
  document.getElementById('btn-layout-dagre').addEventListener('click', () => {
    if (state.cy) layoutDagre(state.cy);
  });
  document.getElementById('btn-layout-cose').addEventListener('click', () => {
    if (state.cy) layoutCose(state.cy);
  });
  document.getElementById('btn-export-png').addEventListener('click', () => {
    if (!state.cy) return;
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--canvas-bg').trim() || '#ffffff';
    const png = state.cy.png({ full: true, scale: 2, bg });
    const a = document.createElement('a');
    a.href = png;
    a.download = 'dwc-dp-graph.png';
    a.click();
  });
  document.getElementById('search-input').addEventListener('input', (e) => {
    if (!state.cy) return;
    const q = e.target.value.trim().toLowerCase();
    state.cy.nodes().forEach(n => {
      const name = (n.data('label') || '').toLowerCase();
      const match = q.length === 0 || name.includes(q);
      n.style('opacity', match ? 1 : 0.2);
    });
  });
}

function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  const btn = document.getElementById('btn-theme');
  btn.textContent = theme === 'dark' ? 'Light' : 'Dark';
  if (state.cy) updateGraphTheme(state.cy, theme);
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const initial = saved || (prefersLight ? 'light' : 'dark');
  applyTheme(initial);
  document.getElementById('btn-theme').addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });
}

async function bootstrap() {
  await loadSchemasIfNeeded();
  initTheme();
  setupUI({ onPackageLoaded: handlePackageLoaded });
  setupGlobalActions();
}

bootstrap();


