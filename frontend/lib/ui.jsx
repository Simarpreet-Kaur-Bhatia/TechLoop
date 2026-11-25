'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as L from 'lucide-react';
import { cn, clamp, initials, hueOf, fdate, TONE, STATUS, DOMAIN_TONE, HUES, CRITERIA } from './data';
import { similarity } from './ai';
import { useStore, userById } from './store';

export function Icon({ name, size = 18, className = '', ...r }) {
  const C = L[name] || L.Circle;
  return <C size={size} className={cn('shrink-0', className)} strokeWidth={1.7} {...r} />;
}
export function Btn({ variant = 'p', size = 'md', icon, iconRight, loading, children, className = '', ...rest }) {
  const v = { p:'btn-p', ai:'btn-ai', o:'btn-o', g:'btn-g', s:'btn-s', d:'btn-d', ok:'btn-ok' }[variant];
  const s = { xs:'btn-xs', sm:'btn-sm', md:'', lg:'btn-lg' }[size];
  return <button {...rest} disabled={rest.disabled || loading} className={cn('btn', v, s, className)}>
    {loading ? <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent spin" /> : icon && <Icon name={icon} size={size === 'xs' ? 13 : size === 'sm' ? 15 : 17} />}
    {children}{iconRight && <Icon name={iconRight} size={size === 'xs' ? 13 : 15} />}
  </button>;
}
export const Card = ({ className = '', children, ...r }) => <div {...r} className={cn('card', className)}>{children}</div>;
export function Pill({ tone = 'cyan', icon, children, className = '' }) {
  const c = TONE[tone] || TONE.cyan;
  return <span className={cn('pill', className)} style={{ color: c, borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, background: `color-mix(in srgb, ${c} 12%, transparent)` }}>
    {icon && <Icon name={icon} size={11} />}{children}</span>;
}
export const StatusPill = ({ status }) => { const s = STATUS[status] || STATUS.draft; return <Pill tone={s.tone} icon={s.icon}>{s.label}</Pill>; };
export function Avatar({ user, size = 34, ring }) {
  const h = hueOf(user?.name);
  return <div className={cn('grid place-items-center rounded-xl font-display font-semibold shrink-0', ring && 'ring-2 ring-cyan/50')}
    style={{ width: size, height: size, fontSize: size * 0.36, color: `hsl(${h} 85% 72%)`, background: `linear-gradient(140deg,hsl(${h} 60% 22%),hsl(${(h + 50) % 360} 55% 14%))`, border: `1px solid hsl(${h} 55% 34%)` }}>
    {initials(user?.name)}</div>;
}
export function Field({ label, hint, error, required, counter, children }) {
  return <label className="block">
    <div className="flex items-baseline justify-between gap-3 mb-1.5">
      <span className="lbl">{label}{required && <span className="text-rose ml-1">*</span>}</span>
      {counter && <span className="mono text-[10px] text-faint tb">{counter}</span>}
    </div>
    {children}
    {error ? <p className="text-[11px] text-rose mt-1.5 flex items-center gap-1"><Icon name="AlertTriangle" size={11} />{error}</p>
      : hint && <p className="text-[11px] text-faint mt-1.5">{hint}</p>}
  </label>;
}
export const Input = (p) => <input {...p} className={cn('inp', p.className)} />;
export const Textarea = (p) => <textarea {...p} className={cn('inp', p.className)} />;
export const Select = ({ children, ...p }) => <select {...p} className={cn('inp', p.className)}>{children}</select>;
export function Toggle({ checked, onChange, label, hint }) {
  return <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left w-full">
    <span className={cn('relative w-10 h-[22px] rounded-full transition-colors shrink-0 border', checked ? 'bg-cyan/20 border-cyan' : 'bg-ink border-line')}>
      <span className={cn('absolute top-[2px] w-4 h-4 rounded-full transition-all', checked ? 'left-[20px] bg-cyan' : 'left-[2px] bg-faint')} />
    </span>
    <span className="min-w-0"><span className="text-[13px] text-fg block">{label}</span>{hint && <span className="text-[11px] text-faint block">{hint}</span>}</span>
  </button>;
}
export function Slider({ label, value, min, max, step = 1, onChange, suffix = '' }) {
  return <div>
    <div className="flex justify-between items-baseline mb-1.5">
      <span className="text-[11px] text-dim tracking-wide">{label}</span>
      <span className="mono text-[11px] text-cyan tb">{value}{suffix}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </div>;
}
export const Meter = ({ value, tone = 'cyan', height = 6 }) => (
  <div className="w-full rounded-full bg-ink border hair overflow-hidden" style={{ height }}>
    <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${clamp(value, 0, 100)}%`, background: `linear-gradient(90deg,${TONE[tone]},color-mix(in srgb,${TONE[tone]} 45%,var(--lime)))` }} />
  </div>
);
function useLock(open, onClose) {
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [open, onClose]);
}
export function Modal({ open, onClose, title, sub, children, footer, wide }) {
  useLock(open, onClose);
  if (!open) return null;
  return <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true">
    <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--scrim)' }} onClick={onClose} />
    <div className={cn('relative card rounded-b-none sm:rounded-b-2xl w-full max-h-[92vh] flex flex-col rise', wide ? 'max-w-4xl' : 'max-w-lg')}>
      <div className="flex items-start justify-between gap-4 p-5 border-b hair">
        <div className="min-w-0"><h3 className="text-lg font-semibold">{title}</h3>{sub && <p className="text-[12px] text-dim mt-0.5">{sub}</p>}</div>
        <button onClick={onClose} className="text-faint hover:text-fg p-1" aria-label="Close"><Icon name="X" size={18} /></button>
      </div>
      <div className="p-5 overflow-y-auto">{children}</div>
      {footer && <div className="p-4 border-t hair flex justify-end gap-2 flex-wrap">{footer}</div>}
    </div>
  </div>;
}
export function Drawer({ open, onClose, title, sub, children, footer, width = 'max-w-xl' }) {
  useLock(open, onClose);
  if (!open) return null;
  return <div className="fixed inset-0 z-[65]" role="dialog" aria-modal="true">
    <div className="absolute inset-0 backdrop-blur-sm" style={{ background: 'var(--scrim)' }} onClick={onClose} />
    <aside className={cn('absolute right-0 top-0 bottom-0 w-full card rounded-none border-y-0 border-r-0 flex flex-col rise', width)}>
      <div className="flex items-start justify-between gap-4 p-5 border-b hair shrink-0">
        <div className="min-w-0"><h3 className="text-lg font-semibold leading-tight">{title}</h3>{sub && <p className="text-[12px] text-dim mt-1">{sub}</p>}</div>
        <button onClick={onClose} className="text-faint hover:text-fg p-1" aria-label="Close"><Icon name="X" size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-5">{children}</div>
      {footer && <div className="p-4 border-t hair shrink-0 flex gap-2 flex-wrap">{footer}</div>}
    </aside>
  </div>;
}
export function Toasts() {
  const { state, dispatch } = useStore();
  useEffect(() => {
    if (!state.toasts.length) return;
    const t = state.toasts.map((x) => setTimeout(() => dispatch({ type: 'TOAST_OFF', id: x.id }), x.undo ? 9000 : 4800));
    return () => t.forEach(clearTimeout);
  }, [state.toasts, dispatch]);
  const tone = { ok:'lime', warn:'amber', info:'sky', err:'rose' };
  const ic = { ok:'CheckCircle2', warn:'AlertTriangle', info:'Info', err:'AlertTriangle' };
  return <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-[90] flex flex-col gap-2 items-end pointer-events-none">
    {state.toasts.map((t) => {
      const c = TONE[tone[t.kind] || 'sky'];
      return <div key={t.id} className="card rounded-xl p-3.5 pr-4 flex items-start gap-3 w-full sm:w-[380px] pointer-events-auto rise"
        style={{ borderColor: `color-mix(in srgb,${c} 45%,var(--line))`, boxShadow: `0 0 32px -14px ${c}, var(--sh)` }}>
        <span style={{ color: c }} className="mt-0.5"><Icon name={ic[t.kind] || 'Info'} size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-tight">{t.title}</p>
          {t.msg && <p className="text-[12px] text-dim mt-0.5 c2">{t.msg}</p>}
          {t.undo && <button onClick={() => { dispatch({ type: 'UNDO' }); dispatch({ type: 'TOAST_OFF', id: t.id }); }}
            className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-lime hover:underline"><Icon name="Undo2" size={13} />Undo deletion</button>}
        </div>
        <button onClick={() => dispatch({ type: 'TOAST_OFF', id: t.id })} className="text-faint hover:text-fg" aria-label="Dismiss"><Icon name="X" size={14} /></button>
      </div>;
    })}
  </div>;
}
export const Empty = ({ icon = 'Archive', title, msg, action }) => (
  <div className="text-center py-14 px-6 border border-dashed hair rounded-2xl">
    <div className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-4 border hair text-cyan" style={{ background: 'color-mix(in srgb,var(--cyan) 8%,transparent)' }}><Icon name={icon} size={24} /></div>
    <p className="font-display text-base font-semibold">{title}</p>
    <p className="text-[13px] text-dim mt-1.5 max-w-sm mx-auto">{msg}</p>
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);
export const Tabs = ({ tabs, value, onChange, className = '' }) => (
  <div className={cn('flex gap-1 p-1 rounded-xl border hair bg-ink/50 overflow-x-auto nb', className)}>
    {tabs.map((t) => <button key={t.id} onClick={() => onChange(t.id)} className={cn('tab', value === t.id && 'tab-on')}>
      {t.icon && <Icon name={t.icon} size={14} />}{t.label}
      {t.count != null && <span className={cn('mono text-[10px] px-1.5 py-0.5 rounded tb', value === t.id ? 'bg-cyan/20 text-cyan' : 'bg-raised text-faint')}>{t.count}</span>}
    </button>)}
  </div>
);
export function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <div ref={ref} className={cn('rv', className)} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
export const Section = ({ id, title, sub, right, children, className = '' }) => (
  <section id={id} className={cn('smt', className)}>
    <div className="flex items-end justify-between gap-4 mb-4 flex-wrap">
      <div className="min-w-0"><h2 className="text-xl sm:text-2xl font-semibold">{title}</h2>{sub && <p className="text-dim text-[13px] mt-1">{sub}</p>}</div>
      {right}
    </div>
    {children}
  </section>
);

export function ProjectCard({ p, matchScore, selected, onSelect, onQuick, layout = 'grid', density = 1, draggable, onDragStart, onDragOver, onDrop, dragOver }) {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const owner = userById(state, p.ownerId);
  const saved = p.savedBy.includes(state.session);
  const stop = (e) => e.stopPropagation();
  const pad = density === 0 ? 'p-3' : density === 1 ? 'p-4' : 'p-5';
  const save = <button onClick={(e) => { stop(e); dispatch({ type: 'SAVE_TOGGLE', id: p.id }); }} title={saved ? 'Remove from saved' : 'Save project'}
    className={cn('p-1.5 rounded-lg transition-colors', saved ? 'text-amber' : 'text-faint hover:text-amber')}>
    <Icon name="Bookmark" size={15} fill={saved ? 'currentColor' : 'none'} /></button>;
  if (layout === 'list') return (
    <div onClick={() => router.push('/project/' + p.id)} draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      className={cn('card rounded-xl p-3.5 flex items-center gap-4 cursor-pointer hl', dragOver && 'dt')}>
      {onSelect && <input type="checkbox" checked={!!selected} onClick={stop} onChange={() => onSelect(p.id)} aria-label="Select" />}
      {draggable && <span className="text-faint cursor-grab"><Icon name="GripVertical" size={15} /></span>}
      <Avatar user={owner} size={38} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-[15px] truncate">{p.title}</h3>
          <StatusPill status={p.status} />
          {matchScore != null && <Pill tone="magenta" icon="Sparkles">{matchScore}% match</Pill>}
        </div>
        <p className="text-[12.5px] text-dim c2 mt-1">{p.short}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {p.domain.slice(0, 2).map((d) => <Pill key={d} tone={DOMAIN_TONE[d]}>{d}</Pill>)}
          <span className="mono text-[10.5px] text-faint">{p.academicYear} · {p.dept} · {p.tech.slice(0, 3).join(' / ')}</span>
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-3 shrink-0">
        <span className="mono text-[11px] text-faint inline-flex items-center gap-1"><Icon name="Eye" size={12} />{p.views}</span>
        <span className="mono text-[11px] text-faint inline-flex items-center gap-1"><Icon name="MessageSquare" size={12} />{p.discussion.length}</span>
        {save}
        {onQuick && <Btn size="xs" variant="s" icon="Eye" onClick={(e) => { stop(e); onQuick(p); }}>Quick look</Btn>}
      </div>
    </div>
  );
  return (
    <article onClick={() => router.push('/project/' + p.id)} draggable={draggable} onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      className={cn('card cursor-pointer hl flex flex-col relative overflow-hidden group', pad, density === 0 ? 'gap-2' : 'gap-3', dragOver && 'dt')}>
      <div className="absolute inset-x-0 top-0 h-[2px] gl opacity-60 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {onSelect && <input type="checkbox" checked={!!selected} onClick={stop} onChange={() => onSelect(p.id)} aria-label="Select" />}
          {draggable && <span className="text-faint cursor-grab" onClick={stop}><Icon name="GripVertical" size={15} /></span>}
          <Avatar user={owner} size={30} />
          <div className="min-w-0">
            <p className="text-[12px] font-medium truncate leading-tight">{owner.name}</p>
            <p className="mono text-[10px] text-faint">{p.dept} · Batch {p.academicYear}</p>
          </div>
        </div>
        {save}
      </div>
      <div>
        <h3 className="font-semibold text-[16px] leading-snug c2">{p.title}</h3>
        <p className={cn('text-[12.5px] text-dim mt-1.5 leading-relaxed', density === 0 ? 'c2' : 'c3')}>{p.short}</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {p.domain.map((d) => <Pill key={d} tone={DOMAIN_TONE[d]}>{d}</Pill>)}
        {matchScore != null && <Pill tone="magenta" icon="Sparkles">{matchScore}% conceptual</Pill>}
      </div>
      {density > 0 && <div className="flex flex-wrap gap-1">
        {p.tech.slice(0, density === 2 ? 5 : 3).map((t) => <span key={t} className="tag">{t}</span>)}
        {p.tech.length > (density === 2 ? 5 : 3) && <span className="mono text-[10px] text-faint px-1 py-0.5">+{p.tech.length - (density === 2 ? 5 : 3)}</span>}
      </div>}
      <div className="mt-auto pt-2.5 border-t hair flex items-center justify-between gap-2">
        <StatusPill status={p.status} />
        <div className="flex items-center gap-2.5 mono text-[10.5px] text-faint">
          <span className="inline-flex items-center gap-1"><Icon name="Eye" size={11} />{p.views}</span>
          <span className="inline-flex items-center gap-1"><Icon name="MessageSquare" size={11} />{p.discussion.length}</span>
          {onQuick && <button onClick={(e) => { stop(e); onQuick(p); }} className="text-cyan hover:underline">quick look</button>}
        </div>
      </div>
    </article>
  );
}

export function FeedbackCard({ fb, showCriteria }) {
  const { state } = useStore();
  const a = userById(state, fb.authorId);
  const tone = fb.decision === 'approved' ? 'lime' : fb.decision === 'revision_requested' ? 'rose' : 'sky';
  const label = fb.decision === 'approved' ? 'Approved' : fb.decision === 'revision_requested' ? 'Revision requested' : 'Review note';
  return <div className="rounded-xl border hair bg-ink/40 p-4" style={{ borderLeft: `3px solid ${TONE[tone]}` }}>
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5 min-w-0">
        <Avatar user={a} size={32} />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold truncate">{a.name}</p>
          <p className="mono text-[10px] text-faint">Faculty Reviewer · v{fb.version} · {fdate(fb.createdAt)}</p>
        </div>
      </div>
      <Pill tone={tone} icon={fb.decision === 'approved' ? 'CheckCircle2' : 'AlertTriangle'}>{label}</Pill>
    </div>
    <p className="text-[13.5px] leading-relaxed mt-3 whitespace-pre-line">{fb.body}</p>
    {showCriteria && fb.criteria && <div className="grid sm:grid-cols-2 gap-x-5 gap-y-2 mt-4 pt-3 border-t hair">
      {CRITERIA.map(([k, l]) => <div key={k}>
        <div className="flex justify-between text-[11px] mb-1"><span className="text-dim">{l}</span><span className="mono text-faint tb">{fb.criteria[k]}/5</span></div>
        <Meter value={fb.criteria[k] * 20} tone={fb.criteria[k] >= 4 ? 'lime' : fb.criteria[k] >= 3 ? 'amber' : 'rose'} height={4} />
      </div>)}
      <p className="sm:col-span-2 mono text-[10px] text-faint mt-1 flex items-center gap-1.5"><Icon name="Lock" size={10} />Rubric is private to the team and reviewer — never shown on the public page.</p>
    </div>}
  </div>;
}

export const StatCard = ({ icon, label, value, tone = 'cyan', sub, onClick }) => (
  <div onClick={onClick} className={cn('card p-4 relative overflow-hidden', onClick && 'cursor-pointer hl')}>
    <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-20" style={{ background: `radial-gradient(circle,${TONE[tone]},transparent 70%)` }} />
    <div className="flex items-center gap-2 mb-2.5" style={{ color: TONE[tone] }}><Icon name={icon} size={16} /><span className="text-[11px] tracking-wide uppercase mono">{label}</span></div>
    <p className="font-display text-3xl font-bold tb leading-none">{value}</p>
    {sub && <p className="text-[11.5px] text-dim mt-1.5">{sub}</p>}
  </div>
);

export function KnowledgeGraph({ projects, height = 380, dense }) {
  const ref = useRef(null), box = useRef(null);
  const router = useRouter();
  useEffect(() => {
    const cv = ref.current, wrap = box.current; if (!cv || !wrap) return;
    const ctx = cv.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const list = projects.slice(0, dense ? 24 : 15);
    if (!list.length) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let W = 0, H = 0, raf = 0, visible = true, hover = -1, ptr = { x: -999, y: -999 };
    const nodes = list.map((p, i) => {
      const a = (i / list.length) * Math.PI * 2, r = 0.28 + (i % 3) * 0.11;
      return { p, x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r * 0.86, vx: 0, vy: 0, r: 4 + p.views / 460, hue: (i * 47) % 360, ph: i * 1.7 };
    });
    const edges = [];
    for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
      const s = similarity(nodes[i].p, nodes[j].p); if (s > 42) edges.push({ i, j, s });
    }
    const css = getComputedStyle(document.documentElement);
    const resize = () => {
      const r = wrap.getBoundingClientRect(); W = Math.max(240, r.width); H = Math.max(200, r.height);
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (t) => {
      const cyan = css.getPropertyValue('--cyan').trim(), lime = css.getPropertyValue('--lime').trim();
      const line = css.getPropertyValue('--line').trim(), fg = css.getPropertyValue('--fg').trim(), raised = css.getPropertyValue('--raised').trim();
      ctx.clearRect(0, 0, W, H);
      if (!reduce) nodes.forEach((n, i) => {
        const dx = ptr.x / W - n.x, dy = ptr.y / H - n.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.04 && d2 > 0.0001) { const f = 0.00055 / d2; n.vx -= dx * f; n.vy -= dy * f; }
        n.vx += (0.5 + Math.cos(n.ph + t * 0.00013 + i) * (0.26 + (i % 3) * 0.1) - n.x) * 0.0016;
        n.vy += (0.5 + Math.sin(n.ph + t * 0.00017 + i) * (0.22 + (i % 3) * 0.08) - n.y) * 0.0016;
        n.vx *= 0.94; n.vy *= 0.94; n.x = clamp(n.x + n.vx, 0.06, 0.94); n.y = clamp(n.y + n.vy, 0.08, 0.92);
      });
      edges.forEach((e) => {
        const a = nodes[e.i], b = nodes[e.j], near = hover === e.i || hover === e.j;
        ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H);
        ctx.strokeStyle = near ? cyan : line; ctx.globalAlpha = near ? 0.85 : 0.3 * (e.s / 100);
        ctx.lineWidth = near ? 1.5 : 0.8; ctx.stroke(); ctx.globalAlpha = 1;
      });
      nodes.forEach((n, i) => {
        const x = n.x * W, y = n.y * H, isH = hover === i;
        const pulse = reduce ? 0 : Math.sin(t * 0.002 + n.ph) * 0.5 + 0.5;
        const rr = n.r + (isH ? 4 : 0) + pulse * 1.1;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 4.5);
        g.addColorStop(0, `hsla(${n.hue},85%,65%,${isH ? 0.5 : 0.24})`); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr * 4.5, 0, 6.284); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.284);
        ctx.fillStyle = isH ? lime : `hsl(${n.hue},80%,66%)`; ctx.fill();
        ctx.strokeStyle = isH ? lime : 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke();
        if (isH) {
          const label = n.p.title.length > 30 ? n.p.title.slice(0, 29) + '…' : n.p.title;
          ctx.font = '500 12px Inter, sans-serif';
          const w = ctx.measureText(label).width + 18;
          const bx = clamp(x - w / 2, 6, W - w - 6), by = clamp(y - rr - 32, 6, H - 30);
          ctx.fillStyle = raised; ctx.strokeStyle = cyan; ctx.lineWidth = 1;
          ctx.beginPath();
          if (ctx.roundRect) ctx.roundRect(bx, by, w, 24, 7); else ctx.rect(bx, by, w, 24);
          ctx.fill(); ctx.stroke();
          ctx.fillStyle = fg; ctx.fillText(label, bx + 9, by + 16);
        }
      });
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };
    const move = (e) => {
      const r = cv.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
      let best = -1, bd = 324;
      nodes.forEach((n, i) => { const dx = n.x * W - ptr.x, dy = n.y * H - ptr.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      hover = best; cv.style.cursor = best >= 0 ? 'pointer' : 'default';
      if (reduce) draw(0);
    };
    const click = () => { if (hover >= 0) router.push('/project/' + nodes[hover].p.id); };
    const leave = () => { hover = -1; ptr = { x: -999, y: -999 }; if (reduce) draw(0); };
    const ro = new ResizeObserver(() => { resize(); if (reduce) draw(0); }); ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting; cancelAnimationFrame(raf);
      if (visible && !reduce) raf = requestAnimationFrame(draw);
    }, { threshold: 0.02 }); io.observe(wrap);
    resize(); raf = requestAnimationFrame(draw);
    cv.addEventListener('pointermove', move); cv.addEventListener('pointerleave', leave); cv.addEventListener('click', click);
    return () => {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      cv.removeEventListener('pointermove', move); cv.removeEventListener('pointerleave', leave); cv.removeEventListener('click', click);
    };
  }, [projects, dense, router]);
  return <div ref={box} className="relative w-full rounded-2xl overflow-hidden border hair bpf" style={{ height, background: 'radial-gradient(120% 100% at 50% 0%, color-mix(in srgb,var(--cyan) 7%,transparent), transparent 70%)' }}>
    <canvas ref={ref} className="block" />
    <div className="absolute top-3 left-3 mono text-[10px] text-faint tracking-[.18em] pointer-events-none">SEMANTIC MAP · {projects.length} NODES</div>
    <div className="absolute bottom-3 left-3 mono text-[10px] text-faint pointer-events-none">hover to inspect · click to open</div>
  </div>;
}

export function BarChart({ data, height = 190 }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return <div className="flex items-end gap-2.5 sm:gap-4" style={{ height }}>
    {data.map((d, i) => <div key={d.label} className="flex-1 flex flex-col items-center justify-end gap-2 min-w-0 h-full">
      <span className="mono text-[11px] tb font-semibold" style={{ color: HUES[i % 8] }}>{d.value}</span>
      <div className="w-full rounded-t-lg bgrow relative overflow-hidden" style={{ height: `${(d.value / max) * 100}%`, minHeight: 6, background: `linear-gradient(180deg,${HUES[i % 8]},color-mix(in srgb,${HUES[i % 8]} 30%,transparent))`, animationDelay: `${i * 70}ms` }}>
        <svg className="absolute inset-0 w-full h-full opacity-20" aria-hidden="true">
          <defs><pattern id={`pt${i}${d.value}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#000" strokeWidth="2" /></pattern></defs>
          <rect width="100%" height="100%" fill={`url(#pt${i}${d.value})`} />
        </svg>
      </div>
      <span className="text-[10.5px] text-dim text-center leading-tight truncate w-full">{d.label}</span>
    </div>)}
  </div>;
}
export function HBars({ data }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return <div className="space-y-2.5">
    {data.map((d, i) => <div key={d.label} className="grid grid-cols-[minmax(72px,110px)_1fr_34px] items-center gap-3">
      <span className="text-[12px] text-dim truncate">{d.label}</span>
      <div className="h-[18px] rounded-md bg-ink border hair overflow-hidden">
        <div className="h-full rounded-md transition-[width] duration-700" style={{ width: `${(d.value / max) * 100}%`, background: `linear-gradient(90deg,color-mix(in srgb,${HUES[i % 8]} 45%,transparent),${HUES[i % 8]})` }} />
      </div>
      <span className="mono text-[11px] text-fg tb text-right">{d.value}</span>
    </div>)}
  </div>;
}
export function Donut({ data, size = 168 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const R = size / 2 - 14, C = 2 * Math.PI * R; let off = 0;
  return <div className="flex items-center gap-5 flex-wrap">
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line)" strokeWidth="16" />
      {data.map((d, i) => { const len = (d.value / total) * C;
        const el = <circle key={d.label} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={HUES[i % 8]} strokeWidth="16" strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-off} />;
        off += len; return el; })}
      <text x={size / 2} y={size / 2} transform={`rotate(90 ${size / 2} ${size / 2})`} textAnchor="middle" dy="6" fill="var(--fg)" fontSize="26" fontWeight="700">{total}</text>
    </svg>
    <div className="space-y-1.5 min-w-0">
      {data.map((d, i) => <div key={d.label} className="flex items-center gap-2 text-[12px]">
        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: HUES[i % 8] }} />
        <span className="text-dim">{d.label}</span>
        <span className="mono text-fg tb ml-auto pl-3">{d.value}</span>
        <span className="mono text-faint tb w-10 text-right">{Math.round((d.value / total) * 100)}%</span>
      </div>)}
    </div>
  </div>;
}