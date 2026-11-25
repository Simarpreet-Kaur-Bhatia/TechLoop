'use client';
import { Component } from 'react';
import { Icon, Btn, Card, Empty, Pill } from './ui';
import { metaFor } from './access';

export const safePct = (n, d) => {
  const num = Number(n), den = Number(d);
  if (!den || Number.isNaN(num) || Number.isNaN(den)) return 0;
  return Math.max(0, Math.min(100, Math.round((num / den) * 100)));
};

export class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('[TechLoop]', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    const e = this.state.error;
    return (
      <div className="shell py-12 relative z-10">
        <Card className="p-6" style={{ borderLeft: '3px solid var(--rose)' }}>
          <p className="flex items-center gap-2 font-display font-semibold text-[16px] text-rose">
            <Icon name="AlertTriangle" size={18} />This screen hit an error
          </p>
          <p className="text-[13px] text-dim mt-2 leading-relaxed">The rest of TechLoop is still working. Copy the message below and send it over.</p>
          <pre className="mono text-[11.5px] text-fg bg-ink/60 border hair rounded-xl p-3.5 mt-4 overflow-x-auto whitespace-pre-wrap break-words">{String(e?.message || e)}</pre>
          {e?.stack && (
            <details className="mt-3">
              <summary className="mono text-[11px] text-faint cursor-pointer">stack trace</summary>
              <pre className="mono text-[10.5px] text-faint mt-2 overflow-x-auto whitespace-pre-wrap">{e.stack}</pre>
            </details>
          )}
          <div className="flex gap-2 mt-5 flex-wrap">
            <Btn icon="RotateCcw" onClick={() => this.setState({ error: null })}>Try again</Btn>
            <Btn variant="o" icon="Zap" onClick={() => { window.location.href = metaFor(this.props.role).home; }}>Back to my workspace</Btn>
            <Btn variant="s" icon="Trash2" onClick={() => { localStorage.removeItem('techloop.archive.v2'); window.location.reload(); }}>Reset saved data</Btn>
          </div>
        </Card>
      </div>
    );
  }
}

export function WrongRole({ need, role, home, area }) {
  const mine = metaFor(role);
  return (
    <div className="shell py-16 relative z-10">
      <Card className="p-6 sm:p-8 max-w-2xl mx-auto relative overflow-hidden" style={{ borderLeft: '3px solid var(--amber)' }}>
        <div className="absolute inset-0 bp opacity-50 pointer-events-none" />
        <div className="relative">
          <div className="flex items-center gap-2 flex-wrap">
            <Pill tone="amber" icon="ShieldAlert">Access restricted</Pill>
            <Pill tone={mine.tone} icon={mine.icon}>{mine.label} session</Pill>
          </div>
          <h1 className="text-2xl font-bold mt-4">{area || 'This area'} is not part of your role</h1>
          <p className="text-[13.5px] text-dim mt-2 leading-relaxed">
            TechLoop enforces role-based access. This screen belongs to <span className="text-fg font-medium">{need}</span>.
            Your verified session is <span className="text-fg font-medium">{mine.label}</span>, so it stays out of reach —
            in the navigation, in search, and in the command palette.
          </p>

          <div className="mt-5 p-3.5 rounded-xl border hair bg-ink/40">
            <p className="mono text-[10px] tracking-[.16em] text-faint mb-2">WHAT YOUR ROLE CAN REACH</p>
            <div className="space-y-1.5">
              {(role === 'student'
                ? [['Zap', 'Home, trending and AI recommendations'], ['LayoutDashboard', 'Your dashboard, submissions and feedback'], ['Plus', 'Create a project and submit it for evaluation'], ['Compass', 'Explore, TechLoop AI and your saved shelf']]
                : role === 'faculty'
                  ? [['ShieldCheck', 'Evaluation queue — only projects assigned to you'], ['ClipboardCheck', 'Rubric review, feedback and revision requests'], ['Compass', 'Explore the wider archive in exploration mode'], ['Sparkles', 'TechLoop AI and your saved shelf']]
                  : [['Users', 'Manage students, faculty and administrators'], ['GitBranch', 'Assign and reassign faculty evaluations'], ['Flag', 'Moderate projects, discussions and files'], ['BarChart3', 'Institutional reports and data export']]
              ).map(([ic, t]) => (
                <div key={t} className="flex items-start gap-2 text-[12.5px] text-dim">
                  <Icon name={ic} size={13} className="text-cyan mt-0.5 shrink-0" />{t}
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-6 flex-wrap">
            <Btn icon="ArrowRight" onClick={() => { window.location.href = home; }}>Go to my workspace</Btn>
            <Btn variant="o" icon="Compass" onClick={() => { window.location.href = '/explore'; }}>Explore the archive</Btn>
          </div>
          <p className="text-[11px] text-faint mt-4 leading-relaxed">
            Need a different role? Sign out from the avatar menu and verify again with the correct institutional identity.
          </p>
        </div>
      </Card>
    </div>
  );
}

export function NotFound({ home }) {
  return (
    <div className="shell py-20 relative z-10">
      <Empty icon="FolderX" title="Record not available"
        msg="This project does not exist, was removed, or is not visible to your role and visibility settings."
        action={<Btn icon="Compass" onClick={() => { window.location.href = '/explore'; }}>Back to archive</Btn>} />
    </div>
  );
}