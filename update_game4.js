const fs = require('fs');

// 1. Update style.css
let style = fs.readFileSync('style.css', 'utf8');
style = style.replace(/\.tile\.active\{.*?\}/, '.tile.active{border-color:var(--cyan);box-shadow:0 0 15px var(--cyan), inset 0 0 10px rgba(0,229,255,0.3); transform:scale(1.05);}');
fs.writeFileSync('style.css', style);

// 2. Update index.html
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace(/<input type="checkbox" id="coop-toggle" checked>/, '<input type="checkbox" id="coop-toggle">');
fs.writeFileSync('index.html', html);

// 3. Update game.js
let game = fs.readFileSync('game.js', 'utf8');

// coopMode default false
game = game.replace(/let sndOn=true,matOn=true,hard=false,coopMode=true/, 'let sndOn=true,matOn=true,hard=false,coopMode=false');

// Add lockedCols to globals
if (!game.includes('lockedCols=[]')) {
    game = game.replace(/let maxG=6,/, 'let lockedCols=[], maxG=6,');
    game = game.replace(/row=0;col=0;guess=new Array\(digCnt\)\.fill\(''\);/, "row=0;col=0;guess=new Array(digCnt).fill('');lockedCols=new Array(digCnt).fill(false);");
}

// Update updateTileText z-index and click logic to ignore lockedCols
game = game.replace(/z-index:10; /, '');
game = game.replace(/text-shadow:0 0 5px rgba\(0,229,255,0\.5\); pointer-events:none; font-family:var\(--ff\);/, 'text-shadow:0 0 5px rgba(0,229,255,0.5); pointer-events:none; font-family:var(--ff); z-index:10;');
game = game.replace(/bottom:-22px;/, 'bottom:-12px;');

game = game.replace(/t\.onclick = \(\) => \{ if\(!over && !isAnimating && r === row\) \{ col = c; updateAct\(\); \} \};/, 
`t.onclick = () => { if(!over && !isAnimating && r === row && !lockedCols[c]) { col = c; updateAct(); } };`);

// Update addD to skip lockedCols
const newAddD = `function addD(d){
if(over||isAnimating)return;
if(col>=digCnt) {
    let firstEmpty = -1;
    for(let i=0; i<digCnt; i++) if(guess[i]==='' && !lockedCols[i]) { firstEmpty=i; break; }
    if (firstEmpty !== -1) col = firstEmpty;
    else return;
}
if(lockedCols[col]) return;
snd('type');
guess[col]=d;
const t=document.getElementById('tile-'+row+'-'+col);
updateTileText(row, col, d);
t.classList.remove('typing');
void t.offsetWidth;
t.classList.add('typing','filled');
let nextCol = col + 1;
while(nextCol < digCnt && (guess[nextCol] !== '' || lockedCols[nextCol])) nextCol++;
if(nextCol < digCnt) col = nextCol;
else if(col < digCnt - 1) col++; 
else col = digCnt;
updateAct();
}`;
game = game.replace(/function addD\(d\)\{.*?\n\}/s, newAddD);

// Update delD to stay and ignore lockedCols
const newDelD = `function delD(){
if(over||isAnimating)return;
if(lockedCols[col]) return;
if(col>=0 && col<digCnt && guess[col]!=='') {
    snd('del');
    guess[col]='';
    const t=document.getElementById('tile-'+row+'-'+col);
    updateTileText(row, col, '');
    t.classList.remove('filled','typing');
} else {
    let p = col - 1;
    while(p >= 0 && lockedCols[p]) p--;
    if(p >= 0) {
        col = p;
        snd('del');
        guess[col]='';
        const t=document.getElementById('tile-'+row+'-'+col);
        updateTileText(row, col, '');
        t.classList.remove('filled','typing');
    }
}
updateAct();
}`;
game = game.replace(/function delD\(\)\{.*?\n\}/s, newDelD);

// Update arrow keys in hk
game = game.replace(/else if\(k==='ArrowLeft'\)\{if\(col>0\)\{col--;updateAct\(\);\}\}else if\(k==='ArrowRight'\)\{if\(col<digCnt-1\)\{col\+\+;updateAct\(\);\}\}/,
`else if(k==='ArrowLeft'){let p=col-1;while(p>=0&&lockedCols[p])p--;if(p>=0){col=p;updateAct();}}else if(k==='ArrowRight'){let p=col+1;while(p<digCnt&&lockedCols[p])p++;if(p<digCnt){col=p;updateAct();}}`);

// Update nxt() in reveal
game = game.replace(/const nxt=\(\)=>\{isAnimating=false;if\(coopMode\)\{curPlayer=curPlayer===1\?2:1;updateTurnUI\(\);showTurnOverlay\(curPlayer\);\}updateAct\(\);\};/,
`const nxt=()=>{isAnimating=false;if(coopMode){curPlayer=curPlayer===1?2:1;updateTurnUI();showTurnOverlay(curPlayer);}for(let i=0;i<digCnt;i++){if(lockedCols[i])guess[i]=answer[i];}col=0;while(col<digCnt&&lockedCols[col])col++;updateAct();};`);

// Update showExtraHint auto fill
game = game.replace(/for\(let h of hArr\)\{\nlet hi=h\.p-1;.*?\nupdateAct\(\);\n\}/s, 
`for(let h of hArr){
let hi=h.p-1; let ansStr=w2d(h.l); let c1=hi*2; let c2=hi*2+1;
lockedCols[c1]=true; lockedCols[c2]=true;
for(let r=row; r<maxG; r++){
    let t1=document.getElementById('tile-'+r+'-'+c1);
    let t2=document.getElementById('tile-'+r+'-'+c2);
    if(t1){ t1.textContent=ansStr[0]; t1.classList.add('correct','filled'); t1.style.pointerEvents='none'; }
    if(t2){ t2.innerHTML=ansStr[1]+'<span style="position:absolute; left:-2px; bottom:-12px; transform:translateX(-50%); font-size:0.8rem; color:#00ff88; font-weight:bold; text-shadow:0 0 5px rgba(0,255,136,0.8); z-index:10; pointer-events:none; font-family:var(--ff);">'+h.l+'</span>'; t2.classList.add('correct','filled'); t2.style.pointerEvents='none'; }
    if(r===row){ guess[c1]=ansStr[0]; guess[c2]=ansStr[1]; }
}
}
col=0; while(col<digCnt&&lockedCols[col])col++;
updateAct();`);

// Update showRes emoji
game = game.replace(/ct\.innerHTML='<div class="r-emoji">'\+\(won\?'🎉':'💀'\)\+'<\/div><div class="r-title '/,
`let emojiHtml = '<div class="r-emoji">'+(won?'🎉':'💀')+'</div>';
if (aWord.length === 10) emojiHtml = '<div class="r-emoji"><img src="muchroom.png" style="width:60px; height:auto;"/></div>';
ct.innerHTML=emojiHtml+'<div class="r-title '`);

fs.writeFileSync('game.js', game);
console.log('Update 4 done');
