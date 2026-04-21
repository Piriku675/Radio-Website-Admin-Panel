// ═══════════════════════════════════════════════
//  schedule.js — schedule editor
//  Weekday / weekend grouping, per-slot show assignment
// ═══════════════════════════════════════════════

import { db }                          from './firebase.js';
import { collection, doc, getDocs, setDoc, deleteDoc, addDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, confirmDialog, openModal, closeModal, setVal, getVal }
  from './utils.js';

const ALL_DAYS     = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const WEEKDAY_SET  = new Set(['monday','tuesday','wednesday','thursday','friday']);
const WEEKEND_SET  = new Set(['saturday','sunday']);

const DAY_TABS = [
  { key: 'weekday', label: 'Weekdays (Mon–Fri)', days: ['monday','tuesday','wednesday','thursday','friday'] },
  { key: 'saturday', label: 'Saturday',          days: ['saturday'] },
  { key: 'sunday',   label: 'Sunday',            days: ['sunday'] },
];

let schedDocs  = [];
let showsList  = [];
let editingSlotId = null;
let activeTab  = 'weekday';

// ── Load ──────────────────────────────────────────
export async function loadSchedule() {
  const [schedSnap, showsSnap] = await Promise.all([
    getDocs(collection(db, 'schedule')),
    getDocs(collection(db, 'shows')),
  ]);

  schedDocs = schedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  showsList  = showsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
                             .sort((a,b) => (a.order||99) - (b.order||99));

  renderTabs();
  renderSlots(activeTab);
  buildShowSelect();
}

// ── Tabs ──────────────────────────────────────────
function renderTabs() {
  const tabBar = document.getElementById('sched-day-tabs');
  if (!tabBar) return;
  tabBar.innerHTML = '';
  DAY_TABS.forEach(tab => {
    const btn = document.createElement('button');
    btn.className = 'sched-day-tab' + (tab.key === activeTab ? ' active' : '');
    btn.textContent = tab.label;
    btn.dataset.tab = tab.key;
    btn.addEventListener('click', () => {
      activeTab = tab.key;
      document.querySelectorAll('.sched-day-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSlots(tab.key);
    });
    tabBar.appendChild(btn);
  });
}

// ── Slots ─────────────────────────────────────────
function renderSlots(tabKey) {
  const container = document.getElementById('sched-slots-body');
  if (!container) return;

  const tab = DAY_TABS.find(t => t.key === tabKey);
  const days = tab?.days || [];

  // Get all slots relevant to this tab's days
  // A slot "belongs" to a tab if ANY of its days match ANY day in the tab
  const relevant = schedDocs.filter(s =>
    (s.days || []).some(d => days.includes(d))
  );
  relevant.sort((a,b) => (a.startHour||0) - (b.startHour||0));

  container.innerHTML = '';

  if (!relevant.length) {
    container.innerHTML = `<div style="padding:20px;color:var(--muted);font-size:13px">No slots scheduled for this period. Click "+ Add Slot" to create one.</div>`;
    return;
  }

  relevant.forEach(slot => {
    const show = showsList.find(s => s.id === slot.showId);
    const row  = document.createElement('div');
    row.className = 'schedule-slot';
    row.innerHTML = `
      <div class="slot-time">${slot.displayTime || formatHour(slot.startHour)}</div>
      <div>
        <div class="slot-show">${show?.emoji || ''} ${slot.showName || slot.showId || '—'}</div>
        <div class="slot-show-sub">${formatDays(slot.days)}</div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-secondary btn-sm" data-id="${slot.id}" data-action="edit-slot">Edit</button>
        <button class="btn btn-danger btn-sm"    data-id="${slot.id}" data-action="del-slot">Remove</button>
      </div>`;
    container.appendChild(row);
  });

  // Wire edit/delete
  container.querySelectorAll('[data-action="edit-slot"]').forEach(btn => {
    btn.addEventListener('click', () => openEditSlot(btn.dataset.id));
  });
  container.querySelectorAll('[data-action="del-slot"]').forEach(btn => {
    btn.addEventListener('click', () => deleteSlot(btn.dataset.id));
  });
}

// ── Add / Edit slot modal ─────────────────────────
function buildShowSelect() {
  const sel = document.getElementById('slot-showId');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select a show —</option>' +
    showsList.map(s => `<option value="${s.id}">${s.emoji||''} ${s.name}</option>`).join('');
}

function openAddSlot() {
  editingSlotId = null;
  document.getElementById('modal-slot-title').textContent = 'Add Schedule Slot';
  setVal('slot-showId', '');
  setVal('slot-startHour', '6');
  setVal('slot-displayTime', '');

  // Default days = current tab
  const tab = DAY_TABS.find(t => t.key === activeTab);
  ALL_DAYS.forEach(d => {
    const cb = document.getElementById(`slot-day-${d}`);
    if (cb) cb.checked = tab ? tab.days.includes(d) : false;
  });

  openModal('modal-slot');
}

function openEditSlot(id) {
  const slot = schedDocs.find(s => s.id === id);
  if (!slot) return;
  editingSlotId = id;
  document.getElementById('modal-slot-title').textContent = 'Edit Schedule Slot';
  setVal('slot-showId', slot.showId || '');
  setVal('slot-startHour', slot.startHour ?? 6);
  setVal('slot-displayTime', slot.displayTime || '');

  // Checkboxes
  ALL_DAYS.forEach(d => {
    const cb = document.getElementById(`slot-day-${d}`);
    if (cb) cb.checked = (slot.days || []).includes(d);
  });

  // Sync show name field
  syncShowNameFromSelect();
  openModal('modal-slot');
}

function syncShowNameFromSelect() {
  const selEl   = document.getElementById('slot-showId');
  const nameEl  = document.getElementById('slot-showName');
  const showId  = selEl?.value;
  const show    = showsList.find(s => s.id === showId);
  if (nameEl && show) nameEl.value = show.name;
}

async function saveSlot() {
  const showId = getVal('slot-showId');
  const show   = showsList.find(s => s.id === showId);
  const startHour = parseInt(getVal('slot-startHour')) || 0;
  const displayTime = getVal('slot-displayTime');

  const selectedDays = ALL_DAYS.filter(d => {
    const cb = document.getElementById(`slot-day-${d}`);
    return cb?.checked;
  });

  if (!showId) { toast('Please select a show', 'error'); return; }
  if (!selectedDays.length) { toast('Please select at least one day', 'error'); return; }

  const data = {
    showId,
    showName:    show?.name || showId,
    displayTime: displayTime || formatHour(startHour),
    startHour,
    days:        selectedDays,
  };

  try {
    if (editingSlotId) {
      await setDoc(doc(db, 'schedule', editingSlotId), data);
    } else {
      const id = `sched-${showId}-${Date.now()}`;
      await setDoc(doc(db, 'schedule', id), data);
    }
    toast('Schedule saved ✓');
    closeModal('modal-slot');
    await loadSchedule();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

async function deleteSlot(id) {
  if (!await confirmDialog('Remove this schedule slot?')) return;
  try {
    await deleteDoc(doc(db, 'schedule', id));
    toast('Slot removed');
    await loadSchedule();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ── Helpers ───────────────────────────────────────
function formatHour(h) {
  if (h == null) return '';
  const hh = ((h % 24) + 24) % 24;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const display = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${display}:00 ${ampm}`;
}

function formatDays(days = []) {
  if (!days.length) return '';
  const ordered = ALL_DAYS.filter(d => days.includes(d));
  const labels = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun' };
  return ordered.map(d => labels[d]).join(', ');
}

// ── Wire UI ───────────────────────────────────────
document.getElementById('add-slot-btn')?.addEventListener('click', openAddSlot);
document.getElementById('save-slot-btn')?.addEventListener('click', saveSlot);
document.getElementById('slot-showId')?.addEventListener('change', syncShowNameFromSelect);
