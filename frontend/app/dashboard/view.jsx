'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Btn, Avatar, Card, Section, Empty, Modal, ProjectCard, FeedbackCard, StatCard } from '../../lib/ui';
import { useStore, userById } from '../../lib/store';
import { rel, reorder } from '../../lib/data';

const arr = (v) => (Array.isArray(v) ? v : []);

export default function Dashboard() {
  const { state, dispatch, me } = useStore();
  const router = useRouter();
  const [drag, setDrag] = useState(null);
  const [over, setOver] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const uid = me?.id ?? null;

  const mine = useMemo(() => {
    if (!uid) return [];
    return state.projects.filter((p) => p && (p.ownerId === uid || arr(p.team).some((t) => t?.userId === uid)));
  }, [state.projects, uid]);

  const owned = useMemo(() => mine.filter((p) => p.ownerId === uid), [mine, uid]);
  const pending = useMemo(() => mine.filter((p) => ['pending', 'in_review'].includes(p.status)), [mine]);
  const revisions = useMemo(() => mine.filter((p) => p.status === 'revision_requested'), [mine]);
  const approved = useMemo(() => mine.filter((p) => p.status === 'approved'), [mine]);

  const saved = useMemo(() => state.projects.filter((p) => arr(p.savedBy).includes(uid)), [state.projects, uid]);

  const recent = useMemo(
    () => arr(state.recent).map((id) => state.projects.find((p) => p.id === id)).filter(Boolean),
    [state.recent, state.projects]
  );

  const feedback = useMemo(
    () => mine
      .flatMap((p) => arr(p.feedback).map((f, i) => ({
        ...f,
        id: f?.id || `${p.id}_fb_${i}`,
        version: f?.version ?? i + 1,
        decision: f?.decision || 'note',
        body: f?.body || '',
        createdAt: f?.createdAt || p.updatedAt || p.createdAt,
        project: p,
      })))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [mine]
  );

  const activity = useMemo(() => {
    const name = (id) => userById(state, id)?.name || 'Someone';
    const items = [
      ...feedback.map((f) => ({
        key: 'fb_' + f.id,
        t: `${name(f.authorId)} ${f.decision === 'approved' ? 'approved' : f.decision === 'revision_requested' ? 'requested changes on' : 'reviewed'} ${f.project.title}`,
        at: f.createdAt,
        icon: f.decision === 'approved' ? 'CheckCircle2' : f.decision === 'revision_requested' ? 'AlertTriangle' : 'MessageSquare',
        tone: f.decision === 'approved' ? 'lime' : f.decision === 'revision_requested' ? 'rose' : 'sky',
        go: '/project/' + f.project.id,
      })),
      ...mine.flatMap((p) => arr(p.discussion)
        .filter((d) => d?.authorId && d.authorId !== uid)
        .map((d) => ({
          key: 'dq_' + (d.id || d.createdAt),
          t: `${name(d.authorId)} asked a question on ${p.title}`,
          at: d.createdAt || p.createdAt,
          icon: 'MessageSquare',
          tone: 'cyan',
          go: '/project/' + p.id,
        }))),
      ...mine.map((p) => ({
        key: 'cr_' + p.id,
        t: `You created ${p.title}`,
        at: p.createdAt,
        icon: 'Plus',
        tone: 'violet',
        go: '/project/' + p.id,
      })),
    ];
    return items
      .filter((x) => x.at && !Number.isNaN(new Date(x.at).getTime()))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 7);
  }, [feedback, mine, state, uid]);

  const move = (fromId, toId) => {
    const ids = owned.map((p) => p.id);
    const from = ids.indexOf(fromId);
    const to = ids.indexOf(toId);
    if (from < 0 || to < 0 || from === to) return;
    dispatch({ type: 'REORDER', ids: reorder(ids, from, to) });
  };
  const drop = (targetId) => {
    if (drag && drag !== targetId) move(drag, targetId);
    setDrag(null); setOver(null);
  };
  const nudge = (id, dir) => {
    const ids = owned.map((p) => p.id);
    const i = ids.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    dispatch({ type: 'REORDER', ids: reorder(ids, i, j) });
    setBusyId(id);
    setTimeout(() => setBusyId((v) => (v === id ? null : v)), 450);
  };
  const remove = () => {
    if (!confirm) return;
    dispatch({ type: 'PROJECT_DELETE', ids: [confirm.id] });
    setConfirm(null);
  };

  if (!me) {
    return (
      <div className="shell py-20 relative z-10">
        <Empty
          icon="Lock"
          title="Sign in to see your dashboard"
          msg="Your projects, faculty feedback and saved archive are tied to your institutional account."
          action={<Btn icon="LogIn" onClick={() => router.push('/login')}>Go to sign in</Btn>}
        />
      </div>
    );
  }

  return (
    <div className="shell py-8 relative z-10">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar user={me} size={54} ring />
          <div className="min-w-0">
            <p className="mono text-[10px] tracking-[.2em] text-cyan">STUDENT DASHBOARD</p>
            <h1 className="text-2xl sm:text-3xl font-bold mt-1 truncate">{me.name}</h1>
            <p className="text-[12.5px] text-dim mt-0.5">
              {[me.dept, me.year && `${me.year} year`, me.roll && `Roll ${me.roll}`, me.batch && `Batch ${me.batch}`].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="o" icon="Compass" onClick={() => router.push('/explore')}>Explore</Btn>
          <Btn icon="Plus" onClick={() => router.push('/create')}>New project</Btn>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <StatCard icon="FolderGit2" label="My projects" value={mine.length} tone="cyan" sub={`${owned.length} owned · ${mine.length - owned.length} as teammate`} />
        <StatCard icon="Clock" label="Pending" value={pending.length} tone="amber" sub="Awaiting faculty evaluation" />
        <StatCard icon="AlertTriangle" label="Revisions" value={revisions.length} tone="rose" sub="Action needed from you" />
        <StatCard icon="CheckCircle2" label="Approved" value={approved.length} tone="lime" sub="Live in the archive" />
      </div>

      {revisions.length > 0 && (
        <Card className="p-4 mb-8" style={{ borderLeft: '3px solid var(--rose)' }}>
          <div className="flex items-start gap-3 flex-wrap">
            <span className="text-rose mt-0.5"><Icon name="AlertTriangle" size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[14px]">Faculty requested changes on {revisions.length} project{revisions.length > 1 ? 's' : ''}</p>
              <p className="text-[12.5px] text-dim mt-1">Read the feedback, edit the record, and resubmit. The full history is preserved — nothing is overwritten.</p>
            </div>
            <Btn size="sm" variant="d" icon="Pencil" onClick={() => router.push('/create?id=' + revisions[0].id)}>Address feedback</Btn>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8">
        <div className="space-y-9 min-w-0">
          <Section
            title="My projects"
            sub="Drag the handle, or use the arrows on touch devices — your pin order is saved"
            right={<span className="mono text-[10.5px] text-faint">{owned.length} records</span>}
          >
            {!owned.length ? (
              <Empty icon="FolderGit2" title="No projects yet" msg="Create your first project record. Six short steps — not a giant academic form."
                action={<Btn icon="Plus" onClick={() => router.push('/create')}>Create project</Btn>} />
            ) : (
              <div className="space-y-2.5">
                {owned.map((p, i) => (
                  <div key={p.id} className={drag === p.id ? 'dg' : ''}>
                    <ProjectCard
                      p={p}
                      layout="list"
                      draggable
                      onDragStart={() => setDrag(p.id)}
                      onDragOver={(e) => { e.preventDefault(); setOver(p.id); }}
                      onDragEnd={() => { setDrag(null); setOver(null); }}
                      onDrop={() => drop(p.id)}
                      dragOver={over === p.id && drag !== p.id}
                    />
                    <div className="flex gap-1.5 mt-1.5 pl-1 flex-wrap items-center">
                      <Btn size="xs" variant="g" icon="ChevronUp" disabled={i === 0} aria-label="Move up" onClick={() => nudge(p.id, -1)} />
                      <Btn size="xs" variant="g" icon="ChevronDown" disabled={i === owned.length - 1} aria-label="Move down" onClick={() => nudge(p.id, 1)} />
                      <span className="w-px h-4 bg-line mx-1" />
                      <Btn size="xs" variant="g" icon="Pencil" onClick={() => router.push('/create?id=' + p.id)}>Edit</Btn>
                      {p.status === 'draft' && <Btn size="xs" variant="g" icon="Send" onClick={() => router.push('/create?id=' + p.id)}>Submit</Btn>}
                      <Btn size="xs" variant="g" icon="Trash2" className="hover:text-rose" onClick={() => setConfirm(p)}>Delete</Btn>
                      {busyId === p.id && <span className="mono text-[10px] text-lime">order saved</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Faculty feedback" sub="Every review, versioned. Rubric scores stay private to your team.">
            {!feedback.length ? (
              <Empty icon="MessageSquare" title="No feedback yet" msg="Submit a project to a faculty member to start the evaluation loop." />
            ) : (
              <div className="space-y-3">
                {feedback.slice(0, 4).map((f) => (
                  <div key={f.id}>
                    <button onClick={() => router.push('/project/' + f.project.id)}
                      className="text-[12.5px] text-cyan hover:underline mb-1.5 inline-flex items-center gap-1.5">
                      <Icon name="FolderGit2" size={12} />{f.project.title}
                    </button>
                    <FeedbackCard fb={f} showCriteria />
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Saved projects" sub={`${saved.length} in your collection`}
            right={saved.length > 0 && <Btn size="sm" variant="g" iconRight="ArrowRight" onClick={() => router.push('/saved')}>View all</Btn>}>
            {!saved.length ? (
              <Empty icon="Bookmark" title="Nothing saved" msg="Bookmark projects while exploring to build your own reference shelf."
                action={<Btn variant="o" icon="Compass" onClick={() => router.push('/explore')}>Explore archive</Btn>} />
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">{saved.slice(0, 4).map((p) => <ProjectCard key={p.id} p={p} density={0} />)}</div>
            )}
          </Section>
        </div>

        <aside className="space-y-6 min-w-0 lg:sticky lg:top-24 lg:self-start">
          <Card className="p-5">
            <p className="font-display font-semibold text-[15px] mb-4 flex items-center gap-2"><Icon name="Activity" size={16} className="text-cyan" />My activity</p>
            {!activity.length ? <p className="text-[12.5px] text-dim">Nothing recorded yet.</p> : (
              <div className="space-y-3.5">
                {activity.map((a) => (
                  <button key={a.key} onClick={() => router.push(a.go)} className="flex gap-3 w-full text-left group">
                    <span className="mt-0.5 shrink-0" style={{ color: `var(--${a.tone})` }}><Icon name={a.icon} size={14} /></span>
                    <div className="min-w-0">
                      <p className="text-[12.5px] leading-snug group-hover:text-cyan transition-colors">{a.t}</p>
                      <p className="mono text-[10px] text-faint mt-0.5">{rel(a.at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <p className="font-display font-semibold text-[15px] mb-4 flex items-center gap-2"><Icon name="Eye" size={16} className="text-violet" />Recently viewed</p>
            {!recent.length ? <p className="text-[12.5px] text-dim">Nothing yet.</p> : (
              <div className="space-y-2">
                {recent.slice(0, 5).map((p) => (
                  <button key={p.id} onClick={() => router.push('/project/' + p.id)}
                    className="w-full text-left p-2.5 rounded-lg border hair hover:border-cyan transition-colors">
                    <p className="text-[12.5px] font-medium truncate">{p.title}</p>
                    <p className="mono text-[10px] text-faint mt-0.5">{arr(p.domain)[0] || 'Project'} · {p.academicYear}</p>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5 relative overflow-hidden">
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(80% 80% at 100% 0%,var(--g2),transparent 65%)' }} />
            <div className="relative">
              <p className="font-display font-semibold text-[15px] mb-2 flex items-center gap-2"><Icon name="Sparkles" size={16} className="text-magenta" />Ask before you build</p>
              <p className="text-[12.5px] text-dim leading-relaxed">Someone may already have hit the exact wall you are about to hit. The assistant answers only from archived projects and cites them.</p>
              <Btn variant="ai" size="sm" className="mt-4 w-full" icon="Bot" onClick={() => router.push('/ai')}>Open TechLoop AI</Btn>
            </div>
          </Card>
        </aside>
      </div>

      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title="Delete this project?"
        sub="You can undo immediately from the toast."
        footer={<>
          <Btn variant="g" onClick={() => setConfirm(null)}>Cancel</Btn>
          <Btn variant="d" icon="Trash2" onClick={remove}>Delete project</Btn>
        </>}
      >
        <p className="text-[13.5px] text-dim leading-relaxed">
          <span className="text-fg font-medium">{confirm?.title}</span> and its feedback history will be removed from your dashboard and the archive. Faculty assignments referencing it are released.
        </p>
      </Modal>
    </div>
  );
}