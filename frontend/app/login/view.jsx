'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Btn, Field, Input, Pill } from '../../lib/ui';
import { KnowledgeGraph } from '../../lib/ui';
import { useStore, useTheme, homeFor } from '../../lib/store';
import { HUES, cn } from '../../lib/data';

const ROLES = [
  { id:'student', label:'Student', icon:'GraduationCap', tone:'cyan', user:'u_aarav', desc:'Create, submit, discover' },
  { id:'faculty', label:'Faculty', icon:'ShieldCheck', tone:'violet', user:'f_sharma', desc:'Assigned evaluations only' },
  { id:'admin', label:'Admin', icon:'Database', tone:'rose', user:'a_root', desc:'Users, moderation, reports' },
];

export default function Login() {
  const { state, dispatch } = useStore();
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('aarav.mehta@college.edu');
  const [pw, setPw] = useState('techloop-demo');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const enterAs = (u) => { dispatch({ type: 'LOGIN', userId: u.id }); router.push(homeFor(u.role)); };
  const submit = (e) => {
    e.preventDefault();
    const u = state.users.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!u) return setErr('No institutional account matches that address. Pick a role above to use a demo account.');
    if (pw.length < 4) return setErr('Password must be at least 4 characters.');
    setErr(''); setBusy(true); setTimeout(() => enterAs(u), 600);
  };
  return <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] relative z-10">
    <div className="relative hidden lg:flex flex-col justify-between p-10 border-r hair overflow-hidden bp">
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(90% 70% at 20% 10%,var(--g1),transparent 60%),radial-gradient(70% 60% at 90% 90%,var(--g2),transparent 60%)' }} />
      <div className="relative">
        <div className="flex items-center gap-2.5 mb-12">
          <span className="w-10 h-10 rounded-xl grid place-items-center border hair" style={{ background: 'linear-gradient(140deg,color-mix(in srgb,var(--cyan) 28%,transparent),color-mix(in srgb,var(--violet) 24%,transparent))' }}><Icon name="Network" size={20} className="text-cyan" /></span>
          <span><span className="font-display font-bold text-xl block leading-none">Tech<span className="gt">Loop</span></span><span className="mono text-[9.5px] text-faint tracking-[.18em]">INSTITUTIONAL KNOWLEDGE</span></span>
        </div>
        <h1 className="text-[42px] leading-[1.06] font-bold max-w-lg">Project knowledge<br />should not graduate<br /><span className="gt">before you do.</span></h1>
        <p className="text-dim text-[14.5px] mt-5 max-w-md leading-relaxed">Reports survive in college records. The practical knowledge — what failed, why, and how it was fixed — evaporates into group chats and dead laptops. TechLoop keeps it, verifies it, and makes it searchable by meaning.</p>
        <div className="flex gap-2 mt-7 flex-wrap">
          {['Problem','Solution','Technology','Challenges','Failures','Learnings','Faculty feedback'].map((t, i) => (
            <span key={t} className="mono text-[10.5px] px-2.5 py-1 rounded-full border rise" style={{ color: HUES[i % 8], borderColor: `color-mix(in srgb,${HUES[i % 8]} 35%,transparent)`, animationDelay: `${i * 60}ms` }}>{t}</span>
          ))}
        </div>
      </div>
      <div className="relative mt-8"><KnowledgeGraph projects={state.projects.filter((p) => p.status === 'approved')} height={280} /></div>
    </div>
    <div className="flex items-center justify-center p-6 sm:p-10 relative">
      <button onClick={toggle} className="absolute top-5 right-5 text-dim hover:text-amber p-2" aria-label="Toggle theme"><Icon name={theme === 'dark' ? 'Sun' : 'Moon'} size={18} /></button>
      <div className="w-full max-w-md rise">
        <div className="lg:hidden flex items-center gap-2.5 mb-8">
          <span className="w-9 h-9 rounded-xl grid place-items-center border hair text-cyan"><Icon name="Network" size={18} /></span>
          <span className="font-display font-bold text-lg">Tech<span className="gt">Loop</span></span>
        </div>
        <p className="mono text-[10px] tracking-[.22em] text-cyan mb-3">AUTHENTICATION REQUIRED</p>
        <h2 className="text-3xl font-bold">Sign in to TechLoop</h2>
        <p className="text-dim text-[13.5px] mt-2">There is no unrestricted project interaction. Every action is tied to a role.</p>
        <div className="grid grid-cols-3 gap-2 mt-7">
          {ROLES.map((r) => <button key={r.id} onClick={() => { setRole(r.id); setEmail(state.users.find((u) => u.id === r.user).email); setErr(''); }}
            className={cn('p-3 rounded-xl border text-left transition-all', role === r.id ? 'bg-raised' : 'hair hover:bg-raised/60')}
            style={role === r.id ? { borderColor: `var(--${r.tone})`, boxShadow: `0 0 26px -12px var(--${r.tone})` } : null}>
            <span style={{ color: `var(--${r.tone})` }}><Icon name={r.icon} size={17} /></span>
            <p className="text-[13px] font-semibold mt-2">{r.label}</p>
            <p className="text-[10.5px] text-faint leading-tight mt-0.5">{r.desc}</p>
          </button>)}
        </div>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Institutional email" required><Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} placeholder="you@college.edu" autoComplete="email" /></Field>
          <Field label="Password" required hint="Demo build — any password of 4+ characters is accepted."><Input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(''); }} autoComplete="current-password" /></Field>
          {err && <p className="text-[12px] text-rose flex items-start gap-1.5"><Icon name="AlertTriangle" size={13} className="mt-0.5 shrink-0" />{err}</p>}
          <Btn type="submit" className="w-full" size="lg" loading={busy} iconRight={busy ? undefined : 'ArrowRight'}>Enter TechLoop</Btn>
        </form>
        <div className="flex items-center gap-3 my-5"><span className="flex-1 h-px bg-line" /><span className="mono text-[10px] text-faint">OR</span><span className="flex-1 h-px bg-line" /></div>
        <button onClick={() => enterAs(state.users.find((u) => u.id === ROLES.find((r) => r.id === role).user))}
          className="w-full h-12 rounded-xl border hair bg-raised hover:border-cyan transition-colors flex items-center justify-center gap-3 text-[13.5px] font-medium">
          <svg width="17" height="17" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8.1" /><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.2-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23" /><path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8z" /><path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.8-2.5 3.2-4.7 6-4.7" /></svg>
          Continue with institutional Google
        </button>
        <p className="text-[11.5px] text-faint mt-6 leading-relaxed">Google OAuth is wired to Django in production. In this build, selecting a role signs you into a seeded institutional account so the whole lifecycle is explorable.</p>
        <div className="mt-4"><Pill tone="lime" icon="Zap">One click · full archive loaded</Pill></div>
      </div>
    </div>
  </div>;
}