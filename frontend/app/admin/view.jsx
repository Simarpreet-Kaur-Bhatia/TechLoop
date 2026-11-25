'use client';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, Btn, Avatar, Card, Tabs, Empty, Pill, Select, StatusPill, Meter, Modal, Section, StatCard, BarChart, HBars, Donut } from '../../lib/ui';
import { useStore, userById } from '../../lib/store';
import { DEPTS, STATUS, DOMAIN_TONE, rel, toCSV, download } from '../../lib/data';

export default function Admin() {
  const { state, dispatch, me } = useStore();
  const router = useRouter();
  const [tab, setTab] = useState('overview');
  const [q, setQ] = useState('');
  const [roleF, setRoleF] = useState('all');
  const [confirm, setConfirm] = useState(null);
  const faculty = state.users.filter((u) => u.role === 'faculty');
  const students = state.users.filter((u) => u.role === 'student');
  const byDept = DEPTS.map((d) => ({ label: d, value: state.projects.filter((p) => p.dept === d).length }));
  const byYear = [...new Set(state.projects.map((p) => p.academicYear))].sort().map((y) => ({ label: y, value: state.projects.filter((p) => p.academicYear === y).length }));
  const techCount = useMemo(() => {
    const m = {}; state.projects.forEach((p) => p.tech.forEach((t) => { m[t] = (m[t] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, value]) => ({ label, value }));
  }, [state.projects]);
  const statusData = ['approved','pending','revision_requested','draft','flagged'].map((s) => ({ label: STATUS[s].label, value: state.projects.filter((p) => p.status === s).length })).filter((d) => d.value);
  const flagged = state.projects.filter((p) => p.flagged);
  const discussions = state.projects.flatMap((p) => p.discussion.map((d) => ({ ...d, project: p })));
  const users = state.users.filter((u) => (roleF === 'all' || u.role === roleF) && (u.name + u.email + u.dept).toLowerCase().includes(q.toLowerCase()));
  const projects = state.projects.filter((p) => (p.title + userById(state, p.ownerId).name).toLowerCase().includes(q.toLowerCase()));
  const exportReport = () => {
    const rows = [['Project','Owner','Department','Batch','Type','Status','Faculty','Feedback rounds','Views','Visibility']];
    state.projects.forEach((p) => rows.push([p.title, userById(state, p.ownerId).name, p.dept, p.academicYear, p.type, p.status, p.facultyId ? userById(state, p.facultyId).name : 'Unassigned', p.feedback.length, p.views, p.visibility]));
    download('techloop-institutional-report.csv', toCSV(rows), 'text/csv');
    dispatch({ type:'TOAST', toast:{ kind:'ok', title:'Report exported', msg:`${rows.length - 1} project records.` } });
  };

  return <div className="shell py-8 relative z-10">
    <div className="flex items-start justify-between gap-4 flex-wrap mb-7">
      <div className="flex items-center gap-4 min-w-0">
        <Avatar user={me} size={54} ring />
        <div className="min-w-0">
          <p className="mono text-[10px] tracking-[.2em] text-rose">ADMINISTRATOR</p>
          <h1 className="text-2xl sm:text-3xl font-bold mt-1">Institutional control panel</h1>
          <p className="text-[12.5px] text-dim mt-0.5">{me.name} · {me.email}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <Btn variant="o" icon="Download" onClick={exportReport}>Export report</Btn>
        <Btn variant="s" icon="RotateCcw" onClick={() => dispatch({ type: 'RESET' })}>Reset demo data</Btn>
      </div>
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <StatCard icon="Users" label="Users" value={state.users.length} tone="cyan" sub={`${students.length} students · ${faculty.length} faculty`} onClick={() => setTab('users')} />
      <StatCard icon="FolderGit2" label="Projects" value={state.projects.length} tone="lime" sub={`${state.projects.filter((p) => p.status === 'approved').length} approved`} onClick={() => setTab('projects')} />
      <StatCard icon="Clock" label="In evaluation" value={state.projects.filter((p) => ['pending','in_review'].includes(p.status)).length} tone="amber" sub="Across all faculty queues" onClick={() => setTab('assignments')} />
      <StatCard icon="Flag" label="Flagged" value={flagged.length} tone="magenta" sub="Awaiting moderation" onClick={() => setTab('moderation')} />
    </div>
    <div className="flex items-center gap-3 mb-6 flex-wrap">
      <Tabs value={tab} onChange={setTab} tabs={[
        { id:'overview', label:'Overview', icon:'LayoutDashboard' },
        { id:'users', label:'Users', icon:'Users', count: state.users.length },
        { id:'projects', label:'Projects', icon:'FolderGit2', count: state.projects.length },
        { id:'assignments', label:'Assignments', icon:'ShieldCheck', count: faculty.length },
        { id:'moderation', label:'Moderation', icon:'Flag', count: flagged.length },
        { id:'reports', label:'Reports', icon:'BarChart3' }]} />
      {['users','projects'].includes(tab) && <div className="relative flex-1 min-w-[200px] max-w-xs ml-auto">
        <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="inp h-9 py-0 pl-9 text-[13px]" /></div>}
      {tab === 'users' && <Select value={roleF} onChange={(e) => setRoleF(e.target.value)} className="h-9 py-0 w-auto">
        <option value="all">All roles</option><option value="student">Students</option><option value="faculty">Faculty</option><option value="admin">Admins</option></Select>}
    </div>

    {tab === 'overview' && <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-5"><p className="font-display font-semibold text-[15px] mb-4">Projects by department</p><BarChart data={byDept} /></Card>
      <Card className="p-5"><p className="font-display font-semibold text-[15px] mb-4">Projects by batch year</p><BarChart data={byYear} /></Card>
      <Card className="p-5"><p className="font-display font-semibold text-[15px] mb-4">Technologies used</p><HBars data={techCount} /></Card>
      <Card className="p-5"><p className="font-display font-semibold text-[15px] mb-4">Lifecycle distribution</p><Donut data={statusData} /></Card>
      <Card className="p-5 lg:col-span-2">
        <p className="font-display font-semibold text-[15px] mb-4">Recent institutional activity</p>
        <div className="space-y-2.5">{state.notifications.slice(0, 8).map((n) => (
          <div key={n.id} className="flex items-start gap-3 text-[12.5px]">
            <Icon name="Activity" size={13} className="text-cyan mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1"><p className="truncate">{n.title}</p><p className="mono text-[10px] text-faint">{userById(state, n.userId).name} · {rel(n.createdAt)}</p></div>
          </div>
        ))}</div>
      </Card>
    </div>}

    {tab === 'users' && <Card className="overflow-x-auto">
      <table className="w-full text-[12.5px] min-w-[720px]">
        <thead><tr className="border-b hair text-left"><th className="p-3">User</th><th className="p-3">Role</th><th className="p-3">Dept</th><th className="p-3">Projects</th><th className="p-3">Status</th><th className="p-3 text-right">Action</th></tr></thead>
        <tbody>{users.map((u) => {
          const count = u.role === 'faculty' ? state.projects.filter((p) => p.facultyId === u.id).length : state.projects.filter((p) => p.ownerId === u.id).length;
          return <tr key={u.id} className="border-b hair last:border-0 hover:bg-raised">
            <td className="p-3"><div className="flex items-center gap-2.5"><Avatar user={u} size={30} /><div className="min-w-0"><p className="font-medium truncate">{u.name}</p><p className="mono text-[10px] text-faint truncate">{u.email}</p></div></div></td>
            <td className="p-3"><Pill tone={u.role === 'faculty' ? 'violet' : u.role === 'admin' ? 'rose' : 'cyan'}>{u.role}</Pill></td>
            <td className="p-3 text-dim">{u.dept}</td>
            <td className="p-3 mono tb text-dim">{count}</td>
            <td className="p-3"><Pill tone={u.active === false ? 'faint' : 'lime'} icon={u.active === false ? 'UserX' : 'UserCheck'}>{u.active === false ? 'Deactivated' : 'Active'}</Pill></td>
            <td className="p-3 text-right"><Btn size="xs" variant={u.active === false ? 'ok' : 's'} icon={u.active === false ? 'UserCheck' : 'UserX'}
              onClick={() => { dispatch({ type:'USER_PATCH', id:u.id, patch:{ active: u.active === false } }); dispatch({ type:'TOAST', toast:{ kind:'info', title: u.active === false ? 'Account reactivated' : 'Account deactivated', msg:u.name } }); }}>
              {u.active === false ? 'Activate' : 'Deactivate'}</Btn></td>
          </tr>;
        })}</tbody>
      </table>
      {!users.length && <div className="p-6"><Empty icon="UserSearch" title="No users match" msg="Adjust the search or role filter." /></div>}
    </Card>}

    {tab === 'projects' && <div className="space-y-2.5">
      {!projects.length && <Empty icon="FolderSearch" title="No projects match" msg="Adjust the search term." />}
      {projects.map((p) => <Card key={p.id} className="p-4 flex items-start gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => router.push('/project/' + p.id)} className="font-display font-semibold text-[15px] hover:text-cyan text-left">{p.title}</button>
            <StatusPill status={p.status} />{p.flagged && <Pill tone="magenta" icon="Flag">Flagged</Pill>}
          </div>
          <p className="mono text-[10.5px] text-faint mt-1">{userById(state, p.ownerId).name} · {p.dept} · {p.academicYear} · {p.feedback.length} review rounds · {p.views} views</p>
          <div className="flex gap-1.5 mt-2 flex-wrap">{p.domain.map((d) => <Pill key={d} tone={DOMAIN_TONE[d]}>{d}</Pill>)}</div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <Btn size="xs" variant="s" icon="Eye" onClick={() => router.push('/project/' + p.id)}>Open</Btn>
          <Btn size="xs" variant={p.flagged ? 'ok' : 's'} icon="Flag" onClick={() => dispatch({ type:'FLAG', id:p.id, title:p.title })}>{p.flagged ? 'Unflag' : 'Flag'}</Btn>
          <Btn size="xs" variant="d" icon="Trash2" onClick={() => setConfirm(p)}>Remove</Btn>
        </div>
      </Card>)}
    </div>}

    {tab === 'assignments' && <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        {faculty.map((f) => {
          const list = state.projects.filter((p) => p.facultyId === f.id);
          const active = list.filter((p) => p.status !== 'approved').length;
          const pct = Math.round((active / f.maxLoad) * 100);
          return <Card key={f.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar user={f} size={38} />
              <div className="min-w-0 flex-1"><p className="text-[13.5px] font-semibold truncate">{f.name}</p><p className="mono text-[10.5px] text-faint">{f.dept} · max {f.maxLoad}</p></div>
              <Pill tone={pct > 80 ? 'rose' : pct > 50 ? 'amber' : 'lime'}>{active}/{f.maxLoad}</Pill>
            </div>
            <Meter value={pct} tone={pct > 80 ? 'rose' : pct > 50 ? 'amber' : 'lime'} />
            <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto">
              {list.map((p) => <div key={p.id} className="flex items-center gap-2 text-[12px]"><span className="truncate flex-1 text-dim">{p.title}</span><StatusPill status={p.status} /></div>)}
              {!list.length && <p className="text-[12px] text-faint">No projects assigned.</p>}
            </div>
          </Card>;
        })}
      </div>
      <Section title="Assign / reassign" sub="Changing the faculty immediately moves the project between evaluation queues.">
        <Card className="overflow-x-auto">
          <table className="w-full text-[12.5px] min-w-[640px]">
            <thead><tr className="border-b hair text-left"><th className="p-3">Project</th><th className="p-3">Student</th><th className="p-3">Status</th><th className="p-3 w-[240px]">Assigned faculty</th></tr></thead>
            <tbody>{state.projects.map((p) => (
              <tr key={p.id} className="border-b hair last:border-0">
                <td className="p-3 font-medium max-w-[260px] truncate">{p.title}</td>
                <td className="p-3 text-dim">{userById(state, p.ownerId).name}</td>
                <td className="p-3"><StatusPill status={p.status} /></td>
                <td className="p-3"><Select value={p.facultyId || ''} className="h-9 py-0" onChange={(e) => e.target.value && dispatch({ type:'ASSIGN', projectId:p.id, facultyId:e.target.value })}>
                  <option value="">Unassigned</option>{faculty.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.dept})</option>)}</Select></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </Section>
    </div>}

    {tab === 'moderation' && <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-5">
        <p className="font-display font-semibold text-[15px] mb-4 flex items-center gap-2"><Icon name="Flag" size={16} className="text-magenta" />Reported content</p>
        {!flagged.length ? <Empty icon="ShieldCheck" title="Nothing flagged" msg="Flagged projects appear here for review." /> :
          <div className="space-y-2.5">{flagged.map((p) => <div key={p.id} className="p-3 rounded-xl border hair bg-ink/40 flex items-center gap-3 flex-wrap">
            <span className="text-[13px] flex-1 min-w-0 truncate">{p.title}</span>
            <Btn size="xs" variant="s" icon="Eye" onClick={() => router.push('/project/' + p.id)}>Inspect</Btn>
            <Btn size="xs" variant="ok" icon="Check" onClick={() => dispatch({ type:'FLAG', id:p.id, title:p.title })}>Clear</Btn>
          </div>)}</div>}
      </Card>
      <Card className="p-5">
        <p className="font-display font-semibold text-[15px] mb-4 flex items-center gap-2"><Icon name="MessagesSquare" size={16} className="text-cyan" />Discussions ({discussions.length})</p>
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto">
          {discussions.map((d) => <div key={d.id} className="p-3 rounded-xl border hair bg-ink/40">
            <p className="text-[12.5px] leading-snug">{d.text}</p>
            <p className="mono text-[10px] text-faint mt-1.5">{userById(state, d.authorId).name} on {d.project.title} · {rel(d.createdAt)}</p></div>)}
          {!discussions.length && <p className="text-[12.5px] text-dim">No discussion posts yet.</p>}
        </div>
      </Card>
      <Card className="p-5 lg:col-span-2">
        <p className="font-display font-semibold text-[15px] mb-4 flex items-center gap-2"><Icon name="Files" size={16} className="text-amber" />Uploaded files</p>
        <div className="overflow-x-auto"><table className="w-full text-[12.5px] min-w-[620px]">
          <thead><tr className="border-b hair text-left"><th className="p-2.5">file_name</th><th className="p-2.5">project_id</th><th className="p-2.5">file_type</th><th className="p-2.5">storage_path</th><th className="p-2.5 text-right">size</th></tr></thead>
          <tbody>{state.projects.flatMap((p) => p.resources.filter((r) => r.size).map((r) => (
            <tr key={r.id} className="border-b hair last:border-0">
              <td className="p-2.5 truncate max-w-[200px]">{r.label}</td>
              <td className="p-2.5 mono text-faint">{p.id}</td>
              <td className="p-2.5"><Pill tone="cyan">{r.kind}</Pill></td>
              <td className="p-2.5 mono text-[10.5px] text-faint truncate max-w-[220px]">supabase://projects/{p.id}/{r.label}</td>
              <td className="p-2.5 text-right mono tb text-dim">{(r.size / 1048576).toFixed(2)} MB</td>
            </tr>
          )))}</tbody>
        </table></div>
      </Card>
    </div>}

    {tab === 'reports' && <div className="grid lg:grid-cols-2 gap-5">
      <Card className="p-5"><p className="font-display font-semibold text-[15px] mb-4">Projects by department</p><BarChart data={byDept} height={220} /></Card>
      <Card className="p-5"><p className="font-display font-semibold text-[15px] mb-4">Projects by year</p><BarChart data={byYear} height={220} /></Card>
      <Card className="p-5"><p className="font-display font-semibold text-[15px] mb-4">Technologies used</p><HBars data={techCount} /></Card>
      <Card className="p-5"><p className="font-display font-semibold text-[15px] mb-4">Activity by status</p><Donut data={statusData} size={190} /></Card>
      <Card className="p-5 lg:col-span-2 flex items-center justify-between gap-4 flex-wrap">
        <div><p className="font-display font-semibold text-[15px]">Institutional report</p><p className="text-[12.5px] text-dim mt-1">Every project with owner, department, batch, faculty, review rounds and visibility.</p></div>
        <div className="flex gap-2">
          <Btn variant="o" icon="FileJson" onClick={() => { download('techloop-archive.json', JSON.stringify(state.projects, null, 2), 'application/json'); dispatch({ type:'TOAST', toast:{ kind:'ok', title:'JSON exported', msg:`${state.projects.length} records.` } }); }}>JSON</Btn>
          <Btn icon="Download" onClick={exportReport}>CSV report</Btn>
        </div>
      </Card>
    </div>}

    <Modal open={!!confirm} onClose={() => setConfirm(null)} title="Remove this project?" sub="Undo is available from the toast for 9 seconds."
      footer={<><Btn variant="g" onClick={() => setConfirm(null)}>Cancel</Btn><Btn variant="d" icon="Trash2" onClick={() => { dispatch({ type:'PROJECT_DELETE', ids:[confirm.id] }); setConfirm(null); }}>Remove project</Btn></>}>
      <p className="text-[13.5px] text-dim leading-relaxed">{confirm?.title} will be removed from the archive, all faculty queues and student dashboards. Feedback history is deleted with it.</p>
    </Modal>
  </div>;
}