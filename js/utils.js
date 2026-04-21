// ═══════════════════════════════════════════════
//  utils.js — shared helpers
// ═══════════════════════════════════════════════

import { Timestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Toast ────────────────────────────────────────
export function toast(msg, type = 'success') {
  const area = document.getElementById('toast-area');
  const el   = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  area.appendChild(el);
  setTimeout(() => el.remove(), 3300);
}

// ── Confirm dialog ───────────────────────────────
export function confirmDialog(msg = 'Are you sure? This cannot be undone.') {
  return new Promise(resolve => {
    const overlay = document.getElementById('confirm-overlay');
    document.getElementById('confirm-msg').textContent = msg;
    overlay.classList.add('open');

    const ok  = document.getElementById('confirm-ok');
    const can = document.getElementById('confirm-cancel');

    const done = val => {
      overlay.classList.remove('open');
      ok.replaceWith(ok.cloneNode(true));
      can.replaceWith(can.cloneNode(true));
      resolve(val);
    };

    document.getElementById('confirm-ok').addEventListener('click',     () => done(true),  { once: true });
    document.getElementById('confirm-cancel').addEventListener('click', () => done(false), { once: true });
  });
}

// ── Modal helpers ────────────────────────────────
export function openModal(id)  { document.getElementById(id).classList.add('open'); }
export function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Expose for inline onclick in HTML
window.closeModal = closeModal;

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

// ── Timestamp helpers ────────────────────────────
export function tsToISO(ts) {
  if (!ts) return '';
  if (ts && typeof ts.toDate === 'function') return ts.toDate().toISOString();
  return String(ts);
}

export function isoToTs(str) {
  if (!str) return null;
  try { return Timestamp.fromDate(new Date(str)); }
  catch { return null; }
}

export function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function nowISO() {
  return new Date().toISOString();
}

// ── Slug from string ─────────────────────────────
export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

// ── Day-of-week helpers ──────────────────────────
export const ALL_DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
export const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export function getTodayName() {
  return ALL_DAYS[new Date().getDay()];
}

export function getCurrentHour() {
  return new Date().getHours();
}

/**
 * Given an array of schedule docs, return the one currently on air.
 * Each doc has: { days: string[], startHour: number, showId, showName, displayTime }
 * Shows run for ~4 hours by default. We pick the one whose startHour is closest
 * to (but not after) the current hour on the current day.
 */
export function getCurrentScheduleSlot(schedDocs) {
  const today = getTodayName();
  const hour  = getCurrentHour();

  // Filter docs that are on today
  const todaySlots = schedDocs.filter(d => (d.days || []).includes(today));

  if (!todaySlots.length) return null;

  // Sort by startHour ascending
  todaySlots.sort((a, b) => a.startHour - b.startHour);

  // Find the slot that should be on air right now:
  // The active slot is the last one whose startHour <= current hour.
  // Slots wrap at midnight so we allow the previous day's last slot if it's < 6AM.
  let active = null;
  for (const slot of todaySlots) {
    if (slot.startHour <= hour) active = slot;
  }

  // If no slot found yet today (before first show) fall back to last slot
  if (!active) active = todaySlots[todaySlots.length - 1];

  return active;
}

// ── Set val helper ───────────────────────────────
export function setVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val ?? '';
}

export function getVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

export function setChecked(id, val) {
  const el = document.getElementById(id);
  if (el) el.checked = !!val;
}

export function getChecked(id) {
  const el = document.getElementById(id);
  return el ? el.checked : false;
}
