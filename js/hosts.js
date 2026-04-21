// ═══════════════════════════════════════════════
//  hosts.js — full CRUD
// ═══════════════════════════════════════════════

import { db }                          from './firebase.js';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, confirmDialog, openModal, closeModal,
         slugify, setVal, getVal, setChecked, getChecked }
  from './utils.js';

let hostsList     = [];
let editingHostId = null;

// ── Load list ─────────────────────────────────────
export async function loadHosts() {
  const snap = await getDocs(collection(db, 'hosts'));
  hostsList  = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                        .sort((a,b) => (a.order||99) - (b.order||99));

  const tbody = document.getElementById('hosts-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  hostsList.forEach(host => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img class="img-thumb"
             src="${host.photoUrl || ''}"
             alt=""
             onerror="this.style.opacity=0"
             style="opacity:${host.photoUrl ? 1 : 0}" />
      </td>
      <td><strong>${host.name || host.id}</strong></td>
      <td class="td-muted td-truncate" style="max-width:160px">${host.role || '—'}</td>
      <td class="td-muted" style="font-size:12px">${(host.showIds || []).join(', ') || '—'}</td>
      <td class="td-mono">${host.order ?? '—'}</td>
      <td class="td-actions">
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" data-id="${host.id}" data-action="edit-host">Edit</button>
          <button class="btn btn-danger btn-sm"    data-id="${host.id}" data-action="del-host">Delete</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit-host"]').forEach(btn => {
    btn.addEventListener('click', () => openEditHost(btn.dataset.id));
  });
  tbody.querySelectorAll('[data-action="del-host"]').forEach(btn => {
    btn.addEventListener('click', () => deleteHost(btn.dataset.id));
  });
}

// ── Open modal for new host ───────────────────────
function openNewHost() {
  editingHostId = null;
  document.getElementById('modal-host-title').textContent = 'New Host';
  document.getElementById('host-id-row').style.display = 'flex';
  ['host-id','host-name','host-role','host-emoji','host-order',
   'host-photoUrl','host-shortBio','host-bio',
   'host-instagram','host-twitter','host-showIds'].forEach(id => setVal(id, ''));
  setVal('host-order', hostsList.length + 1);
  openModal('modal-host');
}

// ── Open modal for existing host ──────────────────
async function openEditHost(id) {
  const snap = await getDoc(doc(db, 'hosts', id));
  if (!snap.exists()) return;
  const data  = snap.data();
  editingHostId = id;

  document.getElementById('modal-host-title').textContent = `Edit — ${data.name}`;
  document.getElementById('host-id-row').style.display = 'none';

  setVal('host-name',      data.name || '');
  setVal('host-role',      data.role || '');
  setVal('host-emoji',     data.emoji || '');
  setVal('host-order',     data.order ?? '');
  setVal('host-photoUrl',  data.photoUrl || '');
  setVal('host-shortBio',  data.shortBio || '');
  setVal('host-bio',       data.bio || '');
  setVal('host-instagram', data.socials?.instagram || '');
  setVal('host-twitter',   data.socials?.twitter || '');
  setVal('host-showIds',   (data.showIds || []).join(', '));

  // Update photo preview
  updatePhotoPreview(data.photoUrl || '');

  openModal('modal-host');
}

function updatePhotoPreview(url) {
  const preview = document.getElementById('host-photo-preview');
  if (!preview) return;
  preview.src   = url;
  preview.style.display = url ? 'block' : 'none';
}

// ── Save ──────────────────────────────────────────
async function saveHost() {
  const btn = document.getElementById('save-host-btn');
  btn.disabled = true;

  let id = editingHostId;
  if (!id) {
    id = getVal('host-id').trim() || slugify(getVal('host-name'));
    if (!id) { toast('Host name / ID required', 'error'); btn.disabled = false; return; }
  }

  const showIdsRaw = getVal('host-showIds').split(',').map(s => s.trim()).filter(Boolean);

  const data = {
    name:      getVal('host-name'),
    role:      getVal('host-role'),
    emoji:     getVal('host-emoji'),
    order:     parseInt(getVal('host-order')) || 99,
    photoUrl:  getVal('host-photoUrl'),
    shortBio:  getVal('host-shortBio'),
    bio:       getVal('host-bio'),
    showIds:   showIdsRaw,
    socials: {
      instagram: getVal('host-instagram'),
      twitter:   getVal('host-twitter'),
    },
  };

  try {
    await setDoc(doc(db, 'hosts', id), data, { merge: true });
    toast(editingHostId ? 'Host updated ✓' : 'Host created ✓');
    closeModal('modal-host');
    await loadHosts();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
  btn.disabled = false;
}

// ── Delete ────────────────────────────────────────
async function deleteHost(id) {
  const host = hostsList.find(h => h.id === id);
  if (!await confirmDialog(`Delete host "${host?.name || id}"?`)) return;
  try {
    await deleteDoc(doc(db, 'hosts', id));
    toast('Host deleted');
    await loadHosts();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
}

// ── Wire UI ───────────────────────────────────────
document.getElementById('add-host-btn')?.addEventListener('click', openNewHost);
document.getElementById('save-host-btn')?.addEventListener('click', saveHost);
document.getElementById('host-photoUrl')?.addEventListener('input', e => updatePhotoPreview(e.target.value));
