var Pages = window.Pages = window.Pages || {};
// ============================================================
// Students Page
// ============================================================
Pages.Students = {
  data: [], page: 1, search: '', classFilter: '', genderFilter: '',

  async load() {
    await this.loadClasses();
    await this.fetchStudents();
  },

  async loadClasses() {
    const data = await API.get('/academics/classes');
    if (data.error) return;
    const sel = document.getElementById('students-class-filter');
    if (!sel) return;
    const existing = sel.innerHTML;
    sel.innerHTML = '<option value="">All Classes</option>' +
      data.map(c => `<option value="${c.id}">${c.name} (${c.student_count || 0})</option>`).join('');

    // Also populate add student modal
    const sSel = document.getElementById('s-class');
    if (sSel) sSel.innerHTML = '<option value="">Select class</option>' +
      data.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  },

  async fetchStudents() {
    const tbody = document.getElementById('students-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px"><div class="loading-spinner" style="margin:auto"></div></td></tr>`;

    const params = { page: this.page, limit: 25 };
    if (this.search) params.search = this.search;
    if (this.classFilter) params.classId = this.classFilter;
    if (this.genderFilter) params.gender = this.genderFilter;

    const data = await API.get('/students', params);
    if (data.error) { Toast.error(data.error); return; }

    const subtitle = document.getElementById('students-subtitle');
    if (subtitle) subtitle.textContent = `${data.pagination?.total || 0} students enrolled`;

    tbody.innerHTML = data.data.length === 0
      ? `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">🎓</div><div class="empty-title">No students found</div><div class="empty-desc">Add your first student to get started</div></div></td></tr>`
      : data.data.map((s, i) => `
        <tr>
          <td style="color:var(--text-muted)">${(this.page - 1) * 25 + i + 1}</td>
          <td>
            <div style="display:flex;align-items:center;gap:10px">
              <div class="avatar sm" style="background:${s.gender === 'female' ? 'var(--pink)' : 'var(--accent)'}">${UI.initials(s.first_name + ' ' + s.last_name)}</div>
              <div>
                <div style="font-weight:600">${s.first_name} ${s.last_name}</div>
                ${s.is_boarding ? '<span class="badge badge-purple" style="font-size:9px">Boarder</span>' : ''}
              </div>
            </div>
          </td>
          <td><span class="font-mono" style="font-size:12px">${s.admission_number}</span></td>
          <td>${s.class_name || '<span class="text-muted">--</span>'}</td>
          <td><span class="badge ${s.gender === 'male' ? 'badge-blue' : 'badge-pink'}">${s.gender === 'male' ? '♂ Male' : '♀ Female'}</span></td>
          <td style="font-family:var(--font-mono);font-size:12px">${s.parent_phone || '--'}</td>
          <td><span class="badge ${s.is_active ? 'badge-green' : 'badge-gray'}">${s.is_active ? 'Active' : 'Inactive'}</span></td>
          <td>
            <div style="display:flex;gap:6px">
              <button class="btn btn-sm btn-secondary" onclick="Pages.Students.viewStudent('${s.id}')">View</button>
              <button class="btn btn-sm btn-ghost" onclick="Pages.Students.editStudent('${s.id}')">Edit</button>
            </div>
          </td>
        </tr>`).join('');

    UI.pagination(document.getElementById('students-pagination'), data, (p) => {
      this.page = p; this.fetchStudents();
    });
  },

  search(val) {
    clearTimeout(this._searchTimer);
    this._searchTimer = setTimeout(() => {
      this.search = val; this.page = 1; this.fetchStudents();
    }, 350);
  },

  filter() {
    this.classFilter = document.getElementById('students-class-filter')?.value || '';
    this.genderFilter = document.getElementById('students-gender-filter')?.value || '';
    this.page = 1;
    this.fetchStudents();
  },

  openAddModal() {
    // Set today's date as default admission date
    const admDate = document.getElementById('s-adm-date');
    if (admDate) admDate.value = new Date().toISOString().split('T')[0];
    // Clear form
    ['s-first-name','s-last-name','s-other-names','s-adm-no','s-kcpe','p-first-name','p-last-name','p-phone','p-email','p-occupation'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    UI.openModal('modal-add-student');
    // Boarding toggle
    document.getElementById('s-boarding')?.addEventListener('change', function() {
      document.getElementById('dorm-group').style.display = this.value === 'true' ? 'block' : 'none';
    });
  },

  async save() {
    const btn = document.getElementById('save-student-btn');
    const payload = {
      firstName: document.getElementById('s-first-name')?.value?.trim(),
      lastName: document.getElementById('s-last-name')?.value?.trim(),
      otherNames: document.getElementById('s-other-names')?.value?.trim(),
      admissionNumber: document.getElementById('s-adm-no')?.value?.trim(),
      gender: document.getElementById('s-gender')?.value,
      dateOfBirth: document.getElementById('s-dob')?.value,
      classId: document.getElementById('s-class')?.value,
      admissionDate: document.getElementById('s-adm-date')?.value,
      isBoarding: document.getElementById('s-boarding')?.value === 'true',
      dormName: document.getElementById('s-dorm')?.value?.trim(),
      kcpeIndexNumber: document.getElementById('s-kcpe')?.value?.trim(),
      bloodGroup: document.getElementById('s-blood')?.value,
      parents: [{
        firstName: document.getElementById('p-first-name')?.value?.trim(),
        lastName: document.getElementById('p-last-name')?.value?.trim(),
        relationship: document.getElementById('p-relationship')?.value,
        phone: document.getElementById('p-phone')?.value?.trim(),
        email: document.getElementById('p-email')?.value?.trim(),
        occupation: document.getElementById('p-occupation')?.value?.trim(),
        isPrimary: true,
      }].filter(p => p.firstName && p.phone),
    };

    if (!payload.firstName || !payload.lastName || !payload.admissionNumber || !payload.gender) {
      Toast.error('Please fill in all required fields'); return;
    }

    UI.setLoading(btn, true);
    const res = await API.post('/students', payload);
    UI.setLoading(btn, false);

    if (res.error) { Toast.error(res.error); return; }
    Toast.success('Student added successfully!');
    UI.closeModal('modal-add-student');
    this.fetchStudents();
  },

  async viewStudent(id) {
    const data = await API.get(`/students/${id}`);
    if (data.error) { Toast.error(data.error); return; }
    // Navigate to student detail -- simplified
    Toast.info(`${data.first_name} ${data.last_name} -- Class: ${data.class_name || 'N/A'} | Balance: ${UI.currency(parseFloat(data.fees?.total_fees || 0) - parseFloat(data.fees?.total_paid || 0))}`);
  },

  editStudent(id) {
    Toast.info('Edit student form coming soon');
  },

  exportCSV() {
    Toast.info('Generating CSV export...');
    // Build CSV from current data
    const rows = [['Adm No', 'First Name', 'Last Name', 'Gender', 'Class', 'Status']];
    document.querySelectorAll('#students-tbody tr').forEach(tr => {
      const cells = tr.querySelectorAll('td');
      if (cells.length > 3) {
        rows.push([cells[1]?.innerText?.split('\n')[0], '', '', '', cells[3]?.innerText, cells[6]?.innerText]);
      }
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = 'students.csv';
    a.click();
  }
};

Router.define?.('students', { title: 'Students', onEnter: () => Pages.Students.load() });
