'use client';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Pill } from './ui';
import { useStore, visibleTo } from './store';
import { score } from './ai';
import { cn, DOMAIN_TONE } from './data';

export function SearchBox({ big = false, onPalette, placeholder }) {
  const { state } = useStore();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const blurTimer = useRef(null);

  const hits = useMemo(() => {
    const term = q.trim();
    if (term.length < 2) return [];
    return visibleTo(state)
      .map((p) => ({ p, s: Math.round(score(p, term, 0.72) * 100) }))
      .filter((x) => x.s > 10)
      .sort((a, b) => b.s - a.s)
      .slice(0, 6);
  }, [q, state]);

  const runSearch = (term) => {
    const t = (term ?? q).trim();
    setOpen(false);
    router.push(t ? '/explore?sem=1&q=' + encodeURIComponent(t) : '/explore');
  };
  const openProject = (id) => { setOpen(false); router.push('/project/' + id); };

  const onKey = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (!open || !hits.length) {
      if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
      return;
    }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((v) => Math.min(v + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((v) => Math.max(v - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); hi > 0 ? openProject(hits[hi - 1].p.id) : runSearch(); }
  };

  const showList = open && q.trim().length >= 2;

  return (
    <div className={cn('relative', big ? 'w-full' : 'hidden md:block flex-1 max-w-sm ml-auto')}>
      <form
        onSubmit={(e) => { e.preventDefault(); runSearch(); }}
        className={cn('relative flex items-center overflow-hidden', big ? 'card' : '')}
        style={big ? { boxShadow: '0 0 0 1px color-mix(in srgb,var(--cyan) 35%,transparent),0 0 22px -6px var(--g1)' } : null}
        role="search"
      >
        <Icon name="Search" size={big ? 19 : 15} className={cn('absolute text-cyan', big ? 'left-4' : 'left-3 top-1/2 -translate-y-1/2')} />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
          onFocus={() => setOpen(true)}
          onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 140); }}
          onKeyDown={onKey}
          aria-label="Search projects, technologies and problems"
          placeholder={placeholder || (big ? 'Search projects, technologies, problems…' : 'Search the archive…')}
          className={cn(
            'outline-none min-w-0',
            big
              ? 'flex-1 h-14 pl-12 pr-3 bg-transparent text-[14.5px]'
              : 'inp h-9 py-0 pl-9 pr-16 rounded-lg text-[13px]'
          )}
        />
        {big ? (
          <button type="submit" className="btn btn-p btn-sm m-1.5 shrink-0">
            <Icon name="Sparkles" size={15} />Semantic
          </button>
        ) : onPalette ? (
          <button
            type="button"
            onClick={onPalette}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 mono text-[10px] text-faint border hair rounded px-1.5 py-0.5 hover:text-cyan hover:border-cyan transition-colors"
          >
            Ctrl K
          </button>
        ) : null}
      </form>

      {showList && (
        <>
          <div className="fixed inset-0 z-45" onMouseDown={() => setOpen(false)} />
          <div className={cn('absolute z-46 card overflow-hidden rise', big ? 'left-0 right-0 top-[calc(100%+8px)]' : 'left-0 right-0 top-11')}>
            <div className="px-3.5 py-2 border-b hair flex items-center gap-2">
              <Icon name="Sparkles" size={12} className="text-magenta" />
              <span className="mono text-[10px] tracking-[.16em] text-faint">SEMANTIC MATCHES</span>
              <span className="ml-auto mono text-[10px] text-faint tb">{hits.length}</span>
            </div>

            <button
              onMouseDown={(e) => { e.preventDefault(); runSearch(); }}
              onMouseEnter={() => setHi(0)}
              className={cn('w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors border-b hair', hi === 0 ? 'bg-raised' : 'hover:bg-raised')}
            >
              <span className="w-7 h-7 rounded-lg grid place-items-center border hair text-cyan shrink-0"><Icon name="Search" size={13} /></span>
              <span className="min-w-0 flex-1">
                <span className="text-[13px] block truncate">Search the whole archive for “{q.trim()}”</span>
                <span className="text-[11px] text-faint">Ranked by conceptual similarity</span>
              </span>
              <Icon name="ArrowRight" size={13} className="text-cyan" />
            </button>

            {!hits.length && (
              <p className="px-3.5 py-4 text-[12.5px] text-dim">
                No close conceptual match yet. Press Enter to run a full archive search.
              </p>
            )}

            {hits.map((h, i) => (
              <button
                key={h.p.id}
                onMouseDown={(e) => { e.preventDefault(); openProject(h.p.id); }}
                onMouseEnter={() => setHi(i + 1)}
                className={cn('w-full flex items-center gap-3 px-3.5 py-2.5 text-left transition-colors', hi === i + 1 ? 'bg-raised' : 'hover:bg-raised')}
              >
                <span className="w-7 h-7 rounded-lg grid place-items-center border hair text-faint shrink-0"><Icon name="FolderGit2" size={13} /></span>
                <span className="min-w-0 flex-1">
                  <span className="text-[13px] block truncate">{h.p.title}</span>
                  <span className="mono text-[10px] text-faint block truncate">{h.p.dept} · {h.p.academicYear} · {h.p.tech.slice(0, 3).join(', ')}</span>
                </span>
                <Pill tone={DOMAIN_TONE[h.p.domain[0]] || 'cyan'} className="hidden sm:inline-flex">{h.s}%</Pill>
              </button>
            ))}

            <div className="px-3.5 py-2 border-t hair flex items-center gap-3 mono text-[10px] text-faint">
              <span>↑ ↓ browse</span><span>↵ open</span><span>esc close</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}