// Use ESM Ajv and plugins from CDN to avoid UMD/MIME issues.
import Ajv from 'https://esm.sh/ajv@8.17.1';
import addFormats from 'https://esm.sh/ajv-formats@3.0.1';
import ajvErrors from 'https://esm.sh/ajv-errors@3.0.0';

let ajvInstance = null;
let compiled = null;

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load schema: ${path}`);
  return await res.json();
}

export async function loadSchemasIfNeeded() {
  if (ajvInstance) return;
  // Configure Ajv with formats and ajv-errors
  ajvInstance = new Ajv({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajvInstance);
  ajvErrors(ajvInstance);

  // Load bundled schemas
  const [dataPackage, tableSchema, dwcDp, dwcResource] = await Promise.all([
    fetchJson('./schemas/frictionless-datapackage.schema.json'),
    fetchJson('./schemas/frictionless-tableschema.schema.json'),
    fetchJson('./schemas/dwc-dp-package.schema.json'),
    fetchJson('./schemas/dwc-dp-resource.schema.json')
  ]);

  // Add schemas to Ajv
  ajvInstance.addSchema(dataPackage, dataPackage.$id || 'https://schemas.local/frictionless/datapackage');
  ajvInstance.addSchema(tableSchema, tableSchema.$id || 'https://schemas.local/frictionless/tableschema');
  ajvInstance.addSchema(dwcResource, dwcResource.$id || 'https://schemas.local/dwc-dp/resource');
  ajvInstance.addSchema(dwcDp, dwcDp.$id || 'https://schemas.local/dwc-dp/package');

  // Compile main validators
  compiled = {
    package: ajvInstance.getSchema(dwcDp.$id || 'https://schemas.local/dwc-dp/package') || ajvInstance.compile(dwcDp),
    frictionless: ajvInstance.getSchema(dataPackage.$id || 'https://schemas.local/frictionless/datapackage') || ajvInstance.compile(dataPackage)
  };
}

function normalizeErrors(errors) {
  if (!errors) return [];
  return errors.map(e => ({
    instancePath: e.instancePath || e.dataPath || '',
    schemaPath: e.schemaPath,
    message: e.message,
    params: e.params
  }));
}

function extraChecks(pkg) {
  const issues = [];
  // Basic uniqueness check for resource names
  const seen = new Set();
  for (const r of pkg.resources || []) {
    if (!r || typeof r !== 'object') continue;
    if (!r.name) continue;
    if (seen.has(r.name)) issues.push({ instancePath: '/resources', message: `Duplicate resource name: ${r.name}` });
    seen.add(r.name);
    // Ensure schema.fields are present if schema provided
    if (r.schema && Array.isArray(r.schema.fields) === false) {
      issues.push({ instancePath: `/resources/${r.name}/schema`, message: 'schema.fields must be an array' });
    }
  }
  return issues;
}

export async function validateDataPackage(pkg) {
  await loadSchemasIfNeeded();
  // Validate against DWC-DP if possible; fall back to frictionless
  const isDwc = true; // treat as DWC-DP by default; schema allows frictionless shape with extensions
  const validator = isDwc ? compiled.package : compiled.frictionless;
  const ok = validator(pkg);
  let errors = normalizeErrors(validator.errors);
  errors = errors.concat(extraChecks(pkg));
  return { valid: ok && errors.length === 0, errors };
}


