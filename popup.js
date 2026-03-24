// ─── STATE ───────────────────────────────────────────────────────────────────
let leads = [];
let isRunning = false;
let selectedKRA = 'both';
let settings = { scrollDelay: 2000, autoNext: true, dedup: true, autoKRA: true };

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await loadFromStorage();
  setupTabs();
  setupFieldToggles();
  setupKRAChips();
  setupSettingToggles();
  setupButtons();
  updateLeadsTab();
  checkLinkedInTab();
});

// ─── STORAGE ──────────────────────────────────────────────────────────────────
async function loadFromStorage() {
  const data = await chrome.storage.local.get(['leads', 'settings']);
  leads = data.leads || [];
  if (data.settings) settings = { ...settings, ...data.settings };
  applySettings();
}

async function saveLeads() {
  await chrome.storage.local.set({ leads });
}

async function saveSettings() {
  await chrome.storage.local.set({ settings });
}

// ─── TAB SWITCHING ────────────────────────────────────────────────────────────
function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    });
  });
}

// ─── FIELD TOGGLES ────────────────────────────────────────────────────────────
function setupFieldToggles() {
  document.querySelectorAll('.field-toggle').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('checked');
    });
  });
}

function getSelectedFields() {
  const fields = {};
  document.querySelectorAll('.field-toggle').forEach(el => {
    fields[el.dataset.field] = el.classList.contains('checked');
  });
  return fields;
}

// ─── KRA CHIPS ───────────────────────────────────────────────────────────────
function setupKRAChips() {
  document.querySelectorAll('.kra-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.kra-chip').forEach(c => {
        c.classList.remove('active-tech', 'active-mkt', 'active-both');
      });
      selectedKRA = chip.dataset.kra;
      if (selectedKRA === 'tech') chip.classList.add('active-tech');
      else if (selectedKRA === 'mkt') chip.classList.add('active-mkt');
      else chip.classList.add('active-both');
    });
  });
}

// ─── SETTINGS TOGGLES ────────────────────────────────────────────────────────
function applySettings() {
  document.getElementById('scrollDelay').value = settings.scrollDelay;
  setToggle('toggleAutoNext', settings.autoNext);
  setToggle('toggleDedup', settings.dedup);
  setToggle('toggleKRA', settings.autoKRA);
}

function setToggle(id, on) {
  const el = document.getElementById(id);
  if (on) el.classList.add('on'); else el.classList.remove('on');
}

function setupSettingToggles() {
  ['toggleAutoNext', 'toggleDedup', 'toggleKRA'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      const el = document.getElementById(id);
      el.classList.toggle('on');
      const key = id === 'toggleAutoNext' ? 'autoNext' : id === 'toggleDedup' ? 'dedup' : 'autoKRA';
      settings[key] = el.classList.contains('on');
      saveSettings();
    });
  });
  document.getElementById('scrollDelay').addEventListener('change', (e) => {
    settings.scrollDelay = parseInt(e.target.value);
    saveSettings();
  });
}

// ─── BUTTONS ─────────────────────────────────────────────────────────────────
function setupButtons() {
  document.getElementById('btnStart').addEventListener('click', startExtraction);
  document.getElementById('btnStop').addEventListener('click', stopExtraction);
  document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
  document.getElementById('btnClearLeads').addEventListener('click', clearLeads);
  document.getElementById('btnResetAll').addEventListener('click', resetAll);
}

// ─── CHECK LINKEDIN ───────────────────────────────────────────────────────────
async function checkLinkedInTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (tab && tab.url && tab.url.includes('linkedin.com/sales')) {
      dot.classList.add('active');
      text.innerHTML = 'Connected to <span>Sales Navigator</span>';
    } else {
      dot.classList.remove('active');
      text.innerHTML = 'Open <span>Sales Navigator</span> to begin';
    }
  } catch (e) {}
}

// ─── EXTRACTION ───────────────────────────────────────────────────────────────
async function startExtraction() {
  if (isRunning) return;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !tab.url.includes('linkedin.com/sales')) {
    showToast('Please open LinkedIn Sales Navigator first', 'error');
    return;
  }

  isRunning = true;
  const pageFrom = parseInt(document.getElementById('pageFrom').value) || 1;
  const pageTo = parseInt(document.getElementById('pageTo').value) || 5;
  const totalPages = pageTo - pageFrom + 1;

  document.getElementById('btnStart').disabled = true;
  document.getElementById('btnStop').disabled = false;
  document.getElementById('progressWrap').classList.add('visible');

  const statusDot = document.getElementById('statusDot');
  statusDot.classList.add('scanning');
  statusDot.classList.remove('active');

  const fields = getSelectedFields();

  let currentPage = pageFrom;
  let extractedThisSession = 0;

  const extractPage = async () => {
    if (!isRunning || currentPage > pageTo) {
      finishExtraction(extractedThisSession);
      return;
    }

    const progress = ((currentPage - pageFrom) / totalPages) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressLabel').textContent = `Scanning page ${currentPage} of ${pageTo}...`;
    document.getElementById('progressCount').textContent = `${extractedThisSession} leads`;

    try {
      const results = await chrome.tabs.sendMessage(tab.id, {
        action: 'extractLeads',
        fields,
        kraFilter: selectedKRA,
        autoKRA: settings.autoKRA
      });

      if (results && results.leads) {
        for (const lead of results.leads) {
          if (settings.dedup) {
            const exists = leads.some(l => l.linkedinUrl === lead.linkedinUrl && lead.linkedinUrl);
            if (exists) continue;
          }
          leads.push(lead);
          extractedThisSession++;
        }
        await saveLeads();
        updateLeadsTab();
      }

      // Navigate next page if enabled
      if (settings.autoNext && currentPage < pageTo) {
        await chrome.tabs.sendMessage(tab.id, { action: 'nextPage' });
        setTimeout(() => {
          currentPage++;
          extractPage();
        }, settings.scrollDelay + 1500);
      } else {
        currentPage++;
        if (currentPage <= pageTo) {
          setTimeout(extractPage, settings.scrollDelay);
        } else {
          finishExtraction(extractedThisSession);
        }
      }
    } catch (e) {
      showToast('Error: Could not reach page content. Reload Sales Navigator.', 'error');
      finishExtraction(extractedThisSession);
    }
  };

  extractPage();
}

function stopExtraction() {
  isRunning = false;
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnStop').disabled = true;
  const statusDot = document.getElementById('statusDot');
  statusDot.classList.remove('scanning');
  statusDot.classList.add('active');
  showToast('Extraction stopped', 'error');
}

function finishExtraction(count) {
  isRunning = false;
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnStop').disabled = true;
  document.getElementById('progressFill').style.width = '100%';
  document.getElementById('progressLabel').textContent = 'Extraction complete!';
  document.getElementById('progressCount').textContent = `${count} leads found`;
  const statusDot = document.getElementById('statusDot');
  statusDot.classList.remove('scanning');
  statusDot.classList.add('active');
  showToast(`✅ Extracted ${count} leads!`, 'success');
  updateLeadsTab();
}

// ─── LEADS TAB ────────────────────────────────────────────────────────────────
function updateLeadsTab() {
  const total = leads.length;
  const tech = leads.filter(l => l.kra === 'Technology').length;
  const mkt = leads.filter(l => l.kra === 'Marketing').length;

  document.getElementById('statTotal').textContent = total;
  document.getElementById('statTech').textContent = tech;
  document.getElementById('statMkt').textContent = mkt;

  const exportBtn = document.getElementById('btnExportExcel');
  const clearBtn = document.getElementById('btnClearLeads');
  exportBtn.disabled = total === 0;
  clearBtn.disabled = total === 0;

  const wrap = document.getElementById('leadsListWrap');
  if (total === 0) {
    wrap.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No leads extracted yet.<br/>Go to Extract tab to start.</div></div>`;
    return;
  }

  const container = document.createElement('div');
  container.className = 'leads-container';

  leads.slice().reverse().forEach(lead => {
    const row = document.createElement('div');
    row.className = 'lead-row';
    const kraClass = lead.kra === 'Technology' ? 'kra-tech' : lead.kra === 'Marketing' ? 'kra-mkt' : 'kra-other';
    row.innerHTML = `
      <div>
        <div class="lead-name">${lead.name || '—'}</div>
        <div class="lead-title">${lead.company || '—'}</div>
      </div>
      <div class="lead-title">${lead.title || '—'}</div>
      <span class="lead-kra ${kraClass}">${lead.kra || 'N/A'}</span>
    `;
    container.appendChild(row);
  });

  wrap.innerHTML = '';
  wrap.appendChild(container);
}

// ─── EXPORT TO EXCEL ──────────────────────────────────────────────────────────
function exportToExcel() {
  if (leads.length === 0) return;

  const headers = [
    'Full Name', 'Job Title', 'Job Description', 'Company Name',
    'Company Size', 'Industry', 'City', 'State', 'LinkedIn URL',
    'KRA (Tech/Marketing)', 'Extracted Date'
  ];

  const rows = leads.map(l => [
    l.name || '',
    l.title || '',
    l.jobDesc || '',
    l.company || '',
    l.companySize || '',
    l.industry || '',
    l.city || '',
    l.state || '',
    l.linkedinUrl || '',
    l.kra || '',
    l.extractedAt || ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const filename = `LeadHarvest_${new Date().toISOString().slice(0, 10)}_${leads.length}leads.csv`;

  chrome.downloads.download({ url, filename, saveAs: true }, () => {
    showToast(`📥 Exported ${leads.length} leads!`, 'success');
  });
}

// ─── CLEAR / RESET ────────────────────────────────────────────────────────────
async function clearLeads() {
  if (!confirm(`Delete all ${leads.length} leads? This cannot be undone.`)) return;
  leads = [];
  await chrome.storage.local.remove('leads');
  updateLeadsTab();
  showToast('All leads cleared', 'error');
}

async function resetAll() {
  if (!confirm('Reset all data and settings? This cannot be undone.')) return;
  leads = [];
  settings = { scrollDelay: 2000, autoNext: true, dedup: true, autoKRA: true };
  await chrome.storage.local.clear();
  applySettings();
  updateLeadsTab();
  showToast('All data reset', 'error');
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(() => { toast.className = 'toast'; }, 3000);
}
