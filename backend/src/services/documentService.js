// ============================================================
// Document Service — HTML-based document generation
// ============================================================

const generateHtml = (template, variables = {}) => {
  let html = template;
  Object.entries(variables).forEach(([key, value]) => {
    html = html.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });
  return html;
};

const wrapInPrintPage = (html, title = 'Document') => {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>
  <style>body{font-family:Georgia,serif;margin:0;padding:20px;background:#fff;color:#000}
  @media print{body{margin:0;padding:10px}}</style></head>
  <body>${html}<script>window.onload=()=>setTimeout(()=>window.print(),600)</script></body></html>`;
};

module.exports = { generateHtml, wrapInPrintPage };
