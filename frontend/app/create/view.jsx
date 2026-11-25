'use client';
import { Suspense, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon, Btn, Field, Input, Textarea, Select, Pill, Avatar, Meter, Card } from '../../lib/ui';
import { useStore, userById } from '../../lib/store';
import { DOMAINS, TECHS, DEPTS, YEARS, PTYPES, VISIBILITY, TONE, DOMAIN_TONE, cn, uid, reorder } from '../../lib/data';
import { brief, expand } from '../../lib/ai';

const STEPS = [
  { name:'Basic', icon:'Info' }, { name:'Problem', icon:'Target' }, { name:'Solution', icon:'Zap' },
  { name:'Technology', icon:'Cpu' }, { name:'Resources', icon:'Link2' }, { name:'Experience', icon:'BookOpen' }, { name:'Submit', icon:'ShieldCheck' },
];
const blank = (me) => ({
  id: uid('p'), title:'', short:'', domain:[], tech:[], year: me?.year || '3rd', dept: me?.dept || 'CSE',
  type:'Major Project', academicYear: String(new Date().getFullYear()), problem:'', solution:'', challenge:'',
  didntWork:'', solved:'', learnings:'', future:'', team:[{ id: uid('tm'), name: me?.name || '', role:'Team Lead', userId: me?.id }],
  resources:[], concepts:[], feedback:[], discussion:[], savedBy:[], followers:[], views:0,
  ownerId: me?.id, facultyId:null, status:'draft', visibility:'draft', flagged:false,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

function Wizard() {
  const sp = useSearchParams();
  const editId = sp.get('id');
  const { state, dispatch, me } = useStore();
  const router = useRouter();
  const existing = editId ? state.projects.find((p) => p.id === editId) : null;
  const [p, setP] = useState(() => (existing ? JSON.parse(JSON.stringify(existing)) : blank(me)));
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [fq, setFq] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const [drag, setDrag] = useState(null); const [over, setOver] = useState(null);
  const [savedFlag, setSavedFlag] = useState(false);
  const fileRef = useRef(null);
  const set = (k, v) => { setP((x) => ({ ...x, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); setSavedFlag(false); };
  const toggle = (k, v) => set(k, p[k].includes(v) ? p[k].filter((x) => x !== v) : [...p[k], v]);
  const faculty = state.users.filter((u) => u.role === 'faculty');
  const shown = faculty.filter((f) => (f.name + f.dept + (f.spec || '')).toLowerCase().includes(fq.toLowerCase()));
  const load = (f) => state.projects.filter((x) => x.facultyId === f.id && ['pending','in_review','revision_requested'].includes(x.status)).length;

  const validate = (s) => {
    const e = {};
    if (s === 0) {
      if (p.title.trim().length < 4) e.title = 'Give the project a real title (4+ characters).';
      if (p.short.trim().length < 20) e.short = 'One or two sentences, at least 20 characters.';
      if (!p.domain.length) e.domain = 'Pick at least one domain.';
    }
    if (s === 1 && p.problem.trim().length < 40) e.problem = 'Describe the problem in at least 40 characters — what hurts today?';
    if (s === 2 && p.solution.trim().length < 40) e.solution = 'Describe what you built in at least 40 characters.';
    if (s === 3 && !p.tech.length) e.tech = 'Select at least one technology.';
    if (s === 5 && p.challenge.trim().length < 20) e.challenge = 'This is the most valuable field in TechLoop. At least 20 characters.';
    if (s === 6 && !p.facultyId) e.facultyId = 'Select the faculty member you are submitting to.';
    setErrors(e); return !Object.keys(e).length;
  };
  const persist = () => {
    if (existing) dispatch({ type: 'PROJECT_PATCH', id: p.id, patch: p });
    else dispatch({ type: 'PROJECT_ADD', project: { ...p, status: 'draft' } });
  };
  const saveDraft = () => { persist(); setSavedFlag(true); dispatch({ type: 'TOAST', toast: { kind:'ok', title:'Draft saved', msg:'Only you and your team can see it.' } }); };
  const submit = () => {
    if (!validate(6)) return;
    const concepts = Object.keys(expand([p.title, p.short, p.problem, p.solution, p.challenge, p.tech.join(' ')].join(' ')).hits).slice(0, 8);
    const payload = { ...p, concepts: concepts.length ? concepts : ['campus'], status: 'pending', visibility: p.visibility === 'draft' ? 'faculty' : p.visibility };
    if (existing) dispatch({ type: 'PROJECT_PATCH', id: p.id, patch: payload });
    else dispatch({ type: 'PROJECT_ADD', project: payload });
    dispatch({ type: 'SUBMIT', id: p.id, facultyId: p.facultyId });
    router.push('/project/' + p.id);
  };
  const runBrief = () => {
    setAiBusy(true); setAiNote('');
    setTimeout(() => {
      const b = brief(p.short || p.title, p.title);
      setP((x) => ({ ...x, problem: x.problem || b.problem, solution: x.solution || b.solution, tech: [...new Set([...x.tech, ...b.tech])].slice(0, 8), challenge: x.challenge || b.challenge, didntWork: x.didntWork || b.didntWork }));
      setAiBusy(false); setAiNote('AI-assisted draft inserted into empty fields. You remain responsible for editing it before submission.');
    }, 850);
  };
  const onFiles = (files) => {
    Array.from(files).forEach((f) => {
      const kind = /\.(png|jpe?g|svg|gif)$/i.test(f.name) ? 'diagram' : /\.(pptx?|key)$/i.test(f.name) ? 'presentation' : 'report';
      setP((x) => ({ ...x, resources: [...x.resources, { id: uid('r'), kind, label: f.name, url: '', size: f.size }] }));
      if (/\.(txt|md|csv|json)$/i.test(f.name)) {
        const rd = new FileReader();
        rd.onload = () => {
          const text = String(rd.result || '').slice(0, 20000);
          const grab = (re) => { const m = text.match(re); return m ? text.slice(m.index + m[0].length).split(/\n\s*\n/)[0].trim().slice(0, 900) : ''; };
          const prob = grab(/problem\s*(statement)?\s*[:\-]/i), sol = grab(/(solution|approach|overview)\s*[:\-]/i);
          const found = TECHS.filter((t) => new RegExp('\\b' + t.replace(/[.+#]/g, '\\$&') + '\\b', 'i').test(text));
          setP((x) => ({ ...x, problem: x.problem || prob, solution: x.solution || sol, tech: [...new Set([...x.tech, ...found])].slice(0, 10) }));
          dispatch({ type: 'TOAST', toast: { kind:'ok', title:'Text extracted from ' + f.name, msg:`${found.length} technologies detected. Review before submitting.` } });
        };
        rd.readAsText(f);
      } else {
        dispatch({ type: 'TOAST', toast: { kind:'info', title:'File attached: ' + f.name, msg:'Binary extraction runs on the Django + Gemini worker in production. Metadata stored now.' } });
      }
    });
  };
  const dp = (i, key) => ({
    draggable: true, onDragStart: () => setDrag(i),
    onDragOver: (e) => { e.preventDefault(); setOver(i); },
    onDrop: () => { if (drag != null && over != null) set(key, reorder(p[key], drag, over)); setDrag(null); setOver(null); },
  });

  const body = () => {
    if (step === 0) return <div className="space-y-5">
      <Field label="Project title" required error={errors.title} counter={`${p.title.length}/90`}><Input value={p.title} maxLength={90} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Smart Campus Navigation System" /></Field>
      <Field label="Short description" required error={errors.short} hint="One or two sentences a junior can scan in three seconds." counter={`${p.short.length}/220`}><Textarea value={p.short} maxLength={220} onChange={(e) => set('short', e.target.value)} className="min-h-[80px]" placeholder="What does it do, in plain language?" /></Field>
      <Field label="Domain" required error={errors.domain} hint="Select all that apply.">
        <div className="flex flex-wrap gap-2">{DOMAINS.map((d) => { const on = p.domain.includes(d); return <button key={d} type="button" onClick={() => toggle('domain', d)}
          className={cn('px-3 h-9 rounded-xl border text-[12.5px] transition-all', on ? 'font-semibold' : 'hair text-dim hover:text-fg')}
          style={on ? { borderColor: TONE[DOMAIN_TONE[d]], color: TONE[DOMAIN_TONE[d]], background: `color-mix(in srgb,${TONE[DOMAIN_TONE[d]]} 12%,transparent)` } : null}>{d}</button>; })}</div>
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Project type"><Select value={p.type} onChange={(e) => set('type', e.target.value)}>{PTYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Academic year"><Select value={p.academicYear} onChange={(e) => set('academicYear', e.target.value)}>{[2022,2023,2024,2025,2026,2027,2028].map((y) => <option key={y}>{y}</option>)}</Select></Field>
        <Field label="Department"><Select value={p.dept} onChange={(e) => set('dept', e.target.value)}>{DEPTS.map((d) => <option key={d}>{d}</option>)}</Select></Field>
        <Field label="Year of study"><Select value={p.year} onChange={(e) => set('year', e.target.value)}>{YEARS.map((y) => <option key={y}>{y}</option>)}</Select></Field>
      </div>
      <div className="border-t hair pt-5">
        <p className="lbl mb-3">Project team · drag to reorder</p>
        <div className="space-y-2">{p.team.map((m, i) => <div key={m.id} {...dp(i, 'team')}
          className={cn('flex items-center gap-2 p-2 rounded-xl border hair bg-ink/40', drag === i && 'dg', over === i && drag !== i && 'dt')}>
          <span className="text-faint cursor-grab px-1"><Icon name="GripVertical" size={15} /></span>
          <Input value={m.name} onChange={(e) => set('team', p.team.map((x) => (x.id === m.id ? { ...x, name: e.target.value } : x)))} placeholder="Member name" className="flex-1 h-9 py-1.5" />
          <Input value={m.role} onChange={(e) => set('team', p.team.map((x) => (x.id === m.id ? { ...x, role: e.target.value } : x)))} placeholder="Role" className="flex-1 h-9 py-1.5" />
          <button type="button" onClick={() => set('team', p.team.filter((x) => x.id !== m.id))} className="text-faint hover:text-rose p-1.5" aria-label="Remove member"><Icon name="Trash2" size={15} /></button>
        </div>)}</div>
        <Btn size="sm" variant="s" icon="Plus" className="mt-2.5" onClick={() => set('team', [...p.team, { id: uid('tm'), name: '', role: '' }])}>Add teammate</Btn>
      </div>
    </div>;
    if (step === 1) return <div className="space-y-5">
      <Card className="p-4 flex items-start gap-3 flex-wrap" style={{ borderColor: 'color-mix(in srgb,var(--magenta) 35%,var(--line))' }}>
        <span className="text-magenta mt-0.5"><Icon name="Sparkles" size={18} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold">Generate a structured brief with Gemini</p>
          <p className="text-[12px] text-dim mt-1">Fills only empty fields. AI assists — it never represents your work for you.</p>
          {aiNote && <p className="text-[11.5px] text-lime mt-2 flex items-start gap-1.5"><Icon name="CheckCircle2" size={12} className="mt-0.5 shrink-0" />{aiNote}</p>}
        </div>
        <Btn size="sm" variant="ai" icon="Sparkles" loading={aiBusy} onClick={runBrief} disabled={!p.title && !p.short}>Generate brief</Btn>
      </Card>
      <Field label="Problem statement" required error={errors.problem} hint="What problem are you solving, and why does it matter? Numbers help." counter={`${p.problem.length} chars`}>
        <Textarea value={p.problem} onChange={(e) => set('problem', e.target.value)} className="min-h-[190px]" placeholder="Manual roll-call consumed 6–9 minutes of every lecture and proxy attendance was routine…" /></Field>
      <div className="grid sm:grid-cols-3 gap-3">
        {[['Target','Quantify the pain','Minutes lost, error rate, cost.'],['Users','Name the affected people','Students, faculty, maintenance.'],['Clock','Say when it happens','Every lecture, month-end, monsoon.']].map(([ic, t, d]) => (
          <div key={t} className="p-3 rounded-xl border hair bg-ink/40"><span className="text-cyan"><Icon name={ic} size={15} /></span><p className="text-[12.5px] font-medium mt-2">{t}</p><p className="text-[11px] text-faint mt-0.5">{d}</p></div>
        ))}
      </div>
    </div>;
    if (step === 2) return <div className="space-y-5">
      <Field label="Solution overview" required error={errors.solution} hint="What did you build, and what is the main idea? Architecture in prose." counter={`${p.solution.length} chars`}>
        <Textarea value={p.solution} onChange={(e) => set('solution', e.target.value)} className="min-h-[220px]" placeholder="An ESP32 reader writes tap events to a local buffer and syncs to a Django service when the network is available…" /></Field>
      <Field label="Future improvements" hint="What would the next team add? This is a gift to your juniors."><Textarea value={p.future} onChange={(e) => set('future', e.target.value)} className="min-h-[100px]" /></Field>
    </div>;
    if (step === 3) return <div className="space-y-5">
      <Field label="Technologies used" required error={errors.tech} hint={`${p.tech.length} selected. Tags are what make this project findable.`}>
        <div className="flex flex-wrap gap-2">{TECHS.map((t) => { const on = p.tech.includes(t); return <button key={t} type="button" onClick={() => toggle('tech', t)}
          className={cn('mono px-2.5 h-8 rounded-lg border text-[11.5px] transition-all', on ? 'border-cyan text-cyan bg-cyan/10 font-semibold' : 'hair text-dim hover:text-fg')}>{on ? '✓ ' : ''}{t}</button>; })}</div>
      </Field>
      {p.tech.length > 0 && <div className="p-4 rounded-xl border hair bg-ink/40">
        <p className="mono text-[10px] tracking-[.16em] text-faint mb-2">STACK PREVIEW</p>
        <p className="mono text-[13px] text-cyan break-words">{p.tech.join(' │ ')}</p></div>}
    </div>;
    if (step === 4) return <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        {[['github','GitHub repository','Github'],['demo','Live demo','ExternalLink'],['report','Project report','FileText'],['presentation','Presentation','Presentation'],['diagram','Architecture diagram','Image'],['other','Other resource','Link2']].map(([k, l, ic]) => (
          <button key={k} type="button" onClick={() => set('resources', [...p.resources, { id: uid('r'), kind: k, label: '', url: '', size: 0 }])}
            className="p-3.5 rounded-xl border hair bg-ink/40 hover:border-cyan transition-colors text-left flex items-center gap-3">
            <span className="text-cyan"><Icon name={ic} size={17} /></span><span className="text-[13px]">{l}</span><Icon name="Plus" size={14} className="ml-auto text-faint" /></button>
        ))}
      </div>
      <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files?.length) onFiles(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()} className="border-2 border-dashed hair rounded-xl p-7 text-center hover:border-cyan transition-colors cursor-pointer">
        <Icon name="Upload" size={24} className="mx-auto text-cyan" />
        <p className="text-[13.5px] font-medium mt-3">Drop files or click to upload</p>
        <p className="text-[11.5px] text-faint mt-1">PDF, PPT, PNG, TXT, MD · Supabase Storage holds the file, PostgreSQL holds only metadata</p>
        <p className="text-[11px] text-faint mt-1">Text-based files are parsed locally to pre-fill your form.</p>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ''; }} />
      </div>
      {p.resources.length > 0 && <div className="space-y-2">
        <p className="lbl">Attached resources · drag to reorder</p>
        {p.resources.map((r, i) => <div key={r.id} {...dp(i, 'resources')}
          className={cn('flex items-center gap-2 p-2.5 rounded-xl border hair bg-ink/40 flex-wrap', drag === i && 'dg', over === i && drag !== i && 'dt')}>
          <span className="text-faint cursor-grab"><Icon name="GripVertical" size={15} /></span>
          <Pill tone="cyan">{r.kind}</Pill>
          <Input value={r.label} onChange={(e) => set('resources', p.resources.map((x) => (x.id === r.id ? { ...x, label: e.target.value } : x)))} placeholder="Label" className="flex-1 min-w-[130px] h-9 py-1.5" />
          <Input value={r.url} onChange={(e) => set('resources', p.resources.map((x) => (x.id === r.id ? { ...x, url: e.target.value } : x)))} placeholder={r.size ? 'stored file' : 'https://…'} disabled={!!r.size} className="flex-[1.4] min-w-[150px] h-9 py-1.5" />
          {r.size > 0 && <span className="mono text-[10px] text-faint">{(r.size / 1048576).toFixed(2)} MB</span>}
          <button type="button" onClick={() => set('resources', p.resources.filter((x) => x.id !== r.id))} className="text-faint hover:text-rose p-1.5" aria-label="Remove resource"><Icon name="Trash2" size={15} /></button>
        </div>)}
      </div>}
    </div>;
    if (step === 5) return <div className="space-y-5">
      <div className="p-4 rounded-xl border" style={{ background: 'color-mix(in srgb,var(--lime) 7%,transparent)', borderColor: 'color-mix(in srgb,var(--lime) 30%,var(--line))' }}>
        <p className="text-[13px] font-semibold flex items-center gap-2"><Icon name="BookOpen" size={16} className="text-lime" />This is the most valuable part of TechLoop</p>
        <p className="text-[12.5px] text-dim mt-1.5 leading-relaxed">A normal repository preserves the code. It does not preserve what failed, why, and how you fixed it. Juniors search for exactly this.</p>
      </div>
      <Field label="Main challenge" required error={errors.challenge} counter={`${p.challenge.length} chars`}><Textarea value={p.challenge} onChange={(e) => set('challenge', e.target.value)} placeholder="Duplicate taps and the campus Wi-Fi dropping mid-lecture…" /></Field>
      <Field label="What did not work?" hint="Be honest. Failed approaches are the highest-signal content in the archive."><Textarea value={p.didntWork} onChange={(e) => set('didntWork', e.target.value)} /></Field>
      <Field label="How did you solve it?"><Textarea value={p.solved} onChange={(e) => set('solved', e.target.value)} /></Field>
      <Field label="Key learning"><Textarea value={p.learnings} onChange={(e) => set('learnings', e.target.value)} /></Field>
    </div>;
    return <div className="space-y-5">
      <Field label="Select faculty" required error={errors.facultyId} hint="Only this faculty member will see the project in their evaluation queue.">
        <div className="relative mb-3"><Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" /><Input value={fq} onChange={(e) => setFq(e.target.value)} placeholder="Search faculty by name, department or specialisation…" className="pl-9" /></div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {shown.map((f) => { const l = load(f), pct = Math.round((l / f.maxLoad) * 100), on = p.facultyId === f.id;
            return <button key={f.id} type="button" onClick={() => set('facultyId', f.id)}
              className={cn('w-full text-left p-3.5 rounded-xl border transition-all flex items-center gap-3', on ? 'bg-raised' : 'hair hover:bg-raised/60')}
              style={on ? { borderColor: 'var(--cyan)', boxShadow: '0 0 26px -12px var(--g1)' } : null}>
              <Avatar user={f} size={40} />
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold truncate">{f.name}</p>
                <p className="mono text-[10.5px] text-faint">{f.dept} · {f.title}</p>
                <p className="text-[11.5px] text-dim mt-0.5 truncate">{f.spec}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-28"><Meter value={pct} tone={pct > 80 ? 'rose' : pct > 50 ? 'amber' : 'lime'} height={4} /></div>
                  <span className="mono text-[10px] text-faint tb">{l}/{f.maxLoad} active</span>
                </div>
              </div>
              {on && <span className="text-cyan shrink-0"><Icon name="CheckCircle2" size={20} /></span>}
            </button>; })}
          {!shown.length && <p className="text-[12.5px] text-dim p-4 text-center">No faculty matches that search.</p>}
        </div>
      </Field>
      <Field label="Visibility" hint="Keep sensitive documents restricted while the profile stays discoverable.">
        <div className="grid sm:grid-cols-2 gap-2">{VISIBILITY.map((v) => { const on = p.visibility === v.id; return <button key={v.id} type="button" onClick={() => set('visibility', v.id)}
          className={cn('p-3 rounded-xl border text-left transition-all', on ? 'bg-raised border-cyan' : 'hair hover:bg-raised/60')}>
          <span className={cn('flex items-center gap-2 text-[13px] font-medium', on ? 'text-cyan' : 'text-fg')}><Icon name={v.icon} size={14} />{v.label}</span>
          <p className="text-[11px] text-faint mt-1">{v.hint}</p></button>; })}</div>
      </Field>
      <Card className="p-4">
        <p className="mono text-[10px] tracking-[.16em] text-faint mb-3">SUBMISSION SUMMARY</p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[12.5px]">
          {[['Title', p.title || '—'],['Domain', p.domain.join(', ') || '—'],['Technologies', `${p.tech.length} selected`],['Team', `${p.team.filter((t) => t.name).length} members`],
            ['Resources', `${p.resources.length} attached`],['Faculty', p.facultyId ? userById(state, p.facultyId).name : '—'],
            ['Failure analysis', p.didntWork ? '✓ written' : '✗ empty'],['Learnings', p.learnings ? '✓ written' : '✗ empty']].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 border-b hair pb-1.5"><span className="text-dim">{k}</span><span className="text-fg text-right truncate max-w-[60%]">{v}</span></div>
          ))}
        </div>
      </Card>
    </div>;
  };

  return <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 relative z-10">
    <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
      <div className="min-w-0">
        <p className="mono text-[10px] tracking-[.2em] text-cyan">{existing ? 'EDIT PROJECT' : 'NEW PROJECT'}</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1 truncate">{existing ? existing.title : 'Create a project record'}</h1>
        <p className="text-[13px] text-dim mt-1.5">Brief but useful. Six short steps, then submit to a faculty member.</p>
      </div>
      <div className="flex items-center gap-2">
        {savedFlag && <Pill tone="lime" icon="Check">Draft saved</Pill>}
        <Btn variant="s" icon="Save" onClick={saveDraft}>Save draft</Btn>
      </div>
    </div>
    <div className="sticky top-16 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-3 backdrop-blur-xl" style={{ background: 'color-mix(in srgb,var(--ink) 84%,transparent)' }}>
      <div className="flex gap-1.5 overflow-x-auto nb pb-2">
        {STEPS.map((s, i) => {
          const done = i < step, cur = i === step;
          return <button key={s.name} onClick={() => { if (i <= step || validate(step)) setStep(i); }}
            className={cn('flex items-center gap-2 px-3 h-9 rounded-xl border text-[12.5px] whitespace-nowrap transition-all', cur ? 'bg-raised border-cyan text-fg font-semibold' : done ? 'hair text-lime' : 'hair text-faint')}>
            <span className={cn('w-5 h-5 rounded-md grid place-items-center mono text-[10px]', cur ? 'bg-cyan text-[#04121A]' : done ? 'bg-lime/20 text-lime' : 'bg-ink text-faint')}>{done ? '✓' : i + 1}</span>
            <Icon name={s.icon} size={13} />{s.name}</button>;
        })}
      </div>
      <div className="h-1 rounded-full bg-ink border hair overflow-hidden">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, background: 'linear-gradient(90deg,var(--cyan),var(--lime))' }} />
      </div>
    </div>
    <Card className="p-5 sm:p-7 mt-5">{body()}</Card>
    <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
      <Btn variant="g" icon="ArrowLeft" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Btn>
      <div className="flex gap-2">
        <Btn variant="o" icon="Save" onClick={saveDraft}>Save draft</Btn>
        {step < 6 ? <Btn iconRight="ArrowRight" onClick={() => { if (validate(step)) setStep((s) => s + 1); }}>Continue</Btn>
          : <Btn variant="ok" icon="Send" onClick={submit}>{existing?.feedback?.length ? 'Resubmit for review' : 'Submit for evaluation'}</Btn>}
      </div>
    </div>
  </div>;
}

export default function Page() {
  return <Suspense fallback={<div className="shell py-20 mono text-[11px] text-faint">LOADING WIZARD…</div>}><Wizard /></Suspense>;
}