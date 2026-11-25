'use client';
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { StoreProvider, useStore, useTheme } from '../lib/store';
import { Icon, Btn, Avatar, Pill, Drawer, Empty, Toasts } from '../lib/ui';
import { SearchBox } from '../lib/search';
import { AuthGate } from '../lib/auth';
import { ErrorBoundary, WrongRole } from '../lib/guard';
import { navFor, canAccess, deniedReason, paletteFor, canSeeProject, metaFor, homeFor } from '../lib/access';
import { cn, rel } from '../lib/data';

const subscribeScroll = (cb) => {
  window.addEventListener('scroll', cb, { passive: true });
  window.addEventListener('resize', cb, { passive: true });
  return () => { window.removeEventListener('scroll', cb); window.removeEventListener('resize', cb); };
};
const useScrolled = () => useSyncExternalStore(subscribeScroll, () => window.scrollY > 12, () => false);
const subscribeNoop = () => () => {};
const useMounted = () => useSyncExternalStore(subscribeNoop, () => true, () => false);

function Navbar({ onPalette, onNotifs }) {
  const { state, dispatch, me } = useStore();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [menuAt, setMenuAt] = useState(null);
  const [mobAt, setMobAt] = useState(null);
  const menuOpen = menuAt === pathname;
  const mobOpen = mobAt === pathname;

  const role = me?.role;
  const meta = metaFor(role);
  const links = navFor(role);
  const unread = state.notifications.filter((n) => n.userId === state.session && !n.read).length;
  const active = (p) => pathname === p || pathname.startsWith(p + '/');
  const myCount = state.projects.filter((p) => p.ownerId === me?.id).length;
  const assignedCount = state.projects.filter((p) => p.facultyId === me?.id).length;

  return (
    <>
      <header className={cn('fixed top-0 inset-x-0 z-50 transition-all duration-300 border-b', scrolled ? 'backdrop-blur-xl hair' : 'border-transparent')}
        style={{ background: scrolled ? 'color-mix(in srgb,var(--ink) 82%,transparent)' : 'transparent' }}>
        <div className="shell h-16 flex items-center gap-3">
          <button onClick={() => setMobAt(pathname)} className="lg:hidden text-dim hover:text-fg p-1.5" aria-label="Menu"><Icon name="Menu" size={20} /></button>

          <Link href={meta.home} className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 rounded-xl grid place-items-center border hair" style={{ background: 'linear-gradient(140deg,color-mix(in srgb,var(--cyan) 28%,transparent),color-mix(in srgb,var(--violet) 24%,transparent))' }}>
              <Icon name="Network" size={18} className="text-cyan" />
            </span>
            <span className="hidden sm:block leading-none">
              <span className="font-display font-bold text-[17px] block">Tech<span className="gt">Loop</span></span>
              <span className="mono text-[9px] text-faint tracking-[.16em]">KNOWLEDGE ARCHIVE</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 ml-3">
            {links.map((r) => (
              <Link key={r.path} href={r.path}
                className={cn('relative px-3 h-9 inline-flex items-center gap-2 rounded-lg text-[13px] font-medium transition-colors', active(r.path) ? 'text-fg' : 'text-dim hover:text-fg')}>
                <Icon name={r.icon} size={14} />{r.label}
                {active(r.path) && <span className="absolute -bottom-[3px] left-3 right-3 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg,var(--cyan),var(--lime))' }} />}
              </Link>
            ))}
          </nav>

          <SearchBox onPalette={onPalette} />

          <div className="flex items-center gap-1 ml-auto md:ml-0">
            <button onClick={onPalette} className="md:hidden text-dim hover:text-cyan p-2" aria-label="Search"><Icon name="Search" size={18} /></button>
            <button onClick={toggle} className="text-dim hover:text-amber p-2 transition-colors" aria-label="Toggle theme"><Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={18} /></button>
            <button onClick={onNotifs} className="relative text-dim hover:text-cyan p-2 transition-colors" aria-label={`Notifications, ${unread} unread`}>
              <Icon name="Bell" size={18} />
              {unread > 0 && <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose text-[#1A0509] mono text-[9px] font-bold grid place-items-center">{unread}</span>}
            </button>

            <div className="relative">
              <button onClick={() => setMenuAt(menuOpen ? null : pathname)} className="flex items-center gap-2 pl-1 pr-2 h-10 rounded-xl border hair hover:border-cyan transition-colors" aria-expanded={menuOpen}>
                <Avatar user={me} size={28} />
                <span className="hidden xl:block text-[12.5px] font-medium max-w-[110px] truncate">{me?.name}</span>
                <Icon name="ChevronDown" size={13} className="text-faint" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuAt(null)} />
                  <div className="absolute right-0 top-12 card p-2 z-20 rise" style={{ width: 300 }}>
                    <div className="p-3 border-b hair">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold truncate">{me?.name}</p>
                        {state.auth?.verified && <Pill tone="lime" icon="BadgeCheck" className="ml-auto shrink-0">Verified</Pill>}
                      </div>
                      <p className="mono text-[10.5px] text-faint mt-0.5 truncate">{me?.email}</p>
                      <p className="mono text-[10px] text-faint mt-0.5 truncate">{state.auth?.phone}</p>
                      <p className="text-[11px] text-dim mt-1 truncate">{state.auth?.college}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Pill tone={meta.tone} icon={meta.icon}>{meta.label}</Pill>
                        <Pill tone="faint" icon="Building2">{me?.dept}</Pill>
                      </div>
                    </div>

                    <div className="p-3 border-b hair">
                      <p className="mono text-[9.5px] tracking-[.16em] text-faint mb-2">SESSION SCOPE</p>
                      <div className="space-y-1.5 text-[12px]">
                        <div className="flex justify-between gap-2"><span className="text-dim">Reachable areas</span><span className="mono text-fg tb">{navFor(role).length}</span></div>
                        <div className="flex justify-between gap-2"><span className="text-dim">{role === 'faculty' ? 'Assigned to you' : role === 'admin' ? 'Institution records' : 'Your records'}</span>
                          <span className="mono text-fg tb">{role === 'faculty' ? assignedCount : role === 'admin' ? state.projects.length : myCount}</span></div>
                        <div className="flex justify-between gap-2"><span className="text-dim">Age on record</span><span className="mono text-fg tb">{state.auth?.age ?? '—'}</span></div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button onClick={() => { setMenuAt(null); router.push('/saved?tab=profile'); }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-raised text-[12.5px] text-dim hover:text-fg">
                        <Icon name="User" size={15} />My profile
                      </button>
                      <button onClick={() => { setMenuAt(null); router.push(meta.home); }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-raised text-[12.5px] text-dim hover:text-fg">
                        <Icon name={meta.icon} size={15} />My workspace
                      </button>
                      <button onClick={() => { dispatch({ type: 'LOGOUT' }); setMenuAt(null); router.push('/'); }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-raised text-[12.5px] text-rose">
                        <Icon name="LogOut" size={15} />Sign out & lock archive
                      </button>
                    </div>
                    <p className="text-[10.5px] text-faint px-3 pt-2 pb-1 leading-relaxed">
                      Changing role requires a fresh identity and phone verification.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className={cn('h-px gl transition-opacity duration-300', scrolled ? 'opacity-70' : 'opacity-0')} />
      </header>

      {mobOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--scrim)' }} onClick={() => setMobAt(null)} />
          <nav className="absolute left-0 top-0 bottom-0 w-72 card rounded-none border-y-0 border-l-0 p-4 rise overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-bold text-lg">Tech<span className="gt">Loop</span></span>
              <button onClick={() => setMobAt(null)} className="text-faint p-1" aria-label="Close menu"><Icon name="X" size={18} /></button>
            </div>
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl border hair bg-ink/40 mb-4">
              <Avatar user={me} size={32} />
              <div className="min-w-0">
                <p className="text-[12.5px] font-medium truncate">{me?.name}</p>
                <p className="mono text-[10px] text-faint">{meta.label} · {me?.dept}</p>
              </div>
            </div>
            {links.map((r) => (
              <Link key={r.path} href={r.path} onClick={() => setMobAt(null)}
                className={cn('flex items-center gap-3 px-3 h-11 rounded-xl text-[14px] mb-1 transition-colors', active(r.path) ? 'bg-raised text-fg border hair' : 'text-dim hover:text-fg')}>
                <Icon name={r.icon} size={16} />{r.label}
              </Link>
            ))}
            {role === 'student' && <Btn className="w-full mt-3" icon="Plus" onClick={() => { setMobAt(null); router.push('/create'); }}>New project</Btn>}
            <button onClick={() => { dispatch({ type: 'LOGOUT' }); setMobAt(null); router.push('/'); }}
              className="w-full flex items-center gap-3 px-3 h-11 rounded-xl text-[14px] mt-2 text-rose hover:bg-raised">
              <Icon name="LogOut" size={16} />Sign out
            </button>
          </nav>
        </div>
      )}
    </>
  );
}

function Footer() {
  const { me } = useStore();
  const role = me?.role;
  const links = navFor(role);
  const extra = role === 'student' ? [['Create project', '/create'], ['Your profile', '/saved?tab=profile']]
    : role === 'faculty' ? [['Exploration mode', '/explore'], ['Your profile', '/saved?tab=profile']]
      : [['Assignments', '/admin'], ['Your profile', '/saved?tab=profile']];
  return (
    <footer className="border-t hair mt-20 relative z-10">
      <div className="shell py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3"><Icon name="Network" size={18} className="text-cyan" /><span className="font-display font-bold">Tech<span className="gt">Loop</span></span></div>
          <p className="text-[12.5px] text-dim leading-relaxed max-w-xs">Seniors create knowledge → faculty validates it → TechLoop preserves it → juniors discover and reuse it.</p>
          <Pill tone={metaFor(role).tone} icon={metaFor(role).icon} className="mt-3">{metaFor(role).scope}</Pill>
        </div>
        <div>
          <p className="mono text-[10px] tracking-[.18em] text-faint mb-3">YOUR WORKSPACE</p>
          <ul className="space-y-2">{links.map((r) => <li key={r.path}><Link href={r.path} className="text-[12.5px] text-dim hover:text-cyan transition-colors">{r.label}</Link></li>)}</ul>
        </div>
        <div>
          <p className="mono text-[10px] tracking-[.18em] text-faint mb-3">QUICK ACTIONS</p>
          <ul className="space-y-2">{extra.map(([l, p]) => <li key={l}><Link href={p} className="text-[12.5px] text-dim hover:text-cyan transition-colors">{l}</Link></li>)}</ul>
        </div>
        <div>
          <p className="mono text-[10px] tracking-[.18em] text-faint mb-3">ACCESS CONTROL</p>
          <p className="text-[12.5px] text-dim leading-relaxed">
            Navigation, search and the command palette are all filtered to your verified role. Areas outside it are unreachable by URL as well.
          </p>
        </div>
      </div>
      <div className="border-t hair">
        <div className="shell py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="mono text-[10.5px] text-faint">Django · DRF · PostgreSQL + pgvector · Gemini · Supabase Storage</p>
          <p className="mono text-[10.5px] text-faint">Institutional knowledge, preserved between batches.</p>
        </div>
      </div>
    </footer>
  );
}

function CommandPalette({ onClose }) {
  const { state, me } = useStore();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const role = me?.role;
  const meta = metaFor(role);

  const { pages, records } = useMemo(() => {
    const visible = state.projects.filter((p) => canSeeProject(state, p));
    return paletteFor(role, visible);
  }, [role, state]);

  const items = useMemo(() => {
    const all = [...pages, ...records];
    if (!q.trim()) return [...pages, ...records.slice(0, 4)];
    const ql = q.toLowerCase();
    return all.filter((x) => (x.t + ' ' + x.s).toLowerCase().includes(ql)).slice(0, 12);
  }, [q, pages, records]);

  const go = useCallback((to) => { onClose(); router.push(to); }, [onClose, router]);

  useEffect(() => {
    const k = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setI((v) => Math.min(v + 1, items.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setI((v) => Math.max(v - 1, 0)); return; }
      if (e.key === 'Enter' && items[i]) { e.preventDefault(); go(items[i].go); }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [items, i, onClose, go]);

  let lastKind = null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4">
      <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--scrim)' }} onClick={onClose} />
      <div className="relative w-full max-w-xl card overflow-hidden rise" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="flex items-center gap-3 px-4 border-b hair">
          <Icon name="Search" size={17} className="text-cyan" />
          <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setI(0); }} placeholder="Jump to a page or project…" className="flex-1 h-14 bg-transparent outline-none text-[15px]" />
          <Pill tone={meta.tone} icon={meta.icon} className="hidden sm:inline-flex shrink-0">{meta.label}</Pill>
          <kbd className="mono text-[10px] text-faint border hair rounded px-1.5 py-0.5 shrink-0">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {!items.length && <p className="text-[13px] text-dim p-6 text-center">Nothing in your {meta.label.toLowerCase()} scope matches that.</p>}
          {items.map((x, n) => {
            const header = x.kind !== lastKind ? (x.kind === 'page' ? 'YOUR WORKSPACE' : 'ARCHIVE RECORDS') : null;
            lastKind = x.kind;
            return (
              <div key={x.go + x.t}>
                {header && <p className="mono text-[9.5px] tracking-[.18em] text-faint px-2.5 pt-2.5 pb-1.5">{header}</p>}
                <button onMouseEnter={() => setI(n)} onClick={() => go(x.go)}
                  className={cn('w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors border', n === i ? 'bg-raised hair' : 'border-transparent')}>
                  <span className={cn('w-8 h-8 rounded-lg grid place-items-center border hair shrink-0', n === i ? 'text-cyan' : 'text-faint')}><Icon name={x.icon} size={15} /></span>
                  <span className="min-w-0 flex-1"><span className="text-[13.5px] block truncate">{x.t}</span><span className="text-[11px] text-faint block truncate">{x.s}</span></span>
                  {n === i && <Icon name="ArrowRight" size={14} className="text-cyan" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="border-t hair px-4 py-2.5 flex items-center gap-4 mono text-[10px] text-faint flex-wrap">
          <span>↑ ↓ navigate</span><span>↵ open</span><span>esc close</span>
          <span className="ml-auto">{meta.scope} · {pages.length} areas · {records.length} records</span>
        </div>
      </div>
    </div>
  );
}

function NotificationDrawer({ open, onClose }) {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const mine = state.notifications.filter((n) => n.userId === state.session);
  const IC = { feedback: 'MessageSquare', approved: 'CheckCircle2', assigned: 'ShieldCheck', discussion: 'MessageSquare', pending: 'Clock', resubmit: 'RotateCcw' };
  const TN = { feedback: 'sky', approved: 'lime', assigned: 'violet', discussion: 'cyan', pending: 'amber', resubmit: 'amber' };
  return (
    <Drawer open={open} onClose={onClose} title="Notifications" sub={`${mine.filter((n) => !n.read).length} unread`} width="max-w-md"
      footer={<><Btn variant="s" size="sm" icon="Check" onClick={() => dispatch({ type: 'NOTIF_ALL' })}>Mark all read</Btn><Btn variant="g" size="sm" onClick={onClose}>Close</Btn></>}>
      {!mine.length ? <Empty icon="Bell" title="Nothing yet" msg="Submission, feedback and discussion events will appear here." /> : (
        <div className="space-y-2">
          {mine.map((n) => (
            <button key={n.id} onClick={() => { dispatch({ type: 'NOTIF_READ', id: n.id }); onClose(); if (n.projectId) router.push('/project/' + n.projectId); }}
              className={cn('w-full text-left p-3.5 rounded-xl border transition-colors hover:border-cyan', n.read ? 'hair' : 'bg-raised')}
              style={!n.read ? { borderColor: 'color-mix(in srgb,var(--cyan) 35%,var(--line))' } : null}>
              <div className="flex gap-3">
                <span className="mt-0.5 shrink-0" style={{ color: `var(--${TN[n.kind] || 'cyan'})` }}><Icon name={IC[n.kind] || 'Info'} size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                  <p className="text-[12px] text-dim mt-1 c2">{n.body}</p>
                  <p className="mono text-[10px] text-faint mt-1.5">{rel(n.createdAt)}</p>
                </div>
                {!n.read && <span className="w-2 h-2 rounded-full bg-cyan shrink-0 mt-1.5" />}
              </div>
            </button>
          ))}
        </div>
      )}
    </Drawer>
  );
}

function Shell({ children }) {
  const { state, me } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [palette, setPalette] = useState(false);
  const [notifs, setNotifs] = useState(false);

  useEffect(() => {
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p); } };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, []);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [pathname]);

  const verified = !!state.auth?.verified && !!me;
  if (!verified) return <><AuthGate /><Toasts /></>;

  const role = me.role;
  const allowed = canAccess(role, pathname);
  const info = allowed ? null : deniedReason(role, pathname);

  return (
    <div className="min-h-screen flex flex-col relative">
      <Navbar onPalette={() => setPalette(true)} onNotifs={() => setNotifs(true)} />
      <main className="flex-1 pt-16">
        {allowed ? (
          <ErrorBoundary key={pathname} role={role}>{children}</ErrorBoundary>
        ) : (
          <WrongRole need={info?.need} area={info?.area} role={role} home={homeFor(role)} />
        )}
      </main>
      <Footer />
      {palette && <CommandPalette onClose={() => setPalette(false)} />}
      <NotificationDrawer open={notifs} onClose={() => setNotifs(false)} />
      <Toasts />
    </div>
  );
}

export default function Providers({ children }) {
  const mounted = useMounted();
  return (
    <StoreProvider>
      <div className="aur" aria-hidden="true"><i /><i /><i /></div>
      <div className="grain" aria-hidden="true" />
      {mounted ? <Shell>{children}</Shell> : (
        <div className="boot">
          <div style={{ textAlign: 'center' }}>
            <div className="r" />
            <div className="mono" style={{ color: 'var(--faint)', fontSize: 11, letterSpacing: '.22em' }}>TECHLOOP // UNLOCKING VAULT</div>
          </div>
        </div>
      )}
    </StoreProvider>
  );
}