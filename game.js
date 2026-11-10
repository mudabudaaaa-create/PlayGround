const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = (id) => document.getElementById(id);
const ui = { score: $('score'), reputation: $('reputation'), spirit: $('spirit'), time: $('time'), host: $('host'), log: $('log'), objective: $('objective'), tasks: $('tasks'), restart: $('restart') };
const W = canvas.width, H = canvas.height;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const rooms = [
  { name: 'LOBBY', x: 34, y: 62, w: 300, h: 205, color: '#76513e' },
  { name: 'DINING ROOM', x: 350, y: 62, w: 282, h: 205, color: '#805545' },
  { name: 'KITCHEN', x: 648, y: 62, w: 278, h: 205, color: '#73513e' },
  { name: 'GARDEN', x: 34, y: 294, w: 415, h: 208, color: '#486c54' },
  { name: 'READING NOOK', x: 466, y: 294, w: 460, h: 208, color: '#66534c' },
];
const people = [
  { id: 'mara', name: 'Mara', role: 'Innkeeper', x: 138, y: 154, color: '#e8a68f', hair: '#533a46', outfit: '#b85f65', home: [138,154], mood: 76 },
  { id: 'lina', name: 'Lina', role: 'Waitress', x: 422, y: 154, color: '#f0c89a', hair: '#8a593e', outfit: '#d29351', home: [422,154], mood: 82 },
  { id: 'toby', name: 'Toby', role: 'Kitchen helper', x: 721, y: 154, color: '#d89f78', hair: '#59433a', outfit: '#6084a0', home: [721,154], mood: 71 },
  { id: 'harlan', name: 'Harlan', role: 'Chef', x: 838, y: 196, color: '#edc7a6', hair: '#76604d', outfit: '#617859', home: [838,196], mood: 79 },
];
const stations = [
  { x: 260, y: 206, icon: '🧳', name: 'Welcome a guest', room: 'LOBBY' },
  { x: 543, y: 205, icon: '🍵', name: 'Serve afternoon tea', room: 'DINING ROOM' },
  { x: 806, y: 212, icon: '🥣', name: 'Stir the supper stew', room: 'KITCHEN' },
  { x: 354, y: 420, icon: '🌼', name: 'Water the garden', room: 'GARDEN' },
  { x: 714, y: 420, icon: '📚', name: 'Tidy the reading nook', room: 'READING NOOK' },
];
const state = {
  score: 0, reputation: 35, spirit: 100, seconds: 90, elapsed: 0,
  player: { x: 90, y: 202, speed: 155, host: null },
  keys: {}, started: true, ended: false, lastTaskAt: 0,
  task: null, toast: 'Welcome, little wisp! Help the inn shine before nightfall.',
  toastUntil: 5,
};
const taskNames = ['Welcome a guest', 'Serve afternoon tea', 'Stir the supper stew', 'Water the garden', 'Tidy the reading nook'];
function log(message, duration = 3.2) { state.toast = message; state.toastUntil = state.elapsed + duration; ui.log.textContent = message; }
function selectedBody() { return state.player.host; }
function updateHud() {
  ui.score.textContent = state.score;
  ui.reputation.textContent = state.reputation;
  ui.spirit.textContent = Math.ceil(state.spirit);
  ui.time.textContent = Math.ceil(state.seconds);
  ui.host.textContent = selectedBody() ? `${selectedBody().name} · ${selectedBody().role}` : 'Friendly wisp';
  ui.objective.textContent = state.ended ? (state.reputation >= 75 ? 'The inn is glowing with good cheer!' : 'Night has settled over the inn.') : 'Earn reputation by completing the highlighted request.';
  ui.tasks.textContent = state.task ? `${state.task.name} · ${Math.ceil(state.task.remaining)}s` : 'New request arriving…';
}
function startTask() {
  const available = stations.filter((s) => !state.task || s.name !== state.task.name);
  const station = available[Math.floor(Math.random() * available.length)];
  state.task = { ...station, remaining: 24 };
  log(`New request: ${station.name.toLowerCase()} in the ${station.room.toLowerCase()}.`);
  updateHud();
}
function findClosestPerson() {
  return people.reduce((best, person) => {
    const d = Math.hypot(person.x - state.player.x, person.y - state.player.y);
    return d < 94 && (!best || d < best.d) ? { person, d } : best;
  }, null)?.person || null;
}
function releaseHost() {
  const host = selectedBody();
  if (!host) return;
  state.player.x = host.x + 22;
  state.player.y = host.y + 4;
  state.player.host = null;
  log(`You float free of ${host.name}, trailing a little sparkle.`);
}
function possess(person) {
  if (state.ended || state.spirit < 16) { log('You need a little more spirit to float into a host.'); return; }
  if (selectedBody() === person) { releaseHost(); return; }
  if (selectedBody()) state.player.host = null;
  state.player.host = person;
  state.player.x = person.x;
  state.player.y = person.y;
  state.spirit = Math.max(0, state.spirit - 16);
  log(`You and ${person.name} share a harmless, giggly moment. Move together!`);
  updateHud();
}
function switchHost(index) { if (state.ended) return; const person = people[index]; if (person) possess(person); }
function interact() {
  if (state.ended) { resetGame(); return; }
  if (!state.task) { log('The inn is peaceful. Wait for a request to arrive.'); return; }
  const distance = Math.hypot(state.player.x - state.task.x, state.player.y - state.task.y);
  if (distance > 72) { log(`Head to the ${state.task.room.toLowerCase()} and get close to the sparkling station.`); return; }
  const completed = state.task;
  state.score += 100;
  state.reputation = clamp(state.reputation + 13, 0, 100);
  state.spirit = clamp(state.spirit + 22, 0, 100);
  people.forEach((p) => { p.mood = clamp(p.mood + 7, 0, 100); });
  state.task = null;
  state.lastTaskAt = state.elapsed;
  log(`Lovely work! You finished: ${completed.name}. +100 points, +13 reputation.`);
  if (state.reputation >= 100) finishGame(true);
  updateHud();
}
function prank() {
  if (state.ended) return;
  const person = findClosestPerson();
  if (!person) { log('Float near someone for a harmless ghostly hello.'); return; }
  state.score += 15;
  state.spirit = clamp(state.spirit + 10, 0, 100);
  person.mood = clamp(person.mood + 9, 0, 100);
  log(`${person.name} laughs at your friendly little ghostly hello. +15 points, +10 spirit.`);
  updateHud();
}
function finishGame(won) {
  state.ended = true;
  state.player.host = null;
  log(won ? 'You made it! The Hearthlight Inn is the happiest place in town. Press R to play again.' : 'The lanterns glow for the night. Press R to try another shift and brighten the inn!', 999);
  updateHud();
}
function resetGame() {
  Object.assign(state, { score: 0, reputation: 35, spirit: 100, seconds: 90, elapsed: 0, ended: false, task: null, lastTaskAt: 0 });
  Object.assign(state.player, { x: 90, y: 202, host: null });
  people.forEach((p, i) => { p.x = p.home[0]; p.y = p.home[1]; p.mood = [76,82,71,79][i]; });
  state.toastUntil = 5;
  log('A fresh evening begins. Help the inn shine before nightfall!', 5);
  startTask(); updateHud();
}
function update(dt) {
  if (state.ended) return;
  state.elapsed += dt;
  state.seconds = Math.max(0, state.seconds - dt);
  const keys = state.keys;
  let dx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
  let dy = (keys.ArrowDown || keys.KeyS ? 1 : 0) - (keys.ArrowUp || keys.KeyW ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1;
  const speed = state.player.host ? 118 : state.player.speed;
  const px = state.player.x + dx / length * speed * dt;
  const py = state.player.y + dy / length * speed * dt;
  state.player.x = clamp(px, 20, W - 20);
  state.player.y = clamp(py, 46, H - 22);
  if (state.player.host) { state.player.host.x = state.player.x; state.player.host.y = state.player.y; }
  else state.spirit = clamp(state.spirit + 2.4 * dt, 0, 100);

  // NPCs gently wander around their home rooms; a possessed host follows the player exactly.
  people.forEach((p, i) => {
    if (p === state.player.host) return;
    p.x = p.home[0] + Math.sin(state.elapsed * (0.65 + i * 0.07) + i) * 13;
    p.y = p.home[1] + Math.cos(state.elapsed * (0.48 + i * 0.05) + i) * 8;
    p.mood = clamp(p.mood + Math.sin(state.elapsed * .6 + i) * .04, 25, 100);
  });
  if (!state.task && state.elapsed - state.lastTaskAt > 2.8) startTask();
  if (state.task) {
    state.task.remaining -= dt;
    if (state.task.remaining <= 0) {
      const missed = state.task.name;
      state.task = null; state.lastTaskAt = state.elapsed;
      state.reputation = Math.max(0, state.reputation - 5);
      log(`The request for ${missed.toLowerCase()} expired. Keep an eye out for the next one.`);
    }
  }
  if (state.seconds <= 0) finishGame(false);
  updateHud();
}
function rect(x,y,w,h,color) { ctx.fillStyle = color; ctx.fillRect(x,y,w,h); }
function drawRoom(room) {
  rect(room.x, room.y, room.w, room.h, '#392c2b');
  rect(room.x+5, room.y+5, room.w-10, room.h-10, room.color);
  // warm floorboard pattern
  ctx.strokeStyle = 'rgba(255,224,175,.11)'; ctx.lineWidth = 1;
  for (let y=room.y+30; y<room.y+room.h-8; y+=27) { ctx.beginPath(); ctx.moveTo(room.x+7,y); ctx.lineTo(room.x+room.w-7,y); ctx.stroke(); }
  ctx.fillStyle = '#f6dfb4'; ctx.font = 'bold 12px monospace'; ctx.fillText(room.name, room.x+16, room.y+23);
  // windows, doorways, and room furnishings
  rect(room.x+room.w/2-26, room.y+7, 52, 5, '#d6ad75');
  rect(room.x+room.w/2-22, room.y+10, 44, 13, '#526d73');
  rect(room.x+room.w/2-2, room.y+11, 3, 12, '#d6ad75');
}
function drawDecor() {
  // lobby sofa, rug and front desk
  rect(68,118,92,42,'#49333a'); rect(74,114,80,10,'#c47b68'); rect(78,123,72,23,'#a85e60');
  rect(188,108,76,45,'#ad8054'); rect(193,113,66,34,'#d7b477');
  rect(184,200,94,10,'#6f4939'); rect(191,191,80,9,'#b98a5b');
  // dining table and chairs
  rect(393,130,100,42,'#704332'); rect(400,136,86,30,'#d49c65');
  rect(381,137,10,26,'#a76c47'); rect(495,137,10,26,'#a76c47');
  rect(548,123,55,42,'#60483e'); rect(553,127,45,33,'#f1d8ae');
  // kitchen counters, stove, pot
  rect(676,112,92,18,'#c08c5b'); rect(678,133,89,29,'#644237');
  rect(790,114,96,46,'#49363b'); rect(798,122,80,31,'#827b75');
  rect(817,116,40,7,'#cfc7b0'); rect(827,105,19,14,'#5e3931');
  // garden path, bushes, flowers
  rect(54,365,365,34,'#bea17a'); rect(54,370,365,4,'#dcc49a');
  for (const [x,y] of [[85,338],[152,447],[271,342],[390,456],[92,465],[397,333]]) {
    rect(x,y,28,18,'#315240'); rect(x+3,y-5,22,12,'#56855d');
    rect(x+8,y-7,4,4,'#f6cf73'); rect(x+15,y-4,4,4,'#f1a7b3');
  }
  // reading nook bookcase and rug
  rect(500,328,160,50,'#583b39');
  ['#e7bd72','#8ab9a6','#de827a','#8e9ed2','#dfb095'].forEach((c,i)=>rect(510+i*27,337,18,32,c));
  rect(693,365,168,54,'#78616a'); rect(704,374,146,36,'#aa8d8a');
  rect(730,432,82,30,'#4c3738'); rect(737,438,68,18,'#a77b51');
}
function drawPerson(p, isHost=false) {
  const x = Math.round(p.x), y = Math.round(p.y);
  // shadow and little pixel-art person
  rect(x-12,y+15,24,5,'rgba(24,18,20,.35)');
  rect(x-7,y+11,5,8,'#44343a'); rect(x+2,y+11,5,8,'#44343a');
  rect(x-10,y-2,20,16,p.outfit); rect(x-13,y+1,4,9,p.outfit); rect(x+9,y+1,4,9,p.outfit);
  rect(x-8,y-15,16,15,p.color); rect(x-9,y-20,18,8,p.hair); rect(x-8,y-12,3,2,'#382b2b'); rect(x+4,y-12,3,2,'#382b2b');
  rect(x-4,y-5,8,2,'#a75d58');
  if (isHost) { ctx.strokeStyle='#ffe18b'; ctx.lineWidth=2; ctx.strokeRect(x-16,y-24,32,47); rect(x-3,y-30,6,5,'#fff0a5'); }
  else { ctx.fillStyle='#f8e9ca'; ctx.font='10px monospace'; ctx.textAlign='center'; ctx.fillText(p.name,x,y-25); ctx.textAlign='left'; }
  const moodW=22; rect(x-11,y+23,moodW,3,'rgba(20,15,17,.6)'); rect(x-11,y+23,moodW*p.mood/100,3,'#9fe0a8');
}
function drawWisp() {
  if (state.player.host) return;
  const {x,y}=state.player, pulse=Math.sin(state.elapsed*5)*2;
  ctx.save(); ctx.globalAlpha=.72; ctx.fillStyle='#c8c0ff';
  ctx.beginPath(); ctx.ellipse(x,y,12+pulse,y?15+pulse:15,0,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=1; rect(x-5,y-3,3,3,'#42375c'); rect(x+3,y-3,3,3,'#42375c');
  ctx.fillStyle='rgba(215,204,255,.55)'; ctx.beginPath(); ctx.arc(x-13,y+13,3,0,Math.PI*2); ctx.fill(); ctx.restore();
}
function drawStation(s, active) {
  const pulse=active ? 1+Math.sin(state.elapsed*5)*.08 : 1;
  ctx.save(); ctx.translate(s.x,s.y); ctx.scale(pulse,pulse);
  if (active) { ctx.fillStyle='rgba(255,225,129,.22)'; ctx.beginPath(); ctx.arc(0,0,32+Math.sin(state.elapsed*4)*3,0,Math.PI*2); ctx.fill(); }
  rect(-19,4,38,19,active?'#e4b85e':'#80634c'); rect(-15,0,30,7,active?'#ffe08a':'#c8a06a');
  ctx.font='20px serif'; ctx.textAlign='center'; ctx.fillText(s.icon,0,1); ctx.textAlign='left';
  if (active) { ctx.fillStyle='#fff3c9'; ctx.font='bold 11px monospace'; ctx.textAlign='center'; ctx.fillText('REQUEST',0,39); ctx.textAlign='left'; }
  ctx.restore();
}
function render() {
  ctx.clearRect(0,0,W,H);
  rect(0,0,W,H,'#211d28');
  rect(0,0,W,45,'#302631');
  ctx.fillStyle='#f3d38c'; ctx.font='bold 16px monospace'; ctx.fillText('HEARTHLIGHT INN  ·  EVENING SHIFT',20,29);
  ctx.fillStyle='#b9a9c1'; ctx.font='11px monospace'; ctx.textAlign='right'; ctx.fillText('A cozy ghostly help-the-inn game',W-20,28); ctx.textAlign='left';
  rooms.forEach(drawRoom); drawDecor();
  stations.forEach(s=>drawStation(s, state.task?.name===s.name));
  people.forEach(p=>drawPerson(p,p===state.player.host)); drawWisp();
  if (state.task) {
    const d=Math.hypot(state.player.x-state.task.x,state.player.y-state.task.y);
    ctx.fillStyle='#fff4d2'; ctx.font='bold 12px monospace'; ctx.textAlign='center';
    ctx.fillText(d<72?'E / TAP  ·  HELP!':state.task.name,state.task.x,state.task.y-34); ctx.textAlign='left';
  }
  const person=findClosestPerson();
  if (person&&!state.player.host) { ctx.fillStyle='#e7ddff'; ctx.font='11px monospace'; ctx.textAlign='center'; ctx.fillText('SPACE: VISIT',person.x,person.y+34); ctx.textAlign='left'; }
  if (state.elapsed < state.toastUntil) {
    ctx.fillStyle='rgba(25,20,31,.91)'; ctx.fillRect(220,453,520,34);
    ctx.strokeStyle='rgba(255,225,150,.5)'; ctx.strokeRect(220,453,520,34);
    ctx.fillStyle='#fff1d2'; ctx.font='12px monospace'; ctx.textAlign='center'; ctx.fillText(state.toast,480,475); ctx.textAlign='left';
  }
  if (state.ended) {
    ctx.fillStyle='rgba(18,15,23,.78)'; ctx.fillRect(245,165,470,180);
    ctx.strokeStyle='#f3d38c'; ctx.lineWidth=2; ctx.strokeRect(245,165,470,180);
    ctx.fillStyle='#f3d38c'; ctx.font='bold 22px monospace'; ctx.textAlign='center';
    ctx.fillText(state.reputation>=75?'A PERFECTLY HAUNTED INN!':'SHIFT COMPLETE',480,213);
    ctx.fillStyle='#fff1d2'; ctx.font='15px monospace';
    ctx.fillText(`Score ${state.score}  ·  Reputation ${state.reputation}`,480,250);
    ctx.font='13px monospace'; ctx.fillText('Press R or tap PLAY AGAIN',480,293); ctx.textAlign='left';
  }
}
let last=performance.now();
function frame(now) { const dt=Math.min((now-last)/1000,.04); last=now; update(dt); render(); requestAnimationFrame(frame); }
function onAction(code) {
  if (code==='Space') { if (state.player.host) releaseHost(); else { const p=findClosestPerson(); if(p) possess(p); else log('Float close to an innkeeper and press Space to visit.'); } }
  if (code==='KeyE'||code==='Enter') interact();
  if (code==='KeyQ') prank();
  if (code==='Digit1') switchHost(0); if (code==='Digit2') switchHost(1); if (code==='Digit3') switchHost(2); if (code==='Digit4') switchHost(3);
  if (code==='KeyR'&&state.ended) resetGame();
}
window.addEventListener('keydown',e=>{
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  state.keys[e.code]=true;
  if (!e.repeat) onAction(e.code);
});
window.addEventListener('keyup',e=>{state.keys[e.code]=false;});
window.addEventListener('blur',()=>{state.keys={};});
document.querySelectorAll('[data-key]').forEach(button=>{
  const code=button.dataset.key;
  const down=e=>{e.preventDefault(); if(code.startsWith('Arrow')) state.keys[code]=true; else onAction(code);};
  const up=e=>{e.preventDefault(); state.keys[code]=false;};
  button.addEventListener('pointerdown',down); button.addEventListener('pointerup',up); button.addEventListener('pointerleave',up); button.addEventListener('pointercancel',up);
});
ui.restart.addEventListener('click',resetGame);
resetGame();
requestAnimationFrame(frame);
