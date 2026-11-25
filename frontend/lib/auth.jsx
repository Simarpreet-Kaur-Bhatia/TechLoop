'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Btn, Card, Pill, Field, Input, Select, Avatar } from './ui';
import { useStore, homeFor } from './store';
import { similarity } from './ai';
import { cn, uid, rel } from './data';

const COLLEGES = [
  'Indian Institute of Technology, Delhi',
  'Indian Institute of Technology, Bombay',
  'National Institute of Technology, Trichy',
  'Vellore Institute of Technology',
  'Birla Institute of Technology and Science, Pilani',
  'Delhi Technological University',
  'Punjab Engineering College, Chandigarh',
  'College of Engineering, Pune',
];
const DIAL = [
  { code: '+91', flag: 'IN', len: 10 },
  { code: '+1', flag: 'US', len: 10 },
  { code: '+44', flag: 'UK', len: 10 },
  { code: '+61', flag: 'AU', len: 9 },
  { code: '+971', flag: 'AE', len: 9 },
];
const ROLES = [
  { id: 'student', label: 'Student', icon: 'GraduationCap', tone: 'cyan', blurb: 'Create, submit and discover projects' },
  { id: 'faculty', label: 'Faculty', icon: 'ShieldCheck', tone: 'violet', blurb: 'Evaluate only what is assigned to you' },
  { id: 'admin', label: 'Administrator', icon: 'Database', tone: 'rose', blurb: 'Users, moderation and reports' },
];
const DEMO = [
  { userId: 'u_aarav', role: 'student', name: 'Aarav Mehta', age: 20, dept: 'CSE', year: '3rd', phone: '9876500001', note: '3 projects · 1 revision pending' },
  { userId: 'f_sharma', role: 'faculty', name: 'Dr. Ananya Sharma', age: 44, dept: 'CSE', phone: '9876500002', note: '3 assigned · evaluation queue live' },
  { userId: 'f_verma', role: 'faculty', name: 'Dr. Rajiv Verma', age: 39, dept: 'CSE', phone: '9876500003', note: '1 resubmission awaiting review' },
  { userId: 'a_root', role: 'admin', name: 'Dean R. Krishnan', age: 52, dept: 'ADMIN', phone: '9876500004', note: 'Full institutional control panel' },
];
const ADMIN_CODE = 'TECHLOOP-ADMIN';
const CHAIN = [
  ['GraduationCap', 'Student creates', 'cyan'],
  ['ShieldCheck', 'Faculty validates', 'violet'],
  ['Archive', 'Archive preserves', 'lime'],
  ['Sparkles', 'Juniors discover', 'magenta'],
];

/* ── vault canvas: real archive nodes, hover reveals a real preserved failure ── */
function Vault({ projects, height = 300 }) {
  const cv = useRef(null), box = useRef(null);
  const [tip, setTip] = useState(null);
  useEffect(() => {
    const c = cv.current, w = box.current; if (!c || !w) return;
    const ctx = c.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const list = projects.slice(0, 18); if (!list.length) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let W = 0, H = 0, raf = 0, live = true, hov = -1, ptr = { x: -999, y: -999 };
    const ns = list.map((p, i) => {
      const a = (i / list.length) * Math.PI * 2, r = 0.27 + (i % 3) * 0.1;
      return { p, x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r * 0.84, vx: 0, vy: 0, r: 4 + (p.views || 0) / 520, h: (i * 47) % 360, ph: i * 1.7 };
    });
    const es = [];
    for (let i = 0; i < ns.length; i++) for (let j = i + 1; j < ns.length; j++) {
      const s = similarity(ns[i].p, ns[j].p); if (s > 44) es.push({ i, j, s });
    }
    const css = getComputedStyle(document.documentElement);
    const size = () => {
      const r = w.getBoundingClientRect(); W = Math.max(220, r.width); H = Math.max(180, r.height);
      c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = (t) => {
      const cy = css.getPropertyValue('--cyan').trim(), li = css.getPropertyValue('--lime').trim(), ln = css.getPropertyValue('--line').trim();
      ctx.clearRect(0, 0, W, H);
      if (!reduce) ns.forEach((n, i) => {
        const dx = ptr.x / W - n.x, dy = ptr.y / H - n.y, d2 = dx * dx + dy * dy;
        if (d2 < 0.05 && d2 > 0.0002) { const f = 0.0006 / d2; n.vx -= dx * f; n.vy -= dy * f; }
        n.vx += (0.5 + Math.cos(n.ph + t * 0.00012 + i) * (0.25 + (i % 3) * 0.1) - n.x) * 0.0016;
        n.vy += (0.5 + Math.sin(n.ph + t * 0.00016 + i) * (0.21 + (i % 3) * 0.08) - n.y) * 0.0016;
        n.vx *= 0.94; n.vy *= 0.94;
        n.x = Math.max(0.06, Math.min(0.94, n.x + n.vx)); n.y = Math.max(0.09, Math.min(0.91, n.y + n.vy));
      });
      es.forEach((e) => {
        const a = ns[e.i], b = ns[e.j], near = hov === e.i || hov === e.j;
        ctx.beginPath(); ctx.moveTo(a.x * W, a.y * H); ctx.lineTo(b.x * W, b.y * H);
        ctx.strokeStyle = near ? cy : ln; ctx.globalAlpha = near ? 0.9 : 0.3 * (e.s / 100);
        ctx.lineWidth = near ? 1.5 : 0.8; ctx.stroke(); ctx.globalAlpha = 1;
      });
      ns.forEach((n, i) => {
        const x = n.x * W, y = n.y * H, on = hov === i;
        const pulse = reduce ? 0 : Math.sin(t * 0.002 + n.ph) * 0.5 + 0.5;
        const rr = n.r + (on ? 4 : 0) + pulse;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 4.6);
        g.addColorStop(0, `hsla(${n.h},85%,65%,${on ? 0.5 : 0.22})`); g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, rr * 4.6, 0, 6.284); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.284);
        ctx.fillStyle = on ? li : `hsl(${n.h},80%,66%)`; ctx.fill();
        ctx.strokeStyle = on ? li : 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.stroke();
      });
      if (!reduce && live) raf = requestAnimationFrame(draw);
    };
    const move = (e) => {
      const r = c.getBoundingClientRect(); ptr = { x: e.clientX - r.left, y: e.clientY - r.top };
      let best = -1, bd = 340;
      ns.forEach((n, i) => { const dx = n.x * W - ptr.x, dy = n.y * H - ptr.y, d = dx * dx + dy * dy; if (d < bd) { bd = d; best = i; } });
      if (best !== hov) { hov = best; setTip(best >= 0 ? ns[best].p : null); }
      c.style.cursor = best >= 0 ? 'crosshair' : 'default';
      if (reduce) draw(0);
    };
    const leave = () => { hov = -1; ptr = { x: -999, y: -999 }; setTip(null); if (reduce) draw(0); };
    const ro = new ResizeObserver(() => { size(); if (reduce) draw(0); }); ro.observe(w);
    const io = new IntersectionObserver(([e]) => { live = e.isIntersecting; cancelAnimationFrame(raf); if (live && !reduce) raf = requestAnimationFrame(draw); }, { threshold: 0.02 });
    io.observe(w);
    size(); raf = requestAnimationFrame(draw);
    c.addEventListener('pointermove', move); c.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); c.removeEventListener('pointermove', move); c.removeEventListener('pointerleave', leave); };
  }, [projects]);

  return (
    <div ref={box} className="relative w-full rounded-2xl overflow-hidden border hair bpf" style={{ height, background: 'radial-gradient(120% 100% at 50% 0%,color-mix(in srgb,var(--cyan) 8%,transparent),transparent 70%)' }}>
      <canvas ref={cv} className="block" />
      <div className="absolute top-3 left-3 mono text-[10px] text-faint tracking-[.18em] pointer-events-none">SEMANTIC VAULT · {projects.length} RECORDS</div>
      {tip ? (
        <div className="absolute bottom-3 left-3 right-3 card rounded-xl p-3 rise pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="FolderGit2" size={13} className="text-cyan" />
            <p className="text-[12.5px] font-semibold truncate">{tip.title}</p>
            <span className="mono text-[10px] text-faint ml-auto shrink-0">{tip.academicYear}</span>
          </div>
          <p className="text-[11.5px] text-dim c2 leading-snug">{tip.didntWork || tip.short}</p>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3 mono text-[10px] text-faint pointer-events-none">hover a node to read what failed</div>
      )}
    </div>
  );
}

/* ── six-box OTP with paste, auto-advance and backspace navigation ── */
function OtpInput({ value, onChange, onDone, invalid }) {
  const refs = useRef([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');
  const put = (i, ch) => {
    const next = digits.slice(); next[i] = ch;
    const joined = next.join('').slice(0, 6);
    onChange(joined);
    if (ch && i < 5) refs.current[i + 1]?.focus();
    if (joined.replace(/\s/g, '').length === 6) onDone?.(joined);
  };
  return (
    <div className={cn('flex gap-2 justify-between', invalid && 'rise')} role="group" aria-label="One-time password">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          value={d}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => put(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => {
            if (e.key === 'Backspace') { e.preventDefault(); if (digits[i]) put(i, ''); else if (i > 0) { put(i - 1, ''); refs.current[i - 1]?.focus(); } }
            if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
            if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
          }}
          onPaste={(e) => {
            e.preventDefault();
            const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
            if (!t) return;
            onChange(t);
            refs.current[Math.min(t.length, 5)]?.focus();
            if (t.length === 6) onDone?.(t);
          }}
          className={cn('inp text-center mono text-[20px] font-bold h-14 px-0 flex-1 min-w-0 transition-all',
            invalid ? 'border-rose text-rose' : d ? 'border-cyan text-cyan' : '')}
          style={d && !invalid ? { boxShadow: '0 0 18px -8px var(--cyan)' } : null}
        />
      ))}
    </div>
  );
}

export function AuthGate() {
  const { state, dispatch } = useStore();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState('student');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [college, setCollege] = useState('');
  const [dept, setDept] = useState('CSE');
  const [adminCode, setAdminCode] = useState('');
  const [demoId, setDemoId] = useState(null);

  const [dial, setDial] = useState('+91');
  const [phone, setPhone] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [otp, setOtp] = useState('');
  const [left, setLeft] = useState(0);
  const [otpErr, setOtpErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});
  const [granted, setGranted] = useState(null);
  const [quote, setQuote] = useState(0);

  const approved = useMemo(() => state.projects.filter((p) => p.status === 'approved'), [state.projects]);
  const quotes = useMemo(() => state.projects.flatMap((p) => (p.feedback || []).map((f) => ({ body: f.body, project: p.title, by: state.users.find((u) => u.id === f.authorId)?.name || 'Faculty' }))).slice(0, 8), [state.projects, state.users]);
  const dialLen = DIAL.find((d) => d.code === dial)?.len || 10;

  useEffect(() => {
    if (!quotes.length) return;
    const t = setInterval(() => setQuote((q) => (q + 1) % quotes.length), 6500);
    return () => clearInterval(t);
  }, [quotes.length]);

  useEffect(() => {
    if (!sent || left <= 0) return;
    const t = setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [sent, left]);

  const pickDemo = (d) => {
    setDemoId(d.userId); setRole(d.role); setName(d.name); setAge(String(d.age));
    setCollege('Punjab Engineering College, Chandigarh'); setDept(d.dept === 'ADMIN' ? 'CSE' : d.dept);
    setPhone(d.phone); setAdminCode(d.role === 'admin' ? ADMIN_CODE : '');
    setErrs({});
  };
  const clearDemo = () => { setDemoId(null); setName(''); setAge(''); setPhone(''); setAdminCode(''); };

  const googlePrefill = () => {
    const d = DEMO.find((x) => x.role === role) || DEMO[0];
    pickDemo(d);
    dispatch({ type: 'TOAST', toast: { kind: 'info', title: 'Institutional Google account linked', msg: `${d.name} · identity pre-filled. Phone verification is still required.` } });
  };

  const validateIdentity = () => {
    const e = {};
    if (name.trim().length < 3) e.name = 'Enter your full name (at least 3 characters).';
    const n = Number(age);
    if (!age || Number.isNaN(n) || n < 16 || n > 90) e.age = 'Age must be a number between 16 and 90.';
    if (college.trim().length < 4) e.college = 'Enter your institution name.';
    if (role === 'admin' && adminCode.trim().toUpperCase() !== ADMIN_CODE) e.adminCode = `Administrator access requires the institutional code. Demo code: ${ADMIN_CODE}`;
    setErrs(e);
    return !Object.keys(e).length;
  };

  const sendOtp = () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== dialLen) { setErrs({ phone: `Enter a valid ${dialLen}-digit number for ${dial}.` }); return; }
    setErrs({}); setBusy(true);
    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setTimeout(() => {
      setCode(generated); setSent(true); setOtp(''); setOtpErr(''); setLeft(30); setBusy(false);
      dispatch({ type: 'TOAST', toast: { kind: 'ok', title: 'Verification code sent', msg: `${dial} ${digits} · valid for this session.` } });
    }, 700);
  };

  const verify = (candidate) => {
    const entered = (candidate ?? otp).replace(/\D/g, '');
    if (entered.length !== 6) { setOtpErr('Enter all six digits.'); return; }
    setBusy(true); setOtpErr('');
    setTimeout(() => {
      setBusy(false);
      if (entered !== code) { setOtpErr('That code does not match. Check the development panel below or resend.'); setOtp(''); return; }
      const digits = phone.replace(/\D/g, '');
      const payload = {
        userId: demoId || uid('u'),
        name: name.trim(), age: Number(age), college: college.trim(), role, dept,
        phone: `${dial} ${digits}`,
        email: `${name.trim().toLowerCase().replace(/[^a-z]+/g, '.').replace(/^\.|\.$/g, '')}@${college.trim().toLowerCase().replace(/[^a-z]+/g, '').slice(0, 12)}.edu`,
      };
      dispatch({ type: 'REGISTER', ...payload });
      setGranted(payload);
      setStep(2);
    }, 800);
  };

  const enter = useCallback(() => {
    if (!granted) return;
    router.push(homeFor(granted.role));
  }, [granted, router]);

  const steps = [['Identity', 'User'], ['Verify', 'Smartphone'], ['Granted', 'BadgeCheck']];
  const roleMeta = ROLES.find((r) => r.id === role);

  return (
    <div className="min-h-screen relative z-10 grid lg:grid-cols-[1.02fr_1fr]">
      {/* ── left: the vault ── */}
      <div className="relative hidden lg:flex flex-col justify-between p-9 border-r hair overflow-hidden bp">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(90% 70% at 18% 8%,var(--g1),transparent 60%),radial-gradient(70% 60% at 92% 92%,var(--g2),transparent 60%)' }} />
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-9">
            <span className="w-10 h-10 rounded-xl grid place-items-center border hair" style={{ background: 'linear-gradient(140deg,color-mix(in srgb,var(--cyan) 30%,transparent),color-mix(in srgb,var(--violet) 24%,transparent))' }}>
              <Icon name="Network" size={20} className="text-cyan" />
            </span>
            <span>
              <span className="font-display font-bold text-xl block leading-none">Tech<span className="gt">Loop</span></span>
              <span className="mono text-[9.5px] text-faint tracking-[.18em]">INSTITUTIONAL KNOWLEDGE VAULT</span>
            </span>
            <Pill tone="lime" icon="Lock" className="ml-auto">Authentication required</Pill>
          </div>

          <h1 className="text-[38px] leading-[1.06] font-bold max-w-lg">
            Project knowledge<br />should not graduate<br /><span className="gt">before you do.</span>
          </h1>
          <p className="text-dim text-[14px] mt-4 max-w-md leading-relaxed">
            Reports survive in college records. What failed, why, and how it was fixed evaporates into group chats and dead laptops. TechLoop keeps it, verifies it, and makes it searchable by meaning.
          </p>

          <div className="flex items-center gap-2 mt-6 flex-wrap">
            {CHAIN.map(([ic, label, tone], i) => (
              <div key={label} className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border mono text-[10px]"
                  style={{ color: `var(--${tone})`, borderColor: `color-mix(in srgb,var(--${tone}) 35%,transparent)`, background: `color-mix(in srgb,var(--${tone}) 10%,transparent)` }}>
                  <Icon name={ic} size={11} />{label}
                </span>
                {i < CHAIN.length - 1 && <Icon name="ChevronRight" size={12} className="text-faint" />}
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-7">
          <Vault projects={approved} height={272} />
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[['Verified records', approved.length, 'lime'], ['Preserved failures', state.projects.filter((p) => p.didntWork).length, 'amber'], ['Faculty reviewers', state.users.filter((u) => u.role === 'faculty').length, 'violet']].map(([l, v, t]) => (
              <div key={l} className="border-l-2 pl-2.5" style={{ borderColor: `var(--${t})` }}>
                <p className="font-display text-xl font-bold tb">{v}</p>
                <p className="text-[10.5px] text-dim leading-tight mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          {quotes.length > 0 && (
            <Card className="p-3.5 mt-4" style={{ borderLeft: '3px solid var(--violet)' }}>
              <p className="mono text-[9.5px] tracking-[.16em] text-faint mb-1.5">PRESERVED FACULTY FEEDBACK</p>
              <p key={quote} className="text-[12px] text-dim leading-relaxed c3 rise">{quotes[quote].body}</p>
              <p className="mono text-[10px] text-faint mt-2 truncate">— {quotes[quote].by} on {quotes[quote].project}</p>
            </Card>
          )}
        </div>
      </div>

      {/* ── right: the gate ── */}
      <div className="flex items-center justify-center p-5 sm:p-9 relative">
        <button
          onClick={() => dispatch({ type: 'THEME', value: state.theme === 'dark' ? 'light' : 'dark' })}
          className="absolute top-4 right-4 text-dim hover:text-amber p-2 transition-colors" aria-label="Toggle theme">
          <Icon name={state.theme === 'dark' ? 'Sun' : 'Moon'} size={18} />
        </button>

        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <span className="w-9 h-9 rounded-xl grid place-items-center border hair text-cyan"><Icon name="Network" size={18} /></span>
            <span className="font-display font-bold text-lg">Tech<span className="gt">Loop</span></span>
            <Pill tone="lime" icon="Lock" className="ml-auto">Required</Pill>
          </div>

          {/* progress rail */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map(([label, ic], i) => {
              const done = i < step, cur = i === step;
              return (
                <div key={label} className="flex items-center gap-2 flex-1">
                  <div className={cn('flex items-center gap-2 px-2.5 h-9 rounded-xl border flex-1 transition-all',
                    cur ? 'bg-raised border-cyan' : done ? 'hair' : 'hair opacity-60')}>
                    <span className={cn('w-5 h-5 rounded-md grid place-items-center shrink-0', cur ? 'bg-cyan text-[#04121A]' : done ? 'bg-lime/20 text-lime' : 'bg-ink text-faint')}>
                      <Icon name={done ? 'Check' : ic} size={12} />
                    </span>
                    <span className={cn('text-[12px] font-medium truncate', cur ? 'text-fg' : done ? 'text-lime' : 'text-faint')}>{label}</span>
                  </div>
                  {i < steps.length - 1 && <span className={cn('w-3 h-px shrink-0', done ? 'bg-lime' : 'bg-line')} />}
                </div>
              );
            })}
          </div>

          {/* ── STEP 0 · identity ── */}
          {step === 0 && (
            <Card className="p-5 sm:p-6 rise">
              <p className="mono text-[10px] tracking-[.22em] text-cyan">STEP 01 · INSTITUTIONAL IDENTITY</p>
              <h2 className="text-2xl font-bold mt-2">Who is entering the archive?</h2>
              <p className="text-[13px] text-dim mt-1.5">Every action in TechLoop is tied to a verified role. There is no unrestricted project interaction.</p>

              <div className="grid grid-cols-3 gap-2 mt-5">
                {ROLES.map((r) => {
                  const on = role === r.id;
                  return (
                    <button key={r.id} type="button"
                      onClick={() => { setRole(r.id); setErrs({}); if (demoId) clearDemo(); }}
                      className={cn('p-3 rounded-xl border text-left transition-all', on ? 'bg-raised' : 'hair hover:bg-raised/60')}
                      style={on ? { borderColor: `var(--${r.tone})`, boxShadow: `0 0 26px -12px var(--${r.tone})` } : null}>
                      <span style={{ color: `var(--${r.tone})` }}><Icon name={r.icon} size={17} /></span>
                      <p className="text-[12.5px] font-semibold mt-2 leading-tight">{r.label}</p>
                      <p className="text-[10px] text-faint leading-tight mt-1">{r.blurb}</p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-4 mt-5">
                <Field label="Full name" required error={errs.name}>
                  <Input value={name} onChange={(e) => { setName(e.target.value); setDemoId(null); setErrs((x) => ({ ...x, name: undefined })); }} placeholder="e.g. Simarpreet Kaur" autoComplete="name" />
                </Field>

                <div className="grid grid-cols-[100px_1fr] gap-3">
                  <Field label="Age" required error={errs.age}>
                    <Input value={age} inputMode="numeric" maxLength={2}
                      onChange={(e) => { setAge(e.target.value.replace(/\D/g, '').slice(0, 2)); setErrs((x) => ({ ...x, age: undefined })); }} placeholder="20" />
                  </Field>
                  <Field label="Department" required>
                    <Select value={dept} onChange={(e) => setDept(e.target.value)}>
                      {['CSE', 'IT', 'ECE', 'EEE', 'ME', 'CE'].map((d) => <option key={d}>{d}</option>)}
                    </Select>
                  </Field>
                </div>

                <Field label="College / institution" required error={errs.college} hint="Start typing — pick a suggestion or enter your own.">
                  <Input value={college} list="tl-colleges"
                    onChange={(e) => { setCollege(e.target.value); setErrs((x) => ({ ...x, college: undefined })); }}
                    placeholder="e.g. Punjab Engineering College, Chandigarh" />
                </Field>
                <datalist id="tl-colleges">{COLLEGES.map((c) => <option key={c} value={c} />)}</datalist>

                {role === 'admin' && (
                  <Field label="Administrator access code" required error={errs.adminCode} hint={`Institutional demo code: ${ADMIN_CODE}`}>
                    <Input value={adminCode} onChange={(e) => { setAdminCode(e.target.value); setErrs((x) => ({ ...x, adminCode: undefined })); }}
                      placeholder="TECHLOOP-ADMIN" className="mono" />
                  </Field>
                )}
              </div>

              <div className="flex items-center gap-3 my-5">
                <span className="flex-1 h-px bg-line" /><span className="mono text-[10px] text-faint">OR PRE-FILL</span><span className="flex-1 h-px bg-line" />
              </div>

              <button onClick={googlePrefill}
                className="w-full h-11 rounded-xl border hair bg-raised hover:border-cyan transition-colors flex items-center justify-center gap-3 text-[13px] font-medium">
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8.1" /><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23" /><path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.8-2.5 3.2-4.7 6-4.7" /></svg>
                Continue with institutional Google
              </button>

              <details className="mt-4 group">
                <summary className="mono text-[10.5px] text-faint cursor-pointer hover:text-cyan flex items-center gap-1.5">
                  <Icon name="ChevronRight" size={12} className="group-open:rotate-90 transition-transform" />
                  USE A SEEDED INSTITUTIONAL IDENTITY
                </summary>
                <div className="space-y-1.5 mt-2.5">
                  {DEMO.map((d) => {
                    const u = state.users.find((x) => x.id === d.userId);
                    return (
                      <button key={d.userId} onClick={() => pickDemo(d)}
                        className={cn('w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-colors', demoId === d.userId ? 'bg-raised border-cyan' : 'hair hover:bg-raised/60')}>
                        <Avatar user={u || { name: d.name }} size={30} />
                        <span className="min-w-0 flex-1">
                          <span className="text-[12.5px] block truncate">{d.name}</span>
                          <span className="mono text-[10px] text-faint block truncate">{d.role} · {d.note}</span>
                        </span>
                        {demoId === d.userId && <Icon name="Check" size={14} className="text-lime shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </details>

              <Btn className="w-full mt-5" size="lg" iconRight="ArrowRight" onClick={() => { if (validateIdentity()) setStep(1); }}>
                Continue to verification
              </Btn>
              <p className="text-[11px] text-faint mt-3 leading-relaxed">
                Your details stay in this browser. Nothing is transmitted to an external identity provider in this build.
              </p>
            </Card>
          )}

          {/* ── STEP 1 · phone verification ── */}
          {step === 1 && (
            <Card className="p-5 sm:p-6 rise">
              <p className="mono text-[10px] tracking-[.22em] text-cyan">STEP 02 · PHONE VERIFICATION</p>
              <h2 className="text-2xl font-bold mt-2">Verify it is really you</h2>
              <div className="flex items-center gap-2.5 mt-3 p-3 rounded-xl border hair bg-ink/40">
                <Avatar user={{ name }} size={34} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold truncate">{name}</p>
                  <p className="mono text-[10px] text-faint truncate">{age} yrs · {dept} · {college}</p>
                </div>
                <Pill tone={roleMeta.tone} icon={roleMeta.icon}>{roleMeta.label}</Pill>
              </div>

              {!sent ? (
                <>
                  <div className="mt-5">
                    <Field label="Mobile number" required error={errs.phone} hint={`A 6-digit code will be issued for ${dial}.`}>
                      <div className="flex gap-2">
                        <Select value={dial} onChange={(e) => { setDial(e.target.value); setErrs({}); }} className="w-26 shrink-0 mono">
                          {DIAL.map((d) => <option key={d.code} value={d.code}>{d.flag} {d.code}</option>)}
                        </Select>
                        <Input value={phone} inputMode="numeric" autoComplete="tel-national"
                          onChange={(e) => { setPhone(e.target.value.replace(/\D/g, '').slice(0, dialLen)); setErrs({}); }}
                          placeholder={dialLen === 10 ? '98765 43210' : '555 010 9999'} className="flex-1 mono tracking-wide" />
                      </div>
                    </Field>
                  </div>
                  <Btn className="w-full mt-5" size="lg" icon="Send" loading={busy} onClick={sendOtp} disabled={phone.replace(/\D/g, '').length !== dialLen}>
                    Send verification code
                  </Btn>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 mt-5 mb-2">
                    <span className="lbl">Enter the 6-digit code</span>
                    <span className="mono text-[10.5px] text-faint">{dial} {phone}</span>
                  </div>
                  <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpErr(''); }} onDone={(v) => verify(v)} invalid={!!otpErr} />
                  {otpErr && <p className="text-[11.5px] text-rose mt-2 flex items-start gap-1.5"><Icon name="AlertTriangle" size={12} className="mt-0.5 shrink-0" />{otpErr}</p>}

                  <div className="flex items-center justify-between gap-3 mt-3">
                    <span className="mono text-[10.5px] text-faint inline-flex items-center gap-1.5">
                      <Icon name="Clock" size={11} />{left > 0 ? `Resend in ${left}s` : 'Code expired'}
                    </span>
                    <button disabled={left > 0} onClick={sendOtp}
                      className={cn('mono text-[11px] inline-flex items-center gap-1.5', left > 0 ? 'text-faint' : 'text-cyan hover:underline')}>
                      <Icon name="RefreshCw" size={11} />Resend code
                    </button>
                  </div>

                  <div className="mt-4 p-3 rounded-xl border" style={{ background: 'color-mix(in srgb,var(--amber) 8%,transparent)', borderColor: 'color-mix(in srgb,var(--amber) 32%,var(--line))' }}>
                    <p className="text-[11.5px] font-semibold flex items-center gap-1.5" style={{ color: 'var(--amber)' }}>
                      <Icon name="Info" size={12} />Development mode — SMS gateway not connected
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="mono text-[22px] font-bold tracking-[.28em] text-fg">{code}</span>
                      <button onClick={() => { setOtp(code); verify(code); }} className="btn btn-s btn-xs ml-auto">
                        <Icon name="Zap" size={12} />Autofill
                      </button>
                      <button onClick={() => navigator.clipboard?.writeText(code)} className="btn btn-g btn-xs" aria-label="Copy code">
                        <Icon name="Copy" size={12} />
                      </button>
                    </div>
                    <p className="text-[10.5px] text-faint mt-1.5">In production this is delivered by Firebase Phone Auth or Supabase OTP and never shown on screen.</p>
                  </div>

                  <Btn className="w-full mt-5" size="lg" icon="BadgeCheck" loading={busy} onClick={() => verify()} disabled={otp.replace(/\D/g, '').length !== 6}>
                    Verify and enter TechLoop
                  </Btn>
                </>
              )}

              <button onClick={() => { setStep(0); setSent(false); setOtp(''); setOtpErr(''); }}
                className="w-full mt-3 inline-flex items-center justify-center gap-1.5 text-[12.5px] text-dim hover:text-fg py-2">
                <Icon name="ArrowLeft" size={13} />Change identity details
              </button>
            </Card>
          )}

          {/* ── STEP 2 · granted ── */}
          {step === 2 && granted && (
            <Card className="p-5 sm:p-6 rise okpulse" style={{ borderColor: 'color-mix(in srgb,var(--lime) 45%,var(--line))' }}>
              <div className="w-14 h-14 rounded-2xl grid place-items-center border mx-auto" style={{ color: 'var(--lime)', borderColor: 'color-mix(in srgb,var(--lime) 45%,transparent)', background: 'color-mix(in srgb,var(--lime) 12%,transparent)' }}>
                <Icon name="BadgeCheck" size={26} />
              </div>
              <h2 className="text-2xl font-bold mt-4 text-center">Access granted</h2>
              <p className="text-[13px] text-dim mt-1.5 text-center">Phone verified. Your role-based workspace is ready.</p>

              <div className="mt-5 space-y-2 text-[12.5px]">
                {[['Name', granted.name], ['Age', `${granted.age} years`], ['Institution', granted.college], ['Department', granted.dept], ['Role', roleMeta.label], ['Verified number', granted.phone]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 border-b hair pb-1.5">
                    <span className="text-dim">{k}</span>
                    <span className="text-fg text-right truncate max-w-[62%]">{v}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 rounded-xl border hair bg-ink/40">
                <p className="mono text-[9.5px] tracking-[.16em] text-faint mb-2">WHAT UNLOCKS FOR YOU</p>
                <div className="space-y-1.5">
                  {(granted.role === 'student'
                    ? [['Compass', 'Explore every verified project in the archive'], ['Sparkles', 'Semantic search and grounded TechLoop AI'], ['Plus', 'Create a project and submit it for evaluation']]
                    : granted.role === 'faculty'
                      ? [['ShieldCheck', 'Evaluation queue — only projects assigned to you'], ['ClipboardCheck', 'Rubric review, feedback and revision requests'], ['Compass', 'Browse the wider archive in exploration mode']]
                      : [['Users', 'Manage students, faculty and administrators'], ['Flag', 'Moderate projects, discussions and files'], ['BarChart3', 'Institutional reports and CSV / JSON export']]
                  ).map(([ic, t]) => (
                    <div key={t} className="flex items-start gap-2 text-[12px] text-dim">
                      <Icon name={ic} size={13} className="text-cyan mt-0.5 shrink-0" />{t}
                    </div>
                  ))}
                </div>
              </div>

              <Btn className="w-full mt-5" size="lg" variant="ok" iconRight="ArrowRight" onClick={enter}>
                Enter {granted.role === 'faculty' ? 'evaluation dashboard' : granted.role === 'admin' ? 'control panel' : 'TechLoop'}
              </Btn>
            </Card>
          )}

          <p className="mono text-[10px] text-faint text-center mt-5 leading-relaxed">
            DJANGO AUTH · GOOGLE OAUTH · PHONE OTP · ROLE-BASED ACCESS CONTROL
          </p>
        </div>
      </div>
    </div>
  );
}