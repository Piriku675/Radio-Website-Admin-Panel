// ═══════════════════════════════════════════════
//  app.js — entry point
//  Imports all modules and registers panel loaders
// ═══════════════════════════════════════════════

import { registerLoader, restorePanel } from './nav.js';
import { loadDashboard }   from './dashboard.js';
import { loadLivestream }  from './livestream.js';
import { loadSchedule }    from './schedule.js';
import { loadShows }       from './shows.js';
import { loadHosts }       from './hosts.js';
import {
  loadPromoStrip,
  loadArticles,
  loadFbFeed,
  loadPromotions,
  loadWinners,
  loadConfigStation,
  loadConfigAbout,
  loadConfigContact,
} from './content.js';

// auth must be imported for its side effects (sets up onAuthStateChanged)
import './auth.js';

// Register panel loaders
registerLoader('dashboard',       loadDashboard);
registerLoader('livestream',      loadLivestream);
registerLoader('schedule',        loadSchedule);
registerLoader('shows',           loadShows);
registerLoader('hosts',           loadHosts);
registerLoader('promostrip',      loadPromoStrip);
registerLoader('articles',        loadArticles);
registerLoader('facebookfeed',    loadFbFeed);
registerLoader('promotions',      loadPromotions);
registerLoader('winners',         loadWinners);
registerLoader('config-station',  loadConfigStation);
registerLoader('config-about',    loadConfigAbout);
registerLoader('config-contact',  loadConfigContact);
