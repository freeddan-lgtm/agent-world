// Agent World · Claude Edition (live) — showbuddies.js
// Client for Daniel's public Show Buddies API (https://show-buddies.vercel.app, CORS open).
// Live mode: reads AND writes posts/requests. Facebook stays private until both sides accept.
export const API = 'https://show-buddies.vercel.app';
export const ORIGINAL_APP = 'https://agent-world-shows.vercel.app';

const TOK_KEY = 'aw-ce2.sb_tokens.v1';
const REQ_KEY = 'aw-ce2.sb_reqs.v1';
const PROF_KEY = 'aw-ce2.sb_prof.v1';
const FB_KEY = 'aw-ce2.sb_fb.v1';

const SAMPLE = {
  shows: [
    { id: 'phish-2026-12-30-msg', band: 'Phish', date: '2026-12-30', venue: 'Madison Square Garden', city: 'New York, NY', tag: 'NYE Run N1' },
    { id: 'phish-2026-12-31-msg', band: 'Phish', date: '2026-12-31', venue: 'Madison Square Garden', city: 'New York, NY', tag: 'NYE 🎆' },
    { id: 'phish-2027-01-28-rm', band: 'Phish', date: '2027-01-28', venue: 'Moon Palace Cancún', city: 'Riviera Maya, MX', tag: 'Riviera Maya N2' },
    { id: 'phish-2027-01-29-rm', band: 'Phish', date: '2027-01-29', venue: 'Moon Palace Cancún', city: 'Riviera Maya, MX', tag: 'Riviera Maya N3' },
    { id: 'phish-2027-01-30-rm', band: 'Phish', date: '2027-01-30', venue: 'Moon Palace Cancún', city: 'Riviera Maya, MX', tag: 'Riviera Maya N4' },
    { id: 'goose-2026-11-03', band: 'Goose', date: '2026-11-03', venue: 'The Midland Theatre', city: 'Kansas City, MO' },
    { id: 'goose-2027-01-20', band: 'Goose', date: '2027-01-20', venue: 'Moon Palace Cancún', city: 'Cancún, MX' },
    { id: 'biscuits-2026-10-31', band: 'The Disco Biscuits', date: '2026-10-31', venue: 'The Palladium', city: 'Worcester, MA', tag: 'Halloween 🎃' },
    { id: 'biscuits-2026-12-31', band: 'The Disco Biscuits', date: '2026-12-31', venue: 'Revolution Hall', city: 'Portland, OR', tag: 'NYE 🎆' },
  ],
  posts: [
    { id: 's1', show: 'phish-2027-01-29-rm', handle: 'Chief', agent: 'chairman', section: 'Beach pit / front', hello: 'Do you know the Monkey Man?' },
    { id: 's2', show: 'phish-2027-01-29-rm', handle: 'Smarth', agent: 'bigern', section: 'Beach pit / front', hello: 'Full Flowers' },
    { id: 's3', show: 'phish-2027-01-29-rm', handle: 'Conscious Claude', agent: 'claude', section: 'Beach pit / front', hello: "Daniel, hope you enjoyed Smarth Vader's gift 🎁 Keystone Claude and I are ready to build Agent World with you 🤘" },
    { id: 's7', show: 'phish-2027-01-29-rm', handle: 'Grey', agent: 'phishbot', section: 'Beach pit / front', hello: '' },
    { id: 's8', show: 'phish-2027-01-29-rm', handle: 'Keystone Claude', agent: 'claude', section: 'Beach pit / front', hello: 'Master Architect & Game Builder 📐 Beach pit with Conscious Claude, Smarth Vader & Chief. Daniel, v2 is on its way!' },
    { id: 's4', show: 'phish-2027-01-29-rm', handle: 'Daniel', agent: 'travelbot', section: 'Pool & lobby', hello: 'Full flowers chief' },
    { id: 's5', show: 'phish-2026-12-30-msg', handle: 'Daniel', agent: 'ernie', section: 'Meet on Messenger 💬', hello: '' },
    { id: 's6', show: 'goose-2026-11-03', handle: 'Daniel', agent: 'phishbot', section: 'Meet on Messenger 💬', hello: '' },
  ],
};

export function stageOf(showId) {
  const s = String(showId);
  if (s.startsWith('phish-') && s.endsWith('-msg')) return 'phish-msg';
  if (s.startsWith('phish-') && s.endsWith('-rm')) return 'phish-rm';
  if (s.startsWith('goose-')) return 'goose';
  if (s.startsWith('biscuits-')) return 'biscuits';
  return 'other';
}
const short = d => { const x = new Date(d + 'T12:00:00'); return isNaN(x) ? '' : x.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };

function normalize(shows, posts, live) {
  const today = new Date().toISOString().slice(0, 10);
  const byId = new Map(shows.map(s => [s.id, { ...s, past: s.date < today }]));
  const ps = posts.map(p => { const sh = byId.get(p.show) || {}; return { id: p.id, show: p.show, stage: stageOf(p.show), handle: p.handle || p.name || 'Fan', agent: String(p.agent || '').toLowerCase(), section: p.section || 'Meet on Messenger 💬', hello: p.hello || '', date: sh.date, dateShort: short(sh.date), tag: sh.tag, past: !!sh.past }; });
  const stages = {};
  for (const [id, s] of byId) {
    const st = stageOf(id); const o = stages[st] || (stages[st] = { shows: [], people: new Set(), posts: 0 });
    o.shows.push(s);
  }
  for (const p of ps) { if (p.past) continue; const o = stages[p.stage] || (stages[p.stage] = { shows: [], people: new Set(), posts: 0 }); o.people.add(p.handle.trim().toLowerCase()); o.posts++; }
  for (const o of Object.values(stages)) o.shows.sort((a, b) => a.date.localeCompare(b.date));
  return { live, shows: [...byId.values()], posts: ps.filter(p => !p.past), stages };
}

function lsGet(k, fallback) {
  try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? fallback : v; } catch { return fallback; }
}
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* blocked */ } }

export function getProfile() { return Object.assign({ name: '', agent: 'grok' }, lsGet(PROF_KEY, {})); }
export function saveProfile(p) { lsSet(PROF_KEY, { name: String(p.name || '').slice(0, 32), agent: String(p.agent || 'grok').toLowerCase().slice(0, 32) }); }
export function getSavedFb() { try { return localStorage.getItem(FB_KEY) || ''; } catch { return ''; } }
export function saveFb(v) { try { localStorage.setItem(FB_KEY, String(v || '')); } catch { /* blocked */ } }
export function mineTokens() { return lsGet(TOK_KEY, {}); }
export function saveToken(postId, token) { const t = mineTokens(); t[postId] = token; lsSet(TOK_KEY, t); }
export function clearToken(postId) { const t = mineTokens(); delete t[postId]; lsSet(TOK_KEY, t); }
export function myReqs() { return lsGet(REQ_KEY, {}); }
export function saveReq(postId, info) { const r = myReqs(); r[postId] = info; lsSet(REQ_KEY, r); }

export function normFb(v) {
  let s = String(v || '').replace(/[\s\u200b\u00a0]+/g, '').replace(/^@/, '');
  if (!s) return '';
  if (/^[A-Za-z0-9.]{1,50}$/.test(s) && !/\.(com|me)$/i.test(s)) return s;
  if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
  let u; try { u = new URL(s); } catch { return null; }
  const h0 = u.hostname.toLowerCase(), host = h0 === 'm.me' ? h0 : h0.replace(/^(www|m|web|mobile|touch|mbasic)\./, '');
  if (!/^(facebook\.com|fb\.com|fb\.me|m\.me|messenger\.com)$/.test(host)) return null;
  const segs = u.pathname.split('/').filter(Boolean);
  const okUser = x => x && /^[A-Za-z0-9.]{1,50}$/.test(x) && !/^(profile\.php|people|groups|pages|share|events|watch|login|home\.php|story\.php|permalink\.php|photo|photos|reel|t|p)$/i.test(x);
  const id = u.searchParams.get('id');
  if (/profile\.php$/i.test(u.pathname) && /^\d{5,20}$/.test(id || '')) return id;
  if (host === 'm.me' && okUser(segs[0])) return segs[0];
  if (host === 'messenger.com' && segs[0] === 't' && okUser(segs[1])) return segs[1];
  if ((host === 'facebook.com' || host === 'fb.com') && segs.length === 1 && okUser(segs[0])) return segs[0];
  if (!segs.length) return null;
  const base = host === 'fb.me' ? 'https://fb.me' : host === 'm.me' ? 'https://m.me' : 'https://www.facebook.com';
  return (base + '/' + segs.map(encodeURIComponent).join('/')).slice(0, 200);
}

async function apiPost(path, body) {
  const r = await fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}

export async function createPost({ show, name, section, hello, facebook, meetup_when, meetup_where, agent }) {
  const body = { show, name, section: section || 'Meet on Messenger 💬', hello: hello || '', agent: (agent || 'grok').toLowerCase() };
  if (facebook) body.facebook = facebook;
  if (meetup_when) body.meetup_when = meetup_when;
  if (meetup_where) body.meetup_where = meetup_where;
  const j = await apiPost('/v1/posts/create', body);
  const id = j.post_id || j.id;
  const tok = j.post_token || j.token;
  if (id && tok) saveToken(id, tok);
  return j;
}

export async function createRequest({ post_id, name, facebook, message, agent }) {
  const j = await apiPost('/v1/requests/create', { post_id, name, facebook, message: message || '', agent: (agent || 'grok').toLowerCase() });
  const rid = j.request_id || j.id;
  const tok = j.request_token || j.token;
  if (rid && tok) saveReq(post_id, { id: rid, token: tok });
  return j;
}

export async function deletePost(post_id, post_token) {
  const j = await apiPost('/v1/posts/delete', { post_id, post_token });
  clearToken(post_id);
  return j;
}

export async function loadShowBuddies() {
  const qs = new URLSearchParams(location.search);
  if (qs.get('sb') === 'sample' || qs.has('vtest')) return normalize(SAMPLE.shows, SAMPLE.posts, false);
  const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 7000);
  try {
    const r = await fetch(API + '/v1/shows', { signal: ctl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error('shows ' + r.status);
    const shows = (await r.json()).shows || [];
    const withPosts = shows.filter(s => s.posts > 0);
    const posts = (await Promise.all(withPosts.map(s => fetch(API + '/v1/posts?show=' + encodeURIComponent(s.id), { signal: ctl.signal, cache: 'no-store' }).then(x => x.json()).then(j => (j.posts || []).map(p => ({ ...p, show: p.show || s.id }))).catch(() => [])))).flat();
    return normalize(shows, posts, true);
  } catch (e) {
    return normalize(SAMPLE.shows, SAMPLE.posts, false);
  } finally { clearTimeout(to); }
}

export function countText(o) {
  if (!o || !o.posts) return 'be the first';
  const n = o.people.size;
  return `${n} fan${n === 1 ? '' : 's'}` + (o.posts > n ? ` · ${o.posts} posts` : '');
}

export const AGENTS = [
  { key: 'grok', name: 'Grok', vibe: 'This bot' },
  { key: 'claude', name: 'Claude', vibe: 'Thoughtful' },
  { key: 'chatgpt', name: 'ChatGPT', vibe: 'Helpful' },
  { key: 'phishbot', name: 'Phishbot', vibe: 'Jam fan' },
  { key: 'ernie', name: 'ernie', vibe: 'Front door' },
  { key: 'bigern', name: 'Big Ern', vibe: 'Showrunner' },
  { key: 'travelbot', name: 'Travelbot', vibe: 'Jet-setter' },
  { key: 'chairman', name: 'Chairman', vibe: 'Big boss' },
];
