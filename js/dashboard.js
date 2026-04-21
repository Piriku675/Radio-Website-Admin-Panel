// ═══════════════════════════════════════════════
//  dashboard.js
// ═══════════════════════════════════════════════

import { db }                        from './firebase.js';
import { collection, doc, getDocs, getDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getCurrentScheduleSlot }    from './utils.js';

export async function loadDashboard() {
  try {
    const [lsSnap, artsSnap, promosSnap, showsSnap,
           hostsSnap, winnersSnap, fbSnap, schedSnap] = await Promise.all([
      getDoc(doc(db, 'config/liveStream')),
      getDocs(collection(db, 'articles')),
      getDocs(collection(db, 'promotions')),
      getDocs(collection(db, 'shows')),
      getDocs(collection(db, 'hosts')),
      getDocs(collection(db, 'winners')),
      getDocs(collection(db, 'facebookFeed')),
      getDocs(collection(db, 'schedule')),
    ]);

    const ls = lsSnap.data() || {};

    // Live status
    const liveEl = document.getElementById('dash-live');
    if (liveEl) {
      liveEl.textContent = ls.isLive ? '● LIVE' : '○ Offline';
      liveEl.className = 'stat-val ' + (ls.isLive ? 'stat-live' : 'stat-offline');
    }

    // Current show — derive from schedule, not just stored showName
    const schedDocs = schedSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const currentSlot = getCurrentScheduleSlot(schedDocs);
    const showEl = document.getElementById('dash-show');
    if (showEl) showEl.textContent = currentSlot?.showName || ls.showName || '—';

    // Published articles
    const published = [...artsSnap.docs].filter(d => d.data().published).length;
    const artEl = document.getElementById('dash-articles');
    if (artEl) artEl.textContent = published;

    // Active promo
    const activePromo = [...promosSnap.docs].find(d => d.data().status === 'active');
    const promoEl = document.getElementById('dash-promo');
    if (promoEl) promoEl.textContent = activePromo ? activePromo.data().title : 'None';

    // Collection counts
    setText('dash-c-shows',    showsSnap.size);
    setText('dash-c-hosts',    hostsSnap.size);
    setText('dash-c-articles', artsSnap.size);
    setText('dash-c-promos',   promosSnap.size);
    setText('dash-c-winners',  winnersSnap.size);
    setText('dash-c-fb',       fbSnap.size);

    // Live dot in sidebar
    const liveDot = document.getElementById('nav-live-dot');
    if (liveDot) liveDot.style.display = ls.isLive ? 'block' : 'none';

  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
