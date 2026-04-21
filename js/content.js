// ═══════════════════════════════════════════════
//  content.js — promostrip, articles, facebookfeed,
//               promotions, winners, config
// ═══════════════════════════════════════════════

import { db }                         from './firebase.js';
import { collection, doc, getDocs, getDoc, setDoc, deleteDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { Timestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { toast, confirmDialog, openModal, closeModal,
         slugify, tsToISO, isoToTs, fmtDate, nowISO,
         setVal, getVal, setChecked, getChecked }
  from './utils.js';

// ═══════════════════════════════════════════════
//  PROMO STRIP
// ═══════════════════════════════════════════════

let currentPsId = null;

export async function loadPromoStrip() {
  const snap  = await getDocs(collection(db, 'promoStrip'));
  const tbody = document.getElementById('promostrip-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const docs = [...snap.docs].sort((a,b) => (a.data().order||99) - (b.data().order||99));
  docs.forEach(d => {
    const data = d.data();
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${data.title || '—'}</strong></td>
      <td class="td-truncate td-muted" style="max-width:200px">${data.subtitle || '—'}</td>
      <td class="td-mono">${data.order ?? '—'}</td>
      <td>${data.active
        ? '<span class="badge badge-green">Active</span>'
        : '<span class="badge badge-gray">Inactive</span>'}</td>
      <td class="td-actions">
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" data-id="${d.id}" data-action="edit-ps">Edit</button>
          <button class="btn btn-danger btn-sm"    data-id="${d.id}" data-action="del-ps">Delete</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit-ps"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s    = await getDoc(doc(db, 'promoStrip', btn.dataset.id));
      const data = s.data();
      currentPsId = btn.dataset.id;
      document.getElementById('modal-ps-title').textContent = 'Edit Promo Strip';
      setVal('ps-title',    data.title    || '');
      setVal('ps-subtitle', data.subtitle || '');
      setVal('ps-linkPage', data.linkPage || '');
      setVal('ps-order',    data.order    ?? 1);
      setChecked('ps-active', !!data.active);
      openModal('modal-promostrip');
    });
  });

  tbody.querySelectorAll('[data-action="del-ps"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!await confirmDialog('Delete this promo strip?')) return;
      await deleteDoc(doc(db, 'promoStrip', btn.dataset.id));
      toast('Promo strip deleted');
      loadPromoStrip();
    });
  });
}

document.getElementById('add-promostrip-btn')?.addEventListener('click', () => {
  currentPsId = null;
  document.getElementById('modal-ps-title').textContent = 'New Promo Strip';
  setVal('ps-title', ''); setVal('ps-subtitle', '');
  setVal('ps-linkPage', 'promotions'); setVal('ps-order', 1);
  setChecked('ps-active', true);
  openModal('modal-promostrip');
});

document.getElementById('save-ps-btn')?.addEventListener('click', async () => {
  const id   = currentPsId || slugify(getVal('ps-title')) || ('ps-' + Date.now());
  const data = {
    title:    getVal('ps-title'),
    subtitle: getVal('ps-subtitle'),
    linkPage: getVal('ps-linkPage'),
    order:    parseInt(getVal('ps-order')) || 1,
    active:   getChecked('ps-active'),
  };
  try {
    await setDoc(doc(db, 'promoStrip', id), data);
    toast('Promo strip saved ✓');
    closeModal('modal-promostrip');
    loadPromoStrip();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
});

// ═══════════════════════════════════════════════
//  ARTICLES
// ═══════════════════════════════════════════════

let currentArticleId = null;

export async function loadArticles() {
  const snap  = await getDocs(collection(db, 'articles'));
  const docs  = [...snap.docs].sort((a,b) =>
    (b.data().publishedAt?.seconds||0) - (a.data().publishedAt?.seconds||0));
  const tbody = document.getElementById('articles-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  docs.forEach(d => {
    const data = d.data();
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-truncate" style="max-width:200px">
        <strong>${data.emoji || ''} ${data.title || d.id}</strong>
      </td>
      <td class="td-muted" style="font-size:12px">${data.category || '—'}</td>
      <td>${data.published
        ? '<span class="badge badge-green">Published</span>'
        : '<span class="badge badge-gray">Draft</span>'}</td>
      <td class="td-muted" style="font-size:12px">${fmtDate(data.publishedAt)}</td>
      <td class="td-actions">
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" data-id="${d.id}" data-action="edit-art">Edit</button>
          <button class="btn ${data.published ? 'btn-warning' : 'btn-success'} btn-sm"
                  data-id="${d.id}" data-pub="${data.published}" data-action="toggle-art">
            ${data.published ? 'Unpublish' : 'Publish'}
          </button>
          <button class="btn btn-danger btn-sm" data-id="${d.id}" data-action="del-art">Delete</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit-art"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s    = await getDoc(doc(db, 'articles', btn.dataset.id));
      const data = s.data();
      currentArticleId = btn.dataset.id;
      document.getElementById('modal-article-title').textContent = `Edit — ${data.title}`;
      setVal('art-title',        data.title        || '');
      setVal('art-category',     data.category     || '');
      setVal('art-emoji',        data.emoji        || '');
      setVal('art-excerpt',      data.excerpt      || '');
      setVal('art-thumbnailUrl', data.thumbnailUrl || '');
      setVal('art-imageUrl',     data.imageUrl     || '');
      setVal('art-contentHtml',  data.contentHtml  || '');
      setVal('art-publishedAt',  tsToISO(data.publishedAt));
      setChecked('art-published', !!data.published);
      openModal('modal-article');
    });
  });

  tbody.querySelectorAll('[data-action="toggle-art"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const pub = btn.dataset.pub === 'true';
      await setDoc(doc(db, 'articles', btn.dataset.id), { published: !pub }, { merge: true });
      toast(!pub ? 'Article published ✓' : 'Article unpublished');
      loadArticles();
    });
  });

  tbody.querySelectorAll('[data-action="del-art"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!await confirmDialog('Delete this article permanently?')) return;
      await deleteDoc(doc(db, 'articles', btn.dataset.id));
      toast('Article deleted');
      loadArticles();
    });
  });
}

document.getElementById('add-article-btn')?.addEventListener('click', () => {
  currentArticleId = null;
  document.getElementById('modal-article-title').textContent = 'New Article';
  ['art-title','art-category','art-emoji','art-excerpt',
   'art-thumbnailUrl','art-imageUrl','art-contentHtml'].forEach(id => setVal(id, ''));
  setVal('art-publishedAt', nowISO());
  setChecked('art-published', false);
  openModal('modal-article');
});

document.getElementById('save-article-btn')?.addEventListener('click', async () => {
  const btn = document.getElementById('save-article-btn');
  btn.disabled = true;
  const id   = currentArticleId
    || slugify(getVal('art-title')) + '-' + Date.now();
  const data = {
    title:        getVal('art-title'),
    category:     getVal('art-category'),
    emoji:        getVal('art-emoji'),
    excerpt:      getVal('art-excerpt'),
    thumbnailUrl: getVal('art-thumbnailUrl'),
    imageUrl:     getVal('art-imageUrl'),
    contentHtml:  getVal('art-contentHtml'),
    publishedAt:  isoToTs(getVal('art-publishedAt')) || Timestamp.now(),
    published:    getChecked('art-published'),
  };
  try {
    await setDoc(doc(db, 'articles', id), data, { merge: true });
    toast(currentArticleId ? 'Article updated ✓' : 'Article created ✓');
    closeModal('modal-article');
    loadArticles();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
  btn.disabled = false;
});

// ═══════════════════════════════════════════════
//  FACEBOOK FEED
// ═══════════════════════════════════════════════

let currentFbId = null;

export async function loadFbFeed() {
  const snap  = await getDocs(collection(db, 'facebookFeed'));
  const docs  = [...snap.docs].sort((a,b) =>
    (b.data().postedAt?.seconds||0) - (a.data().postedAt?.seconds||0));
  const tbody = document.getElementById('fb-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  docs.forEach(d => {
    const data = d.data();
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-truncate" style="max-width:280px">${data.text || '—'}</td>
      <td class="td-muted" style="font-size:12px">${fmtDate(data.postedAt)}</td>
      <td class="td-actions">
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" data-id="${d.id}" data-action="edit-fb">Edit</button>
          <button class="btn btn-danger btn-sm"    data-id="${d.id}" data-action="del-fb">Delete</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit-fb"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s    = await getDoc(doc(db, 'facebookFeed', btn.dataset.id));
      const data = s.data();
      currentFbId = btn.dataset.id;
      document.getElementById('modal-fb-title').textContent = 'Edit Post';
      setVal('fb-text',     data.text || '');
      setVal('fb-postedAt', tsToISO(data.postedAt));
      openModal('modal-fb');
    });
  });

  tbody.querySelectorAll('[data-action="del-fb"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!await confirmDialog('Delete this Facebook post?')) return;
      await deleteDoc(doc(db, 'facebookFeed', btn.dataset.id));
      toast('Post deleted');
      loadFbFeed();
    });
  });
}

document.getElementById('add-fb-btn')?.addEventListener('click', () => {
  currentFbId = null;
  document.getElementById('modal-fb-title').textContent = 'Add Post';
  setVal('fb-text', '');
  setVal('fb-postedAt', nowISO());
  openModal('modal-fb');
});

document.getElementById('save-fb-btn')?.addEventListener('click', async () => {
  const id   = currentFbId || ('fb-' + Date.now());
  const data = {
    text:     getVal('fb-text'),
    postedAt: isoToTs(getVal('fb-postedAt')) || Timestamp.now(),
  };
  try {
    await setDoc(doc(db, 'facebookFeed', id), data);
    toast('Post saved ✓');
    closeModal('modal-fb');
    loadFbFeed();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
});

// ═══════════════════════════════════════════════
//  PROMOTIONS
// ═══════════════════════════════════════════════

let currentPromoId = null;

export async function loadPromotions() {
  const snap  = await getDocs(collection(db, 'promotions'));
  const docs  = [...snap.docs].sort((a,b) => {
    const ord = { active:0, ended:1 };
    return (ord[a.data().status]||1) - (ord[b.data().status]||1);
  });
  const tbody = document.getElementById('promos-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  docs.forEach(d => {
    const data  = d.data();
    const badge = data.status === 'active'
      ? '<span class="badge badge-green">Active</span>'
      : '<span class="badge badge-gray">Ended</span>';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${data.emoji || ''} ${data.title || d.id}</strong></td>
      <td>${badge}</td>
      <td class="td-muted" style="font-size:12px">${fmtDate(data.startsAt)}</td>
      <td class="td-muted" style="font-size:12px">${fmtDate(data.endsAt)}</td>
      <td class="td-actions">
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" data-id="${d.id}" data-action="edit-promo">Edit</button>
          <button class="btn btn-danger btn-sm"    data-id="${d.id}" data-action="del-promo">Delete</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit-promo"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s    = await getDoc(doc(db, 'promotions', btn.dataset.id));
      const data = s.data();
      currentPromoId = btn.dataset.id;
      document.getElementById('modal-promo-title').textContent = `Edit — ${data.title}`;
      setVal('promo-title',       data.title       || '');
      setVal('promo-emoji',       data.emoji       || '');
      setVal('promo-status',      data.status      || 'active');
      setVal('promo-statusLabel', data.statusLabel || '');
      setVal('promo-description', data.description || '');
      setVal('promo-imageUrl',    data.imageUrl    || '');
      setVal('promo-ctaUrl',      data.ctaUrl      || '');
      setVal('promo-startsAt',    tsToISO(data.startsAt));
      setVal('promo-endsAt',      tsToISO(data.endsAt));
      openModal('modal-promo');
    });
  });

  tbody.querySelectorAll('[data-action="del-promo"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!await confirmDialog('Delete this promotion?')) return;
      await deleteDoc(doc(db, 'promotions', btn.dataset.id));
      toast('Promotion deleted');
      loadPromotions();
    });
  });
}

document.getElementById('add-promo-btn')?.addEventListener('click', () => {
  currentPromoId = null;
  document.getElementById('modal-promo-title').textContent = 'New Promotion';
  ['promo-title','promo-emoji','promo-statusLabel','promo-description',
   'promo-imageUrl','promo-ctaUrl','promo-endsAt'].forEach(id => setVal(id, ''));
  setVal('promo-status',   'active');
  setVal('promo-startsAt', nowISO());
  openModal('modal-promo');
});

document.getElementById('save-promo-btn')?.addEventListener('click', async () => {
  const id = currentPromoId
    || slugify(getVal('promo-title')) + '-' + new Date().getFullYear();
  const data = {
    title:       getVal('promo-title'),
    emoji:       getVal('promo-emoji'),
    status:      getVal('promo-status'),
    statusLabel: getVal('promo-statusLabel'),
    description: getVal('promo-description'),
    imageUrl:    getVal('promo-imageUrl'),
    ctaUrl:      getVal('promo-ctaUrl'),
    startsAt:    isoToTs(getVal('promo-startsAt')),
    endsAt:      isoToTs(getVal('promo-endsAt')),
  };
  try {
    await setDoc(doc(db, 'promotions', id), data, { merge: true });
    toast('Promotion saved ✓');
    closeModal('modal-promo');
    loadPromotions();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
});

// ═══════════════════════════════════════════════
//  WINNERS
// ═══════════════════════════════════════════════

let currentWinnerId = null;

export async function loadWinners() {
  const snap  = await getDocs(collection(db, 'winners'));
  const docs  = [...snap.docs].sort((a,b) =>
    (b.data().announcedAt?.seconds||0) - (a.data().announcedAt?.seconds||0));
  const tbody = document.getElementById('winners-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  docs.forEach(d => {
    const data = d.data();
    const tr   = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${data.name || '—'}</strong></td>
      <td class="td-muted">${data.location || '—'}</td>
      <td>${data.prize || '—'}</td>
      <td class="td-muted" style="font-size:12px">${fmtDate(data.announcedAt)}</td>
      <td class="td-actions">
        <div class="flex gap-8">
          <button class="btn btn-secondary btn-sm" data-id="${d.id}" data-action="edit-win">Edit</button>
          <button class="btn btn-danger btn-sm"    data-id="${d.id}" data-action="del-win">Delete</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('[data-action="edit-win"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const s    = await getDoc(doc(db, 'winners', btn.dataset.id));
      const data = s.data();
      currentWinnerId = btn.dataset.id;
      document.getElementById('modal-winner-title').textContent = 'Edit Winner';
      setVal('win-name',        data.name     || '');
      setVal('win-location',    data.location || '');
      setVal('win-prize',       data.prize    || '');
      setVal('win-announcedAt', tsToISO(data.announcedAt));
      openModal('modal-winner');
    });
  });

  tbody.querySelectorAll('[data-action="del-win"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!await confirmDialog('Remove this winner?')) return;
      await deleteDoc(doc(db, 'winners', btn.dataset.id));
      toast('Winner removed');
      loadWinners();
    });
  });
}

document.getElementById('add-winner-btn')?.addEventListener('click', () => {
  currentWinnerId = null;
  document.getElementById('modal-winner-title').textContent = 'Add Winner';
  ['win-name','win-location','win-prize'].forEach(id => setVal(id, ''));
  setVal('win-announcedAt', nowISO());
  openModal('modal-winner');
});

document.getElementById('save-winner-btn')?.addEventListener('click', async () => {
  const id   = currentWinnerId || ('w-' + Date.now());
  const data = {
    name:        getVal('win-name'),
    location:    getVal('win-location'),
    prize:       getVal('win-prize'),
    announcedAt: isoToTs(getVal('win-announcedAt')) || Timestamp.now(),
  };
  try {
    await setDoc(doc(db, 'winners', id), data);
    toast('Winner saved ✓');
    closeModal('modal-winner');
    loadWinners();
  } catch (e) { toast('Error: ' + e.message, 'error'); }
});

// ═══════════════════════════════════════════════
//  CONFIG — STATION
// ═══════════════════════════════════════════════

export async function loadConfigStation() {
  const snap = await getDoc(doc(db, 'config/station'));
  const d    = snap.data() || {};
  setVal('st-callSign',          d.callSign          || '');
  setVal('st-frequency',         d.frequency         || '');
  setVal('st-established',       d.established       || '');
  setVal('st-tagline',           d.tagline           || '');
  setVal('st-fb-pageName',       d.facebook?.pageName       || '');
  setVal('st-fb-followersLabel', d.facebook?.followersLabel || '');
  setVal('st-fb-pageUrl',        d.facebook?.pageUrl        || '');
}

document.getElementById('save-station-btn')?.addEventListener('click', async () => {
  try {
    await setDoc(doc(db, 'config/station'), {
      callSign:    getVal('st-callSign'),
      frequency:   getVal('st-frequency'),
      established: getVal('st-established'),
      tagline:     getVal('st-tagline'),
      facebook: {
        pageName:       getVal('st-fb-pageName'),
        followersLabel: getVal('st-fb-followersLabel'),
        pageUrl:        getVal('st-fb-pageUrl'),
      },
    });
    toast('Station info saved ✓');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
});

// ═══════════════════════════════════════════════
//  CONFIG — ABOUT
// ═══════════════════════════════════════════════

export async function loadConfigAbout() {
  const snap = await getDoc(doc(db, 'config/about'));
  const d    = snap.data() || {};
  setVal('ab-statsListeners', d.statsListeners || '');
  setVal('ab-statsYears',     d.statsYears     || '');
  setVal('ab-statsShows',     d.statsShows     || '');
  setVal('ab-whoWeAre',       d.whoWeAre       || '');
  setVal('ab-mission',        d.mission        || '');
  setVal('ab-background',     d.background     || '');
}

document.getElementById('save-about-btn')?.addEventListener('click', async () => {
  try {
    const snap = await getDoc(doc(db, 'config/about'));
    const existing = snap.data() || {};
    await setDoc(doc(db, 'config/about'), {
      ...existing,
      statsListeners: getVal('ab-statsListeners'),
      statsYears:     getVal('ab-statsYears'),
      statsShows:     getVal('ab-statsShows'),
      whoWeAre:       getVal('ab-whoWeAre'),
      mission:        getVal('ab-mission'),
      background:     getVal('ab-background'),
    });
    toast('About page saved ✓');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
});

// ═══════════════════════════════════════════════
//  CONFIG — CONTACT
// ═══════════════════════════════════════════════

export async function loadConfigContact() {
  const snap = await getDoc(doc(db, 'config/contact'));
  const d    = snap.data() || {};
  setVal('ct-whatsapp',    d.whatsapp     || '');
  setVal('ct-whatsappDesc', d.whatsappDesc || '');
  setVal('ct-fb-handle',   d.facebook?.handle          || '');
  setVal('ct-fb-url',      d.facebook?.url             || '');
  setVal('ct-tt-handle',   d.tiktok?.handle            || '');
  setVal('ct-tt-url',      d.tiktok?.url               || '');
  setVal('ct-wa-handle',   d.whatsappSocial?.handle    || '');
  setVal('ct-wa-url',      d.whatsappSocial?.url       || '');
  setVal('ct-address',     d.address || '');
}

document.getElementById('save-contact-btn')?.addEventListener('click', async () => {
  try {
    await setDoc(doc(db, 'config/contact'), {
      whatsapp:     getVal('ct-whatsapp'),
      whatsappDesc: getVal('ct-whatsappDesc'),
      facebook:       { handle: getVal('ct-fb-handle'), url: getVal('ct-fb-url') },
      tiktok:         { handle: getVal('ct-tt-handle'), url: getVal('ct-tt-url') },
      whatsappSocial: { handle: getVal('ct-wa-handle'), url: getVal('ct-wa-url') },
      address:      getVal('ct-address'),
    });
    toast('Contact info saved ✓');
  } catch (e) { toast('Error: ' + e.message, 'error'); }
});
