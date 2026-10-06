(() => {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const STORAGE_KEYS = { theme: 'rafeno_theme', saved: 'rafeno_saved' };
  const MAX_FILE = 4 * 1024 * 1024;

  let savedItems = [];
  let stagedFiles = [];

  const html = document.documentElement;
  const themeBtn = $('#themeBtn');
  const tabs = $$('.tab');
  const panels = $$('.panel');
  const countBadge = $('#countBadge');

  const textInput = $('#textInput');
  const charCount = $('#charCount');
  const pasteBtn = $('#pasteBtn');
  const clearTextBtn = $('#clearTextBtn');
  const saveTextBtn = $('#saveTextBtn');
  const shareTextBtn = $('#shareTextBtn');
  const quickChips = $$('.chip');

  const dropzone = $('#dropzone');
  const pickBtn = $('#pickBtn');
  const fileInput = $('#fileInput');
  const stagedWrap = $('#stagedWrap');
  const stagedList = $('#stagedList');
  const clearStaged = $('#clearStaged');

  const savedList = $('#savedList');
  const clearAllBtn = $('#clearAllBtn');

  const sheetBackdrop = $('#sheetBackdrop');
  const sheet = $('#sheet');
  const sheetTitle = $('#sheetTitle');
  const sheetSub = $('#sheetSub');
  const sheetGrid = $('#sheetGrid');
  const sheetClose = $('#sheetClose');

  const toast = $('#toast');

  let toastTimer;
  function showToast(msg, duration = 2200) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  function setTheme(theme) {
    html.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEYS.theme, theme); } catch (e) {}
  }
  function initTheme() {
    let stored = null;
    try { stored = localStorage.getItem(STORAGE_KEYS.theme); } catch (e) {}
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(stored || (prefersDark ? 'dark' : 'light'));
  }
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = html.getAttribute('data-theme');
      setTheme(current === 'dark' ? 'light' : 'dark');
    });
  }

  function switchTab(name) {
    tabs.forEach(t => {
      const active = t.dataset.tab === name;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', active);
    });
    panels.forEach(p => {
      const active = p.id === `panel-${name}`;
      p.classList.toggle('is-active', active);
      p.hidden = !active;
    });
  }
  tabs.forEach(tab => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

  function loadSaved() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.saved);
      savedItems = raw ? JSON.parse(raw) : [];
    } catch { savedItems = []; }
    updateBadge();
    renderSaved();
  }
  function persistSaved() {
    try { localStorage.setItem(STORAGE_KEYS.saved, JSON.stringify(savedItems)); }
    catch { showToast('Kaydku wuu buuxsamay'); }
    updateBadge();
  }
  function updateBadge() { if (countBadge) countBadge.textContent = savedItems.length; }

  function updateCharCount() { if (charCount && textInput) charCount.textContent = textInput.value.length; }
  if (textInput) textInput.addEventListener('input', updateCharCount);

  if (pasteBtn) {
    pasteBtn.addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          textInput.value = text;
          updateCharCount();
          showToast('Waa la dhejiyay');
        }
      } catch { showToast('Dhejintu ma shaqeyn — isku day gacanta'); }
    });
  }

  if (clearTextBtn) {
    clearTextBtn.addEventListener('click', () => {
      textInput.value = '';
      updateCharCount();
    });
  }

  quickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      textInput.value = chip.dataset.quick;
      updateCharCount();
      textInput.focus();
    });
  });

  if (saveTextBtn) {
    saveTextBtn.addEventListener('click', () => {
      const text = textInput.value.trim();
      if (!text) { showToast('Qoraal madhan lama kaydin karo'); return; }
      savedItems.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        type: 'text',
        text,
        createdAt: Date.now()
      });
      persistSaved();
      renderSaved();
      showToast('Qoraalka waa la kaydiyay');
    });
  }

  if (shareTextBtn) {
    shareTextBtn.addEventListener('click', () => {
      const text = textInput.value.trim();
      if (!text) { showToast('Qor wax aad wadaagto marka hore'); return; }
      openShareSheet(text, 'text');
    });
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function handleFiles(fileList) {
    const files = [...fileList];
    let added = 0, skipped = 0;
    files.forEach(file => {
      if (file.size > MAX_FILE) { skipped++; return; }
      stagedFiles.push(file);
      added++;
    });
    if (added) { renderStaged(); showToast(`${added} fayl la daray`); }
    if (skipped) showToast(`${skipped} fayl wuu ka weyn yahay 4 MB`, 3000);
  }

  function renderStaged() {
    if (!stagedWrap || !stagedList) return;
    if (!stagedFiles.length) {
      stagedWrap.hidden = true;
      stagedList.innerHTML = '';
      return;
    }
    stagedWrap.hidden = false;
    stagedList.innerHTML = '';
    stagedFiles.forEach((file, index) => {
      const item = document.createElement('div');
      item.className = 'item';

      const icon = document.createElement('div');
      icon.className = 'item-icon';
      icon.innerHTML = fileIcon(file.type);

      const body = document.createElement('div');
      body.className = 'item-body';

      const title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = file.name;

      const meta = document.createElement('div');
      meta.className = 'item-meta';
      meta.textContent = formatBytes(file.size);

      body.appendChild(title);
      body.appendChild(meta);

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const shareBtn = document.createElement('button');
      shareBtn.className = 'mini-btn';
      shareBtn.title = 'Wadaag';
      shareBtn.innerHTML = shareIcon();
      shareBtn.addEventListener('click', () => openShareSheet(file, 'file'));

      const removeBtn = document.createElement('button');
      removeBtn.className = 'mini-btn danger';
      removeBtn.title = 'Ka saar';
      removeBtn.innerHTML = trashIcon();
      removeBtn.addEventListener('click', () => {
        stagedFiles.splice(index, 1);
        renderStaged();
      });

      actions.appendChild(shareBtn);
      actions.appendChild(removeBtn);

      item.appendChild(icon);
      item.appendChild(body);
      item.appendChild(actions);
      stagedList.appendChild(item);
    });
  }

  function fileIcon(type) {
    type = type || '';
    if (type.startsWith('image/')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
    if (type.startsWith('video/')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
    if (type.startsWith('audio/')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    if (type.includes('pdf')) return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`;
  }
  function shareIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.6" y1="10.6" x2="15.4" y2="6.4"></line><line x1="8.6" y1="13.4" x2="15.4" y2="17.6"></line></svg>`;
  }
  function trashIcon() {
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
  }

  if (dropzone) {
    dropzone.addEventListener('click', () => fileInput.click());
    ['dragenter', 'dragover'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add('is-drag'); });
    });
    ['dragleave', 'drop'].forEach(evt => {
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove('is-drag'); });
    });
    dropzone.addEventListener('drop', (e) => {
      if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
    });
  }
  if (pickBtn) pickBtn.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  if (fileInput) fileInput.addEventListener('change', () => { handleFiles(fileInput.files); fileInput.value = ''; });

  if (clearStaged) {
    clearStaged.addEventListener('click', () => {
      stagedFiles = [];
      renderStaged();
      showToast('Liiska waa la nadiifiyay');
    });
  }

  function renderSaved() {
    if (!savedList) return;
    if (!savedItems.length) {
      savedList.innerHTML = `
        <div class="empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
          </svg>
          <p>Weli waxba lama kaydin.<br>Kaydi qoraal ama fayl si aad uga hesho halkan.</p>
        </div>`;
      return;
    }
    savedList.innerHTML = '';
    savedItems.forEach(item => {
      const el = document.createElement('div');
      el.className = 'item';

      const icon = document.createElement('div');
      icon.className = 'item-icon';
      if (item.type === 'text') {
        icon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
      } else {
        icon.innerHTML = fileIcon(item.mime || '');
      }

      const body = document.createElement('div');
      body.className = 'item-body';

      const title = document.createElement('div');
      title.className = 'item-title';
      title.textContent = item.type === 'text' ? 'Qoraal' : (item.name || 'Fayl');

      const meta = document.createElement('div');
      meta.className = 'item-meta';
      const date = new Date(item.createdAt).toLocaleDateString('so-SO', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      meta.textContent = date + (item.size ? ' · ' + formatBytes(item.size) : '');

      body.appendChild(title);
      body.appendChild(meta);

      if (item.type === 'text' && item.text) {
        const preview = document.createElement('div');
        preview.className = 'item-text';
        preview.textContent = item.text;
        body.appendChild(preview);
      }

      const actions = document.createElement('div');
      actions.className = 'item-actions';

      const shareBtn = document.createElement('button');
      shareBtn.className = 'mini-btn';
      shareBtn.title = 'Wadaag';
      shareBtn.innerHTML = shareIcon();
      shareBtn.addEventListener('click', () => {
        if (item.type === 'text') openShareSheet(item.text, 'text');
        else showToast('Faylka asalka ah lama kaydin — wadaag marka hore');
      });

      const removeBtn = document.createElement('button');
      removeBtn.className = 'mini-btn danger';
      removeBtn.title = 'Tirtir';
      removeBtn.innerHTML = trashIcon();
      removeBtn.addEventListener('click', () => {
        savedItems = savedItems.filter(i => i.id !== item.id);
        persistSaved();
        renderSaved();
        showToast('Waa la tirtiray');
      });

      actions.appendChild(shareBtn);
      actions.appendChild(removeBtn);

      el.appendChild(icon);
      el.appendChild(body);
      el.appendChild(actions);
      savedList.appendChild(el);
    });
  }

  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', () => {
      if (!savedItems.length) return;
      if (confirm('Ma hubtaa inaad tirtirto dhammaan kaydka?')) {
        savedItems = [];
        persistSaved();
        renderSaved();
        showToast('Kaydka waa la tirtiray');
      }
    });
  }

  let currentShareData = null;
  let currentShareType = null;

  function openShareSheet(data, type) {
    currentShareData = data;
    currentShareType = type;
    if (type === 'text') {
      sheetTitle.textContent = 'Wadaag qoraal';
      sheetSub.textContent = data.length > 80 ? data.slice(0, 80) + '…' : data;
    } else {
      sheetTitle.textContent = 'Wadaag fayl';
      sheetSub.textContent = `${data.name} · ${formatBytes(data.size)}`;
    }
    renderShareOptions();
    sheetBackdrop.hidden = false;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeShareSheet() {
    sheetBackdrop.hidden = true;
    sheet.hidden = true;
    document.body.style.overflow = '';
    currentShareData = null;
    currentShareType = null;
  }

  function renderShareOptions() {
    sheetGrid.innerHTML = '';
    const options = [
      {
        label: 'WhatsApp',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
        action: () => { const t = encodeURIComponent(getShareText()); window.open(`https://wa.me/?text=${t}`, '_blank'); }
      },
      {
        label: 'Telegram',
        icon: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
        action: () => { const t = encodeURIComponent(getShareText()); window.open(`https://t.me/share/url?url=${t}`, '_blank'); }
      },
      {
        label: 'Email',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`,
        action: () => {
          const subject = encodeURIComponent('Rafeno — Wadaag');
          const body = encodeURIComponent(getShareText());
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
      },
      {
        label: 'Copy',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
        action: async () => {
          if (currentShareType === 'text') {
            try { await navigator.clipboard.writeText(currentShareData); showToast('Qoraalka waa la koobiyeeyay'); }
            catch { showToast('Koobiyeyntu ma shaqeyn'); }
          } else showToast('Faylasha lama koobi karo');
        }
      },
      {
        label: 'Download',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
        action: () => downloadData()
      },
      {
        label: 'More',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>`,
        action: () => nativeShare()
      }
    ];

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'sheet-item';
      btn.type = 'button';
      btn.innerHTML = `${opt.icon}<span>${opt.label}</span>`;
      btn.addEventListener('click', () => { opt.action(); closeShareSheet(); });
      sheetGrid.appendChild(btn);
    });
  }

  function getShareText() {
    if (currentShareType === 'text') return currentShareData;
    return `${currentShareData.name} (${formatBytes(currentShareData.size)})`;
  }

  function downloadData() {
    if (currentShareType === 'text') {
      const blob = new Blob([currentShareData], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'rafeno-qoraal.txt'; a.click();
      URL.revokeObjectURL(url);
      showToast('Waa la soo dejiyay');
    } else {
      const url = URL.createObjectURL(currentShareData);
      const a = document.createElement('a');
      a.href = url; a.download = currentShareData.name; a.click();
      URL.revokeObjectURL(url);
      showToast('Waa la soo dejiyay');
    }
  }

  async function nativeShare() {
    if (currentShareType === 'text') {
      if (navigator.share) {
        try { await navigator.share({ title: 'Rafeno', text: currentShareData }); showToast('Waa la wadaagay'); }
        catch (e) { if (e.name !== 'AbortError') showToast('Wadaagtu ma shaqeyn'); }
      } else showToast('Wadaagta qalabkaaga ma taageerto');
    } else {
      if (navigator.canShare && navigator.canShare({ files: [currentShareData] })) {
        try { await navigator.share({ files: [currentShareData], title: currentShareData.name }); showToast('Waa la wadaagay'); }
        catch (e) { if (e.name !== 'AbortError') showToast('Wadaagtu ma shaqeyn'); }
      } else downloadData();
    }
  }

  if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeShareSheet);
  if (sheetClose) sheetClose.addEventListener('click', closeShareSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheet && !sheet.hidden) closeShareSheet();
  });

  function init() {
    initTheme();
    loadSaved();
    updateCharCount();
    renderStaged();
    renderSaved();
  }
  init();
})();
