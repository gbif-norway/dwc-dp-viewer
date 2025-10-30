export function initGraph(container) {
  const cy = cytoscape({
    container,
    style: [
      { selector: 'node', style: { 'background-color': '#22c55e', 'label': 'data(label)', 'color': '#e5e7eb', 'font-size': 10, 'text-wrap': 'wrap', 'text-max-width': 140, 'text-valign': 'center', 'text-halign': 'center' } },
      { selector: 'edge', style: { 'curve-style': 'bezier', 'width': 2, 'line-color': '#8bafff', 'target-arrow-color': '#8bafff', 'target-arrow-shape': 'triangle', 'label': 'data(label)', 'font-size': 8, 'color': '#94a3b8', 'text-background-color': '#0b1022', 'text-background-opacity': 0.7, 'text-background-padding': 2 } },
      { selector: '.dim', style: { 'opacity': 0.25 } },
      { selector: ':selected', style: { 'border-width': 3, 'border-color': '#eab308' } }
    ],
    wheelSensitivity: 0.2,
    minZoom: 0.1,
    maxZoom: 5
  });

  // Ensure layout extensions are registered
  if (cytoscape && cytoscape('core', 'layout').length === 0 && window.cytoscapeDagre) {
    window.cytoscape.use(window.cytoscapeDagre);
  }
  if (window.cytoscapeCoseBilkent) {
    window.cytoscape.use(window.cytoscapeCoseBilkent);
  }

  // Click interactions to show details via dispatch event
  cy.on('select', 'node,edge', (evt) => {
    const el = evt.target;
    const detail = { type: el.isNode() ? 'node' : 'edge', data: el.data() };
    window.dispatchEvent(new CustomEvent('graph:selected', { detail }));
  });

  return cy;
}

export function buildGraph(cy, pkg) {
  cy.elements().remove();
  const resources = pkg.resources || [];
  const idByName = new Map();
  const elements = [];

  for (const r of resources) {
    const id = `res:${r.name || r.path || Math.random().toString(36).slice(2)}`;
    idByName.set(r.name, id);
    elements.push({ group: 'nodes', data: { id, label: r.name || r.path || 'resource', profile: r.profile, mediatype: r.mediatype, schema: r.schema || null } });
  }

  for (const r of resources) {
    const childId = idByName.get(r.name);
    const fks = (r.schema && Array.isArray(r.schema.foreignKeys)) ? r.schema.foreignKeys : [];
    for (const fk of fks) {
      const ref = fk.reference || {};
      const parentName = ref.resource;
      const parentId = idByName.get(parentName);
      if (!parentId) continue;
      const label = fk.fields && ref.fields ? `${[].concat(fk.fields).join(', ')} → ${[].concat(ref.fields).join(', ')}` : 'FK';
      elements.push({ group: 'edges', data: { id: `e:${childId}->${parentId}:${label}`, source: childId, target: parentId, label, fk } });
    }
  }

  cy.add(elements);
  layoutDagre(cy);
}

export function fitGraph(cy) {
  cy.fit(undefined, 40);
}

export function layoutDagre(cy) {
  cy.layout({ name: 'dagre', rankDir: 'LR', nodeSep: 50, edgeSep: 20, rankSep: 80 }).run();
  fitGraph(cy);
}

export function layoutCose(cy) {
  cy.layout({ name: 'cose-bilkent', animate: false, randomize: true, gravity: 1 }).run();
  fitGraph(cy);
}


