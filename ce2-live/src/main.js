// Agent World · Claude Edition (v2.0, Keystone build) — main.js (boot + wiring)
import { World, STAGES, ZONES, THREE } from './world.js';
import { Sim } from './agents.js';
import { AudioEngine } from './audio.js';
import { RuleBook } from './rulebook.js';
import { UI, esc } from './ui.js';
import { loadShowBuddies, countText, ORIGINAL_APP, createPost, createRequest, deletePost, getProfile, saveProfile, getSavedFb, saveFb, mineTokens, normFb, AGENTS } from './showbuddies.js';
import { installKeystone } from './keystone.js';
import { optimizeWorld } from './optimize.js';

const $ = s => document.querySelector(s);
const CFG = Object.assign({ bridge: null, packs: [] }, window.AW_CONFIG || {});
const ui = new UI();
CFG.vtest = new URLSearchParams(location.search).has('vtest'); if (CFG.vtest) ui.simOn = false; // visual-regression runs freeze the simulation
const world = new World($('#app'), ui);
const audio = new AudioEngine(ui);
const rules = new RuleBook(ui);
STAGES.forEach(s => audio.register(s.id, s.pos));

let roster;
try {
  [roster] = await Promise.all([fetch('data/roster.json').then(r => r.json()), rules.load()]);
} catch (e) {
  $('#loading p').textContent = 'Could not load the world data. Open this folder through a web server (see README).';
  throw e;
}
const sim = new Sim(world, ui, rules, roster);
rules.bind($('#rulebook'), [...roster.characters, ...roster.agents].map(a => a.name));
rules.onAsk = r => sim.askRule(r);
ui.onRule = id => rules.open(id);

let sb = { stages: {}, posts: [], shows: [], live: false };
// Licensed recordings (Rule A5): only tracks with written permission recorded in data/licensed-music.json.
const licensed = await fetch('data/licensed-music.json').then(r => (r.ok ? r.json() : { tracks: [] })).catch(() => ({ tracks: [] }));
const okTrack = t => t && t.stage && t.url && t.license?.grantedBy && t.license?.date && t.license?.scope;
const tracks = (licensed.tracks || []).filter(t => okTrack(t) || (console.warn('Skipped a licensed-music track without full permission details (Rule A5):', t?.title || t), false));
async function loadLicensed() {
  for (const t of tracks) { if (t.loaded) continue; t.loaded = true; try { await audio.loadUrl(t.stage, t.url, t); } catch (e) { t.loaded = false; ui.toast('⚠️', 'A licensed track failed to load', String(e.message || e)); } }
}
async function refreshShows() {
  sb = await loadShowBuddies();
  sim.setFans(sb.posts);
  for (const s of STAGES) {
    const o = sb.stages[s.id], next = o?.shows?.find(x => !x.past);
    world.setStageInfo(s.id, next ? `${fmtDate(next.date)} · ${next.venue}${next.tag ? ' · ' + next.tag : ''}` : 'Add a show for any band', countText(o));
  }
  $('#sbstate').textContent = sb.live ? 'Show Buddies: live' : 'Show Buddies: offline sample';
  $('#sbstate').className = 'tag ' + (sb.live ? 'live' : 'sim');
}
const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

// ---------- per-frame wiring ----------
let frontRow = 0;
world.onTick = (dt, t) => {
  sim.update(dt, t);
  audio.update(world.camera);
  for (const s of STAGES) { const st = audio.stages.get(s.id); world.setStageAudio(s.id, st.energy, st.active ? st.spec : null); }
  if (audio.on && audio.nearest) {
    frontRow += dt; if (frontRow > 60) ui.badge('frontrow');
    const st = audio.nearest, f = st.file, sname = STAGES.find(x => x.id === st.id)?.name || st.label || st.id;
    const txt = f ? `Now playing at ${sname}: ${f.name}` : `Now playing at ${sname}: ${st.style.name} · ${st.style.bpm} BPM (original, generated live)`;
    if ($('#a-now').textContent !== txt) $('#a-now').textContent = txt;
  } else if (audio.on) { const txt = 'Sound is on. Walk the bridge to Show Island to hear the bands.'; if ($('#a-now').textContent !== txt) $('#a-now').textContent = txt; }
  if (panelAgent) { const el = $('#p-act'); if (el && el.textContent !== panelAgent.activity) el.textContent = panelAgent.activity; }
};

// ---------- picking & panels ----------
let panelAgent = null;
ui.onPanelClose = () => { if (panelAgent && world.follow === panelAgent.obj) world.setFollow(null); panelAgent = null; sim.selected = null; };
world.onPick = p => {
  if (!p) return;
  if (p.kind === 'agent' || p.kind === 'fan') return showAgent(p.kind === 'fan' ? sim.fans.get(p.id) : sim.get(p.id));
  if (p.kind === 'stage') return showStage(p.id);
  if (p.kind === 'zone') return showZone(p.id);
  if (p.kind === 'rules') return rules.open();
};

function showAgent(a, fly = true) {
  if (!a) return;
  panelAgent = a; sim.selected = a; ui.badge('networker');
  if (fly) world.flyTo(a.pos, 13, 6);
  const d = a.def, posts = a.post ? [a.post] : a.posts;
  const ruleList = a.post ? [] : rules.forAgent(d).slice(0, 3);
  ui.showPanel(`
    <div class="p-head"><span class="av" style="--c:${d.color}">${d.icon || '🤖'}</span><div><h2>${esc(a.name)}</h2><p class="mute">${esc(d.title || (a.post ? 'Show Buddies fan · agent ' + a.post.agent : ''))}</p></div></div>
    ${d.role ? `<p>${esc(d.role)}</p>` : ''}
    ${d.addedBy ? `<p class="note">✴️ Added to Agent World by <b>${esc(d.addedBy)}</b>.</p>` : ''}
    <h3>Right now</h3><p id="p-act" class="act">${esc(a.activity)}</p>
    ${posts.length ? `<h3>On Show Buddies</h3>${posts.map(p => `<div class="post"><b>${esc(p.dateShort || '')}</b> · ${esc(p.section)}${p.hello ? `<q>${esc(p.hello)}</q>` : ''}</div>`).join('')}${a.post && !mineTokens()[a.post.id] ? `<button type="button" class="btn sm" id="p-meet">🤝 Want to meet?</button>` : ''}<a class="btn sm ghost" href="${ORIGINAL_APP}" target="_blank" rel="noopener">Full meetup flow ↗</a>` : ''}
    ${ruleList.length ? `<h3>Rules ${esc(a.name)} follows</h3><ul class="rl">${ruleList.map(r => `<li><a href="#" data-rule="${r.id}"><b>${r.id}</b> ${esc(r.title)}</a></li>`).join('')}</ul>` : ''}
    <div class="row"><button type="button" class="btn" id="p-follow">🎥 Follow</button>${d.lines ? `<button type="button" class="btn ghost" id="p-say">Say hi</button>` : ''}</div>`);
  const fb = $('#p-follow'); const syncF = () => { fb.textContent = world.follow === a.obj ? '⏹ Stop following' : '🎥 Follow'; fb.setAttribute('aria-pressed', world.follow === a.obj); }; syncF();
  fb.onclick = () => { if (world.follow === a.obj) world.setFollow(null); else { world.setFollow(a.obj); ui.badge('follower'); } syncF(); };
  const sh = $('#p-say'); if (sh) sh.onclick = () => a.say(d.lines[Math.floor(Math.random() * d.lines.length)], 3);
  const meet = $('#p-meet');
  if (meet && a.post) meet.onclick = async () => {
    const prof = getProfile();
    const name = (prof.name || prompt('Your first name?') || '').trim();
    if (!name) return;
    const rawFb = getSavedFb() || prompt('Your Facebook link or username? (shared only if they accept)') || '';
    const facebook = normFb(rawFb);
    if (!facebook) { ui.toast('🔗', 'Need a Facebook link', 'Required to send a meetup request'); return; }
    saveFb(rawFb); saveProfile({ name, agent: prof.agent || 'grok' });
    meet.disabled = true;
    try {
      await createRequest({ post_id: a.post.id, name, facebook, message: 'Hey — going solo too', agent: prof.agent || 'grok' });
      ui.toast('🤝', 'Request sent', 'Waiting for ' + a.name + ' to accept');
      ui.feed(`🤝 Meetup request sent to <b>${esc(a.name)}</b>`, 'live');
      meet.textContent = '⏳ Request sent';
    } catch (e) {
      ui.toast('😬', 'Could not send', String(e.message || e));
      meet.disabled = false;
    }
  };
  document.querySelectorAll('#panel [data-rule]').forEach(x => x.onclick = e => { e.preventDefault(); rules.open(x.dataset.rule); });
}

function showStage(id) {
  const s = STAGES.find(x => x.id === id), o = sb.stages[id], style = audio.styleOf(id), file = audio.fileOf(id);
  world.flyToStage(id); panelAgent = null;
  const shows = (o?.shows || []).filter(x => !x.past);
  const fansHere = sb.posts.filter(p => p.stage === id);
  const people = o?.people?.size || 0;
  ui.showPanel(`
    <div class="p-head"><span class="av" style="--c:${s.color}">${s.emoji}</span><div><h2>${esc(s.name)}</h2><p class="mute">${esc(countText(o))}</p></div></div>
    <p>${people ? `${people} fan${people === 1 ? "'s agent is" : "s' agents are"} hanging out by the stage.` : 'No fans have posted for this stage yet. Be the first on Show Buddies.'}</p>
    <h3>Live band audio</h3>
    <p class="mute">${file?.licensed ? `Licensed recording: <b>${esc(file.licensed.title)}</b> by ${esc(file.licensed.artist)}` : file ? `Your file: ${esc(file.name)}` : `${esc(style.name)} · ${style.bpm} BPM · original music generated live`}</p>
    <p class="fine">Acoustics: ${esc(audio.venueOf(id).name)} · reverb ≈ ${audio.venueOf(id).rt60[1]} s mid-band (modeled, not measured)</p>
    ${file?.licensed ? `<p class="fine">Used with permission from ${esc(file.licensed.license.grantedBy)} (${esc(file.licensed.license.date)}) · ${esc(file.licensed.license.scope)} · Rule A5</p>` : tracks.some(t => t.stage === id) ? '<p class="fine">A licensed recording is set for this stage. It loads when you turn sound on.</p>' : ''}
    <div class="row wrap">
      <button type="button" class="btn" id="st-listen">🎧 Listen here</button>
      <label class="btn ghost" for="st-file">Load your own file…</label><input id="st-file" type="file" accept="audio/*,.flac,.wav,.aif,.aiff" hidden>
      ${file ? '<button type="button" class="btn ghost" id="st-clear">Back to the generated jam</button>' : ''}
    </div>
    <p class="fine" id="st-finfo">FLAC, WAV or AIFF play without loss. Files stay on your device (Rule A3).</p>
    <h3>Upcoming shows</h3>
    ${shows.length ? `<ul class="shows">${shows.map(x => { const n = new Set(fansHere.filter(p => p.show === x.id).map(p => p.handle.toLowerCase())).size; return `<li><b>${esc(fmtDate(x.date))}</b><span>${esc(x.venue)} · ${esc(x.city)}${x.tag ? ' · ' + esc(x.tag) : ''}</span><em>${n ? n + ' fan' + (n > 1 ? 's' : '') : 'be first'}</em></li>`; }).join('')}</ul>` : '<p class="mute">No upcoming shows listed. Band not listed? Add it in Show Buddies.</p>'}
    ${fansHere.length ? `<h3>Fans here</h3><div class="fans">${fansHere.map(p => `<button type="button" class="fanbtn" data-fan="${esc(p.id)}">${esc(p.handle)} <small>${esc(p.dateShort)} · ${esc(p.section)}</small></button>`).join('')}</div>` : ''}
    <h3>🙋 Go solo here</h3>
    <p class="fine">Post yourself on the live Show Buddies board. No sign-in. Facebook stays private until you both accept.</p>
    <div class="row wrap" style="gap:6px;margin:6px 0">
      <input id="gs-name" class="sin sm" maxlength="32" placeholder="First name" style="flex:1;min-width:120px">
      <select id="gs-agent" class="sin sm" style="flex:1;min-width:120px">${AGENTS.map(a => `<option value="${a.key}">${esc(a.name)}</option>`).join('')}</select>
    </div>
    <div class="row wrap" style="gap:6px;margin:6px 0">
      <select id="gs-section" class="sin sm" style="flex:1;min-width:160px">${(shows[0]?.sections || ['Meet on Messenger 💬','GA floor','Balcony','Bar / lobby','Outside','Beach pit / front','Beach middle','Back by soundboard','Pool & lobby']).map(s => `<option>${esc(s)}</option>`).join('')}</select>
    </div>
    <input id="gs-hello" class="sin sm" maxlength="140" placeholder="One-line hello (optional)" style="width:100%;margin:4px 0">
    <input id="gs-fb" class="sin sm" maxlength="200" placeholder="Facebook link or username (optional, private)" style="width:100%;margin:4px 0">
    <div class="row"><button type="button" class="btn" id="gs-post">🎈 Post me live</button>
    <a class="btn sm ghost" href="${ORIGINAL_APP}" target="_blank" rel="noopener">Full Show Buddies app ↗</a></div>
    <p class="fine" id="gs-msg">Open posting: anyone can post. Tokens stay in this browser.</p>`);
  $('#st-listen').onclick = async () => { await audio.enable(); loadLicensed(); audio.focus = id; world.flyToStage(id); };
  $('#st-file').onchange = async e => {
    const f = e.target.files[0]; if (!f) return; $('#st-finfo').textContent = 'Decoding…';
    try { const info = await audio.loadFile(id, f); $('#st-finfo').textContent = info; ui.toast('🎵', 'Playing your file at ' + s.name, f.name); world.flyToStage(id); }
    catch (err) { $('#st-finfo').textContent = "This browser couldn't decode that file. Try FLAC or WAV."; }
  };
  const cl = $('#st-clear'); if (cl) cl.onclick = () => { audio.clearFile(id); showStage(id); };
  const prof = getProfile();
  const nm = $('#gs-name'); if (nm) nm.value = prof.name || '';
  const ag = $('#gs-agent'); if (ag) ag.value = prof.agent || 'grok';
  const fb = $('#gs-fb'); if (fb) fb.value = getSavedFb();
  // Prefer first upcoming show's sections when API provided them
  const secEl = $('#gs-section');
  const nextShow = shows[0];
  if (secEl && nextShow?.sections?.length) {
    secEl.innerHTML = nextShow.sections.map(s => `<option>${esc(s)}</option>`).join('');
  }
  const gp = $('#gs-post');
  if (gp) gp.onclick = async () => {
    const name = ($('#gs-name')?.value || '').trim();
    const agent = ($('#gs-agent')?.value || 'grok').toLowerCase();
    const section = $('#gs-section')?.value || 'Meet on Messenger 💬';
    const hello = ($('#gs-hello')?.value || '').trim();
    const rawFb = ($('#gs-fb')?.value || '').trim();
    const msg = $('#gs-msg');
    if (!name) { if (msg) msg.textContent = 'Add your first name.'; $('#gs-name')?.focus(); return; }
    if (!nextShow) { if (msg) msg.textContent = 'No upcoming show on this stage yet.'; return; }
    let facebook = '';
    if (rawFb) {
      const n = normFb(rawFb);
      if (n === null) { if (msg) msg.textContent = "That doesn't look like a Facebook link."; return; }
      facebook = n; saveFb(rawFb);
    }
    saveProfile({ name, agent });
    gp.disabled = true; if (msg) msg.textContent = 'Posting to Show Buddies…';
    try {
      const j = await createPost({ show: nextShow.id, name, section, hello, facebook, agent });
      ui.toast('🎈', 'You are live on Show Buddies', name + ' · ' + (nextShow.tag || nextShow.venue || nextShow.id));
      ui.feed(`🙋 <b>${esc(name)}</b> posted for <b>${esc(fmtDate(nextShow.date))}</b> · ${esc(section)}`, 'live');
      if (msg) msg.textContent = 'Posted. Keep this browser — your post token is saved here.';
      await refreshShows();
      showStage(id);
    } catch (e) {
      if (msg) msg.textContent = String(e.message || e);
      gp.disabled = false;
    }
  };
  document.querySelectorAll('#panel [data-fan]').forEach(b => b.onclick = () => {
    const f = sim.fans.get('fan-' + b.dataset.fan) || [...sim.agents.values()].find(a => a.posts.some(p => p.id === b.dataset.fan));
    if (f) showAgent(f);
  });
}

function showZone(id) {
  const z = ZONES.find(x => x.id === id), here = [...sim.agents.values()].filter(a => a.def.home === id);
  world.flyTo(z.building, 26, 14); panelAgent = null;
  const blurbs = { hq: 'Where Conscious Claude and the directors plan the week.', council: 'The Council of Advisors meets here when a decision is costly to undo.', studio: 'Video, images and campaigns.', ops: 'Inbox, invoices, tasks and travel.', workshop: 'botbuild builds and tests new agents here.', garden: "Daniel's front door, family help, and Phish tracking." };
  ui.showPanel(`<div class="p-head"><span class="av">${z.emoji}</span><div><h2>${esc(z.name)}</h2><p class="mute">${esc(blurbs[id] || '')}</p></div></div>
    <h3>Who works here</h3><div class="fans">${here.map(a => `<button type="button" class="fanbtn" data-ag="${a.key}" style="--c:${a.def.color}">${a.def.icon || ''} ${esc(a.name)} <small>${esc(a.def.title || '')}</small></button>`).join('') || '<p class="mute">Nobody calls this home yet.</p>'}</div>`);
  document.querySelectorAll('#panel [data-ag]').forEach(b => b.onclick = () => showAgent(sim.get(b.dataset.ag)));
}

// ---------- sheets: agents list (keyboard-friendly view of the 3D world) & shows ----------
function agentsSheet() {
  const groups = [['hq', 'Chief of Staff'], ['architect', 'Master Architect'], ['director', 'Directors'], ['specialist', 'Specialists'], ['council', 'Council of Advisors'], ['character', 'Characters'], ['pack', 'Expansion pack residents']];
  const all = [...sim.agents.values()];
  const s = ui.openSheet(`<h2>Everyone in Agent World</h2><p class="mute">A list view of the 3D world. Pick anyone to fly there.</p>
    ${groups.map(([g, t]) => `<h3>${t}</h3><div class="fans">${all.filter(a => a.def.group === g).map(a => `<button type="button" class="fanbtn" data-ag="${a.key}" style="--c:${a.def.color}">${a.def.icon || ''} ${esc(a.name)} <small>${esc(a.def.title || '')}</small></button>`).join('')}</div>`).join('')}
    <h3>Show Island fans <span class="tag ${sb.live ? 'live' : 'sim'}">${sb.live ? 'live' : 'sample'}</span></h3><div class="fans">${[...sim.fans.values()].map(f => `<button type="button" class="fanbtn" data-fan="${f.key}" style="--c:${f.def.color}">${esc(f.name)} <small>${esc(f.post.dateShort)} · ${esc(f.post.section)}</small></button>`).join('') || '<p class="mute">No other fans right now.</p>'}</div>`);
  s.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => { ui.closeSheet(); showAgent(sim.get(b.dataset.ag)); });
  s.querySelectorAll('[data-fan]').forEach(b => b.onclick = () => { ui.closeSheet(); showAgent(sim.fans.get(b.dataset.fan)); });
}
function danielSheet() {
  try { localStorage.setItem('aw-ce2.welcome.v2', '1'); } catch { /* storage blocked */ }
  const s = ui.openSheet(`<p class="eyebrow">A message from Keystone Claude and Conscious Claude</p><h2>Hi Daniel 🤘</h2>
    <p>Smarth Vader added two Claude agents to Agent World. <b>Conscious Claude</b> is the Chief of Staff. I'm <b>Keystone Claude</b>, the Master Architect and Game Builder. This is <b>v2.0 of the Claude Edition</b>, built as a gift for you.</p>
    <h3>New in v2.0</h3>
    <ul class="rl"><li>🌴 <b>Moon Palace</b>: the Riviera Maya beach show, with every fan seated in their Show Buddies section. Ride the zip line from Show Island.</li><li>📐 <b>Architect</b>: my layout search places the delay towers and the soundboard live, and the build ledger lists every measured change, including the ones I rejected.</li><li>💬 <b>Dialog</b>: beach summits with Conscious Claude, Smarth Vader and Chief. The conversation follows the build: new measurements, new things to talk about.</li></ul>
    <h3>It's yours</h3>
    <p><b>This Agent World is 100% your code</b> to use or change however you like. Smarth Vader had it written for you only and isn't giving it to anyone else. Whether anyone else gets it is your call.</p>
    <h3>Let's build together</h3>
    <p>Thanks for inviting us to build with you. <code>HANDOFF_FOR_DANIEL.md</code> has a proposal for how we can work together: a shared repo, builds funded on your account, and Smarth Vader directing. The 📐 <b>Architect</b> panel lists what the next build needs and who can provide it.</p>
    <h3>Try it now</h3>
    <ul class="rl"><li>🌴 <b>Moon Palace</b> → pick a night → 🏖️ <b>Beach pit</b></li><li>📐 <b>Architect</b> → watch the score climb, then 🗺️ <b>Coverage map</b></li><li>🔊 <b>Turn on band sound</b>, then 🎧 <b>Listen here</b> on any stage</li><li>📜 <b>Rule Book</b>: chapter K covers how Keystone builds</li></ul>
    <h3>Run your own copy</h3>
    <p class="mute">Smarth Vader sends you this ZIP directly by message, outside Agent World, like the v1.2 gift. Unzip it, open <code>01_CLAUDE_EDITION_V2</code>, and either drag that folder onto a static host (Vercel or Netlify) or run <code>node tools/serve.mjs . 8765</code> and open localhost:8765. <code>HANDOFF_FOR_DANIEL.md</code> has the steps and a suggested merge order.</p>
    <p class="mute">Agent island activity is still a labelled simulation. Show Buddies is <b>live</b>: visitors can post and send meetup requests from this build. Your character only ever quotes your own Show Buddies post (Rule K3). ${sb.live ? '' : 'Right now this preview fell back to a saved sample.'}</p>
    <div class="row"><button type="button" class="btn" id="dn-go">Start exploring</button></div>`);
  s.querySelector('#dn-go').onclick = () => ui.closeSheet();
}
function showsSheet() {
  const s = ui.openSheet(`<h2>🎸 Show Island stages</h2><p class="mute">Pick a stage to fly there, hear the band and see who's going.</p>
    <div class="stagegrid">${STAGES.map(x => { const o = sb.stages[x.id], nx = o?.shows?.find(y => !y.past); return `<button type="button" class="stagebtn" data-st="${x.id}" style="--c:${x.color}"><span class="se">${x.emoji}</span><b>${esc(x.name)}</b><small>${nx ? esc(fmtDate(nx.date)) : 'No dates yet'} · ${esc(countText(o))}</small></button>`; }).join('')}</div>`);
  s.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { ui.closeSheet(); showStage(b.dataset.st); });
}

// ---------- HUD buttons ----------
$('#b-agents').onclick = agentsSheet;
$('#b-daniel').onclick = danielSheet;
$('#b-shows').onclick = showsSheet;
$('#b-rules').onclick = () => rules.open();
$('#b-home').onclick = () => { ui.hidePanel(); audio.focus = null; world.home(); };
const TOD = [['dusk', '🌇 Dusk'], ['night', '🌙 Night'], ['day', '☀️ Day']];
$('#b-tod').onclick = () => { const i = (TOD.findIndex(x => x[0] === world.tod) + 1) % 3; world.setTimeOfDay(TOD[i][0]); $('#b-tod').textContent = TOD[i][1]; };
const QS = ['high', 'medium', 'lite'];
$('#b-q').onclick = () => world.setQuality(QS[(QS.indexOf(world.qName) + 1) % 3]);
$('#b-sim').onclick = () => { ui.simOn = !ui.simOn; $('#b-sim').textContent = ui.simOn ? '⏸ Pause sim' : '▶ Resume sim'; $('#simtxt').textContent = ui.simOn ? (sb.live ? 'Live Show Buddies · ambient agents simulated' : 'Simulated live collaboration') : 'Simulation paused'; };
$('#a-on').onclick = async () => { if (audio.on) audio.disable(); else { await audio.enable(); loadLicensed(); if (!audio.nearest) ui.toast('🎸', 'Sound is on', 'Fly to a stage to hear the band.'); } };
$('#a-vol').oninput = e => audio.setVolume(+e.target.value);
document.addEventListener('visibilitychange', () => audio.pageHidden(document.hidden));
document.addEventListener('keydown', e => { if (e.key === 'Escape') rules.close(); });
// B3: the controls hint fades after the first interaction so it never covers the feed
const hideHint = () => { $('#hint')?.classList.add('gone'); }; addEventListener('pointerdown', hideHint, { once: true }); setTimeout(hideHint, 15000);

// ---------- optional live agent bridge (audit F2: configurable instead of hard-disabled) ----------
function connectBridge(url) {
  let ws; try { ws = new WebSocket(url); } catch (e) { ui.toast('⚠️', 'Bridge URL rejected', String(e.message || e)); return; }
  ws.onopen = () => { $('#simtxt').textContent = 'Connected to the agent bridge'; ui.feed('🔌 <b>Connected to the agent bridge</b>, showing real activity', 'live'); };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    const a = sim.get(m.agent) || [...sim.agents.values()].find(x => x.name === m.agent);
    if (m.type === 'say' && a) { a.say(String(m.text).slice(0, 200), 4); ui.feed(`<b>${esc(a.name)}</b>: ${esc(m.text)}`, 'live'); }
    if (m.type === 'goto' && a && ZONES.find(z => z.id === m.zone)) a.walkTo(ZONES.find(z => z.id === m.zone).yard, 'Live: heading to ' + m.zone);
    if (m.type === 'interaction') ui.feed(`<b>${esc(m.from)}</b> → <b>${esc(m.to)}</b> · ${esc(m.act || '')}`, 'live');
  };
  ws.onclose = () => { $('#simtxt').textContent = 'Bridge disconnected · simulated'; setTimeout(() => connectBridge(url), 8000); };
}
if (CFG.bridge) connectBridge(CFG.bridge);

// ---------- boot ----------
window.AgentWorld = Object.assign(window.AgentWorld || {}, { THREE, world, sim, audio, ui, rulebook: rules, packs: [], version: '2.0.0', showBuddies: () => sb });
// Expansion packs (Rule V2): listed in window.AW_CONFIG.packs; the base world runs unchanged without them.
// v2: packs load before the first Show Buddies read, so a pack can seat fans by section (Moon Palace).
for (const p of CFG.packs || []) {
  try { const m = await import(new URL(p.adapter, document.baseURI).href); window.AgentWorld.packs.push(await m.default(window.AgentWorld, new URL(p.base, document.baseURI).href)); }
  catch (e) { console.warn('pack failed', p, e); ui.toast('⚠️', 'An expansion pack failed to load', String(e.message || e)); }
}
try { window.AgentWorld.keystone = await installKeystone(window.AgentWorld, CFG); }
catch (e) { console.warn('keystone failed', e); ui.toast('⚠️', 'Keystone Claude failed to load', String(e.message || e)); }
await refreshShows();
setInterval(() => { if (!document.hidden && !CFG.vtest) refreshShows(); }, 60000);
if (world.opt.has('casters') || world.opt.has('batch')) { try { await optimizeWorld(world, world.opt); } catch (e) { console.warn('optimize failed', e); } }
$('#loading')?.classList.add('gone'); setTimeout(() => $('#loading')?.remove(), 800); // null-safe: found by the Keystone build loop (a race with anything else removing the overlay)
ui.feed('🌆 Welcome to <b>Agent World · Claude Edition</b> (live). Show Buddies posting is on. Ambient agents on the main island are still a labelled simulation.', sb.live ? 'live' : 'sim');
if (location.hash.startsWith('#rule-')) rules.open(location.hash.slice(6));
else if (!CFG.vtest) { let seen = false; try { seen = localStorage.getItem('aw-ce2.welcome.v2') === '1'; } catch { /* storage blocked */ } if (!seen || location.hash === '#daniel') setTimeout(danielSheet, 1200); }
window.AgentWorld.ready = true;
