// ═══════════════════════════════════════════════
//  shows.js — full CRUD
// ═══════════════════════════════════════════════

import { db }                          from './firebase.js';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, confirmDialog, openModal, closeModal,
         slugify, setVal, getVal, setChecked, getChecked }
  from './utils.js';

let showsList     = [];
let editingShowId = null;

// ── Load list ─────────────────────────────────────
export async function loadShows() {
  const snap = await getDocs(collection(db, 'shows'));
  showsList  = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                        .sort((a,b) => (a.order||99) - (b.order||99));

  const tbody = document.getElementById('shows-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  showsList.forEach(show => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-truncate" style="max-width:160px">
        <strong>${show.emoji || ''} ${show.name || show.id}</strong>
      </td>
      <td class="td-muted td-truncate" style="max-width:140px">${show.timeSlot || '—'}</td>
      <td class="td-muted" style="font-size:12px">${(show.hostNames || []).join(', ') || '—'}</td>
      <td>${show.featured
        ? '<span class="badge badge-accent">Featured</span>'
        : '<span class="badge badge-gray">No</span>'}</td>
      <td class="td-mono">${show.order ?? '—'}</td>
      <td class="td-actions">
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" data-id="${show.id}" data-action="edit-show">Edit</button>
          <button class="btn btn-danger btn-sm"    data-id="${show.id}" data-action="del-show">Delete</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit-show"]').forEach(btn => {
    btn.addEventListener('click', () => openEditShow(btn.dataset.id));
  });
  tbody.querySelectorAll('[data-action="del-show"]').forEach(btn => {
    btn.addEventListener('click', () => deleteShow(btn.dataset.id));
  });
}

// ── Open modal for new show ───────────────────────
function openNewShow() {
  editingShowId = null;
  document.getElementById('modal-show-title').textContent = 'New Show';
  document.getElementById('show-id-row').style.display = 'flex';
  ['show-id','show-name','show-emoji','show-timeSlot','show-displayTime',
   'show-order','show-thumbnailUrl','show-description','show-features'].forEach(id => setVal(id, ''));
  setChecked('show-featured', false);
  setVal('show-order', showsList.length + 1);
  openModal('modal-show');
}

// ── Open modal for existing show ──────────────────
async function openEditShow(id) {
  const snap = await getDoc(doc(db, 'shows', id));
  if (!snap.exists()) return;
  const data = snap.data();
  editingShowId = id;

  document.getElementById('modal-show-title').textContent = `Edit — ${data.name}`;
  document.getElementById('show-id-row').style.display = 'none'; // can't change ID

  setVal('show-name',         data.name || '');
  setVal('show-emoji',        data.emoji || '');
  setVal('show-timeSlot',     data.timeSlot || '');
  setVal('show-displayTime',  data.displayTime || '');
  setVal('show-order',        data.order ?? '');
  setVal('show-thumbnailUrl', data.thumbnailUrl || '');
  setVal('show-description',  data.description || '');
  setVal('show-features',     (data.features || []).join('\n'));
  setChecked('show-featured', !!data.featured);

  openModal('modal-show');
}

// ── Save ──────────────────────────────────────────
async function saveShow() {
  const btn = document.getElementById('save-show-btn');
  btn.disabled = true;

  let id = editingShowId;
  if (!id) {
    // New show — use provided ID or auto-generate from name
    id = getVal('show-id').trim() || slugify(getVal('show-name'));
    if (!id) { toast('Show name / ID required', 'error'); btn.disabled = false; return; }
  }

  const data = {
    name:         getVal('show-name'),
    emoji:        getVal('show-emoji'),
    timeSlot:     getVal('show-timeSlot'),
    displayTime:  getVal('show-displayTime'),
    order:        parseInt(getVal('show-order')) || 99,
    featured:     getChecked('show-featured'),  // ONLY controls homepage featured highlight
    thumbnailUrl: getVal('show-thumbnailUrl'),
    description:  getVal('show-description'),
    features:     getVal('show-features').split('\n').map(s => s.trim()).filter(Boolean),
  };

  // Preserve hostIds / hostNames if editing (don't wipe them)
  if (editingShowId) {
    const snap = await getDoc(doc(db, 'shows', id));
    const existing = snap.data() || {};
    data.hostIds   = existing.hostIds   || [];
    data.hostNames = existing.hostNames || [];
    data.scheduleRows = existing.scheduleRows || [];
  }

  try {
    await setDoc(doc(db, 'shows', id), data, { merge: true });
    toast(editingShowId ? 'Show updated ✓' : 'Show created ✓');
    closeModal('modal-show');
    await loadShows();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
  btn.disabled = false;
}

// ── Delete ────────────────────────────────────────
async function deleteShow(id) {
  const show = showsList.find(s => s.id === id);
  if (!await confirmDialog(`Delete "${show?.name || id}"? This cannot be undone.`)) return;
  try {
    await deleteDoc(doc(db, 'shows', id));
    toast('Show deleted');
    await loadShows();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ── Wire UI ───────────────────────────────────────
document.getElementById('add-show-btn')?.addEventListener('click', openNewShow);
document.getElementById('save-show-btn')?.addEventListener('click', saveShow);
