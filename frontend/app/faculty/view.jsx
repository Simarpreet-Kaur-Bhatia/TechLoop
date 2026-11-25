'use client';
import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon, Btn, Avatar, Card, Tabs, Empty, Pill, Textarea, Slider, Meter, StatusPill, Section, StatCard } from '../../lib/ui';
import { useStore, assignedTo, userById } from '../../lib/store';
import { CRITERIA, DOMAIN_TONE, rel, fdate, cn } from '../../lib/data';

function ReviewPanel({ p, onBack }) {
  const { state, dispatch, me } = useStore();
  const [body, setBody] = useState('');
  const [crit, setCrit] = useState({ problem: 4, implementation: 4, documentation: 3, innovation: 4 });
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);
  const owner = userById(state, p.ownerId);
  const act = (decision) => {
    if (body.trim().length < 25) { setErr('Write at least 25 characters of actionable feedback — this becomes institutional knowledge.'); return; }
    setErr(''); dispatch({ type: 'REVIEW', projectId: p.id, decision, body: body.trim(), criteria: crit });
    setDone(decision); setBody(''); setTimeout(() => setDone(null), 2000);
  };
  return <div>
    <button onClick={onBack} className="inline-flex items-center gap-1.5 text-[12.5px] text-dim hover:text-cyan mb-5"><Icon name="ArrowLeft" size={14} />Back to evaluation queue</button>
    <div className="grid lg:grid-cols-[1fr_380px] gap-8">
      <div className="min-w-0 space-y-5">
        <div>
          <div className="flex gap-2 flex-wrap mb-3"><StatusPill status={p.status} />{p.domain.map((d) => <Pill key={d} tone={DOMAIN_TONE[d]}>{d}</Pill>)}</div>
          <h1 className="text-2xl sm:text-3xl font-bold">{p.title}</h1>
          <p className="text-[13px] text-dim mt-2">{owner.name} · {p.dept} · {p.year} year · {p.type} · Batch {p.academicYear}</p>
          <p className="text-[14px] text-dim mt-3 leading-relaxed">{p.short}</p>
        </div>
        {[['Problem', p.problem, 'Target', 'cyan'],['Solution', p.solution, 'Zap', 'lime'],['Main challenge', p.challenge, 'AlertTriangle', 'amber'],
          ['What did not work', p.didntWork, 'XCircle', 'rose'],['How it was solved', p.solved, 'Wrench', 'emerald'],['Key learnings', p.learnings, 'BookOpen', 'violet']].filter(([, v]) => v).map(([t, v, ic, tone]) => (
          <Card key={t} className="p-5 relative overflow-hidden">
            <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `var(--${tone})` }} />
            <p className="flex items-center gap-2 font-display font-semibold text-[14.5px] mb-2" style={{ color: `var(--${tone})` }}><Icon name={ic} size={15} />{t}</p>
            <p className="text-[13.5px] leading-relaxed whitespace-pre-line">{v}</p>
          </Card>
        ))}
        <Card className="p-5">
          <p className="mono text-[10px] tracking-[.16em] text-faint mb-3">TECHNOLOGY & RESOURCES</p>
          <div className="flex flex-wrap gap-1.5 mb-4">{p.tech.map((t) => <span key={t} className="mono text-[11.5px] px-2.5 py-1 rounded-lg border hair text-cyan bg-cyan/5">{t}</span>)}</div>
          <div className="space-y-2">{p.resources.map((r) => (
            <div key={r.id} className="flex items-center gap-2.5 text-[12.5px]">
              <Icon name={r.kind === 'github' ? 'Github' : r.url ? 'ExternalLink' : 'FileText'} size={14} className="text-faint" />
              {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-cyan hover:underline truncate">{r.label}</a> : <span className="text-dim truncate">{r.label}</span>}
              {r.size > 0 && <span className="mono text-[10px] text-faint ml-auto">{(r.size / 1048576).toFixed(2)} MB</span>}
            </div>
          ))}</div>
        </Card>
        {p.feedback.length > 0 && <Section title="Feedback history" sub="Every version is preserved — resubmission never overwrites a prior review.">
          <div className="space-y-3">{[...p.feedback].reverse().map((fb) => (
            <Card key={fb.id} className="p-4" style={{ borderLeft: `3px solid ${fb.decision === 'approved' ? 'var(--lime)' : fb.decision === 'revision_requested' ? 'var(--rose)' : 'var(--sky)'}` }}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <span className="mono text-[10.5px] text-faint">v{fb.version} · {userById(state, fb.authorId).name} · {fdate(fb.createdAt)}</span>
                <Pill tone={fb.decision === 'approved' ? 'lime' : fb.decision === 'revision_requested' ? 'rose' : 'sky'}>{fb.decision.replace('_', ' ')}</Pill>
              </div>
              <p className="text-[13px] leading-relaxed">{fb.body}</p>
            </Card>
          ))}</div>
        </Section>}
      </div>
      <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <Card className={cn('p-5', done === 'approved' && 'okpulse')}>
          <p className="font-display font-semibold text-[15px] mb-1 flex items-center gap-2"><Icon name="ClipboardCheck" size={16} className="text-cyan" />Evaluation panel</p>
          <p className="text-[11.5px] text-faint mb-4">Rubric is private to the team, reviewer and admin. Only your written feedback is published.</p>
          <div className="space-y-4 mb-5">{CRITERIA.map(([k, l]) => <Slider key={k} label={l} value={crit[k]} min={1} max={5} onChange={(v) => setCrit((c) => ({ ...c, [k]: v }))} suffix="/5" />)}</div>
          <Textarea value={body} onChange={(e) => { setBody(e.target.value); setErr(''); }} className="min-h-[170px]"
            placeholder="Good implementation of the API layer. Consider improving error handling and documentation of deployment steps…" />
          <div className="flex justify-between items-center mt-1.5">
            <span className="mono text-[10px] text-faint tb">{body.length} chars</span>
            {err && <span className="text-[11px] text-rose text-right max-w-[70%]">{err}</span>}
          </div>
          <div className="grid gap-2 mt-4">
            <Btn variant="ok" icon="CheckCircle2" onClick={() => act('approved')}>Approve and publish</Btn>
            <Btn variant="d" icon="AlertTriangle" onClick={() => act('revision_requested')}>Request revision</Btn>
            <Btn variant="s" icon="Save" onClick={() => act('note')}>Save review note</Btn>
          </div>
          {done && <p className="text-[12px] text-lime mt-3 flex items-center gap-1.5"><Icon name="CheckCircle2" size={13} />Student notified · history updated.</p>}
          <div className="border-t hair mt-5 pt-4">
            <p className="mono text-[10px] tracking-[.16em] text-faint mb-2">LIFECYCLE</p>
            {['Student submits','Faculty receives','Faculty reviews','Feedback delivered','Student resubmits','Reviewed again'].map((s, i) => (
              <div key={s} className="flex items-center gap-2 text-[12px] py-0.5">
                <span className="w-4 h-4 rounded-full grid place-items-center mono text-[9px] border hair text-faint">{i + 1}</span>
                <span className="text-dim">{s}</span></div>
            ))}
          </div>
        </Card>
      </aside>
    </div>
  </div>;
}

function Queue() {
  const { state, me } = useStore();
  const router = useRouter();
  const sp = useSearchParams();
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [reviewId, setReviewId] = useState(sp.get('review'));
  const mine = assignedTo(state, me.id);
  const pending = mine.filter((p) => ['pending','in_review'].includes(p.status));
  const revisions = mine.filter((p) => p.status === 'revision_requested');
  const reviewed = mine.filter((p) => ['approved','revision_requested'].includes(p.status));
  const active = state.projects.find((p) => p.id === reviewId);
  const rows = useMemo(() => {
    const b = tab === 'pending' ? pending : tab === 'reviewed' ? reviewed : mine;
    const ql = q.trim().toLowerCase();
    return ql ? b.filter((p) => (p.title + userById(state, p.ownerId).name + p.tech.join(' ')).toLowerCase().includes(ql)) : b;
  }, [tab, q, mine, pending, reviewed, state]);
  const loadPct = Math.round((mine.filter((p) => p.status !== 'approved').length / me.maxLoad) * 100);

  if (active && (active.facultyId === me.id || me.role === 'admin'))
    return <ReviewPanel p={active} onBack={() => { setReviewId(null); router.replace('/faculty'); }} />;

  return <>
    <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
      <div className="flex items-center gap-4 min-w-0">
        <Avatar user={me} size={54} ring />
        <div className="min-w-0">
          <p className="mono text-[10px] tracking-[.2em] text-violet">FACULTY · EVALUATION MODE</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1 truncate">{me.name}</h1>
          <p className="text-[12.5px] text-dim mt-0.5">{me.dept} · {me.title} · {me.spec}</p>
        </div>
      </div>
      <Btn variant="o" icon="Compass" onClick={() => router.push('/explore')}>Exploration mode</Btn>
    </div>
    <div className="p-3.5 rounded-xl border hair bg-ink/40 flex items-start gap-2.5 mb-6">
      <Icon name="ShieldCheck" size={16} className="text-violet mt-0.5 shrink-0" />
      <p className="text-[12.5px] text-dim leading-relaxed"><span className="text-fg font-medium">Assignment-based queue.</span> You see only the {mine.length} projects assigned to you — not every submission in the college. Browsing the wider archive is a separate mode.</p>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard icon="FolderGit2" label="Assigned" value={mine.length} tone="violet" sub={`Capacity ${me.maxLoad} students`} />
      <StatCard icon="Clock" label="Pending" value={pending.length} tone="amber" sub="Awaiting your evaluation" />
      <StatCard icon="CheckCircle2" label="Reviewed" value={reviewed.length} tone="lime" sub="Feedback delivered" />
      <StatCard icon="AlertTriangle" label="Revisions" value={revisions.length} tone="rose" sub="Sent back to students" />
    </div>
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <p className="text-[12.5px] font-medium">Active evaluation load</p>
        <span className="mono text-[11px] text-faint tb">{mine.filter((p) => p.status !== 'approved').length} / {me.maxLoad}</span>
      </div>
      <Meter value={loadPct} tone={loadPct > 80 ? 'rose' : loadPct > 50 ? 'amber' : 'lime'} />
    </Card>
    <div className="flex items-center gap-3 mb-5 flex-wrap">
      <Tabs value={tab} onChange={setTab} tabs={[
        { id:'pending', label:'Pending', icon:'Clock', count: pending.length },
        { id:'reviewed', label:'Reviewed', icon:'CheckCircle2', count: reviewed.length },
        { id:'all', label:'All assigned', icon:'Layers', count: mine.length }]} />
      <div className="relative flex-1 min-w-[200px] max-w-sm ml-auto">
        <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by title, student or tech…" className="inp h-9 py-0 pl-9 text-[13px]" />
      </div>
    </div>
    {!rows.length ? <Empty icon="Inbox" title={q ? 'Nothing matches that filter' : 'Queue is clear'} msg={q ? 'Clear the search to see the full queue.' : 'No projects in this bucket right now. New submissions assigned to you will appear here.'} /> :
      <div className="space-y-3">{rows.map((p) => {
        const owner = userById(state, p.ownerId);
        const last = p.feedback[p.feedback.length - 1];
        return <Card key={p.id} className="p-4 hl">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar user={owner} size={42} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => router.push('/project/' + p.id)} className="font-display font-semibold text-[16px] hover:text-cyan text-left">{p.title}</button>
                <StatusPill status={p.status} />
                {p.feedback.length > 1 && <Pill tone="sky" icon="History">v{p.feedback.length} review</Pill>}
              </div>
              <p className="text-[12.5px] text-dim c2 mt-1.5">{p.short}</p>
              <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                <span className="mono text-[10.5px] text-faint">{owner.name} · {p.dept} · {p.year} year · {p.type} · submitted {rel(p.createdAt)}</span>
                {p.domain.map((d) => <Pill key={d} tone={DOMAIN_TONE[d]}>{d}</Pill>)}
              </div>
              {last && <p className="text-[12px] text-dim mt-2.5 border-l-2 pl-2.5 c2" style={{ borderColor: last.decision === 'approved' ? 'var(--lime)' : 'var(--rose)' }}>
                <span className="mono text-[10px] text-faint">LAST FEEDBACK · {fdate(last.createdAt)}</span><br />{last.body}</p>}
            </div>
            <div className="flex gap-2 shrink-0">
              <Btn size="sm" variant="o" icon="Eye" onClick={() => router.push('/project/' + p.id)}>Read</Btn>
              <Btn size="sm" variant={p.status === 'approved' ? 's' : 'p'} icon="ClipboardCheck" onClick={() => setReviewId(p.id)}>{p.status === 'approved' ? 'View review' : 'Evaluate'}</Btn>
            </div>
          </div>
        </Card>;
      })}</div>}
  </>;
}

export default function Page() {
  return <div className="shell py-8 relative z-10">
    <Suspense fallback={<div className="mono text-[11px] text-faint py-20">LOADING QUEUE…</div>}><Queue /></Suspense>
  </div>;
}