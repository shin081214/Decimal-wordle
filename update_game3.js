const fs = require('fs');
let code = fs.readFileSync('game.js', 'utf8');

// 1. updKb function empty
code = code.replace(/function updKb\(d,s\)\{.*?\}/, 'function updKb(d,s){}');

// 2. guess initialization
code = code.replace(/guess=\[\];/g, "guess=new Array(digCnt).fill('');");

// 3. createBoard onclick and tile creation
code = code.replace(/const t=document\.createElement\('div'\);t\.className='tile';t\.id='tile-'\+r\+'-'\+c;rv\.appendChild\(t\);/g, 
`const t=document.createElement('div');t.className='tile';t.id='tile-'+r+'-'+c;
t.onclick = () => { if(!over && !isAnimating && r === row) { col = c; updateAct(); } };
rv.appendChild(t);`);

// 4. updateTileText function injection
const updateTileTextFunc = `
function updateTileText(r, c, text) {
    const t = document.getElementById('tile-'+r+'-'+c);
    if (!t) return;
    if(c%2 === 1) {
        const g1 = guess[c-1] || '';
        const g2 = guess[c] || '';
        let letter = '';
        if(g1 !== '' && g2 !== '') {
            let num = parseInt(g1+g2, 10);
            if(num >= 1 && num <= 26) {
                letter = String.fromCharCode(64 + num);
            }
        }
        t.innerHTML = text + '<span style="position:absolute; left:-2px; bottom:-22px; transform:translateX(-50%); font-size:0.85rem; color:#00e5ff; font-weight:bold; text-shadow:0 0 5px rgba(0,229,255,0.5); pointer-events:none; font-family:var(--ff);">' + letter + '</span>';
    } else {
        t.textContent = text;
        if (c+1 < digCnt) {
            updateTileText(r, c+1, guess[c+1] || '');
        }
    }
}
`;

if (!code.includes('function updateTileText')) {
    code = code.replace(/function addD\(d\)\{/, updateTileTextFunc + '\nfunction addD(d){');
}

// 5. addD replacement
const newAddD = `function addD(d){
if(over||isAnimating)return;
if(col>=digCnt) {
    let firstEmpty = guess.indexOf('');
    if (firstEmpty !== -1) col = firstEmpty;
    else return;
}
snd('type');
guess[col]=d;
const t=document.getElementById('tile-'+row+'-'+col);
updateTileText(row, col, d);
t.classList.remove('typing');
void t.offsetWidth;
t.classList.add('typing','filled');
let nextCol = col + 1;
while(nextCol < digCnt && guess[nextCol] !== '') nextCol++;
if(nextCol < digCnt) col = nextCol;
else if(col < digCnt - 1) col++; 
else col = digCnt;
updateAct();
}`;
code = code.replace(/function addD\(d\)\{.*?\n\}/s, newAddD);

// 6. delD replacement
const newDelD = `function delD(){
if(over||isAnimating)return;
if(col >= digCnt || guess[col] === '') {
    let p = col - 1;
    while(p >= 0 && guess[p] === '') p--;
    if(p >= 0) col = p;
    else if (col > 0) col--;
}
if(col>=0 && col<digCnt && guess[col]!=='') {
    snd('del');
    guess[col]='';
    const t=document.getElementById('tile-'+row+'-'+col);
    updateTileText(row, col, '');
    t.classList.remove('filled','typing');
}
updateAct();
}`;
code = code.replace(/function delD\(\)\{.*?\n\}/s, newDelD);

// 7. updateAct arrow keys handling
// Find window.addEventListener('keydown' ...
// We need to add ArrowLeft and ArrowRight to window.addEventListener('keydown', e=>{...})
const keydownRegex = /window\.addEventListener\('keydown',\s*e=>\{[\s\S]*?\}\);/;
let keydownMatch = code.match(keydownRegex);
if (keydownMatch) {
    let kd = keydownMatch[0];
    if (!kd.includes('ArrowLeft')) {
        kd = kd.replace(/if\(e\.key==='Backspace'\)/, `if(e.key==='ArrowLeft'){if(col>0){col--;updateAct();}return;}else if(e.key==='ArrowRight'){if(col<digCnt-1){col++;updateAct();}return;}else if(e.key==='Backspace')`);
        code = code.replace(keydownRegex, kd);
    }
}

// 8. Hint filling
// In showExtraHint, after `extraHintStr=...`
const hintAutoFill = `for(let h of hArr){
let hi=h.p-1; let ansStr=w2d(h.l); let c1=hi*2; let c2=hi*2+1;
guess[c1]=ansStr[0]; guess[c2]=ansStr[1];
let t1=document.getElementById('tile-'+row+'-'+c1); let t2=document.getElementById('tile-'+row+'-'+c2);
if(t1) t1.classList.add('filled'); if(t2) t2.classList.add('filled');
updateTileText(row, c1, guess[c1]);
}
updateAct();`;

code = code.replace(/extraHintStr=\(extraHintStr\?extraHintStr\+' \/ ':''\)\+'\('\+hs\+'\)';/, `extraHintStr=(extraHintStr?extraHintStr+' / ':'')+'('+hs+')';\n${hintAutoFill}`);

// Write back
fs.writeFileSync('game.js', code);
console.log('Done update_game3');
