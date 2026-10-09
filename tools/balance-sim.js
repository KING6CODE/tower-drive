/* Banc de simulation Tower Drive : joueur virtuel accéléré (jamais publié). Chargé via fetch + eval. */
(function(){
var RealDate=window.__RealDate||Date;window.__RealDate=RealDate;
var FAKE={t:RealDate.now()};
window.Date=class extends RealDate{constructor(...a){if(a.length===0)super(FAKE.t);else super(...a)}static now(){return FAKE.t}};
/* neutraliser tout ce qui est coûteux / visuel */
window.save=function(){};window.saveResume=function(){};window.toast=function(){};window.vib=function(){};
window.draw=function(){};window.updateHud=function(){};window.updUltBtns=function(){};
try{window.SFX=new Proxy({}, {get:function(){return function(){}}})}catch(e){}
silentPause=true; /* la boucle de la page ne touche plus à R */

var PRIO_CARDS=['dmg','hp','isp','aspd','regen','coin','cash','swnd','stw','wskip','esh','crit','edef','freeup','cco','range','slow','bers','wacc','ebal'];
var PRIO_WPN=['gt','bh','dw','cl','mines','ms','cf','ps','sl'];
var PRIO_PERK=['DÉGÂTS','CADENCE','ARMES','INTÉGRITÉ','PIÈCES','BLINDAGE','RÉGÉN','CRÉDITS','MODULES','PERKS','SOINS','SAUT'];
var SEQ=[0,0,1,0,2,0,1,0];
var PROFILES={
 casual:{sessions:2,realMin:20,speedCap:3,chestGems:25,chestCores:0,revive:true},
 regular:{sessions:3,realMin:60,speedCap:5,chestGems:70,chestCores:0,revive:true},
 engaged:{sessions:4,realMin:120,speedCap:6.25,chestGems:185,chestCores:45,revive:true}
};
var S=null;

function newState(name){
 var P=PROFILES[name];
 M=defMeta();M.tutStage=3;M.atelierGift=1;M.cardsGift=1;M.tutSeen={ult:1};M.coins=50;M.gems=40;M.resume=null;
 R=null;
 FAKE.t=new RealDate(2026,0,1,8,0,0).getTime();
 S={name:name,P:P,day:0,rr:0,wsrr:0,labrr:0,runs:0,runLog:[],daily:[],recent:[],coinsTot:0,gemsSpent:{pull:0,evo:0,slot:0,mod:0,uw:0},gameSec:0,deaths:0,revives:0,tierBest:{},prestiged:0};
}

function lkOk(u){return !u.lk||lkOpen(u.lk)}
function wsCandidate(cat){
 var best=null,bc=1e300;
 for(var i=0;i<UDEF.length;i++){
  var u=UDEF[i];if(u.cat!==cat||!lkOk(u))continue;
  var cost;
  if(u.lock&&!M.wsU[u.id])cost=u.lock;
  else{var l=M.ws[u.id]||0;if(u.cap!==undefined&&l>=u.cap)continue;cost=wsCost(u,l)}
  if(cost<bc){bc=cost;best=u}
 }
 return best?{u:best,c:bc}:null;
}
function spendWorkshop(budget){
 var buys=0,spent=0,fail=0;
 for(var g=0;g<20000&&fail<SEQ.length*2;g++){
  var cat=SEQ[S.wsrr%SEQ.length];S.wsrr++;
  var c=wsCandidate(cat);
  if(!c){fail++;continue}
  if(c.c>budget-spent||c.c>M.coins){fail++;continue}
  fail=0;
  M.coins-=c.c;spent+=c.c;
  if(c.u.lock&&!M.wsU[c.u.id])M.wsU[c.u.id]=1;else M.ws[c.u.id]=(M.ws[c.u.id]||0)+1;
  buys++;
 }
 return buys;
}
function spendLab(budget){
 if(!labUnlocked())return 0;
 var n=0;
 for(var g=0;g<10;g++){
  if((M.lab.rs||[]).length>=M.lab.slots)break;
  var best=null,order=[];
  for(var k=0;k<LABS.length;k++)order.push(LABS[(S.labrr+k)%LABS.length]);
  var sp=LABS.filter(function(d){return d.id==='spd'})[0];
  order.unshift(sp);
  for(var o=0;o<order.length;o++){
   var d=order[o],l=M.lab.lvl[d.id]||0;
   if(labAct(d.id)||(d.max&&l>=d.max))continue;
   var cost=labCost(d,l);
   if(cost<=Math.min(budget,M.coins)){best={d:d,cost:cost,l:l};break}
   if(d.id==='spd'&&l<d.max)break; /* on économise pour la vitesse */
  }
  if(!best)break;
  if(best.d.id!=='spd')S.labrr++;
  M.coins-=best.cost;budget-=best.cost;
  M.lab.rs.push({id:best.d.id,start:Date.now(),end:Date.now()+labDurS(best.d,best.l)*1000});
  n++;
 }
 return n;
}
function pullCards(n){
 for(var i=0;i<n;i++){
  var r=rollRarity(),pool=[],tries=0;
  while(tries<3){pool=CARDS.filter(function(c){return c.r===r&&cardLv(c.id)<7});if(pool.length)break;r=(r+1)%3;tries++}
  if(!pool.length)pool=CARDS.filter(function(c){return cardLv(c.id)<7});
  if(!pool.length)return i;
  var c=pool[irnd(0,pool.length-1)],rec=M.cards.own[c.id];
  if(rec&&rec.c!==undefined&&rec.l!==undefined)rec.c++;else M.cards.own[c.id]={c:0,l:1};
 }
 return n;
}
function equipCards(){
 normalizeCards();
 for(var i=0;i<M.slots;i++)M.cards.eq[i]=null;
 var k=0;
 for(var p=0;p<PRIO_CARDS.length&&k<M.slots;p++){
  var id=PRIO_CARDS[p];
  if(cardLv(id)>=1){M.cards.eq[k++]=id}
 }
}
function spendGems(){
 var ownedN=0;for(var id in M.cards.own)ownedN++;
 var guard=0;
 while(guard++<400){
  var did=false;
  /* 1) évolutions des cartes équipées */
  for(var p=0;p<PRIO_CARDS.length;p++){
   var cid=PRIO_CARDS[p],lv=cardLv(cid);
   if(lv<1||lv>=7)continue;
   var need=CARDNEXT[lv-1],gem=CARDGEM[lv-1];
   if(cardCopies(cid)>=need&&M.gems>=gem){M.gems-=gem;S.gemsSpent.evo+=gem;M.cards.own[cid].c-=need;M.cards.own[cid].l++;M.st.evos++;did=true;break}
  }
  if(did)continue;
  /* 2) emplacement supplémentaire : priorité tant que le coût reste raisonnable et qu'on a assez de cartes à y mettre */
  var saving=false;
  if(M.slots<22){
   var sc=SLOTCOST[M.slots-1];
   if(ownedN>=M.slots){
    if(M.gems>=sc){M.gems-=sc;S.gemsSpent.slot+=sc;M.slots++;M.cards.eq.push(null);continue}
    if(sc<=1000)saving=true; /* on économise pour l'emplacement plutôt que de tirer */
   }
  }
  if(saving)break;
  /* 3) modules système */
  if(bestAny()>=30&&M.gems>=150&&ownedN>=10){
   var allMax=true;for(var q=0;q<3;q++)if((M.mods.lv[MODDEF[q].id]||0)<5)allMax=false;
   if(!allMax){M.gems-=150;S.gemsSpent.mod+=150;var tgt;do{tgt=MODDEF[irnd(0,2)]}while((M.mods.lv[tgt.id]||0)>=5);M.mods.lv[tgt.id]=(M.mods.lv[tgt.id]||0)+1;continue}
  }
  /* 4) éveil des armes (gemmes) */
  var wdid=false;
  for(var w=0;w<PRIO_WPN.length;w++){var lw=wlv(PRIO_WPN[w]);if(lw>=4&&lw<8){var gc=uwPlusCost(lw);if(M.gems>=gc){M.gems-=gc;S.gemsSpent.uw+=gc;M.wpn[PRIO_WPN[w]]=lw+1;wdid=true;break}}}
  if(wdid)continue;
  /* 5) tirages */
  if(saving)break;
  if(M.gems>=20){var n=Math.min(10,Math.floor(M.gems/20));M.gems-=n*20;S.gemsSpent.pull+=n*20;var got=pullCards(n);if(!got){M.gems+=n*20;break}ownedN=0;for(var id2 in M.cards.own)ownedN++;continue}
  break;
 }
 equipCards();
}
function spendCores(){
 for(var g=0;g<60;g++){
  var did=false;
  for(var w=0;w<PRIO_WPN.length;w++){
   var id=PRIO_WPN[w],lv=wlv(id);
   if(lv===0){var c=uwCost();if(M.cores>=c){M.cores-=c;M.wpn[id]=1;did=true;break}}
  }
  if(did)continue;
  for(var w2=0;w2<PRIO_WPN.length;w2++){
   var id2=PRIO_WPN[w2],lv2=wlv(id2);
   if(lv2>=1&&lv2<4){var base=uwCost();/* coût de palier basé sur le dernier coût d'arme */ var cst=UW_COST[Math.max(0,Math.min(UW_COST.length-1,countWpn()-1))]*(lv2+1)*2;if(M.cores>=cst){M.cores-=cst;M.wpn[id2]=lv2+1;did=true;break}}
  }
  if(!did)break;
 }
}
function countWpn(){var n=0;for(var i=0;i<WPN.length;i++)if(wlv(WPN[i].id)>0)n++;return n}
function metaSpend(){
 var coinsBefore=M.coins;
 var labB=labUnlocked()?Math.floor(M.coins*.3):0;
 spendLab(labB);
 spendWorkshop(M.coins);
 spendCores();
 spendGems();
}
function dailyIncome(){
 var P=S.P;
 M.gems+=GEM_DAILY; /* gemmes quotidiennes (pub) */
 var cr=CAL_R[S.day%7];if(cr.c)M.coins+=cr.c;if(cr.g)M.gems+=cr.g;
 if(S.day%7===6){M.gems+=P.chestGems;if(P.chestCores)M.cores+=P.chestCores}
}
function startNewRun(){
 var un=Math.min(tiersUnlocked()-1,11),tier=un;
 var rc=S.recent.filter(function(r){return r.tier===un});
 if(un>0&&rc.length>=2&&rc.slice(-2).every(function(r){return r.wave<12}))tier=un-1;
 startRun(tier,null,false);
 R.revived=!S.P.revive; /* si le joueur regarde les pubs : revive possible */
 S.runs++;S.cur={n:S.runs,tier:tier,t0:S.gameSec,c0:M.st.coins,cores0:M.st.cores||0};
}
function finishRun(){
 var c=S.cur;if(!c)return;
 var rec={n:c.n,tier:c.tier,wave:c.wave||0,sec:Math.round(c.time||0),day:S.day,coins:Math.round(M.st.coins-c.c0),killer:lastKiller,cores:(M.st.cores||0)-c.cores0};
 S.runLog.push(rec);S.recent.push(rec);if(S.recent.length>6)S.recent.shift();
 S.cur=null;
}
function botTick(){
 /* achats en partie */
 var nb=R.time<90?60:6;
 for(var k=0;k<nb;k++){
  var cat=SEQ[S.rr%SEQ.length],best=null,bc=1e300;
  for(var i=0;i<UDEF.length;i++){var u=UDEF[i];if(u.cat!==cat||!ruVisible(u))continue;var l=R.ups[u.id];if(u.cap!==undefined&&l>=u.cap)continue;var c=ruCost(u,l);if(c<bc){bc=c;best=u}}
  if(!best){S.rr++;continue}
  if(R.cash<bc)break;
  R.cash-=bc;R.ups[best.id]++;recalc();S.rr++;
 }
 /* armes actives */
 for(var w=0;w<WPN.length;w++){var d=WPN[w];if(d.act&&wlv(d.id)>0&&(R.cds[d.id]||0)<=0&&R.disabledW!==d.id){try{actWeapon(d.id)}catch(e){}}}
 if(R.s.stwM>1&&(R.cds.stw||0)<=0){try{actWeapon('stw')}catch(e){}}
 /* perks */
 var ov=document.getElementById('ovPerk');
 if(ov&&ov.classList.contains('on')){
  var bs=[].slice.call(document.querySelectorAll('#perkBox [data-pk]')),pick=null,bp=99;
  bs.forEach(function(b){if(b.classList.contains('top'))return;var t=b.textContent,pr=99;for(var p=0;p<PRIO_PERK.length;p++)if(t.indexOf(PRIO_PERK[p])>=0){pr=p;break}if(pr<bp){bp=pr;pick=b}});
  if(!pick&&bs.length)pick=bs[0];
  if(pick)pick.click();
 }
 /* revive */
 if(R.revPrompt){
  S.revives++;
  $('ovRevive').classList.remove('on');
  R.revPrompt=false;R.revived=true;R.tower.hp=R.tower.maxhp*.5;R.shieldT=Math.max(R.shieldT,4);
  for(var e=0;e<R.enemies.length;e++){var q=R.enemies[e];if(!q.dead&&!(q.d&&q.d.boss)&&Math.hypot(q.x-200,q.y-200)<70){q.hp=0;kill(q,false)}}
 }
}
/* joue `sec` secondes de jeu */
function play(sec){
 var steps=Math.round(sec*60),n=0;
 while(n<steps){
  if(!R){finishRun();startNewRun()}
  var cur=S.cur;
  for(var q=0;q<30&&R&&n<steps;q++,n++){
   update(DT);
   if(R){cur.wave=R.wave;cur.time=R.time}
   if(!R)break;
  }
  if(R){botTick()}
  else{S.deaths++}
 }
 S.gameSec+=sec;
}
function snapshot(){
 var cards=0,cardLvSum=0;for(var id in M.cards.own){cards++;cardLvSum+=cardLv(id)}
 var wsSum=0;for(var k in M.ws)wsSum+=M.ws[k];
 var labSum=0;for(var k2 in M.lab.lvl)labSum+=M.lab.lvl[k2];
 return {day:S.day,best:M.best.slice(0,6).join('/'),tiers:tiersUnlocked(),ws:wsSum,cards:cards+'('+cardLvSum+'★)',slots:M.slots,wpn:countWpn()+'(Σ'+Object.values(M.wpn).reduce(function(a,b){return a+b},0)+')',gems:M.gems,cores:M.cores,coins:Math.round(M.coins),lab:labSum,spdLv:(M.lab.lvl.spd||0),spd:S.lastSpd||1,mods:(M.mods.lv.atk||0)+'/'+(M.mods.lv.def||0)+'/'+(M.mods.lv.eco||0),runs:S.runs,hours:Math.round(S.gameSec/360)/10};
}
function simDays(n,budgetMs){
 var t0=performance.now(),done=0;
 while(done<n&&performance.now()-t0<budgetMs){
  if(S.day>0)FAKE.t+=24*3600e3;
  FAKE.t=Math.floor(FAKE.t/86400e3)*86400e3+8*3600e3;
  dailyIncome();
  var P=S.P;
  for(var s=0;s<P.sessions;s++){
   FAKE.t+=s*5*3600e3;
   labTick();
   metaSpend();
   var spdNow=Math.min(P.speedCap,SPD_STEPS[spdMax()]),gsec=P.realMin*60*spdNow/P.sessions;S.lastSpd=spdNow;
   play(gsec);
   metaSpend();
  }
  S.day++;done++;
  var sn=snapshot();sn.coinsDay=Math.round(M.st.coins-(S.stPrev||0));S.stPrev=M.st.coins;S.daily.push(sn);
 }
 return done;
}

/* Essai ciblé sur un Gardien : démarre près du boss (Intro Sprint niveau 7), joue jusqu'à la mort ou la victoire. mod = {hp:x, sp:x} */
function bossTrial(tier,bossWave,n,mod){
 var out=[],save0={best:M.best[tier],isp:M.cards.own.isp,eq0:M.cards.eq[0],hpm:EDEF.boss.hp,spm:EDEF.boss.sp,rev:S.P.revive};
 mod=mod||{};
 if(mod.hp)EDEF.boss.hp=save0.hpm*mod.hp;
 if(mod.sp)EDEF.boss.sp=save0.spm*mod.sp;
 M.cards.own.isp={c:0,l:7};M.cards.eq[0]='isp';M.best[tier]=Math.max(M.best[tier],bossWave+1);
 /* le sprint saute jusqu'à floor((best-2)/10)*10+1 : on règle le record pour que le boss soit à ~9 vagues de là */
 M.best[tier]=bossWave-8+1; // lim=best-1=bossWave-8 -> cible= floor((lim-1)/10)*10+1
 S.P.revive=false;
 for(var i=0;i<n;i++){
  startRun(tier,null,false);R.revived=true;
  var minFrac=1,passed=false,t0=0,steps=0,cap=60*480;
  while(R&&steps<cap){
   update(DT);steps++;
   if(!R)break;
   if(steps%30===0)botTick();
   if(R&&R.boss&&R.wave===bossWave){var b=R.boss;minFrac=Math.min(minFrac,b.hp/b.maxhp)}
   if(R&&R.wave>bossWave){passed=true;break}
  }
  out.push({passed:passed,minFrac:+minFrac.toFixed(3),wave:R?R.wave:bossWave,start:null});
  if(R){R.revived=true;R.tower.hp=0;R.dead=false;R.active=false;R=null}
 }
 M.best[tier]=save0.best;EDEF.boss.hp=save0.hpm;EDEF.boss.sp=save0.spm;S.P.revive=save0.rev;
 if(save0.isp)M.cards.own.isp=save0.isp;else delete M.cards.own.isp;M.cards.eq[0]=save0.eq0;
 return out;
}

window.TDSIM={bossTrial:bossTrial,setSeq:function(a){SEQ=a},setProfile:function(n,o){for(var k in o)PROFILES[n][k]=o[k]},newState:newState,simDays:simDays,snapshot:snapshot,state:function(){return S},PROFILES:PROFILES,play:play,metaSpend:metaSpend};
})();
window.runAsync=function(target){if(window.__run)return 'already';window.__run=true;(function step(){if(TDSIM.state().day>=target){window.__run=false;return}TDSIM.simDays(1,1);setTimeout(step,5)})();return 'started'};
window.prog=function(){var S=TDSIM.state();return JSON.stringify({day:S.day,running:!!window.__run,snap:S.daily[S.daily.length-1],runs:S.runLog.slice(-4).map(function(r){return 'W'+r.wave+' '+Math.round(r.sec/60)+'m'})})};
'sim loaded'
