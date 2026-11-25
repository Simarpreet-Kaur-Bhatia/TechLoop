'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Btn, Pill, Section, Reveal, Card, KnowledgeGraph, ProjectCard } from '../../lib/ui';
import { SearchBox } from '../../lib/search';
import { useStore } from '../../lib/store';
import { related } from '../../lib/ai';
import { DOMAINS, DOMAIN_TONE, TONE, cn } from '../../lib/data';

const SECTIONS = [['overview', 'Overview'], ['trending', 'Trending'], ['discover', 'Discover'], ['loop', 'The loop']];
const DICONS = ['Globe', 'Cpu', 'Wifi', 'ShieldCheck', 'Database', 'GitBranch', 'Activity'];
const TRY = ['automatic classroom attendance', 'agricultural monitoring', 'intermittent campus Wi-Fi'];
const A = (v) => (Array.isArray(v) ? v : []);

export default function Home() {
  const { state, me } = useStore();
  const router = useRouter();
  const [sec, setSec] = useState('overview');

  const approved = useMemo(
    () => state.projects.filter((p) => p.status === 'approved'),
    [state.projects]
  );

  const trending = useMemo(
    () => [...approved].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 3),
    [approved]
  );

  const recentSeed = useMemo(() => {
    const id = A(state.recent)[0];
    return state.projects.find((p) => p.id === id) || approved[0] || null;
  }, [state.recent, state.projects, approved]);

  const recommended = useMemo(() => {
    if (!recentSeed) return [];
    return related(recentSeed, state.projects, 3)
      .map((r) => ({ project: r.project ?? r.p, score: r.score ?? r.s ?? 0 }))
      .filter((r) => r.project);
  }, [recentSeed, state.projects]);

  const facultyCount = state.users.filter((u) => u.role === 'faculty').length;
  const failureCount = state.projects.filter((p) => String(p.didntWork || '').trim().length > 0).length;

  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) setSec(e.target.id); }),
      { rootMargin: '-110px 0px -60% 0px' }
    );
    SECTIONS.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const runQuery = (s) => router.push('/explore?sem=1&q=' + encodeURIComponent(s));

  return (
    <div className="relative z-10">
      <div className="sticky top-16 z-40 backdrop-blur-xl border-b hair" style={{ background: 'color-mix(in srgb,var(--ink) 80%,transparent)' }}>
        <div className="shell flex gap-1 overflow-x-auto nb h-11 items-center">
          {SECTIONS.map(([id, l]) => (
            <button key={id} onClick={() => jump(id)}
              className={cn('px-3 h-7 inline-flex items-center rounded-full mono text-[11px] tracking-wide transition-colors whitespace-nowrap', sec === id ? 'text-[#04121A] font-semibold' : 'text-dim hover:text-fg')}
              style={sec === id ? { background: 'linear-gradient(102deg,var(--cyan),var(--lime))' } : null}>{l}</button>
          ))}
          <span className="ml-auto mono text-[10.5px] text-faint hidden sm:block">
            {approved.length} verified projects · {facultyCount} faculty
          </span>
        </div>
      </div>

      <section id="overview" className="smt relative overflow-hidden">
        <div className="absolute inset-0 bp opacity-70 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(80% 60% at 15% 0%,var(--g1),transparent 62%)' }} />
        <div className="shell pt-14 pb-16 grid lg:grid-cols-[1.1fr_1fr] gap-10 items-center relative">
          <div>
            <Pill tone="lime" icon="Zap">Batch 2022 → 2028 · live archive</Pill>
            <h1 className="text-[46px] sm:text-[62px] leading-[.98] font-bold mt-5 rise" style={{ animationDelay: '80ms' }}>
              Build.<br />Discover.<br /><span className="gt">Learn.</span>
            </h1>
            <p className="text-dim text-[15.5px] mt-5 max-w-lg leading-relaxed rise" style={{ animationDelay: '160ms' }}>
              Learn from projects built before you. {me && <span className="text-fg">Welcome back, {me.name.split(' ')[0]}.</span>} Search by the problem you are trying to solve — not the exact title someone typed three years ago.
            </p>

            <div className="mt-7 rise" style={{ animationDelay: '240ms' }}>
              <SearchBox big />
              <div className="flex gap-1.5 mt-3 flex-wrap items-center">
                <span className="mono text-[10.5px] text-faint">TRY:</span>
                {TRY.map((s) => (
                  <button key={s} type="button" onClick={() => runQuery(s)}
                    className="mono text-[10.5px] px-2.5 py-1 rounded-full border hair text-dim hover:text-cyan hover:border-cyan transition-colors">{s}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mt-9 max-w-md">
              {[['Verified projects', approved.length, 'lime'], ['Faculty reviewers', facultyCount, 'violet'], ['Preserved failures', failureCount, 'amber']].map(([l, v, t]) => (
                <div key={l} className="border-l-2 pl-3" style={{ borderColor: TONE[t] }}>
                  <p className="font-display text-2xl font-bold tb">{v}</p>
                  <p className="text-[11px] text-dim leading-tight mt-0.5">{l}</p>
                </div>
              ))}
            </div>
          </div>

          <Reveal delay={120}>
            <KnowledgeGraph projects={approved} height={430} dense />
            <p className="text-[11.5px] text-faint mt-3 flex items-start gap-2">
              <Icon name="Info" size={12} className="mt-0.5 shrink-0" />
              Edges are conceptual similarity computed from problem, solution, failure and technology signals — the same layer that powers Related Projects.
            </p>
          </Reveal>
        </div>
      </section>

      <section id="trending" className="smt shell py-14 relative">
        <div className="absolute inset-x-0 top-0 h-64 pointer-events-none" style={{ background: 'radial-gradient(60% 100% at 80% 0%,var(--g3),transparent 70%)' }} />
        <Section
          title="Trending in the archive"
          sub="Most opened verified projects this term"
          right={<Btn variant="o" size="sm" iconRight="ArrowRight" onClick={() => router.push('/explore')}>Browse all</Btn>}
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map((p, i) => (
              <Reveal key={p.id} delay={i * 90}><ProjectCard p={p} density={2} /></Reveal>
            ))}
          </div>
        </Section>
      </section>

      <section id="discover" className="smt shell py-14">
        <Section
          title="AI recommendations for you"
          sub={recentSeed ? `Because you recently opened ${recentSeed.title}` : 'Based on your activity'}
        >
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommended.map((r, i) => (
              <Reveal key={r.project.id} delay={i * 90}>
                <ProjectCard p={r.project} matchScore={r.score} density={2} />
              </Reveal>
            ))}
          </div>
        </Section>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-10">
          {DOMAINS.map((d, i) => {
            const n = state.projects.filter((p) => A(p.domain).includes(d) && p.status === 'approved').length;
            return (
              <Reveal key={d} delay={i * 50}>
                <button onClick={() => router.push('/explore?domain=' + encodeURIComponent(d))}
                  className="w-full card rounded-xl p-4 text-left hl group relative overflow-hidden">
                  <span className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{ background: `radial-gradient(circle,${TONE[DOMAIN_TONE[d]]},transparent 70%)` }} />
                  <span style={{ color: TONE[DOMAIN_TONE[d]] }}><Icon name={DICONS[i]} size={19} /></span>
                  <p className="text-[13.5px] font-semibold mt-2.5">{d}</p>
                  <p className="mono text-[10.5px] text-faint mt-0.5">{n} project{n === 1 ? '' : 's'}</p>
                </button>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section id="loop" className="smt shell py-14">
        <Card className="p-6 sm:p-10 relative overflow-hidden">
          <div className="absolute inset-0 bp opacity-60 pointer-events-none" />
          <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(70% 100% at 50% 100%,var(--g2),transparent 65%)' }} />
          <div className="relative">
            <p className="mono text-[10px] tracking-[.22em] text-cyan">THE PRODUCT LOOP</p>
            <h2 className="text-2xl sm:text-3xl font-bold mt-3 max-w-2xl">Not a submission portal. A knowledge loop that closes across batches.</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {[
                ['GraduationCap', 'Student creates', 'Problem, solution, technology, and honestly — what failed.', 'cyan'],
                ['ShieldCheck', 'Faculty reviews', 'Assignment-based queue. Feedback becomes institutional record, not a chat message.', 'violet'],
                ['Archive', 'Archive preserves', 'Approved projects keep their rubric private and their learnings public.', 'lime'],
                ['Sparkles', 'Juniors discover', 'Semantic search and grounded AI return sources, not invented answers.', 'magenta'],
              ].map(([ic, t, d, tone], i) => (
                <Reveal key={t} delay={i * 100}>
                  <div className="relative">
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="w-9 h-9 rounded-xl grid place-items-center border hair"
                        style={{ color: TONE[tone], background: `color-mix(in srgb,${TONE[tone]} 10%,transparent)` }}>
                        <Icon name={ic} size={17} />
                      </span>
                      <span className="mono text-[10px] text-faint">0{i + 1}</span>
                    </div>
                    <p className="font-display font-semibold text-[15px]">{t}</p>
                    <p className="text-[12.5px] text-dim mt-1.5 leading-relaxed">{d}</p>
                    {i < 3 && <span className="hidden lg:block absolute top-4 -right-3 text-faint"><Icon name="ArrowRight" size={15} /></span>}
                  </div>
                </Reveal>
              ))}
            </div>
            <div className="flex gap-3 mt-9 flex-wrap">
              <Btn icon="Plus" onClick={() => router.push('/create')}>Create a project</Btn>
              <Btn variant="ai" icon="Sparkles" onClick={() => router.push('/ai')}>Ask TechLoop AI</Btn>
              <Btn variant="o" icon="Compass" onClick={() => router.push('/explore')}>Explore the archive</Btn>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}