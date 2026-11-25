'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Btn, Card, Pill, Toggle, Slider, Select, Input, Drawer, Empty, StatusPill, Modal, Field, ProjectCard } from '../../lib/ui';
import { useStore, visibleTo, userById } from '../../lib/store';
import { score } from '../../lib/ai';
import { DOMAINS, TECHS, DEPTS, YEARS, PTYPES, DOMAIN_TONE, cn, toCSV, download } from '../../lib/data';

const A = (v) => (Array.isArray(v) ? v : []);
const PREF_KEY = 'techloop.explore.prefs';
const DEFAULT_PREFS = { layout: 'grid', density: 1, colMin: 300, weight: 70, group: 'none', sort: 'relevance', showFilters: true };
const SORTS = [['relevance', 'Relevance'], ['newest', 'Newest first'], ['oldest', 'Oldest first'], ['views', 'Most viewed'], ['title', 'Title A–Z']];
const GROUPS = [['none', 'No grouping'], ['domain', 'Domain'], ['dept', 'Department'], ['academicYear', 'Batch year'], ['faculty', 'Faculty']];

const readPrefs = () => {
  try {
    const s = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
    return s && typeof s === 'object' ? { ...DEFAULT_PREFS, ...s } : { ...DEFAULT_PREFS };
  } catch { return { ...DEFAULT_PREFS }; }
};

function Facet({ title, options, selected, onToggle }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b hair pb-3 mb-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between text-[12px] font-semibold text-fg mb-2">
        {title}<Icon name={open ? 'ChevronUp' : 'ChevronDown'} size={14} className="text-faint" />
      </button>
      {open && (
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-[12.5px] text-dim hover:text-fg cursor-pointer">
              <input type="checkbox" checked={selected.includes(o)} onChange={() => onToggle(o)} />
              <span className="truncate">{o}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Explore({ query }) {
  const { state, dispatch, me } = useStore();
  const router = useRouter();
  const q0 = query?.q || '';
  const semParam = query?.sem ?? query?.semantic;

  const [f, setF] = useState(() => ({
    domain: query?.domain ? [query.domain] : [],
    tech: query?.tech ? [query.tech] : [],
    year: [], dept: query?.dept ? [query.dept] : [], type: [], faculty: [],
    q: q0,
    sem: semParam != null ? semParam === '1' || semParam === 'true' : true,
  }));
  const [prefs, setPrefs] = useState(readPrefs);
  const [sel, setSel] = useState([]);
  const [quick, setQuick] = useState(null);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs]);

  const setPref = (k, v) => setPrefs((p) => ({ ...p, [k]: v }));
  const toggle = (k, v) => setF((x) => ({ ...x, [k]: x[k].includes(v) ? x[k].filter((y) => y !== v) : [...x[k], v] }));
  const clearFilters = () => setF({ domain: [], tech: [], year: [], dept: [], type: [], faculty: [], q: '', sem: f.sem });

  const pool = useMemo(() => visibleTo(state), [state]);

  const results = useMemo(() => {
    const term = f.q.trim();
    let r = pool.map((p) => ({ p, s: term ? Math.round(score(p, term, f.sem ? prefs.weight / 100 : 0) * 100) : null }));
    if (term && f.sem) r = r.filter((x) => x.s > 8);
    if (term && !f.sem) {
      const ql = term.toLowerCase();
      r = r.filter((x) => (x.p.title + ' ' + x.p.short + ' ' + A(x.p.tech).join(' ') + ' ' + A(x.p.domain).join(' ')).toLowerCase().includes(ql));
    }
    ['domain', 'tech'].forEach((k) => { if (f[k].length) r = r.filter((x) => f[k].some((v) => A(x.p[k]).includes(v))); });
    ['year', 'dept', 'type'].forEach((k) => { if (f[k].length) r = r.filter((x) => f[k].includes(x.p[k])); });
    if (f.faculty.length) r = r.filter((x) => f.faculty.includes(x.p.facultyId));
    const cmp = {
      relevance: (a, b) => (b.s ?? b.p.views) - (a.s ?? a.p.views),
      newest: (a, b) => new Date(b.p.createdAt) - new Date(a.p.createdAt),
      oldest: (a, b) => new Date(a.p.createdAt) - new Date(b.p.createdAt),
      views: (a, b) => b.p.views - a.p.views,
      title: (a, b) => a.p.title.localeCompare(b.p.title),
    }[prefs.sort] || ((a, b) => (b.s ?? 0) - (a.s ?? 0));
    return [...r].sort(cmp);
  }, [pool, f, prefs.sort, prefs.weight]);

  const grouped = useMemo(() => {
    if (prefs.group === 'none') return [['All matching projects', results]];
    const keyOf = prefs.group === 'faculty'
      ? (x) => (x.p.facultyId ? userById(state, x.p.facultyId).name : 'Unassigned')
      : prefs.group === 'domain'
        ? (x) => A(x.p.domain)[0] || 'Uncategorised'
        : (x) => x.p[prefs.group];
    const m = new Map();
    results.forEach((x) => { const k = keyOf(x) || '—'; if (!m.has(k)) m.set(k, []); m.get(k).push(x); });
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [results, prefs.group, state]);

  const activeCount = ['domain', 'tech', 'year', 'dept', 'type', 'faculty'].reduce((s, k) => s + f[k].length, 0) + (f.q.trim() ? 1 : 0);
  const allSelected = results.length > 0 && sel.length === results.length;
  const ownSelected = sel.length > 0 && sel.every((id) => state.projects.find((p) => p.id === id)?.ownerId === me?.id);
  const pick = (id) => setSel((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));

  const exportCSV = () => {
    const rows = [['Title', 'Owner', 'Department', 'Batch', 'Domain', 'Technologies', 'Status', 'Faculty', 'Views', 'Match %']];
    const source = sel.length ? results.filter((x) => sel.includes(x.p.id)) : results;
    source.forEach(({ p, s }) => rows.push([
      p.title, userById(state, p.ownerId).name, p.dept, p.academicYear,
      A(p.domain).join(' | '), A(p.tech).join(' | '), p.status,
      p.facultyId ? userById(state, p.facultyId).name : 'Unassigned', p.views, s ?? '',
    ]));
    download('techloop-archive.csv', toCSV(rows), 'text/csv');
    dispatch({ type: 'TOAST', toast: { kind: 'ok', title: 'Export ready', msg: `${rows.length - 1} projects written to CSV.` } });
  };

  const resetAll = () => { clearFilters(); setPrefs({ ...DEFAULT_PREFS }); setSel([]); };

  const FilterBody = (
    <>
      <Facet title="Domain" options={DOMAINS} selected={f.domain} onToggle={(v) => toggle('domain', v)} />
      <Facet title="Technology" options={TECHS} selected={f.tech} onToggle={(v) => toggle('tech', v)} />
      <Facet title="Year of study" options={YEARS} selected={f.year} onToggle={(v) => toggle('year', v)} />
      <Facet title="Department" options={DEPTS} selected={f.dept} onToggle={(v) => toggle('dept', v)} />
      <Facet title="Project type" options={PTYPES} selected={f.type} onToggle={(v) => toggle('type', v)} />
      <div className="pb-1">
        <p className="text-[12px] font-semibold mb-2">Faculty</p>
        <Select value={f.faculty[0] || ''} onChange={(e) => setF((x) => ({ ...x, faculty: e.target.value ? [e.target.value] : [] }))}>
          <option value="">Any faculty</option>
          {state.users.filter((u) => u.role === 'faculty').map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>
      </div>
    </>
  );

  return (
    <div className="shell py-8 relative z-10">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div className="min-w-0">
          <p className="mono text-[10px] tracking-[.2em] text-cyan">PROJECT ARCHIVE</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Explore the knowledge base</h1>
          <p className="text-[13px] text-dim mt-1.5">Search by meaning, not just by title. {pool.length} projects visible to your role.</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="o" size="sm" icon="Download" onClick={exportCSV}>Export CSV</Btn>
          {me?.role === 'student' && <Btn size="sm" icon="Plus" onClick={() => router.push('/create')}>New project</Btn>}
        </div>
      </div>

      <div className="relative mb-4">
        <Icon name="Search" size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan" />
        <input
          value={f.q}
          onChange={(e) => setF((x) => ({ ...x, q: e.target.value }))}
          placeholder="Try: automatically records students entering a classroom"
          aria-label="Search the archive"
          className="inp h-14 pl-12 pr-32 text-[14.5px]"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {f.q && <button onClick={() => setF((x) => ({ ...x, q: '' }))} className="text-faint hover:text-fg p-1" aria-label="Clear search"><Icon name="X" size={16} /></button>}
          <Pill tone={f.sem ? 'magenta' : 'faint'} icon={f.sem ? 'Sparkles' : 'Type'}>{f.sem ? 'Semantic' : 'Keyword'}</Pill>
        </div>
      </div>

      <Card className="p-4 mb-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="mono text-[10px] tracking-[.18em] text-faint">VIEW CONTROLS</span>
          <span className="flex-1" />
          <Btn size="xs" variant="g" icon="RotateCcw" onClick={resetAll}>Reset all</Btn>
          <Btn size="xs" variant="s" icon="Bookmark" onClick={() => setSaveOpen(true)}>Save view</Btn>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
          <div>
            <p className="text-[11px] text-dim mb-1.5">Layout</p>
            <div className="flex gap-1 p-1 rounded-lg border hair bg-ink/50">
              {[['grid', 'LayoutGrid'], ['list', 'List'], ['table', 'Table']].map(([k, ic]) => (
                <button key={k} onClick={() => setPref('layout', k)} aria-label={k}
                  className={cn('flex-1 h-8 rounded-md grid place-items-center transition-colors', prefs.layout === k ? 'bg-raised text-cyan border hair' : 'text-faint hover:text-fg')}>
                  <Icon name={ic} size={15} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] text-dim mb-1.5">Sort by</p>
            <Select value={prefs.sort} onChange={(e) => setPref('sort', e.target.value)} className="h-9 py-0">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          <div>
            <p className="text-[11px] text-dim mb-1.5">Group by</p>
            <Select value={prefs.group} onChange={(e) => setPref('group', e.target.value)} className="h-9 py-0">
              {GROUPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
          </div>
          <div className="flex flex-col justify-center">
            <Toggle checked={f.sem} onChange={(v) => setF((x) => ({ ...x, sem: v }))} label="Semantic search" hint="Concept expansion + similarity" />
          </div>
          <Slider label="Card density" value={prefs.density} min={0} max={2} onChange={(v) => setPref('density', v)} />
          <Slider label="Column width" value={prefs.colMin} min={230} max={460} step={10} onChange={(v) => setPref('colMin', v)} suffix="px" />
          <Slider label="Semantic weight" value={prefs.weight} min={0} max={100} step={5} onChange={(v) => setPref('weight', v)} suffix="%" />
          <div className="flex flex-col justify-center">
            <Toggle checked={prefs.showFilters} onChange={(v) => setPref('showFilters', v)} label="Filter sidebar" hint={`${activeCount} active filters`} />
          </div>
        </div>

        {A(state.savedViews).length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-3 border-t hair flex-wrap">
            <span className="mono text-[10px] text-faint tracking-[.14em]">SAVED VIEWS</span>
            {state.savedViews.map((v) => (
              <span key={v.id} className="inline-flex items-center gap-1 rounded-full border hair bg-ink/50 pl-2.5 pr-1 py-1">
                <button
                  onClick={() => {
                    setF({ domain: [], tech: [], year: [], dept: [], type: [], faculty: [], q: '', sem: true, ...(v.filters || {}) });
                    dispatch({ type: 'TOAST', toast: { kind: 'info', title: 'View applied', msg: v.name } });
                  }}
                  className="text-[11.5px] text-dim hover:text-cyan"
                >{v.name}</button>
                <button onClick={() => dispatch({ type: 'VIEW_DEL', id: v.id })} className="text-faint hover:text-rose p-0.5" aria-label="Delete view"><Icon name="X" size={12} /></button>
              </span>
            ))}
          </div>
        )}
      </Card>

      <div className={cn('grid gap-6', prefs.showFilters ? 'lg:grid-cols-[240px_1fr]' : 'grid-cols-1')}>
        {prefs.showFilters && (
          <aside className="hidden lg:block">
            <div className="card p-4 sticky top-24">
              <div className="flex items-center justify-between mb-3">
                <p className="font-display font-semibold text-[14px] flex items-center gap-2"><Icon name="Filter" size={15} className="text-cyan" />Filters</p>
                {activeCount > 0 && <button onClick={clearFilters} className="text-[11px] text-rose hover:underline">Clear</button>}
              </div>
              {FilterBody}
            </div>
          </aside>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <label className="flex items-center gap-2 text-[12.5px] text-dim cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={() => setSel(allSelected ? [] : results.map((x) => x.p.id))} />Select all
            </label>
            <span className="mono text-[11.5px] text-faint tb">{results.length} result{results.length === 1 ? '' : 's'}</span>
            <Btn size="xs" variant="s" icon="Filter" className="lg:hidden" onClick={() => setMobileFilters(true)}>
              Filters{activeCount ? ` (${activeCount})` : ''}
            </Btn>
            {sel.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap ml-auto">
                <Pill tone="cyan" icon="CheckCheck">{sel.length} selected</Pill>
                <Btn size="xs" variant="s" icon="Bookmark" onClick={() => { dispatch({ type: 'BULK_SAVE', ids: sel }); setSel([]); }}>Save</Btn>
                <Btn size="xs" variant="s" icon="Download" onClick={exportCSV}>Export</Btn>
                <Btn size="xs" variant="d" icon="Trash2" disabled={!ownSelected}
                  title={ownSelected ? 'Delete selected' : 'You can only delete projects you own'}
                  onClick={() => setConfirmDel(true)}>Delete</Btn>
                <Btn size="xs" variant="g" icon="X" onClick={() => setSel([])}>Clear</Btn>
              </div>
            )}
          </div>

          {!results.length ? (
            <Empty icon="SearchX" title="No projects match"
              msg="Loosen a filter, switch off semantic mode, or describe the problem instead of the technology."
              action={<Btn variant="o" icon="RotateCcw" onClick={clearFilters}>Reset filters</Btn>} />
          ) : (
            grouped.map(([label, rows]) => (
              <div key={label} className="mb-8">
                {prefs.group !== 'none' && (
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="font-display font-semibold text-[15px]">{label}</h3>
                    <span className="mono text-[10.5px] text-faint">{rows.length}</span>
                    <span className="flex-1 h-px bg-line" />
                  </div>
                )}

                {prefs.layout === 'table' ? (
                  <div className="card overflow-x-auto">
                    <table className="w-full text-[12.5px] min-w-[720px]">
                      <thead>
                        <tr className="border-b hair text-left">
                          <th className="p-3 w-8"></th>
                          <th className="p-3 font-semibold">Project</th>
                          <th className="p-3 font-semibold">Dept</th>
                          <th className="p-3 font-semibold">Batch</th>
                          <th className="p-3 font-semibold">Domain</th>
                          <th className="p-3 font-semibold">Status</th>
                          <th className="p-3 font-semibold text-right">Views</th>
                          {f.q.trim() && <th className="p-3 font-semibold text-right">Match</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(({ p, s }) => (
                          <tr key={p.id} className="border-b hair last:border-0 hover:bg-raised cursor-pointer" onClick={() => setQuick(p)}>
                            <td className="p-3" onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={sel.includes(p.id)} onChange={() => pick(p.id)} aria-label="Select row" />
                            </td>
                            <td className="p-3 font-medium max-w-[260px] truncate">{p.title}</td>
                            <td className="p-3 text-dim">{p.dept}</td>
                            <td className="p-3 text-dim mono">{p.academicYear}</td>
                            <td className="p-3"><Pill tone={DOMAIN_TONE[A(p.domain)[0]] || 'cyan'}>{A(p.domain)[0] || '—'}</Pill></td>
                            <td className="p-3"><StatusPill status={p.status} /></td>
                            <td className="p-3 text-right mono tb text-dim">{p.views}</td>
                            {f.q.trim() && <td className="p-3 text-right mono tb text-magenta">{s ?? 0}%</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : prefs.layout === 'list' ? (
                  <div className="space-y-2.5">
                    {rows.map(({ p, s }) => (
                      <ProjectCard key={p.id} p={p} layout="list" matchScore={f.q.trim() ? s : null}
                        selected={sel.includes(p.id)} onSelect={pick} onQuick={setQuick} />
                    ))}
                  </div>
                ) : (
                  <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill,minmax(${Math.min(prefs.colMin, 320)}px,1fr))` }}>
                    {rows.map(({ p, s }) => (
                      <ProjectCard key={p.id} p={p} density={prefs.density} matchScore={f.q.trim() ? s : null}
                        selected={sel.includes(p.id)} onSelect={pick} onQuick={setQuick} />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Drawer open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filters" sub={`${activeCount} active`} width="max-w-sm"
        footer={<><Btn variant="s" size="sm" onClick={clearFilters}>Clear all</Btn><Btn size="sm" onClick={() => setMobileFilters(false)}>Show {results.length} results</Btn></>}>
        {FilterBody}
      </Drawer>

      <Drawer open={!!quick} onClose={() => setQuick(null)} title={quick?.title}
        sub={quick ? `${userById(state, quick.ownerId).name} · ${quick.dept} · Batch ${quick.academicYear}` : ''}
        footer={quick && (
          <>
            <Btn icon="ArrowUpRight" onClick={() => { const id = quick.id; setQuick(null); router.push('/project/' + id); }}>Open full project</Btn>
            <Btn variant="s" icon="Bookmark" onClick={() => dispatch({ type: 'SAVE_TOGGLE', id: quick.id })}>
              {A(quick.savedBy).includes(state.session) ? 'Unsave' : 'Save'}
            </Btn>
          </>
        )}>
        {quick && (
          <div className="space-y-5">
            <div className="flex gap-2 flex-wrap">
              <StatusPill status={quick.status} />
              {A(quick.domain).map((d) => <Pill key={d} tone={DOMAIN_TONE[d] || 'cyan'}>{d}</Pill>)}
            </div>
            <p className="text-[13.5px] text-dim leading-relaxed">{quick.short}</p>
            {[['Problem', quick.problem], ['Solution', quick.solution], ['Main challenge', quick.challenge], ['What did not work', quick.didntWork], ['Key learning', quick.learnings]]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <p className="mono text-[10px] tracking-[.16em] text-cyan mb-1.5">{k.toUpperCase()}</p>
                  <p className="text-[13px] leading-relaxed">{v}</p>
                </div>
              ))}
            <div>
              <p className="mono text-[10px] tracking-[.16em] text-faint mb-2">TECHNOLOGY</p>
              <div className="flex flex-wrap gap-1">{A(quick.tech).map((t) => <span key={t} className="tag">{t}</span>)}</div>
            </div>
          </div>
        )}
      </Drawer>

      <Modal open={saveOpen} onClose={() => setSaveOpen(false)} title="Save this view" sub="Filters, search mode and query are stored together."
        footer={<>
          <Btn variant="g" onClick={() => setSaveOpen(false)}>Cancel</Btn>
          <Btn icon="Bookmark" disabled={!viewName.trim()}
            onClick={() => { dispatch({ type: 'VIEW_ADD', name: viewName.trim(), filters: f }); setViewName(''); setSaveOpen(false); }}>Save view</Btn>
        </>}>
        <Field label="View name" required>
          <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="e.g. Final-year IoT with hardware failures" />
        </Field>
        <p className="text-[12px] text-dim mt-3">{activeCount} filters · {f.sem ? 'semantic' : 'keyword'} mode{f.q ? ` · ${f.q}` : ''}</p>
      </Modal>

      <Modal open={confirmDel} onClose={() => setConfirmDel(false)}
        title={`Delete ${sel.length} project${sel.length > 1 ? 's' : ''}?`} sub="Undo is available from the toast for 9 seconds."
        footer={<>
          <Btn variant="g" onClick={() => setConfirmDel(false)}>Cancel</Btn>
          <Btn variant="d" icon="Trash2" onClick={() => { dispatch({ type: 'PROJECT_DELETE', ids: sel }); setSel([]); setConfirmDel(false); }}>Delete</Btn>
        </>}>
        <p className="text-[13.5px] text-dim leading-relaxed">Only projects you own can be deleted. Their feedback history and faculty assignments are removed with them.</p>
      </Modal>
    </div>
  );
}