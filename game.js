(() => {
  const canvas = document.querySelector('#game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const $ = (id) => document.getElementById(id);
  const rooms = {
    common: { name: 'THE COMMON ROOM', floor: '#c99468', wall: '#e8c99a', trim: '#a66f4c', doors: [{ x: 25, y: 153, to: 'garden', label: 'Garden' }, { x: 455, y: 153, to: 'kitchen', label: 'Kitchen' }, { x: 240, y: 270, to: 'lounge', label: 'Lounge' }] },
    kitchen: { name: 'THE SUNLIT KITCHEN', floor: '#d8b27d', wall: '#f0d7a8', trim: '#b48055', doors: [{ x: 25, y: 153, to: 'common', label: 'Common room' }] },
    garden: { name: 'THE POCKET GARDEN', floor: '#90b77c', wall: '#c8dea8', trim: '#6f9a69', doors: [{ x: 455, y: 153, to: 'common', label: 'Common room' }] },
    lounge: { name: 'THE MUSIC LOUNGE', floor: '#9e829e', wall: '#d5b9c9', trim: '#83647e', doors: [{ x: 240, y: 77, to: 'common', label: 'Common room' }] }
  };
  const npcs = {
    marlow: { id: 'marlow', name: 'Marlow', role: "the inn's cheerful cook", emoji: '🍲', room: 'kitchen', x: 352, y: 160, hair: '#654632', skin: '#bd8060', shirt: '#e77b61', pants: '#536b77', trust: 0, tint: '#e77b61', quote: 'A little magic could make supper sparkle. Want to borrow my apron for a minute?' },
    juniper: { id: 'juniper', name: 'Juniper', role: "the inn's resident artist", emoji: '🌼', room: 'garden', x: 352, y: 164, hair: '#583f63', skin: '#e2b38b', shirt: '#8a94cb', pants: '#516d79', trust: 0, tint: '#8a94cb', quote: 'I believe in curious ghosts. A friendly visit? Absolutely—just keep my paint out of the pond!' },
    ollie: { id: 'ollie', name: 'Ollie', role: "the inn's piano player", emoji: '🎹', room: 'lounge', x: 350, y: 170, hair: '#493b34', skin: '#d49b75', shirt: '#4e9b86', pants: '#554766', trust: 0, tint: '#4e9b86', quote: "A ghostly duet? I've been hoping someone would ask. Borrow my hands and give the keys a tickle." }
  };
  const props = {
    common: [{x:78,y:108,w:86,h:34,type:'sofa'},{x:225,y:82,w:58,h:44,type:'rug'},{x:207,y:92,w:44,h:28,type:'table'},{x:350,y:103,w:54,h:44,type:'plant'}],
    kitchen: [{x:80,y:91,w:146,h:30,type:'counter'},{x:113,y:166,w:54,h:38,type:'table'},{x:293,y:91,w:45,h:38,type:'pantry'},{x:400,y:104,w:32,h:50,type:'plant'}],
    garden: [{x:77,y:83,w:70,h:35,type:'flowerbed'},{x:180,y:134,w:58,h:36,type:'bench'},{x:343,y:86,w:57,h:36,type:'flowerbed'},{x:410,y:174,w:32,h:38,type:'tree'}],
    lounge: [{x:67,y:92,w:124,h:36,type:'piano'},{x:284,y:110,w:72,h:36,type:'sofa'},{x:228,y:188,w:58,h:28,type:'rug'},{x:406,y:102,w:34,h:48,type:'plant'}]
  };
  const stations = {
    kitchen: [{x:253,y:173,label:'TEA TRAY',title:'Tea-tray parade!',text:'March a perfectly balanced tray around the kitchen like a tiny royal procession. Marlow gives a delighted little bow.',emoji:'🫖'}, {x:146,y:120,label:'SOUP POT',title:'The soup sings!',text:'With Marlow’s permission, coax a bubbling pot into humming a very silly tune.',emoji:'🍲'}],
    garden: [{x:265,y:220,label:'FLOWERS',title:'Upside-down bouquet!',text:'Make a playful flower arrangement that looks like it is growing toward the clouds. Juniper calls it modern art.',emoji:'🌷'}, {x:410,y:212,label:'WIND CHIME',title:'A breeze with a beat!',text:'Give the wind chime a gentle, perfectly timed tap-tap-tinkle. The garden answers in harmony.',emoji:'🎐'}],
    lounge: [{x:221,y:159,label:'PIANO',title:'Ghostly duet!',text:'Ollie lends you a flourish: plink, plonk, ploooo. The last note floats like a bubble.',emoji:'🎹'}, {x:385,y:183,label:'DANCE SPOT',title:'One tiny waltz!',text:'Try three deliberately over-dramatic dance steps. Ollie supplies the imaginary orchestra.',emoji:'🪩'}],
    common: [{x:260,y:196,label:'TEA TABLE',title:'The teacups tango!',text:'A harmless little clink-clink dance across the table. The cups settle safely right where they started.',emoji:'☕'}]
  };
  const spawn = { common: {x:240,y:190}, kitchen: {x:78,y:154}, garden: {x:382,y:154}, lounge: {x:240,y:103} };
  const keys = new Set();
  const state = { room:'common', x:240, y:186, face:1, host:null, joy:0, pranks:new Set(), talked:new Set(), time:0, toastTimer:0, toastText:'', particles:[], sound:false };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const dist = (a,b) => Math.hypot(a.x-b.x,a.y-b.y);
  function toast(text) { state.toastText=text; state.toastTimer=2.3; $('toast').textContent=text; $('toast').classList.add('show'); }
  function updateUI() {
    const who=state.host ? npcs[state.host] : null;
    $('sceneChip').textContent=rooms[state.room].name;
    $('formStatus').textContent=who ? `borrowing ${who.name}'s body` : 'floaty ghost';
    $('joyStatus').textContent=`${state.joy} / 3`;
    $('whimsyBar').style.width=`${Math.min(100,state.joy/3*100)}%`;
    $('missionProgress').style.width=`${Math.min(100,state.joy/3*100)}%`;
    $('progressText').textContent=`${Math.min(state.joy,3)} / 3 moments`;
    $('missionPercent').textContent=`${Math.min(100,Math.round(state.joy/3*100))}%`;
    if(state.joy>=3){$('missionTitle').textContent='The inn is glowing!';$('missionText').textContent='You made a whole houseful of grown-ups laugh. There is always room for one more kind little haunting.';}
    for(const n of Object.values(npcs)) $('mood-'+n.id).textContent='♥'.repeat(Math.min(3,n.trust))+'♡'.repeat(3-Math.min(3,n.trust));
  }
  function openDialog(emoji,title,text,choices) {
    $('dialogEmoji').textContent=emoji; $('dialogTitle').textContent=title; $('dialogText').textContent=text; const box=$('dialogChoices'); box.innerHTML='';
    for(const item of choices){const b=document.createElement('button');b.className='choice'+(item.secondary?' secondary':'');b.textContent=item.label;b.disabled=!!item.disabled;b.onclick=()=>{closeDialog();item.action&&item.action();};box.appendChild(b);}
    $('dialogBackdrop').classList.add('open');
  }
  function closeDialog(){ $('dialogBackdrop').classList.remove('open'); }
  function enterRoom(name,door) { state.room=name; const target=spawn[name]; state.x=target.x;state.y=target.y;state.face=name==='garden'?-1:1;toast(`You drift into ${rooms[name].name.toLowerCase()}.`);updateUI(); }
  function nearbyNPC(){return Object.values(npcs).find(n=>n.room===state.room&&n.id!==state.host&&dist(state,n)<42);}
  function nearbyDoor(){return rooms[state.room].doors.find(d=>dist(state,d)<34);}
  function nearbyStation(){return (stations[state.room]||[]).find(s=>dist(state,s)<33);}
  function interactNPC(n) {
    if(!state.host){
      openDialog(n.emoji,`Meet ${n.name}`,`${n.name} is ${n.role}. ${n.quote}`,[
        {label:`Ask to borrow ${n.name}'s body for a friendly prank`,action:()=>{
          state.host=n.id;state.x=n.x-48;state.y=n.y+32;n.trust=Math.min(3,n.trust+1);updateUI();toast(`${n.name} invites your spirit in. You feel right at home!`);sparkles(state.x,state.y,'#fff2a6');
        }},
        {label:`Chat with ${n.name}`,secondary:true,action:()=>{
          if(!state.talked.has(n.id)){state.talked.add(n.id);n.trust=Math.min(3,n.trust+1);updateUI();toast(`${n.name} shares a warm, ghost-friendly smile.`);}else toast(`${n.name} waves. “Come back when you fancy a bit of magic!”`);
        }},
        {label:'Maybe later',secondary:true}
      ]);
    } else {
      const current=npcs[state.host];
      openDialog(n.emoji,`A magical hello to ${n.name}`,`${n.name} and ${current.name} both know this is a silly, temporary bit of magic. ${n.name} grins: “Want to swap our borrowed places?”`,[
        {label:`Swap places with ${n.name} (both agree)`,action:()=>{
          const old=current;state.host=n.id;state.x=n.x-40;state.y=n.y+30;old.trust=Math.min(3,old.trust+1);n.trust=Math.min(3,n.trust+1);updateUI();toast(`${current.name} and ${n.name} trade places with a poof!`);sparkles(state.x,state.y,'#d7f4ff');
        }},
        {label:`Chat as ${current.name}`,secondary:true,action:()=>toast(`“Nice to see you, ${n.name}!” ${n.name} laughs.`)},
        {label:'Not right now',secondary:true}
      ]);
    }
  }
  function doStation(s) {
    if(!state.host){openDialog('✨','A little mischief?','You are a floaty ghost right now. Ask an adult resident if you may borrow their body first—then the harmless pranks are all yours.',[{label:'Got it!'}]);return;}
    const key=`${state.room}:${s.label}`;
    openDialog(s.emoji,s.title,s.text,[
      {label:'Do the playful thing!',action:()=>{
        const first=!state.pranks.has(key);state.pranks.add(key);
        const host=npcs[state.host];host.trust=Math.min(3,host.trust+1);if(first&&state.joy<3)state.joy++;
        updateUI();sparkles(state.x,state.y,'#ffde87');
        if(first){toast(state.joy>=3?'A little laughter, everywhere! Mission complete!':'A joyful little prank! The inn feels brighter.');}
        else toast('A second encore! The room giggles all over again.');
      }}, {label:'On second thought',secondary:true}
    ]);
  }
  function interact(){
    if($('dialogBackdrop').classList.contains('open'))return;
    const n=nearbyNPC(); if(n){interactNPC(n);return;}
    const station=nearbyStation();if(station){doStation(station);return;}
    const door=nearbyDoor();if(door){enterRoom(door.to,door);return;}
    if(state.host){toast('Try a glowing little station to spread some harmless joy.');}else toast('A friendly resident or door is just around the corner.');
  }
  function release(){if(state.host){const n=npcs[state.host];state.host=null;updateUI();toast(`You float free. ${n.name} is safely back in their own body.`);sparkles(state.x,state.y,'#d7f4ff');}else toast('You are already in your own ghostly form!');}
  function sparkles(x,y,color){for(let i=0;i<12;i++)state.particles.push({x,y,vx:(Math.random()-.5)*60,vy:(Math.random()-.8)*65,life:.65+Math.random()*.55,color});}

  const R=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function drawRoom(){
    const room=rooms[state.room];R(0,0,480,300,room.floor);
    // Hand-laid pixel floor tiles
    for(let y=57;y<300;y+=24)for(let x=0;x<480;x+=32){
      if(((x/32|0)+(y/24|0))%2===0)R(x,y,31,23,'#ffffff0b');
      R(x,y,32,1,'#674d3820');R(x,y,1,24,'#674d3820');
      if((x*7+y*3)%11===0)R(x+8,y+7,2,2,'#674d3818');
    }
    R(0,0,480,57,room.wall);R(0,52,480,7,room.trim);R(0,0,480,4,'#fff6dd');
    for(let x=10;x<480;x+=32){R(x,12,22,17,'#ffffff18');R(x+2,14,18,13,'#ffffff12');}
    // Window
    R(32,13,51,34,'#7d9e9a');R(36,17,43,26,'#b4d7c6');R(56,17,3,26,'#e8d8a8');R(36,29,43,3,'#e8d8a8');R(29,46,57,4,room.trim);
    if(state.room==='garden'){
      R(92,15,28,30,'#a4cfdf');R(96,19,20,22,'#d7f0d7');R(104,19,3,22,'#a5c4ba');R(96,28,20,3,'#a5c4ba');
      for(let i=0;i<6;i++){const bx=20+i*75;R(bx,229+(i%2)*10,20,18,'#62915d');R(bx+4,225+(i%2)*10,3,6,'#f3d16f');R(bx+12,223+(i%2)*10,3,6,'#f2a4a1');}
    } else {
      R(352,14,54,33,'#89a5a0');R(356,18,46,25,state.room==='lounge'?'#d8c6df':'#b4d9d5');R(376,18,3,25,'#e8d8a8');R(356,28,46,3,'#e8d8a8');R(348,46,62,4,room.trim);
      if(state.room==='kitchen'){for(let i=0;i<5;i++){R(362+i*8,22,4,4,['#e78573','#e9c66c','#8ec2a8','#d4a0ca','#8badce'][i]);}}
    }
    // wall pictures
    R(145,16,30,27,'#956a51');R(148,19,24,21,'#bfe0be');R(151,28,17,3,'#f3d37b');R(154,23,4,5,'#e98979');R(163,24,4,7,'#7fa58b');
    // Doors
    for(const d of room.doors)drawDoor(d);
    for(const p of props[state.room]||[])drawProp(p);
    // Luminous prank targets
    for(const s of stations[state.room]||[]){
      ctx.globalAlpha=.35+Math.sin(state.time*3+s.x)*.17;ctx.strokeStyle='#fff0a5';ctx.lineWidth=2;ctx.beginPath();ctx.arc(s.x,s.y,15+Math.sin(state.time*4+s.x)*2,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;
      R(s.x-2,s.y-19,4,4,'#fff1a8');
    }
  }
  function drawDoor(d){
    const horizontal=Math.abs(d.x-240)<30;
    if(horizontal){const x=d.x-22,y=d.y<150?54:248;R(x,y,44,47,'#654539');R(x+4,y+4,36,43,'#a66e4d');R(x+8,y+7,28,34,'#c68b5c');R(x+10,y+9,24,29,'#e5b674');R(x+29,y+27,3,3,'#f4d887');R(x-3,y+43,50,5,'#704e40');}
    else{const x=d.x<100?0:436,y=d.y-23;R(x,y,44,47,'#654539');R(x+4,y+4,36,43,'#a66e4d');R(x+8,y+7,28,34,'#c68b5c');R(x+10,y+9,24,29,'#e5b674');R(x+(x===0?29:12),y+27,3,3,'#f4d887');}
  }
  function drawProp(p){
    const {x,y,w,h,type}=p;
    if(type==='sofa'){R(x+4,y+h-4,w-8,8,'#634c49');R(x,y+9,w,h-12,'#b86e66');R(x+4,y+4,w-8,h-12,'#d78678');R(x+8,y+8,w-16,6,'#e8a08c');R(x+3,y+h-2,5,7,'#735447');R(x+w-8,y+h-2,5,7,'#735447');}
    if(type==='rug'){R(x,y,w,h,'#8e6578');R(x+4,y+4,w-8,h-8,'#c28b92');R(x+9,y+8,w-18,h-16,'#e1b779');R(x+w/2-2,y+5,4,h-10,'#f2d89a');}
    if(type==='table'){R(x+4,y+h-3,w-8,6,'#77513b');R(x,y,w,h-6,'#bd8a58');R(x+4,y+3,w-8,5,'#d4a66f');R(x+8,y+h-1,4,8,'#79543e');R(x+w-12,y+h-1,4,8,'#79543e');}
    if(type==='counter'){R(x,y+9,w,h-9,'#80604d');R(x-2,y+2,w+4,9,'#f2e4c2');R(x+5,y+5,w-10,4,'#fff3dc');R(x+12,y+14,21,h-22,'#c79a69');R(x+w-39,y+14,25,h-22,'#c79a69');}
    if(type==='pantry'){R(x+3,y+4,w-6,h-4,'#8d5d42');R(x,y,w,8,'#b17b50');R(x+5,y+11,w-10,2,'#e0b67c');R(x+5,y+24,w-10,2,'#e0b67c');R(x+w/2,y+15,3,3,'#f5d384');}
    if(type==='flowerbed'){R(x,y+8,w,h-8,'#735143');R(x-3,y+4,w+6,8,'#b97d50');R(x+3,y+8,w-6,h-11,'#5d7748');for(let i=0;i<4;i++){R(x+8+i*14,y-2+(i%2)*4,4,10,'#52875c');R(x+5+i*14,y-4+(i%2)*4,5,5,i%2?'#f1a2a3':'#f1d176');R(x+10+i*14,y-4+(i%2)*4,5,5,i%2?'#f3c98c':'#d18cb5');}}
    if(type==='bench'){R(x+5,y+6,w-10,6,'#9b6849');R(x+7,y+16,w-14,6,'#b57b53');R(x+11,y+20,4,12,'#684d41');R(x+w-15,y+20,4,12,'#684d41');}
    if(type==='tree'||type==='plant'){R(x+w/2-4,y+h-8,8,12,'#9e6d4b');R(x+w/2-13,y+9,26,22,'#5d9368');R(x+w/2-7,y+3,19,18,'#73ab72');R(x+w/2-17,y+14,13,16,'#6fa36e');R(x+w/2+6,y+14,14,14,'#579064');R(x+w/2-9,y+13,3,3,'#c9dd91');}
    if(type==='piano'){R(x,y+8,w,h-8,'#282b39');R(x+3,y+2,w-6,9,'#4e4c5a');R(x+7,y+15,w-14,8,'#f5e5c4');for(let i=0;i<8;i++){R(x+8+i*11,y+15,1,8,'#6e6970');if(i%3!==1)R(x+14+i*11,y+15,4,5,'#292d38');}R(x+8,y+h-1,5,7,'#40343b');R(x+w-14,y+h-1,5,7,'#40343b');}
  }
  function drawPerson(x,y,n,asPlayer=false){
    const bob=Math.sin(state.time*4+(n? n.x:0))*1.3;
    ctx.fillStyle='#32404b44';ctx.beginPath();ctx.ellipse(x,y+11,12,4,0,0,Math.PI*2);ctx.fill();
    const skin=n?n.skin:'#f0c4a0',hair=n?n.hair:'#40535d',shirt=n?n.tint:'#80c9bb',pants=n?n.pants:'#617488';
    R(x-7,y-14+bob,14,16,shirt);R(x-8,y-8+bob,16,8,shirt);R(x-6,y+2+bob,5,8,pants);R(x+1,y+2+bob,5,8,pants);R(x-7,y+9+bob,6,3,'#614d45');R(x+1,y+9+bob,6,3,'#614d45');
    R(x-6,y-25+bob,12,12,skin);R(x-7,y-29+bob,14,6,hair);R(x-8,y-24+bob,3,7,hair);R(x+5,y-25+bob,3,7,hair);R(x-3,y-20+bob,2,2,'#34414a');R(x+3,y-20+bob,2,2,'#34414a');R(x-2,y-15+bob,4,1,'#995f59');
    if(n&&n.id==='marlow'){R(x-9,y-14+bob,3,13,'#fff0d6');R(x-10,y-2+bob,7,3,'#fff0d6');}
    if(n&&n.id==='juniper'){R(x-8,y-27+bob,4,9,'#765c78');R(x+5,y-27+bob,4,9,'#765c78');R(x-11,y-26+bob,3,5,'#e9bd73');}
    if(n&&n.id==='ollie'){R(x-8,y-30+bob,5,5,'#3f3739');R(x+3,y-30+bob,5,5,'#3f3739');}
    if(asPlayer){R(x+7,y-28+bob,6,6,'#fff0a3');}
  }
  function drawGhost(x,y){
    const bob=Math.sin(state.time*3.5)*3;ctx.fillStyle='#364b5740';ctx.beginPath();ctx.ellipse(x,y+9,12,4,0,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=.78;R(x-10,y-20+bob,20,19,'#d8f6ef');R(x-8,y-24+bob,16,8,'#e9fff7');R(x-10,y-4+bob,5,6,'#d8f6ef');R(x-2,y-3+bob,5,5,'#d8f6ef');R(x+5,y-5+bob,5,7,'#d8f6ef');ctx.globalAlpha=1;
    R(x-5,y-15+bob,3,4,'#314851');R(x+3,y-15+bob,3,4,'#314851');R(x-2,y-7+bob,4,2,'#68aaa0');
    ctx.strokeStyle='#fffbe6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x-15,y-14+bob);ctx.lineTo(x-20,y-18+bob);ctx.moveTo(x+15,y-17+bob);ctx.lineTo(x+20,y-20+bob);ctx.stroke();
  }
  function label(text,x,y,color='#fff8e9'){
    ctx.font='bold 8px ui-rounded,system-ui,sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#31464dcc';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);
  }
  function drawWorld(){
    ctx.setTransform(2,0,0,2,0,0);drawRoom();
    for(const n of Object.values(npcs))if(n.room===state.room&&n.id!==state.host){drawPerson(n.x,n.y,n);label(n.name,n.x,n.y-34);}
    const host=state.host?npcs[state.host]:null;
    if(host)drawPerson(state.x,state.y,host,true);else drawGhost(state.x,state.y);
    label(host?`YOU AS ${host.name.toUpperCase()}`:'PIP · FRIENDLY GHOST',state.x,state.y-36,'#fff4ba');
    for(const d of rooms[state.room].doors){if(dist(state,d)<57){label(`E · ${d.label}`,d.x,d.y-30,'#fff1aa');}}
    const s=nearbyStation();if(s)label(`E · ${s.label}`,s.x,s.y-24,'#fff1aa');
    const n=nearbyNPC();if(n)label('E · SAY HELLO',n.x,n.y-47,'#fff1aa');
    for(let i=state.particles.length-1;i>=0;i--){const p=state.particles[i];ctx.globalAlpha=clamp(p.life,0,1);R(p.x,p.y,3,3,p.color);p.x+=p.vx/60;p.y+=p.vy/60;p.vy+=.8;p.life-=1/60;if(p.life<=0)state.particles.splice(i,1);}ctx.globalAlpha=1;
  }
  function updateHint(){
    const n=nearbyNPC(),s=nearbyStation(),d=nearbyDoor();
    $('nearbyHint').textContent=n?`E · say hello to ${n.name}`:s?`E · ${s.label.toLowerCase()}${state.host?' — try a harmless prank':' — borrow a body first'}`:d?`E · wander to the ${d.label.toLowerCase()}`:state.host?'Find a glowing station and press E for a playful prank.':'Wander over to say hello!';
  }
  let last=performance.now();
  function frame(now){
    const dt=Math.min(.04,(now-last)/1000);last=now;state.time+=dt;
    if(!document.hidden&&!$('dialogBackdrop').classList.contains('open')){
      let dx=0,dy=0;if(keys.has('ArrowLeft')||keys.has('a'))dx--;if(keys.has('ArrowRight')||keys.has('d'))dx++;if(keys.has('ArrowUp')||keys.has('w'))dy--;if(keys.has('ArrowDown')||keys.has('s'))dy++;
      if(dx||dy){const len=Math.hypot(dx,dy);state.x+=dx/len*105*dt;state.y+=dy/len*105*dt;if(dx)state.face=Math.sign(dx);}
      state.x=clamp(state.x,17,463);state.y=clamp(state.y,66,286);
    }
    if(state.toastTimer>0){state.toastTimer-=dt;if(state.toastTimer<=0)$('toast').classList.remove('show');}
    drawWorld();updateHint();requestAnimationFrame(frame);
  }
  function playNote(){if(!state.sound)return;try{const AC=window.AudioContext||window.webkitAudioContext;const ac=playNote.ac||(playNote.ac=new AC());const osc=ac.createOscillator(),gain=ac.createGain();osc.type='sine';osc.frequency.value=[523,659,784][Math.floor(Math.random()*3)];gain.gain.setValueAtTime(.055,ac.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.28);osc.connect(gain);gain.connect(ac.destination);osc.start();osc.stop(ac.currentTime+.3);}catch(e){}}
  document.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k))e.preventDefault();
    if(k==='escape'){closeDialog();return;}if(k==='e'||k===' '){if(!e.repeat)interact();return;}if(k==='r'){if(!e.repeat)release();return;}keys.add(k);
  });
  document.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>keys.clear());
  document.querySelectorAll('[data-dir]').forEach(b=>{
    const key={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[b.dataset.dir];
    const on=e=>{e.preventDefault();keys.add(key);};const off=e=>{e.preventDefault();keys.delete(key);};
    b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointercancel',off);b.addEventListener('pointerleave',off);
  });
  $('touchInteract').addEventListener('click',interact);$('touchReturn').addEventListener('click',release);
  $('closeDialog').addEventListener('click',closeDialog);$('dialogBackdrop').addEventListener('click',e=>{if(e.target===$('dialogBackdrop'))closeDialog();});
  $('soundBtn').addEventListener('click',()=>{state.sound=!state.sound;$('soundBtn').textContent=`♪ SOUND: ${state.sound?'ON':'OFF'}`;playNote();});
  document.addEventListener('click',e=>{if(e.target.classList.contains('choice')&&state.sound)playNote();});
  updateUI();requestAnimationFrame(frame);
})();
