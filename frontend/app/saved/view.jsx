'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Btn, Avatar, Card, Pill, Tabs, Empty, Section, Select, ProjectCard, StatCard, Meter } from '../../lib/ui';
import { useStore, userById } from '../../lib/store';
import { fdate, rel, cn, TONE, HUES } from '../../lib/data';

const arr = (v) => (Array.isArray(v) ? v : []);

const KNOWLEDGE = [
  ['Problem statement', 'problem', 'cyan'],
  ['Solution overview', 'solution', 'lime'],
  ['Main challenge', 'challenge', 'amber'],
  ['Failed approaches', 'didntWork', 'rose'],
  ['Key learnings', 'learnings', 'violet'],
  ['Faculty feedback', 'feedback', 'magenta'],
];

export default function Saved({ query }) {
  const { state, me } = useStore();
  const router = useRouter();
  const initial = query?.tab === 'profile' ? 'profile' : query?.tab === 'following' ? 'following' : 'saved';
  const [tab, setTab] = useState(initial);
  const [sort, setSort] = useState('recent');
  const [q, setQ] = useState('');

  const uid = me?.id ?? null;

  const saved = useMemo(() => state.projects.filter((p) => arr(p.savedBy).includes(uid)), [state.projects, uid]);
  const followed = useMemo(() => state.projects.filter((p) => arr(p.followers).includes(uid)), [state.projects, uid]);

  const mine = useMemo(() => {
    if (!uid) return [];
    return state.projects.filter((p) => p.ownerId === uid || arr(p.team).some((t) => t?.userId === uid));
  }, [state.projects, uid]);

  const approved = useMemo(() => mine.filter((p) => p.status === 'approved'), [mine]);
  const totalViews = useMemo(() => mine.reduce((s, p) => s + (Number(p.views) || 0), 0), [mine]);
  const answers = useMemo(
    () => state.projects.reduce((s, p) => s + arr(p.discussion).filter((d) => d?.authorId === uid).length, 0),
    [state.projects, uid]
  );

  const techCounts = useMemo(() => {
    const m = new Map();
    mine.forEach((p) => arr(p.tech).forEach((t) => m.set(t, (m.get(t) || 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [mine]);
  const techMax = techCounts.length ? techCounts[0][1] : 1;

  const knowledge = useMemo(
    () => KNOWLEDGE.map(([label, key, tone]) => ({
      label,
      tone,
      n: mine.filter((p) => (key === 'feedback' ? arr(p.feedback).length > 0 : String(p[key] || '').trim().length > 0)).length,
    })),
    [mine]
  );

  const myNotifs = useMemo(
    () => state.notifications.filter((n) => n.userId === uid),
    [state.notifications, uid]
  );

  /* deterministic enrolment date — derived from stored records, never from the clock at render time */
  const joined = useMemo(() => {
    const stamps = [...mine.map((p) => p.createdAt), ...myNotifs.map((n) => n.createdAt)]
      .map((s) => new Date(s).getTime())
      .filter((n) => Number.isFinite(n));
    if (stamps.length) return new Date(Math.min(...stamps)).toISOString();
    const batch = Number(me?.batch);
    const admission = Number.isFinite(batch) ? batch - 4 : 2022;
    return new Date(Date.UTC(admission, 7, 1)).toISOString();
  }, [mine, myNotifs, me]);

  const rows = useMemo(() => {
    const base = tab === 'following' ? followed : saved;
    const ql = q.trim().toLowerCase();
    const filtered = ql
      ? base.filter((p) => (p.title + ' ' + p.short + ' ' + arr(p.tech).join(' ')).toLowerCase().includes(ql))
      : [...base];
    if (sort === 'title') filtered.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'views') filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
    else filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    return filtered;
  }, [tab, saved, followed, q, sort]);

  if (!me) {
    return (
      <div className="shell py-20 relative z-10">
        <Empty
          icon="Lock"
          title="Sign in to see your collection"
          msg="Saved projects, followed work and your contribution profile are tied to your institutional account."
          action={<Btn icon="LogIn" onClick={() => router.push('/login')}>Go to sign in</Btn>}
        />
      </div>
    );
  }

  return (
    <div className="shell py-8 relative z-10">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
        <div className="min-w-0">
          <p className="mono text-[10px] tracking-[.2em] text-amber">YOUR COLLECTION</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Saved, followed & profile</h1>
          <p className="text-[13px] text-dim mt-1.5 max-w-2xl">
            Your reference shelf across batches. Following a project surfaces its updates in your notifications.
          </p>
        </div>
        {me.role === 'student' && <Btn icon="Plus" onClick={() => router.push('/create')}>New project</Btn>}
      </div>

      <Tabs
        className="mb-6 w-fit"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'saved', label: 'Saved', icon: 'Bookmark', count: saved.length },
          { id: 'following', label: 'Following', icon: 'Bell', count: followed.length },
          { id: 'profile', label: 'Profile', icon: 'User' },
        ]}
      />

      {tab !== 'profile' && (
        <>
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filter your collection…"
                aria-label="Filter collection"
                className="inp h-9 py-0 pl-9 text-[13px]"
              />
            </div>
            <Select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 py-0 w-auto">
              <option value="recent">Recently updated</option>
              <option value="title">Title A–Z</option>
              <option value="views">Most viewed</option>
            </Select>
            <span className="mono text-[11px] text-faint tb">{rows.length} shown</span>
            {(q || sort !== 'recent') && (
              <Btn size="xs" variant="g" icon="RotateCcw" onClick={() => { setQ(''); setSort('recent'); }}>Reset</Btn>
            )}
          </div>

          {!rows.length ? (
            <Empty
              icon={tab === 'saved' ? 'Bookmark' : 'Bell'}
              title={q ? 'Nothing matches that filter' : tab === 'saved' ? 'Nothing saved yet' : 'Not following anything'}
              msg={q ? 'Clear the filter to see your whole collection.' : 'Explore the archive and bookmark projects you want to learn from.'}
              action={q
                ? <Btn variant="o" icon="RotateCcw" onClick={() => setQ('')}>Clear filter</Btn>
                : <Btn icon="Compass" onClick={() => router.push('/explore')}>Explore archive</Btn>}
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map((p) => <ProjectCard key={p.id} p={p} density={2} />)}
            </div>
          )}
        </>
      )}

      {tab === 'profile' && (
        <>
          <Card className="p-6 sm:p-8 relative overflow-hidden mb-8">
            <div className="absolute inset-0 bp opacity-60 pointer-events-none" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 100% at 15% 0%,var(--g1),transparent 62%)' }} />
            <div className="relative flex items-start gap-5 flex-wrap">
              <Avatar user={me} size={76} ring />
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold">{me.name}</h2>
                <p className="mono text-[11.5px] text-faint mt-1">{me.email}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Pill tone={me.role === 'faculty' ? 'violet' : me.role === 'admin' ? 'rose' : 'cyan'} icon={me.role === 'faculty' ? 'ShieldCheck' : me.role === 'admin' ? 'LayoutDashboard' : 'GraduationCap'}>
                    {me.role.toUpperCase()}
                  </Pill>
                  <Pill tone="faint" icon="Building2">{me.dept}</Pill>
                  {me.year && <Pill tone="faint" icon="Calendar">{me.year} year · Batch {me.batch}</Pill>}
                  {me.roll && <Pill tone="faint" icon="Hash">{me.roll}</Pill>}
                  {me.title && <Pill tone="faint" icon="Award">{me.title}</Pill>}
                </div>
                {me.spec && <p className="text-[13px] text-dim mt-3">{me.spec}</p>}
              </div>
              <div className="flex gap-2 flex-wrap">
                <Btn variant="o" icon="Compass" onClick={() => router.push('/explore')}>Explore</Btn>
                {me.role === 'student' && <Btn icon="Plus" onClick={() => router.push('/create')}>New project</Btn>}
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            <StatCard icon="FolderGit2" label="Projects" value={mine.length} tone="cyan" sub={`${approved.length} approved`} />
            <StatCard icon="Eye" label="Total views" value={totalViews} tone="lime" sub="Across your archive records" />
            <StatCard icon="MessagesSquare" label="Answers given" value={answers} tone="violet" sub="Knowledge shared with juniors" />
            <StatCard icon="Cpu" label="Technologies" value={techCounts.length} tone="amber" sub="Used across your work" />
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-8">
            <div className="space-y-8 min-w-0">
              <Section title="Knowledge preserved" sub="What your records actually carry forward to the next batch.">
                {!mine.length ? (
                  <Empty icon="BookOpen" title="Nothing recorded yet" msg="Create a project and fill the Experience step — that is the part juniors search for." />
                ) : (
                  <Card className="p-5 space-y-3.5">
                    {knowledge.map((k) => (
                      <div key={k.label}>
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <span className="text-[12.5px] text-dim flex items-center gap-2">
                            <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: TONE[k.tone] }} />
                            {k.label}
                          </span>
                          <span className="mono text-[11px] tb" style={{ color: k.n ? TONE[k.tone] : 'var(--faint)' }}>
                            {k.n}/{mine.length}
                          </span>
                        </div>
                        <Meter value={mine.length ? (k.n / mine.length) * 100 : 0} tone={k.tone} height={5} />
                      </div>
                    ))}
                    <p className="text-[11px] text-faint pt-1 flex items-start gap-1.5">
                      <Icon name="Info" size={11} className="mt-0.5 shrink-0" />
                      A repository preserves code. TechLoop preserves what failed, why, and how it was fixed.
                    </p>
                  </Card>
                )}
              </Section>

              <Section title="Contributions" sub="Projects you own or contributed to as a teammate.">
                {!mine.length ? (
                  <Empty
                    icon="FolderGit2"
                    title="No contributions yet"
                    msg="Create your first project record to start building institutional knowledge."
                    action={<Btn icon="Plus" onClick={() => router.push('/create')}>Create project</Btn>}
                  />
                ) : (
                  <div className="space-y-2.5">
                    {mine.map((p) => <ProjectCard key={p.id} p={p} layout="list" />)}
                  </div>
                )}
              </Section>
            </div>

            <aside className="space-y-5 min-w-0 lg:sticky lg:top-24 lg:self-start">
              <Card className="p-5">
                <p className="font-display font-semibold text-[15px] mb-4 flex items-center gap-2">
                  <Icon name="Cpu" size={16} className="text-cyan" />Technology footprint
                </p>
                {!techCounts.length ? (
                  <p className="text-[12.5px] text-dim">No technologies recorded yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {techCounts.map(([t, n], i) => (
                      <div key={t} className="grid grid-cols-[minmax(64px,96px)_1fr_22px] items-center gap-2.5">
                        <span className="text-[12px] text-dim truncate">{t}</span>
                        <div className="h-[16px] rounded-md bg-ink border hair overflow-hidden">
                          <div
                            className="h-full rounded-md transition-[width] duration-700"
                            style={{ width: `${(n / techMax) * 100}%`, background: `linear-gradient(90deg,color-mix(in srgb,${HUES[i % 8]} 45%,transparent),${HUES[i % 8]})` }}
                          />
                        </div>
                        <span className="mono text-[11px] text-fg tb text-right">{n}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <p className="font-display font-semibold text-[15px] mb-4 flex items-center gap-2">
                  <Icon name="Bell" size={16} className="text-violet" />Recent notifications
                </p>
                {!myNotifs.length ? (
                  <p className="text-[12.5px] text-dim">Nothing yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {myNotifs.slice(0, 5).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => n.projectId && router.push('/project/' + n.projectId)}
                        className="w-full text-left group"
                      >
                        <p className={cn('text-[12.5px] leading-snug transition-colors', n.projectId && 'group-hover:text-cyan')}>{n.title}</p>
                        <p className="mono text-[10px] text-faint mt-0.5">{rel(n.createdAt)}</p>
                      </button>
                    ))}
                  </div>
                )}
              </Card>

              <Card className="p-5">
                <p className="font-display font-semibold text-[15px] mb-3 flex items-center gap-2">
                  <Icon name="Award" size={16} className="text-lime" />Institutional record
                </p>
                <div className="space-y-2 text-[12.5px]">
                  {[
                    ['Member since', fdate(joined)],
                    ['Department', me.dept],
                    me.roll ? ['Roll number', me.roll] : null,
                    me.batch ? ['Graduating batch', String(me.batch)] : null,
                    ['Archive records', String(mine.length)],
                    ['Verified records', String(approved.length)],
                  ].filter(Boolean).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 border-b hair pb-1.5 last:border-0">
                      <span className="text-dim">{k}</span>
                      <span className="mono text-fg text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-faint mt-3 leading-relaxed">
                  Authenticated via Django + institutional Google OAuth in production.
                </p>
              </Card>

              <Card className="p-5 relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(80% 80% at 100% 0%,var(--g2),transparent 65%)' }} />
                <div className="relative">
                  <p className="font-display font-semibold text-[14.5px] mb-2 flex items-center gap-2">
                    <Icon name="Sparkles" size={15} className="text-magenta" />Ask the archive
                  </p>
                  <p className="text-[12.5px] text-dim leading-relaxed">
                    Find teams who already hit the wall you are about to hit — grounded answers with cited sources.
                  </p>
                  <Btn variant="ai" size="sm" className="mt-3 w-full" icon="Bot" onClick={() => router.push('/ai')}>
                    Open TechLoop AI
                  </Btn>
                </div>
              </Card>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}