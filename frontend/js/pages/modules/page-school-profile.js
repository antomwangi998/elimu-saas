'use strict';
if (typeof Pages !== 'undefined') {
Pages.SchoolProfile = {
  _data: null,

  async load() {
    const area = document.getElementById('page-school-profile');
    if (!area) return;
    area.innerHTML = `<div style="text-align:center;padding:60px"><div class="loading-spinner" style="margin:auto"></div></div>`;
    const data = await API.get('/schools/my').catch(()=>({}));
    this._data = data || {};
    this.render(area, this._data);
  },

  render(area, sc) {
    area.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2 class="page-title">🏫 School Profile</h2>
          <p class="page-subtitle">Manage school information, branding and settings</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary" onclick="Pages.SchoolProfile.saveProfile()">💾 Save Changes</button>
        </div>
      </div>

      <!-- Cover photo + Logo -->
      <div style="position:relative;margin-bottom:80px">
        <div id="cover-photo-area" style="height:200px;background:${sc.cover_photo_url?'url('+sc.cover_photo_url+') center/cover':'linear-gradient(135deg,#1565C0,#7B1FA2)'};border-radius:12px;overflow:hidden;position:relative">
          ${sc.cover_photo_url?`<img src="${sc.cover_photo_url}" style="width:100%;height:100%;object-fit:cover">`:'<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.3);font-size:48px">🏫</div>'}
          <label style="position:absolute;bottom:12px;right:12px;cursor:pointer">
            <span class="btn btn-sm" style="background:rgba(0,0,0,0.6);color:white;border:none">📷 Change Cover</span>
            <input type="file" accept="image/*" style="display:none" onchange="Pages.SchoolProfile.uploadPhoto(this,'cover')">
          </label>
        </div>
        <!-- Logo -->
        <div style="position:absolute;bottom:-60px;left:24px">
          <div id="logo-area" style="width:100px;height:100px;border-radius:50%;background:white;border:4px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.2);overflow:hidden;display:flex;align-items:center;justify-content:center">
            ${sc.logo_url ? `<img src="${sc.logo_url}" style="width:100%;height:100%;object-fit:cover">` : `<div style="width:100%;height:100%;background:var(--brand-subtle);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:800;color:var(--brand)">${(sc.name||'S').charAt(0)}</div>`}
          </div>
          <label style="position:absolute;bottom:0;right:0;cursor:pointer">
            <span style="width:28px;height:28px;background:var(--brand);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-size:14px;border:2px solid white;cursor:pointer">📷</span>
            <input type="file" accept="image/*" style="display:none" onchange="Pages.SchoolProfile.uploadPhoto(this,'logo')">
          </label>
        </div>
      </div>

      <!-- Form -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <!-- Left column -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-header"><h3>🏫 Basic Information</h3></div>
            <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group" style="grid-column:1/-1;margin:0"><label class="form-label">School Name *</label><input id="sp-name" class="form-control" value="${sc.name||''}" placeholder="Full school name"></div>
              <div class="form-group" style="margin:0"><label class="form-label">Short Name</label><input id="sp-short" class="form-control" value="${sc.short_name||''}" placeholder="Abbreviation"></div>
              <div class="form-group" style="margin:0"><label class="form-label">School Code</label><input id="sp-code" class="form-control" value="${sc.school_code||''}" readonly style="opacity:0.6"></div>
              <div class="form-group" style="margin:0"><label class="form-label">KNEC Code</label><input id="sp-knec" class="form-control" value="${sc.knec_code||''}" placeholder="Ministry code"></div>
              <div class="form-group" style="margin:0"><label class="form-label">School Type</label>
                <select id="sp-type" class="form-control">
                  <option value="secondary" ${sc.type==='secondary'?'selected':''}>Secondary</option>
                  <option value="primary" ${sc.type==='primary'?'selected':''}>Primary</option>
                  <option value="mixed" ${sc.type==='mixed'?'selected':''}>Mixed (Primary+Secondary)</option>
                </select>
              </div>
              <div class="form-group" style="margin:0"><label class="form-label">Boarding Type</label>
                <select id="sp-boarding" class="form-control">
                  <option value="day" ${sc.boarding_type==='day'?'selected':''}>Day School</option>
                  <option value="boarding" ${sc.boarding_type==='boarding'?'selected':''}>Boarding</option>
                  <option value="mixed" ${sc.boarding_type==='mixed'?'selected':''}>Day & Boarding</option>
                </select>
              </div>
              <div class="form-group" style="margin:0"><label class="form-label">Founded Year</label><input id="sp-founded" class="form-control" type="number" value="${sc.founded_year||''}" placeholder="e.g. 1965"></div>
              <div class="form-group" style="margin:0"><label class="form-label">Motto</label><input id="sp-motto" class="form-control" value="${sc.motto||''}" placeholder="School motto"></div>
              <div class="form-group" style="grid-column:1/-1;margin:0"><label class="form-label">Description</label><textarea id="sp-desc" class="form-control" rows="3" placeholder="Brief school description">${sc.description||''}</textarea></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>📍 Location</h3></div>
            <div style="padding:16px;display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group" style="grid-column:1/-1;margin:0"><label class="form-label">Physical Address</label><input id="sp-addr" class="form-control" value="${sc.address||''}" placeholder="P.O. Box, Town"></div>
              <div class="form-group" style="margin:0"><label class="form-label">County</label><input id="sp-county" class="form-control" value="${sc.county||''}" placeholder="e.g. Nairobi"></div>
              <div class="form-group" style="margin:0"><label class="form-label">Sub-County</label><input id="sp-subcounty" class="form-control" value="${sc.sub_county||''}" placeholder="Sub-county"></div>
            </div>
          </div>
        </div>

        <!-- Right column -->
        <div style="display:flex;flex-direction:column;gap:16px">
          <div class="card">
            <div class="card-header"><h3>📞 Contact</h3></div>
            <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
              <div class="form-group" style="margin:0"><label class="form-label">Phone</label><input id="sp-phone" class="form-control" value="${sc.phone||''}" type="tel" placeholder="+254 7XX XXX XXX"></div>
              <div class="form-group" style="margin:0"><label class="form-label">Email</label><input id="sp-email" class="form-control" value="${sc.email||''}" type="email" placeholder="info@school.ac.ke"></div>
              <div class="form-group" style="margin:0"><label class="form-label">Website</label><input id="sp-website" class="form-control" value="${sc.website||''}" type="url" placeholder="https://www.school.ac.ke"></div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>🖼️ School Photos</h3></div>
            <div style="padding:16px">
              <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px" id="gallery-grid">
                <label style="cursor:pointer;aspect-ratio:1;background:var(--bg-elevated);border:2px dashed var(--border);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px">
                  <span style="font-size:28px">📷</span>
                  <span style="font-size:11px;color:var(--text-muted)">Add Photo</span>
                  <input type="file" accept="image/*" multiple style="display:none" onchange="Pages.SchoolProfile.uploadGalleryPhotos(this)">
                </label>
              </div>
              <div style="font-size:11px;color:var(--text-muted)">Upload photos of classrooms, labs, sports grounds, events</div>
            </div>
          </div>

          <div class="card">
            <div class="card-header"><h3>🔑 Principal Details</h3></div>
            <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
              <div class="form-group" style="margin:0"><label class="form-label">Principal's Name</label><input id="sp-principal" class="form-control" value="${sc.principal_name||sc.settings?.principalName||''}" placeholder="Full name"></div>
              <div class="form-group" style="margin:0"><label class="form-label">Principal's Signature</label>
                <label style="cursor:pointer;display:block;padding:12px;border:2px dashed var(--border);border-radius:8px;text-align:center">
                  <div style="font-size:20px;margin-bottom:4px">✍️</div>
                  <div style="font-size:12px;color:var(--text-muted)">Upload signature image (PNG with transparent bg)</div>
                  <input type="file" accept="image/png" style="display:none" onchange="Pages.SchoolProfile.uploadPhoto(this,'signature')">
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>`;
  },

  async uploadPhoto(input, type) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5*1024*1024) { Toast.error('Image too large. Max 5MB'); return; }

    // Convert to base64 data URL for preview (in real app, upload to storage)
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      if (type === 'logo') {
        const area = document.getElementById('logo-area');
        if (area) area.innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover">`;
        // Store for save
        this._data = this._data || {};
        this._data._logoBase64 = dataUrl;
        Toast.success('Logo updated — click Save Changes to apply');
      } else if (type === 'cover') {
        const area = document.getElementById('cover-photo-area');
        if (area) area.style.background = `url(${dataUrl}) center/cover`;
        this._data = this._data || {};
        this._data._coverBase64 = dataUrl;
        Toast.success('Cover photo updated — click Save Changes to apply');
      } else if (type === 'signature') {
        this._data = this._data || {};
        this._data._signatureBase64 = dataUrl;
        Toast.success('Signature uploaded — click Save Changes to apply');
      }
    };
    reader.readAsDataURL(file);
  },

  uploadGalleryPhotos(input) {
    const files = Array.from(input.files);
    if (!files.length) return;
    const grid = document.getElementById('gallery-grid');
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        const div = document.createElement('div');
        div.style.cssText = 'aspect-ratio:1;border-radius:8px;overflow:hidden;position:relative';
        div.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">
          <button onclick="this.parentElement.remove()" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:12px">✕</button>`;
        grid.insertBefore(div, grid.lastElementChild);
      };
      reader.readAsDataURL(file);
    });
    Toast.success(`${files.length} photo(s) added to gallery`);
  },

  async saveProfile() {
    const g = id => document.getElementById(id)?.value?.trim() || '';
    const body = {
      name: g('sp-name'), shortName: g('sp-short'), type: g('sp-type'),
      boardingType: g('sp-boarding'), county: g('sp-county'), subCounty: g('sp-subcounty'),
      address: g('sp-addr'), phone: g('sp-phone'), email: g('sp-email'),
      website: g('sp-website'), motto: g('sp-motto'), description: g('sp-desc'),
      foundedYear: parseInt(g('sp-founded'))||undefined, knecCode: g('sp-knec'),
    };
    if (this._data?._logoBase64) body.logoUrl = this._data._logoBase64;
    if (this._data?._coverBase64) body.coverPhotoUrl = this._data._coverBase64;
    if (!body.name) { Toast.error('School name required'); return; }
    const btn = document.querySelector('[onclick*="saveProfile"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
    const r = await API.put('/schools/my', body);
    if (r?.id || r?.message || r?.name) {
      Toast.success('✅ School profile saved!');
    } else {
      Toast.error(r?.error || 'Save failed');
    }
    if (btn) { btn.disabled = false; btn.textContent = '💾 Save Changes'; }
  },
};
}
