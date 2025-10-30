export async function previewResourceData(url, container) {
  const wrap = document.createElement('div');
  wrap.style.marginTop = '10px';
  wrap.innerHTML = `<div class="label">Preview (first 50 rows)</div>`;
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');
  table.appendChild(thead); table.appendChild(tbody);
  wrap.appendChild(table);
  container.appendChild(wrap);
  try {
    await new Promise((resolve, reject) => {
      Papa.parse(url, {
        download: true,
        header: true,
        preview: 50,
        skipEmptyLines: true,
        complete: (res) => {
          const rows = res.data || [];
          if (rows.length === 0) { wrap.innerHTML += '<div class="hint">No rows to preview or not accessible.</div>'; return resolve(); }
          const cols = Object.keys(rows[0]);
          const trh = document.createElement('tr');
          cols.forEach(c => { const th = document.createElement('th'); th.textContent = c; trh.appendChild(th); });
          thead.appendChild(trh);
          rows.forEach(r => {
            const tr = document.createElement('tr');
            cols.forEach(c => { const td = document.createElement('td'); td.textContent = r[c]; tr.appendChild(td); });
            tbody.appendChild(tr);
          });
          resolve();
        },
        error: reject
      });
    });
  } catch (err) {
    const msg = document.createElement('div');
    msg.className = 'hint';
    msg.textContent = `Preview failed: ${err.message}`;
    wrap.appendChild(msg);
  }
}


