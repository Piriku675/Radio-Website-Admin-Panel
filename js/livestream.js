// ═══════════════════════════════════════════════
//  livestream.js
//  Auto-detects current show from schedule.
//  Admins can override stream URL and isLive flag.
// ═══════════════════════════════════════════════

import { db }                          from './firebase.js';
import { doc, getDoc, setDoc, getDocs, collection }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, getCurrentScheduleSlot, setVal, setChecked, getVal, getChecked }
  from './utils.js';

export async function loadLivestream() {
  const [lsSnap, schedSnap] = await Promise.all([
    getDoc(doc(db, 'config/liveStream')),
    getDocs(collection(db, 'schedule')),
  ]);

  const ls         = lsSnap.data() || {};
  const schedDocs  = schedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  const currentSlot = getCurrentScheduleSlot(schedDocs);

  // Populate form
  setVal('ls-streamUrl',     ls.streamUrl || '');
  setChecked('ls-isLive',    !!ls.isLive);

  // Current show info — from live schedule detection
  const autoShowName    = currentSlot?.showName    || '—';
  const autoDisplayTime = currentSlot?.displayTime || '—';
  const autoShowId      = currentSlot?.showId      || '';

  // Show the auto-detected show info
  const autoEl = document.getElementById('ls-auto-show');
  if (autoEl) {
    autoEl.innerHTML = `
      <span class="badge badge-green" style="margin-right:6px">Auto-detected</span>
      <strong>${autoShowName}</strong>
      <span class="text-muted text-sm" style="margin-left:8px">${autoDisplayTime}</span>
    `;
  }

  // Update stored liveStream doc's show info to match schedule
  // (so the public site also gets the right show automatically)
  if (currentSlot) {
    // Fetch show details for thumbnail etc.
    try {
      const showSnap = await getDoc(doc(db, 'shows', currentSlot.showId));
      const showData = showSnap.exists() ? showSnap.data() : {};

      document.getElementById('ls-auto-thumb')?.setAttribute('src', showData.thumbnailUrl || '');
      document.getElementById('ls-auto-tagline').textContent  = showData.description
        ? showData.description.split('\n')[0].slice(0, 80) + '…'
        : '';
    } catch {}
  }

  // Live / offline indicator
  updateLiveDot(!!ls.isLive, autoShowName);
}

function updateLiveDot(isLive, showName) {
  const dot = document.getElementById('stream-live-dot');
  const lbl = document.getElementById('stream-live-label');
  if (dot) dot.className = 'live-dot' + (isLive ? '' : ' offline');
  if (lbl) lbl.textContent = isLive
    ? `Stream is LIVE · ${showName}`
    : 'Stream is Offline';
}

document.getElementById('save-livestream-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('save-livestream-btn');
  btn.disabled = true;

  try {
    // Read the current schedule to get live show info
    const schedSnap   = await getDocs(collection(db, 'schedule'));
    const schedDocs   = schedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const currentSlot = getCurrentScheduleSlot(schedDocs);

    // Optionally fetch show thumbnail
    let showData = {};
    if (currentSlot?.showId) {
      try {
        const showSnap = await getDoc(doc(db, 'shows', currentSlot.showId));
        if (showSnap.exists()) showData = showSnap.data();
      } catch {}
    }

    await setDoc(doc(db, 'config/liveStream'), {
      streamUrl:     getVal('ls-streamUrl'),
      isLive:        getChecked('ls-isLive'),
      // Auto-filled from schedule
      showName:      currentSlot?.showName    || '',
      showTagline:   showData.description?.split('\n')[0]?.slice(0, 100) || '',
      timeSlot:      currentSlot?.displayTime || '',
      thumbnailUrl:  showData.thumbnailUrl    || '',
      currentShowId: currentSlot?.showId      || '',
      updatedAt:     Timestamp.now(),
    });

    toast('Live stream saved ✓');
    await loadLivestream();
  } catch (e) {
    toast('Error: ' + e.message, 'error');
  }
  btn.disabled = false;
});
