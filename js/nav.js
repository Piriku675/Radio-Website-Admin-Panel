// ═══════════════════════════════════════════════
//  nav.js — sidebar navigation & panel switching
// ═══════════════════════════════════════════════

// Lazy-import loaders so we avoid circular deps
const loaderMap = {};

export function registerLoader(panelId, fn) {
  loaderMap[panelId] = fn;
}

export function goPanel(id) {
  // Deactivate all panels
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  // Activate target
  const panel = document.getElementById(`panel-${id}`);
  if (panel) panel.classList.add('active');

  // Update sidebar
  document.querySelectorAll('.nav-item[data-panel]').forEach(n => n.classList.remove('active'));
  const navItem = document.querySelector(`.nav-item[data-panel="${id}"]`);
  if (navItem) navItem.classList.add('active');

  // Run loader
  if (loaderMap[id]) loaderMap[id]();

  // Close mobile sidebar
  closeMobileSidebar();

  // Store last panel
  try { sessionStorage.setItem('wvbz_panel', id); } catch {}
}

// Expose globally (used by dashboard quick-action buttons)
window.goPanel = goPanel;

// ── Wire sidebar nav items ────────────────────────
document.querySelectorAll('.nav-item[data-panel]').forEach(btn => {
  btn.addEventListener('click', () => goPanel(btn.dataset.panel));
});

// ── Mobile sidebar toggle ─────────────────────────
const sidebar        = document.querySelector('.sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const hamburger      = document.getElementById('hamburger-btn');

function openMobileSidebar() {
  sidebar.classList.add('mobile-open');
  sidebarOverlay.classList.add('visible');
}
function closeMobileSidebar() {
  sidebar.classList.remove('mobile-open');
  sidebarOverlay.classList.remove('visible');
}

hamburger?.addEventListener('click', () => {
  sidebar.classList.contains('mobile-open') ? closeMobileSidebar() : openMobileSidebar();
});
sidebarOverlay?.addEventListener('click', closeMobileSidebar);

// ── Overview (dashboard) collapse toggle ──────────
// The dashboard stats section can be collapsed to save space
const overviewToggle = document.getElementById('overview-toggle-btn');
const overviewBody   = document.getElementById('overview-collapse-body');
let overviewOpen = true;

function setOverviewState(open) {
  overviewOpen = open;
  if (overviewBody) {
    overviewBody.style.display = open ? 'block' : 'none';
  }
  if (overviewToggle) {
    overviewToggle.querySelector('.arrow').textContent = open ? '▲' : '▼';
    overviewToggle.querySelector('.toggle-label').textContent = open ? 'Hide Overview' : 'Show Overview';
  }
  try { localStorage.setItem('wvbz_overview', open ? '1' : '0'); } catch {}
}

overviewToggle?.addEventListener('click', () => setOverviewState(!overviewOpen));

// Restore persisted state
try {
  const saved = localStorage.getItem('wvbz_overview');
  if (saved === '0') setOverviewState(false);
} catch {}

// ── Restore last panel on load ────────────────────
export function restorePanel() {
  try {
    const last = sessionStorage.getItem('wvbz_panel');
    if (last && document.getElementById(`panel-${last}`)) {
      goPanel(last);
      return;
    }
  } catch {}
  goPanel('dashboard');
}
