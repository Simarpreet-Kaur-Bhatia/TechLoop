'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon, Btn, Pill, Card } from '../../lib/ui';
import { useStore } from '../../lib/store';
import { answer, SUGGESTIONS } from '../../lib/ai';
import { cn } from '../../lib/data';

const PIPELINE = [['FileText','Project + report + feedback'],['Scissors','Chunking'],['Binary','Gemini embeddings'],['Database','PostgreSQL + pgvector'],['Search','Semantic retrieval'],['Sparkles','Gemini'],['ShieldCheck','Grounded answer + sources']];

function Assistant() {
  const { state } = useStore();
  const router = useRouter();
  const sp = useSearchParams();
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState(sp.get('q') || '');
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const endRef = useRef(null); const timer = useRef(null);
  useEffect(() => () => clearInterval(timer.current), []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, typed]);

  const send = (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput(''); setBusy(true); setTyped('');
    setMsgs((m) => [...m, { role: 'user', text: q }]);
    setTimeout(() => {
      const res = answer(q, state.projects);
      let i = 0; clearInterval(timer.current);
      timer.current = setInterval(() => {
        i += Math.max(3, Math.round(res.text.length / 90));
        setTyped(res.text.slice(0, i));
        if (i >= res.text.length) {
          clearInterval(timer.current); setTyped(''); setBusy(false);
          setMsgs((m) => [...m, { role: 'ai', text: res.text, sources: res.sources }]);
        }
      }, 16);
    }, 420);
  };

  return <div className="shell py-8 relative z-10">
    <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
      <div>
        <p className="mono text-[10px] tracking-[.2em] text-magenta">GROUNDING: INSTITUTIONAL ARCHIVE ONLY</p>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1 flex items-center gap-3"><Icon name="Bot" size={26} className="text-magenta" />TechLoop AI</h1>
        <p className="text-[13px] text-dim mt-1.5 max-w-2xl">Answers are retrieved from stored student projects and always cite their sources. If the archive has nothing relevant, the assistant says so rather than inventing an answer.</p>
      </div>
      <Pill tone="lime" icon="Database">{state.projects.filter((p) => p.status === 'approved').length} grounded sources</Pill>
    </div>

    <Card className="p-4 mb-6 overflow-x-auto nb">
      <p className="mono text-[10px] tracking-[.18em] text-faint mb-3">RAG PIPELINE</p>
      <div className="flex items-center gap-2 min-w-[760px]">
        {PIPELINE.map(([ic, l], i) => <div key={l} className="flex items-center gap-2 flex-1">
          <div className="flex-1 p-2.5 rounded-xl border hair bg-ink/40 text-center">
            <Icon name={ic} size={15} className="mx-auto text-cyan" />
            <p className="text-[10.5px] text-dim mt-1.5 leading-tight">{l}</p>
          </div>
          {i < PIPELINE.length - 1 && <Icon name="ChevronRight" size={14} className="text-faint shrink-0" />}
        </div>)}
      </div>
    </Card>

    <div className="grid lg:grid-cols-[1fr_300px] gap-6">
      <Card className="flex flex-col min-h-[520px] max-h-[70vh]">
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!msgs.length && !typed && <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <span className="w-16 h-16 rounded-2xl grid place-items-center border hair text-magenta mb-4" style={{ background: 'color-mix(in srgb,var(--magenta) 10%,transparent)' }}><Icon name="Sparkles" size={28} /></span>
            <p className="font-display text-lg font-semibold">Have students worked on something like your idea?</p>
            <p className="text-[13px] text-dim mt-2 max-w-md">Describe the problem in plain language. The assistant searches the archive by meaning and returns ranked projects with their reported failures.</p>
            <div className="flex flex-col gap-2 mt-6 w-full max-w-md">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="text-left p-3 rounded-xl border hair bg-ink/40 hover:border-magenta transition-colors text-[12.5px] text-dim hover:text-fg flex items-center gap-2">
                <Icon name="CornerDownRight" size={13} className="text-magenta shrink-0" />{s}</button>)}
            </div>
          </div>}
          {msgs.map((m, i) => m.role === 'user'
            ? <div key={i} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-2.5 text-[13.5px] border hair bg-raised">{m.text}</div></div>
            : <div key={i} className="space-y-3">
                <div className="flex gap-3">
                  <span className="w-8 h-8 rounded-lg grid place-items-center border hair text-magenta shrink-0"><Icon name="Bot" size={15} /></span>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border hair bg-ink/40 p-4">
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-line">{m.text}</p></div>
                </div>
                {m.sources?.length > 0 && <div className="pl-11">
                  <p className="mono text-[10px] tracking-[.16em] text-faint mb-2">SOURCES USED</p>
                  <div className="flex flex-wrap gap-2">{m.sources.map((s) => (
                    <button key={s.id} onClick={() => router.push('/project/' + s.id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border hair bg-raised hover:border-magenta transition-colors">
                      <Icon name="FolderGit2" size={13} className="text-magenta" />
                      <span className="text-[12px] max-w-[200px] truncate">{s.title}</span>
                      <span className="mono text-[10px] text-lime tb">{s.score}%</span></button>
                  ))}</div>
                </div>}
              </div>)}
          {typed && <div className="flex gap-3">
            <span className="w-8 h-8 rounded-lg grid place-items-center border hair text-magenta shrink-0"><Icon name="Bot" size={15} /></span>
            <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border hair bg-ink/40 p-4">
              <p className="text-[13.5px] leading-relaxed whitespace-pre-line car">{typed}</p></div>
          </div>}
          {busy && !typed && <div className="flex gap-3 items-center text-dim text-[12.5px]">
            <span className="w-8 h-8 rounded-lg grid place-items-center border hair text-magenta shrink-0"><Icon name="Search" size={15} className="spin" /></span>
            Retrieving from pgvector…</div>}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="p-4 border-t hair flex gap-2 items-end">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Describe your idea or ask about previous work…" className="inp flex-1 min-h-[46px] max-h-32 py-3" />
          <Btn type="submit" icon="Send" loading={busy} disabled={!input.trim()}>Ask</Btn>
        </form>
      </Card>

      <aside className="space-y-5 min-w-0">
        <Card className="p-5">
          <p className="font-display font-semibold text-[14.5px] mb-3 flex items-center gap-2"><Icon name="ShieldCheck" size={15} className="text-lime" />Grounding rules</p>
          <ul className="space-y-2.5 text-[12.5px] text-dim">
            {['Only approved archive projects are retrieved.','Every answer lists the source projects it used.','Below the similarity floor, the assistant abstains.','AI never submits or edits work on your behalf.'].map((t) => (
              <li key={t} className="flex gap-2"><Icon name="Check" size={13} className="text-lime mt-0.5 shrink-0" />{t}</li>
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <p className="font-display font-semibold text-[14.5px] mb-3 flex items-center gap-2"><Icon name="Lightbulb" size={15} className="text-amber" />Try these</p>
          <div className="space-y-2">{SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} disabled={busy}
            className={cn('w-full text-left p-2.5 rounded-lg border hair text-[12px] text-dim hover:text-fg hover:border-amber transition-colors', busy && 'opacity-50')}>{s}</button>)}</div>
        </Card>
        {msgs.length > 0 && <Btn variant="s" icon="RotateCcw" className="w-full" onClick={() => { clearInterval(timer.current); setMsgs([]); setTyped(''); setBusy(false); }}>Clear conversation</Btn>}
      </aside>
    </div>
  </div>;
}

export default function Page() {
  return <Suspense fallback={<div className="shell py-20 mono text-[11px] text-faint">LOADING ASSISTANT…</div>}><Assistant /></Suspense>;
}