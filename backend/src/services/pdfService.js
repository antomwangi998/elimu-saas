// ============================================================
// PDF Service — Browser Print (No Puppeteer / No Chrome)
// All PDF generation uses window.print() on the frontend
// Server returns HTML that the browser prints to PDF
// ============================================================

const buildCertificateHtml = ({ school, certificate }) => {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>body{font-family:Georgia,serif;margin:0;padding:20px}@media print{body{margin:0}}</style></head>
  <body>
    <div style="border:8px double gold;padding:32px;text-align:center;min-height:480px">
      <h1 style="margin:0;font-size:28px">${school.name || 'School'}</h1>
      <h2 style="text-transform:uppercase;letter-spacing:2px;color:#b8860b">${certificate.type || 'Achievement'}</h2>
      <p style="font-size:16px">This certifies that</p>
      <h2 style="font-size:36px;color:#b8860b;font-style:italic">${certificate.recipient_name || certificate.student_name}</h2>
      <h3>${certificate.title}</h3>
      <p>${certificate.description || ''}</p>
      <p style="font-size:12px;margin-top:40px">Certificate No: ${certificate.certificate_number || '—'}</p>
    </div>
    <script>window.onload=()=>setTimeout(()=>window.print(),500)</script>
  </body></html>`;
};

const generatePdf = async (html, options = {}) => {
  // No server-side PDF generation — return HTML buffer
  // Frontend uses window.print() to PDF
  return Buffer.from(html, 'utf8');
};

module.exports = { generatePdf, buildCertificateHtml };
