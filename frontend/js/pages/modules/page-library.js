'use strict';
if (typeof Pages !== 'undefined') {
Pages.Library = {
  _books:[], _q:'',
  async load() {
    const area = document.getElementById('page-storekeeper') || document.getElementById('page-library');
    if(!area) return;
    area.innerHTML = `
      <div class="page-header"><div class="page-header-left"><h2 class="page-title">📚 Library Management</h2><p class="page-subtitle">Books, circulation, borrowing & returns</p></div>
        <div class="page-header-actions">
          <button class="btn btn-secondary" onclick="Pages.Library.openReturn()">↩️ Return Book</button>
          <button class="btn btn-primary" onclick="Pages.Library.openBorrow()">📤 Issue Book</button>
        </div>
      </div>
      <div class="stats-grid" style="margin-bottom:20px">
        <div class="stat-card" style="--stat-color:var(--brand);--stat-bg:var(--brand-subtle)"><div class="stat-icon">📚</div><div class="stat-body"><div class="stat-value">1,240</div><div class="stat-label">Total Books</div></div></div>
        <div class="stat-card" style="--stat-color:var(--amber);--stat-bg:var(--amber-bg)"><div class="stat-icon">📤</div><div class="stat-body"><div class="stat-value">187</div><div class="stat-label">Borrowed</div></div></div>
        <div class="stat-card" style="--stat-color:var(--red);--stat-bg:var(--red-bg)"><div class="stat-icon">⚠️</div><div class="stat-body"><div class="stat-value">23</div><div class="stat-label">Overdue</div></div></div>
        <div class="stat-card" style="--stat-color:var(--green);--stat-bg:var(--green-bg)"><div class="stat-icon">✅</div><div class="stat-body"><div class="stat-value">1,053</div><div class="stat-label">Available</div></div></div>
      </div>
      <div class="card">
        <div class="card-header"><h3>📋 Circulation Records</h3>
          <div style="display:flex;gap:8px"><input class="form-control" style="width:220px" placeholder="Search student or book..." oninput="Pages.Library._q=this.value;Pages.Library.renderTable()">
          <button class="btn btn-sm btn-secondary" onclick="Pages.Library.addBook()">+ Add Book</button></div>
        </div>
        <div id="lib-table"></div>
      </div>`;
    this.renderTable();
  },
  renderTable() {
    const records = [
      {student:'Kamau James',book:'Mathematics Form 4',isbn:'978-9966-25-090-5',issued:'2024-09-01',due:'2024-09-30',status:'overdue'},
      {student:'Wanjiku Grace',book:'Biology Practical',isbn:'978-9966-25-091-2',issued:'2024-09-10',due:'2024-10-10',status:'borrowed'},
      {student:'Otieno David',book:'Blossoms of the Savannah',isbn:'978-9966-25-092-9',issued:'2024-09-15',due:'2024-10-15',status:'borrowed'},
      {student:'Muthoni Faith',book:'Chemistry Revision',isbn:'978-9966-25-093-6',issued:'2024-09-05',due:'2024-09-20',status:'returned'},
    ].filter(r=>!this._q||(r.student+r.book).toLowerCase().includes(this._q.toLowerCase()));
    const area = document.getElementById('lib-table');
    if(!area) return;
    area.innerHTML = `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Student</th><th>Book Title</th><th>ISBN</th><th>Issued</th><th>Due Date</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${records.map(r=>`<tr>
        <td style="font-weight:600">${r.student}</td>
        <td>${r.book}</td>
        <td><code style="font-size:11px">${r.isbn}</code></td>
        <td>${r.issued}</td>
        <td>${r.due}</td>
        <td><span class="badge badge-${r.status==='returned'?'green':r.status==='overdue'?'red':'amber'}">${r.status.toUpperCase()}</span></td>
        <td>${r.status!=='returned'?`<button class="btn btn-sm btn-primary" onclick="Toast.success('Book returned: '+'${r.book.slice(0,20)}')">Return</button>`:'<span style="color:var(--green)">✓</span>'}</td>
      </tr>`).join('')}</tbody></table></div>`;
  },
  addBook() {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-overlay open" id="lib-add" onclick="if(event.target===this)this.remove()">
      <div class="modal" style="max-width:480px"><div class="modal-header"><h3>📚 Add Book to Library</h3><button onclick="document.getElementById('lib-add').remove()" class="btn btn-sm">✕</button></div>
      <div class="modal-body" style="padding:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Book Title *</label><input id="lb-title" class="form-control" placeholder="Full book title"></div>
        <div class="form-group"><label class="form-label">Author</label><input id="lb-author" class="form-control" placeholder="Author name"></div>
        <div class="form-group"><label class="form-label">ISBN</label><input id="lb-isbn" class="form-control" placeholder="978-..."></div>
        <div class="form-group"><label class="form-label">Subject</label><select id="lb-subject" class="form-control"><option>Mathematics</option><option>English</option><option>Sciences</option><option>Humanities</option><option>Fiction</option><option>Reference</option></select></div>
        <div class="form-group"><label class="form-label">Copies</label><input id="lb-copies" class="form-control" type="number" value="1" min="1"></div>
      </div>
      <div class="modal-footer" style="padding:12px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:8px">
        <button class="btn btn-secondary" onclick="document.getElementById('lib-add').remove()">Cancel</button>
        <button class="btn btn-primary" onclick="Toast.success('Book added: '+document.getElementById('lb-title').value);document.getElementById('lib-add').remove()">Add Book</button>
      </div></div></div>`);
  },
  openBorrow() { this.addBook(); },
  openReturn() { Toast.success('Return form: scan barcode or search by student name'); },
};
}
