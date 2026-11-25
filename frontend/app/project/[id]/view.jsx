  'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Icon, Btn, Pill, StatusPill, Avatar, Card, Empty, Textarea, Reveal, ProjectCard, FeedbackCard } from '../../../lib/ui';
import { useStore, userById } from '../../../lib/store';
import { related } from '../../../lib/ai';
import { DOMAIN_TONE, VISIBILITY, fdate, rel, cn } from '../../../lib/data';
import { canSeeProject } from '../../../lib/access';

const RES_ICON = { github:'Github', demo:'ExternalLink', report:'FileText', presentation:'Presentation', diagram:'Image', other:'Link2' };

export default function ProjectDetail() {
  const { id } = useParams();
  const { state, dispatch, me } = useStore();
  const router = useRouter();
  const found = state.projects.find((x) => x.id === id);
  const p = found && canSeeProject(state, found) ? found : null;
  const [q, setQ] = useState('');
  const [tab, setTab] = useState('overview');
  useEffect(() => { if (p) dispatch({ type: 'RECENT', id: p.id }); }, [id]);
  const rel4 = useMemo(() => (p ? related(p, state.projects, 4) : []), [p, state.projects]);
  if (!p) return <div className="shell py-20 relative z-10"><Empty icon="FolderX" title="Project not found" msg="It may have been deleted or is not visible to your role." action={<Btn icon="Compass" onClick={() => router.push('/explore')}>Back to archive</Btn>} /></div>;

  const owner = userById(state, p.ownerId);
  const fac = p.facultyId ? userById(state, p.facultyId) : null;
  const isTeam = p.ownerId === me?.id || p.team.some((t) => t.userId === me?.id);
  const canSeeRubric = isTeam || me?.role === 'admin' || (me?.role === 'faculty' && p.facultyId === me.id);
  const saved = p.savedBy.includes(me?.id);
  const followed = p.followers.includes(me?.id);
  const vis = VISIBILITY.find((v) => v.id === p.visibility);
  const share = async () => {
    const url = location.origin + '/project/' + p.id;
    try { await navigator.clipboard.writeText(url); dispatch({ type:'TOAST', toast:{ kind:'ok', title:'Link copied', msg:url } }); }
    catch { dispatch({ type:'TOAST', toast:{ kind:'info', title:'Share link', msg:url } }); }
  };
  const blocks = [['Problem', p.problem, 'Target', 'cyan'],['Solution', p.solution, 'Zap', 'lime'],['Main challenge', p.challenge, 'AlertTriangle', 'amber'],
    ['What did not work', p.didntWork, 'XCircle', 'rose'],['How it was solved', p.solved, 'Wrench', 'emerald'],['Key learnings', p.learnings, 'BookOpen', 'violet'],['Future improvements', p.future, 'Telescope', 'magenta']];

  return <div className="relative z-10">
    <div className="relative overflow-hidden border-b hair">
      <div className="absolute inset-0 bp opacity-60 pointer-events-none" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 100% at 20% 0%,var(--g1),transparent 62%)' }} />
      <div className="shell py-10 relative">
        <button onClick={() => router.push('/explore')} className="inline-flex items-center gap-1.5 text-[12.5px] text-dim hover:text-cyan mb-5"><Icon name="ArrowLeft" size={14} />Back to archive</button>
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-0 max-w-3xl">
            <div className="flex gap-2 flex-wrap mb-3">
              <StatusPill status={p.status} />
              {p.domain.map((d) => <Pill key={d} tone={DOMAIN_TONE[d]}>{d}</Pill>)}
              <Pill tone="faint" icon={vis?.icon}>{vis?.label}</Pill>
              {p.flagged && <Pill tone="magenta" icon="Flag">Flagged for moderation</Pill>}
            </div>
            <h1 className="text-3xl sm:text-[42px] font-bold leading-[1.05]">{p.title}</h1>
            <p className="text-dim text-[15px] mt-3 leading-relaxed">{p.short}</p>
            <div className="flex items-center gap-4 mt-5 flex-wrap mono text-[11px] text-faint">
              <span className="inline-flex items-center gap-1.5"><Icon name="Building2" size={12} />{p.dept}</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="Calendar" size={12} />Batch {p.academicYear}</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="Layers" size={12} />{p.type}</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="Eye" size={12} />{p.views} views</span>
              <span className="inline-flex items-center gap-1.5"><Icon name="Clock" size={12} />updated {rel(p.updatedAt)}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Btn variant={saved ? 's' : 'o'} size="sm" icon="Bookmark" onClick={() => dispatch({ type: 'SAVE_TOGGLE', id: p.id })}>{saved ? 'Saved' : 'Save'}</Btn>
            <Btn variant={followed ? 's' : 'o'} size="sm" icon="Bell" onClick={() => dispatch({ type: 'FOLLOW_TOGGLE', id: p.id })}>{followed ? 'Following' : 'Follow'}</Btn>
            <Btn variant="o" size="sm" icon="Share2" onClick={share}>Share</Btn>
            {isTeam && <Btn size="sm" icon="Pencil" onClick={() => router.push('/create?id=' + p.id)}>Edit</Btn>}
            {me?.role === 'faculty' && p.facultyId === me.id && <Btn size="sm" variant="ai" icon="ShieldCheck" onClick={() => router.push('/faculty?review=' + p.id)}>Evaluate</Btn>}
          </div>
        </div>
      </div>
    </div>

    <div className="shell py-8 grid lg:grid-cols-[1fr_320px] gap-8">
      <div className="min-w-0">
        <div className="flex gap-1 p-1 rounded-xl border hair bg-ink/50 overflow-x-auto nb mb-6">
          {[['overview','Knowledge','BookOpen'],['feedback',`Faculty feedback (${p.feedback.length})`,'MessageSquare'],['discussion',`Discussion (${p.discussion.length})`,'MessagesSquare'],['related',`Related (${rel4.length})`,'Sparkles']].map(([k, l, ic]) => (
            <button key={k} onClick={() => setTab(k)} className={cn('tab', tab === k && 'tab-on')}><Icon name={ic} size={14} />{l}</button>
          ))}
        </div>

        {tab === 'overview' && <div className="space-y-5">
          {blocks.filter(([, v]) => v).map(([title, val, ic, tone], i) => (
            <Reveal key={title} delay={i * 60}>
              <Card className="p-5 relative overflow-hidden">
                <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: `var(--${tone})` }} />
                <p className="flex items-center gap-2 font-display font-semibold text-[15px] mb-2.5" style={{ color: `var(--${tone})` }}><Icon name={ic} size={16} />{title}</p>
                <p className="text-[14px] leading-relaxed whitespace-pre-line">{val}</p>
              </Card>
            </Reveal>
          ))}
          <Card className="p-5">
            <p className="mono text-[10px] tracking-[.16em] text-faint mb-3">TECHNOLOGY STACK</p>
            <div className="flex flex-wrap gap-1.5">{p.tech.map((t) => <span key={t} className="mono text-[11.5px] px-2.5 py-1 rounded-lg border hair text-cyan bg-cyan/5">{t}</span>)}</div>
          </Card>
          {p.resources.length > 0 && <Card className="p-5">
            <p className="mono text-[10px] tracking-[.16em] text-faint mb-3">RESOURCES</p>
            <div className="grid sm:grid-cols-2 gap-2">
              {p.resources.map((r) => {
                const inner = <>
                  <span className="text-cyan"><Icon name={RES_ICON[r.kind] || 'Link2'} size={17} /></span>
                  <span className="min-w-0 flex-1"><span className="text-[13px] block truncate">{r.label || r.kind}</span>
                    <span className="mono text-[10px] text-faint">{r.size ? `${(r.size / 1048576).toFixed(2)} MB · Supabase Storage` : r.url || 'metadata only'}</span></span>
                  <Icon name={r.url ? 'ArrowUpRight' : 'Lock'} size={14} className="text-faint" /></>;
                return r.url
                  ? <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border hair bg-ink/40 hover:border-cyan transition-colors">{inner}</a>
                  : <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border hair bg-ink/40">{inner}</div>;
              })}
            </div>
            <p className="text-[11px] text-faint mt-3 flex items-start gap-1.5"><Icon name="Info" size={11} className="mt-0.5 shrink-0" />PostgreSQL stores file_name, project_id, file_type, storage_path, uploaded_by and created_at — never the file itself.</p>
          </Card>}
        </div>}

        {tab === 'feedback' && <div className="space-y-4">
          {!p.feedback.length ? <Empty icon="MessageSquare" title="No faculty feedback yet" msg={p.facultyId ? `Assigned to ${fac?.name}. Feedback will appear here once the review is submitted.` : 'This project has not been submitted for evaluation.'} /> :
            <>
              <div className="p-3.5 rounded-xl border hair bg-ink/40 flex items-start gap-2.5">
                <Icon name="Info" size={15} className="text-sky mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-dim leading-relaxed">TechLoop publishes faculty feedback as institutional knowledge. There are no public marks — rubric scores are visible only to the project team, the reviewer and administrators.</p>
              </div>
              {[...p.feedback].reverse().map((fb) => <FeedbackCard key={fb.id} fb={fb} showCriteria={canSeeRubric} />)}
            </>}
        </div>}

        {tab === 'discussion' && <div className="space-y-4">
          <Card className="p-4">
            <p className="text-[13px] font-semibold mb-2">Ask the team a question</p>
            <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="How did you handle PostgreSQL deployment? Did you face authentication issues?" className="min-h-[90px]" />
            <div className="flex justify-between items-center gap-3 mt-3 flex-wrap">
              <p className="text-[11.5px] text-faint">Keep it academic. The author is notified when you post.</p>
              <Btn size="sm" icon="Send" disabled={q.trim().length < 5} onClick={() => { dispatch({ type: 'ASK', projectId: p.id, text: q.trim() }); setQ(''); }}>Post question</Btn>
            </div>
          </Card>
          {!p.discussion.length ? <Empty icon="MessagesSquare" title="No questions yet" msg="Be the first to ask this team how they solved something." /> :
            p.discussion.map((d) => {
              const a = userById(state, d.authorId);
              return <Card key={d.id} className="p-4">
                <div className="flex items-center gap-2.5 mb-2">
                  <Avatar user={a} size={30} />
                  <div className="min-w-0"><p className="text-[13px] font-medium truncate">{a.name}{d.authorId === p.ownerId && <span className="ml-2 text-[10px] mono text-lime">AUTHOR</span>}</p>
                    <p className="mono text-[10px] text-faint">{rel(d.createdAt)}</p></div>
                </div>
                <p className="text-[13.5px] leading-relaxed">{d.text}</p>
              </Card>;
            })}
        </div>}

        {tab === 'related' && <div>
          <div className="p-3.5 rounded-xl border hair bg-ink/40 flex items-start gap-2.5 mb-4">
            <Icon name="Sparkles" size={15} className="text-magenta mt-0.5 shrink-0" />
            <p className="text-[12.5px] text-dim leading-relaxed">Conceptual similarity is computed from shared problem concepts, technology overlap and domain — so a completely different title can still be a near neighbour. In production this is a pgvector cosine query over Gemini embeddings.</p>
          </div>
          {!rel4.length ? <Empty icon="Sparkles" title="No neighbours yet" msg="More approved projects will surface related work here." /> :
            <div className="grid sm:grid-cols-2 gap-4">{rel4.map((r) => <ProjectCard key={r.project.id} p={r.project} matchScore={r.score} density={1} />)}</div>}
        </div>}
      </div>

      <aside className="space-y-5 min-w-0 lg:sticky lg:top-24 lg:self-start">
        <Card className="p-5">
          <p className="mono text-[10px] tracking-[.16em] text-faint mb-3">PROJECT TEAM</p>
          <div className="space-y-3">{p.team.map((m) => (
            <div key={m.id} className="flex items-center gap-2.5">
              <Avatar user={m.userId ? userById(state, m.userId) : { name: m.name }} size={32} />
              <div className="min-w-0"><p className="text-[13px] font-medium truncate">{m.name}</p><p className="text-[11px] text-faint truncate">{m.role}</p></div>
            </div>
          ))}</div>
        </Card>
        {fac && <Card className="p-5">
          <p className="mono text-[10px] tracking-[.16em] text-faint mb-3">FACULTY REVIEWER</p>
          <div className="flex items-center gap-2.5">
            <Avatar user={fac} size={38} />
            <div className="min-w-0"><p className="text-[13.5px] font-semibold truncate">{fac.name}</p><p className="mono text-[10.5px] text-faint">{fac.dept} · {fac.title}</p></div>
          </div>
          <p className="text-[11.5px] text-dim mt-3">{fac.spec}</p>
          <p className="text-[11px] text-faint mt-2">Submitted {fdate(p.createdAt)} · assignment-based evaluation.</p>
        </Card>}
        <Card className="p-5">
          <p className="mono text-[10px] tracking-[.16em] text-faint mb-3">PRESERVED KNOWLEDGE</p>
          <div className="space-y-2">
            {[['Problem statement', p.problem],['Solution overview', p.solution],['Main challenge', p.challenge],['Failed approaches', p.didntWork],['Resolution', p.solved],['Key learnings', p.learnings],['Future scope', p.future],['Faculty feedback', p.feedback.length ? 'yes' : '']].map(([l, v]) => (
              <div key={l} className="flex items-center gap-2 text-[12.5px]">
                <Icon name={v ? 'CheckCircle2' : 'Circle'} size={13} className={v ? 'text-lime' : 'text-faint'} />
                <span className={v ? 'text-fg' : 'text-faint'}>{l}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(80% 80% at 100% 0%,var(--g2),transparent 65%)' }} />
          <div className="relative">
            <p className="font-display font-semibold text-[14.5px] mb-2 flex items-center gap-2"><Icon name="Bot" size={15} className="text-magenta" />Ask about this work</p>
            <p className="text-[12.5px] text-dim leading-relaxed">Query the whole archive for teams who hit this same wall.</p>
            <Btn variant="ai" size="sm" className="mt-3 w-full" icon="Sparkles" onClick={() => router.push('/ai?q=' + encodeURIComponent(p.title))}>Open TechLoop AI</Btn>
          </div>
        </Card>
      </aside>
    </div>
  </div>;
}