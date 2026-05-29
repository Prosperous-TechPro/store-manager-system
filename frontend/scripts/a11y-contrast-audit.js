const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '../src/styles.css');
const css = fs.readFileSync(file, 'utf8');

function extractVars(cssText){
  const root = cssText.match(/:root\s*{([\s\S]*?)}/);
  if(!root) return {};
  const body = root[1];
  const lines = body.split(/;\n?/);
  const vars = {};
  for(const line of lines){
    const m = line.match(/--([a-z0-9-_]+)\s*:\s*([^;\n]+)/i);
    if(m) vars[m[1].trim()] = m[2].trim();
  }
  return vars;
}

function parseColor(s){
  if(!s) return null;
  s = s.trim();
  if(s.startsWith('#')){
    const hex = s.slice(1);
    if(hex.length===3) return hex.split('').map(h=>parseInt(h+h,16));
    if(hex.length===6) return [hex.slice(0,2),hex.slice(2,4),hex.slice(4,6)].map(h=>parseInt(h,16));
  }
  const rgba = s.match(/rgba?\(([^)]+)\)/i);
  if(rgba){
    const parts = rgba[1].split(',').map(p=>p.trim());
    return parts.slice(0,3).map(v=>Math.round(parseFloat(v)));
  }
  // fallback simple named colors small map
  const named = {
    white:[255,255,255], black:[0,0,0]
  };
  if(named[s]) return named[s];
  return null;
}

function luminance([r,g,b]){
  const srgb = [r,g,b].map(v=>v/255).map(v=> v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055,2.4));
  return 0.2126*srgb[0]+0.7152*srgb[1]+0.0722*srgb[2];
}
function contrast(rgbA, rgbB){
  const L1 = luminance(rgbA);
  const L2 = luminance(rgbB);
  const lighter = Math.max(L1,L2);
  const darker = Math.min(L1,L2);
  return +( (lighter+0.05)/(darker+0.05) ).toFixed(2);
}

const vars = extractVars(css);
const parsed = {};
for(const k in vars){
  parsed[k]= parseColor(vars[k]);
}

const checks = [
  {name: 'Body text vs page bg', fg: 'text', bg: 'bg-0', min:4.5},
  {name: 'Body text vs surface', fg: 'text', bg: 'surface', min:4.5},
  {name: 'Muted text vs surface', fg: 'muted', bg: 'surface', min:4.5},
  {name: 'Nav link vs surface', fg: 'muted', bg: 'surface', min:4.5},
  // nav active uses white text visually; check white on primary
  {name: 'Nav link active (white text) vs primary', fg: '#ffffff', bg: 'primary', min:4.5},
  {name: 'Account name vs nav surface', fg: 'text', bg: 'surface', min:4.5},
  // button primary uses white text; check that
  {name: 'Button primary text (white) vs primary', fg: '#ffffff', bg: 'primary', min:4.5},
  {name: 'Button secondary text vs surface', fg: 'primary', bg: 'surface', min:4.5},
  {name: 'Metric label vs metric bg', fg: 'muted', bg: 'surface', min:4.5},
];

const results = [];
for(const c of checks){
  const fg = (c.fg && c.fg.startsWith('#')) ? parseColor(c.fg) : parsed[c.fg];
  let bg = (c.bg && c.bg.startsWith('#')) ? parseColor(c.bg) : parsed[c.bg];
  if(!fg || !bg){
    results.push({...c, ok:false, reason:'missing variable or parse failed', ratio:null});
    continue;
  }
  const ratio = contrast(fg,bg);
  results.push({...c, ratio, ok: ratio >= (c.min||4.5)});
}

console.log('Contrast Audit Results:');
let failCount = 0;
for(const r of results){
  if(r.ok) console.log(`  ✔ ${r.name}: ${r.ratio}:1`);
  else { console.log(`  ✖ ${r.name}: ${r.ratio||'n/a'}:1  — FAILED (need ≥ ${r.min}) ${r.reason?'- '+r.reason:''}`); failCount++; }
}
process.exit(failCount>0?2:0);
