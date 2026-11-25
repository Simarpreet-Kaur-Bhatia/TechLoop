import { clamp, TECHS } from './data';

const LEX = {
  attendance:['attendance','rfid','face','biometric','qr','roll','presence','proxy','entry','classroom','records'],
  automation:['automatic','automatically','automate','auto','manual','unattended','sensor'],
  classroom:['class','classroom','lecture','lab','campus','school','teacher'],
  agriculture:['crop','soil','farm','farmer','agriculture','irrigation','field','ndvi','drone','yield','moisture','plant'],
  irrigation:['water','watering','valve','moisture','pump','soil'],
  vision:['image','camera','photo','face','detect','recognition','opencv','visual','picture'],
  security:['phishing','attack','fraud','malicious','secure','threat','credential','password','hack'],
  identity:['verify','verification','identity','authenticate','certificate','credential','login'],
  documents:['pdf','report','resume','notes','document','paper','slide','text','extract','parse'],
  nlp:['language','text','summarise','summarize','summary','nlp','embedding','semantic','meaning'],
  search:['search','find','discover','lookup','retrieve','query','similar','related'],
  assistance:['assistant','help','suggest','recommend','advise','chat','ask','guide'],
  sustainability:['waste','sustain','green','environment','reduce','carbon','food'],
  monitoring:['monitor','track','watch','alert','notify','sensor','telemetry','log'],
  hardware:['arduino','esp32','raspberry','sensor','iot','device','embedded','circuit','beacon','lora'],
  navigation:['navigate','navigation','map','route','indoor','wayfinding','location','path','direction'],
  accessibility:['disability','assistive','sign','blind','accessibility','inclusive','wheelchair'],
  career:['resume','job','placement','interview','career','hiring','recruit'],
  matching:['match','matching','pair','similarity','compare','recommend'],
  booking:['book','booking','reserve','slot','schedule','equipment','inventory'],
  study:['study','revision','learn','exam','prep','spaced','course','semester'],
  analytics:['analyse','analyze','analytics','forecast','predict','data','trend','statistics'],
  forecasting:['forecast','predict','future','estimate','projection'],
  offline:['offline','buffer','sync','network','intermittent','queue','wifi'],
  privacy:['privacy','consent','personal','retention','delete'],
  mobile:['phone','mobile','app','android','sms','ble','bluetooth'],
  campus:['campus','college','hostel','mess','library','block','institute'],
  graphs:['graph','routing','node','network','astar'],
  trust:['trust','tamper','forge','proof','immutable','blockchain','ledger'],
  records:['record','register','archive','store','history'],
  detection:['detect','detection','flag','identify','anomaly'],
  classification:['classify','classification','label','category'],
  assistive:['assist','assistive','support','aid'],
  lowpower:['battery','solar','sleep','lowpower','energy'],
  remote:['remote','rural','drone','satellite','distance'],
  inventory:['inventory','stock','equipment','asset','kit'],
  retrieval:['retrieve','retrieval','rag','grounded','citation','source'],
  location:['location','geo','gps','fence','position'],
  web:['web','website','portal','browser','dashboard','frontend'],
  tracking:['track','tracking','progress','streak'],
};
const STOP = new Set('a an the i we you they it is are was were of to for in on with and or my our your their this that these those want build make create using use used something some thing things how what which do does did can could should would will student students project projects'.split(' '));
const tok = (t) => (t || '').toLowerCase().replace(/[^a-z0-9+# ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w) && w.length > 1);

export function expand(query) {
  const toks = tok(query); const hits = {};
  toks.forEach((t) => {
    for (const [c, words] of Object.entries(LEX)) {
      if (words.includes(t) || c === t) hits[c] = (hits[c] || 0) + 1;
      else if (t.length > 3 && words.some((w) => w.length > 4 && (w.startsWith(t) || t.startsWith(w)))) hits[c] = (hits[c] || 0) + 0.5;
    }
  });
  return { toks, hits };
}
const text = (p) => [p.title, p.short, p.problem, p.solution, p.challenge, p.learnings, p.didntWork, p.tech.join(' '), p.domain.join(' ')].join(' ').toLowerCase();
function kw(p, toks) {
  if (!toks.length) return 0;
  const t = text(p), ti = p.title.toLowerCase(); let h = 0;
  toks.forEach((w) => { if (ti.includes(w)) h += 2; else if (t.includes(w)) h += 1; });
  return clamp(h / (toks.length * 2), 0, 1);
}
function cs(p, hits) {
  const keys = Object.keys(hits); if (!keys.length) return 0;
  const total = keys.reduce((s, k) => s + hits[k], 0); let got = 0;
  keys.forEach((k) => { if (p.concepts.includes(k)) got += hits[k]; });
  return clamp(got / total, 0, 1);
}
export function score(p, query, weight = 0.7) {
  const { toks, hits } = expand(query);
  if (!toks.length) return 0;
  const k = kw(p, toks), c = cs(p, hits);
  return clamp((1 - weight) * k + weight * Math.max(c, k * 0.55), 0, 1);
}
export function similarity(a, b) {
  const ca = new Set(a.concepts), cb = new Set(b.concepts);
  let inter = 0; ca.forEach((c) => { if (cb.has(c)) inter++; });
  const jac = inter / (new Set([...ca, ...cb]).size || 1);
  const ta = new Set(a.tech); let ti = 0; b.tech.forEach((t) => { if (ta.has(t)) ti++; });
  const tj = ti / (new Set([...ta, ...b.tech]).size || 1);
  const dom = a.domain.some((d) => b.domain.includes(d)) ? 1 : 0;
  return clamp(Math.round((jac * 0.6 + tj * 0.25 + dom * 0.15) * 100), 0, 99);
}
export const related = (p, all, n = 4) =>
  all.filter((q) => q.id !== p.id && q.status === 'approved')
     .map((q) => ({ project: q, score: similarity(p, q) }))
     .sort((x, y) => y.score - x.score).slice(0, n);

export const SUGGESTIONS = [
  'Have students worked on automatic classroom attendance before?',
  'Projects related to agricultural monitoring',
  'What hardware failures did IoT teams report?',
  'Django projects with PostgreSQL',
  'How did teams handle intermittent campus Wi-Fi?',
];

export function answer(query, projects) {
  const hits = projects.filter((p) => p.status === 'approved')
    .map((p) => ({ p, s: score(p, query, 0.72) }))
    .filter((r) => r.s > 0.12).sort((a, b) => b.s - a.s).slice(0, 5);
  if (!hits.length) return {
    text: 'I could not find anything in the TechLoop archive that grounds an answer to that.\n\nThis assistant only answers from stored student projects — it will not invent sources. Try describing the problem instead of the technology ("records students entering a classroom" rather than "RFID"), or broaden the query.',
    sources: [],
  };
  const L = [`Yes — ${hits.length} archived project${hits.length > 1 ? 's are' : ' is'} conceptually close to what you described. Ranked by similarity to your query:`, ''];
  hits.forEach((h, i) => {
    L.push(`${i + 1}. ${h.p.title}  ·  ${Math.round(h.s * 100)}% match`);
    L.push(`   Batch ${h.p.academicYear} · ${h.p.dept} · ${h.p.tech.slice(0, 4).join(', ')}`);
    L.push(`   ${h.p.short}`, '');
  });
  const ch = hits.map((h) => h.p.challenge).filter(Boolean).slice(0, 3);
  if (ch.length) { L.push('Common challenges reported by these teams:'); ch.forEach((c) => L.push('• ' + c.split('.')[0] + '.')); L.push(''); }
  const fl = hits.map((h) => h.p.didntWork).filter(Boolean).slice(0, 2);
  if (fl.length) { L.push('What did not work for them — read this before choosing an approach:'); fl.forEach((c) => L.push('• ' + c.split('.').slice(0, 2).join('.').trim() + '.')); L.push(''); }
  L.push('Every statement above is drawn from the cited project records. Open a source to read the full failure analysis and faculty feedback.');
  return { text: L.join('\n'), sources: hits.map((h) => ({ id: h.p.id, title: h.p.title, score: Math.round(h.s * 100) })) };
}

export function brief(idea, title) {
  const { hits } = expand(idea + ' ' + title);
  const concepts = Object.keys(hits).sort((a, b) => hits[b] - hits[a]).slice(0, 4);
  const pool = TECHS.filter((t) => {
    const l = t.toLowerCase();
    return concepts.some((c) => (LEX[c] || []).some((w) => l.includes(w)))
      || (concepts.includes('hardware') && ['Arduino', 'ESP32', 'Raspberry Pi', 'C++'].includes(t))
      || (concepts.includes('nlp') && ['Gemini API', 'pgvector', 'Python'].includes(t))
      || (concepts.includes('web') && ['React', 'Django', 'PostgreSQL'].includes(t));
  });
  const tech = [...new Set([...pool, 'Python', 'Django', 'PostgreSQL'])].slice(0, 6);
  const s = (title || idea || 'the system').trim().replace(/\.$/, '');
  return {
    problem: `Today, ${s.toLowerCase()} is handled manually or not at all, which costs time and produces inconsistent records. The people affected have no reliable way to verify the current state, and existing data is scattered across spreadsheets, messages and paper. This project addresses that gap with a single, auditable source of truth.`,
    solution: `${s} captures the relevant signal where the activity happens, validates it against a small set of explicit rules, and stores an append-only record. A dashboard exposes the current state and a daily digest replaces manual chasing. The design assumes the network is intermittently unavailable and degrades to a local buffer rather than losing data.`,
    tech,
    challenge: 'The hardest part is likely data reliability at the edge — duplicate events, clock drift and intermittent connectivity. A second risk is user trust: one confidently wrong output early on will make people stop reading the dashboard.',
    didntWork: `Not attempted yet — complete this honestly after the first prototype fails. Prior TechLoop teams working on ${concepts.slice(0, 2).join(' and ') || 'similar problems'} most often reported that a naive always-online design lost data during network outages.`,
  };
}