'use client';
import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { USERS, PROJECTS, NOTIFICATIONS, uid } from './data';

const KEY = 'techloop.archive.v2';
const Store = createContext(null);

const ARRAYS = ['domain', 'tech', 'team', 'resources', 'feedback', 'discussion', 'savedBy', 'followers', 'concepts'];
const TEXT = ['short', 'problem', 'solution', 'challenge', 'didntWork', 'solved', 'learnings', 'future'];

export const normalize = (p) => {
  const src = p || {};
  const o = { ...src };
  ARRAYS.forEach((k) => { if (!Array.isArray(o[k])) o[k] = []; });
  TEXT.forEach((k) => { if (typeof o[k] !== 'string') o[k] = ''; });
  o.id = o.id || uid('p');
  o.title = o.title || 'Untitled project';
  o.ownerId = o.ownerId || 'u_aarav';
  o.facultyId = o.facultyId ?? null;
  o.dept = o.dept || 'CSE';
  o.year = o.year || '3rd';
  o.type = o.type || 'Major Project';
  o.academicYear = String(o.academicYear || new Date().getFullYear());
  o.status = o.status || 'draft';
  o.visibility = o.visibility || 'draft';
  o.views = Number(o.views) || 0;
  o.flagged = !!o.flagged;
  o.createdAt = o.createdAt || new Date().toISOString();
  o.updatedAt = o.updatedAt || o.createdAt;
  o.team = o.team.map((t) => ({ id: t?.id || uid('tm'), name: t?.name || '', role: t?.role || '', userId: t?.userId || null }));
  o.feedback = o.feedback.map((f, i) => ({
    id: f?.id || uid('fb'), authorId: f?.authorId || 'f_sharma', version: f?.version ?? i + 1,
    decision: f?.decision || 'note', body: f?.body || '', criteria: f?.criteria || null, createdAt: f?.createdAt || o.createdAt,
  }));
  o.discussion = o.discussion.map((d) => ({ id: d?.id || uid('d'), authorId: d?.authorId || 'u_aarav', text: d?.text || '', createdAt: d?.createdAt || o.createdAt }));
  o.resources = o.resources.map((r) => ({ id: r?.id || uid('r'), kind: r?.kind || 'other', label: r?.label || '', url: r?.url || '', size: Number(r?.size) || 0 }));
  return o;
};

const base = () => ({
  session: null,
  auth: null,
  theme: 'dark',
  users: USERS,
  projects: PROJECTS.map(normalize),
  notifications: NOTIFICATIONS,
  recent: [],
  toasts: [],
  undo: null,
  savedViews: [
    { id: 'v_iot', name: 'IoT + hardware failures', filters: { domain: ['IoT'], tech: [], year: [], dept: [], type: [], faculty: [], q: '', sem: true, semantic: true } },
    { id: 'v_ai', name: 'AI/ML major projects', filters: { domain: ['AI/ML'], tech: [], year: [], dept: [], type: ['Major Project'], faculty: [], q: '', sem: true, semantic: true } },
  ],
});

function init() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { saved = null; }
  const b = base();
  if (!saved || !Array.isArray(saved.projects)) return b;
  const auth = saved.auth && saved.auth.verified ? saved.auth : null;
  return {
    ...b, ...saved,
    projects: saved.projects.map(normalize),
    users: Array.isArray(saved.users) && saved.users.length ? saved.users : USERS,
    notifications: Array.isArray(saved.notifications) ? saved.notifications : NOTIFICATIONS,
    savedViews: Array.isArray(saved.savedViews) ? saved.savedViews : b.savedViews,
    recent: Array.isArray(saved.recent) ? saved.recent : [],
    auth,
    session: auth ? saved.session ?? auth.userId : null,
    theme: saved.theme === 'light' ? 'light' : 'dark',
    toasts: [], undo: null,
  };
}

const toast = (s, t) => ({ ...s, toasts: [...s.toasts, { id: uid('t'), ...t }].slice(-4) });
const notify = (s, userId, kind, title, body, projectId) => ({
  ...s, notifications: [{ id: uid('n'), userId, kind, title, body, projectId, createdAt: new Date().toISOString(), read: false }, ...s.notifications],
});
const U = (s, id) => s.users.find((u) => u.id === id) || s.users[0];
const teamOf = (p) => (Array.isArray(p?.team) ? p.team : []);

function reducer(s, a) {
  switch (a.type) {
    case 'REGISTER': {
      const existing = s.users.find((u) => u.id === a.userId);
      const batch = 2026 + (a.role === 'student' ? Math.max(0, 4 - Number(a.yearNum || 3)) : 0);
      const user = existing
        ? { ...existing, name: a.name || existing.name, age: a.age ?? existing.age, college: a.college || existing.college, phone: a.phone || existing.phone, dept: a.dept || existing.dept, verified: true }
        : {
            id: a.userId, name: a.name, role: a.role, email: a.email, dept: a.dept || 'CSE',
            age: a.age, college: a.college, phone: a.phone, verified: true,
            ...(a.role === 'student'
              ? { year: '3rd', batch, roll: `${(a.dept || 'CSE').slice(0, 3).toUpperCase()}${String(Math.floor(1000 + Math.random() * 8999))}` }
              : a.role === 'faculty'
                ? { title: 'Faculty Member', maxLoad: 40, spec: `${a.dept || 'CSE'} · Verified reviewer` }
                : { title: 'Administrator' }),
          };

      let users = existing ? s.users.map((u) => (u.id === user.id ? user : u)) : [...s.users, user];
      let projects = s.projects;
      let notifications = s.notifications;

      /* a newly verified faculty inherits the live evaluation pool so the queue is real */
      if (a.role === 'faculty' && !existing) {
        const pool = s.projects.filter((p) => ['pending', 'in_review', 'revision_requested'].includes(p.status)).slice(0, 3);
        const ids = pool.map((p) => p.id);
        projects = s.projects.map((p) => (ids.includes(p.id) ? { ...p, facultyId: user.id } : p));
        pool.forEach((p) => {
          notifications = [{ id: uid('n'), userId: user.id, kind: 'assigned', title: `Assigned to you: ${p.title}`, body: `${U(s, p.ownerId).name} · ${p.dept} · ${p.type}`, projectId: p.id, createdAt: new Date().toISOString(), read: false }, ...notifications];
        });
      }
      if (a.role === 'student' && !existing) {
        notifications = [{ id: uid('n'), userId: user.id, kind: 'assigned', title: 'Welcome to TechLoop', body: 'Explore the archive, then create your first project record.', projectId: null, createdAt: new Date().toISOString(), read: false }, ...notifications];
      }

      const auth = { verified: true, userId: user.id, name: user.name, age: a.age, college: a.college, role: a.role, dept: user.dept, phone: a.phone, at: new Date().toISOString() };
      return toast(
        { ...s, users, projects, notifications, session: user.id, auth, recent: [] },
        { kind: 'ok', title: 'Identity verified', msg: `${user.name} · ${a.role} · ${a.phone}` }
      );
    }

    case 'LOGIN': {
      const u = s.users.find((x) => x.id === a.id);
      if (!u) return s;
      return { ...s, session: a.id, auth: { verified: true, userId: u.id, name: u.name, age: u.age ?? null, college: u.college || 'Punjab Engineering College, Chandigarh', role: u.role, dept: u.dept, phone: u.phone || '—', at: new Date().toISOString() } };
    }
    case 'LOGOUT': return { ...s, session: null, auth: null, recent: [] };
    case 'THEME': return { ...s, theme: a.value };
    case 'TOAST': return toast(s, a.toast);
    case 'TOAST_OFF': return { ...s, toasts: s.toasts.filter((t) => t.id !== a.id) };

    case 'PROJECT_ADD': return { ...s, projects: [normalize(a.project), ...s.projects] };
    case 'PROJECT_PATCH': return { ...s, projects: s.projects.map((p) => (p.id === a.id ? normalize({ ...p, ...a.patch, updatedAt: new Date().toISOString() }) : p)) };
    case 'PROJECT_DELETE': {
      const gone = s.projects.filter((p) => a.ids.includes(p.id));
      if (!gone.length) return s;
      return toast({ ...s, projects: s.projects.filter((p) => !a.ids.includes(p.id)), undo: { projects: s.projects } },
        { kind: 'warn', title: `${gone.length} project${gone.length > 1 ? 's' : ''} deleted`, msg: gone.map((g) => g.title).join(', '), undo: true });
    }
    case 'UNDO': return s.undo ? toast({ ...s, projects: s.undo.projects, undo: null }, { kind: 'ok', title: 'Restored', msg: 'Deletion was undone.' }) : s;
    case 'REORDER': {
      const map = Object.fromEntries(s.projects.map((p) => [p.id, p]));
      const moved = a.ids.map((id) => map[id]).filter(Boolean);
      if (!moved.length) return s;
      return { ...s, projects: [...moved, ...s.projects.filter((p) => !a.ids.includes(p.id))] };
    }

    case 'SUBMIT': {
      const p = s.projects.find((x) => x.id === a.id); if (!p) return s;
      let n = { ...s, projects: s.projects.map((x) => (x.id === a.id ? { ...x, facultyId: a.facultyId, status: 'pending', visibility: x.visibility === 'draft' ? 'faculty' : x.visibility, updatedAt: new Date().toISOString() } : x)) };
      n = notify(n, a.facultyId, 'assigned', `New project assigned: ${p.title}`, `${U(s, p.ownerId).name} · ${p.dept} · ${p.type}`, p.id);
      n = notify(n, p.ownerId, 'assigned', `${p.title} submitted to ${U(s, a.facultyId).name}`, 'Your project entered the evaluation queue.', p.id);
      return toast(n, { kind: 'ok', title: 'Submitted for evaluation', msg: `Assigned to ${U(s, a.facultyId).name}` });
    }

    case 'REVIEW': {
      const p = s.projects.find((x) => x.id === a.projectId); if (!p) return s;
      const entry = { id: uid('fb'), authorId: s.session, version: (p.feedback?.length || 0) + 1, decision: a.decision, body: a.body, criteria: a.criteria, createdAt: new Date().toISOString() };
      const status = a.decision === 'approved' ? 'approved' : a.decision === 'revision_requested' ? 'revision_requested' : 'in_review';
      let n = { ...s, projects: s.projects.map((x) => (x.id === a.projectId ? { ...x, status, feedback: [...x.feedback, entry], visibility: a.decision === 'approved' && x.visibility !== 'draft' ? 'public' : x.visibility, updatedAt: new Date().toISOString() } : x)) };
      const label = a.decision === 'approved' ? 'Project approved' : a.decision === 'revision_requested' ? 'Revision requested' : 'Review note saved';
      n = notify(n, p.ownerId, a.decision === 'approved' ? 'approved' : 'feedback', `${label}: ${p.title}`, a.body.slice(0, 120), p.id);
      teamOf(p).forEach((m) => { if (m.userId && m.userId !== p.ownerId) n = notify(n, m.userId, 'feedback', `${label}: ${p.title}`, a.body.slice(0, 120), p.id); });
      return toast(n, { kind: a.decision === 'approved' ? 'ok' : 'info', title: label, msg: p.title });
    }

    case 'SAVE_TOGGLE': return { ...s, projects: s.projects.map((p) => (p.id === a.id ? { ...p, savedBy: p.savedBy.includes(s.session) ? p.savedBy.filter((u) => u !== s.session) : [...p.savedBy, s.session] } : p)) };
    case 'FOLLOW_TOGGLE': return { ...s, projects: s.projects.map((p) => (p.id === a.id ? { ...p, followers: p.followers.includes(s.session) ? p.followers.filter((u) => u !== s.session) : [...p.followers, s.session] } : p)) };
    case 'BULK_SAVE': return toast({ ...s, projects: s.projects.map((p) => (a.ids.includes(p.id) && !p.savedBy.includes(s.session) ? { ...p, savedBy: [...p.savedBy, s.session] } : p)) }, { kind: 'ok', title: `${a.ids.length} projects saved`, msg: 'Added to your collection.' });

    case 'ASK': {
      const p = s.projects.find((x) => x.id === a.projectId); if (!p) return s;
      const post = { id: uid('d'), authorId: s.session, text: a.text, createdAt: new Date().toISOString() };
      let n = { ...s, projects: s.projects.map((x) => (x.id === a.projectId ? { ...x, discussion: [...x.discussion, post] } : x)) };
      if (p.ownerId !== s.session) n = notify(n, p.ownerId, 'discussion', `New question on ${p.title}`, a.text.slice(0, 120), p.id);
      return toast(n, { kind: 'ok', title: 'Posted', msg: 'The project author has been notified.' });
    }

    case 'NOTIF_READ': return { ...s, notifications: s.notifications.map((n) => (n.id === a.id ? { ...n, read: true } : n)) };
    case 'NOTIF_ALL': return { ...s, notifications: s.notifications.map((n) => (n.userId === s.session ? { ...n, read: true } : n)) };
    case 'RECENT': return { ...s, recent: [a.id, ...s.recent.filter((r) => r !== a.id)].slice(0, 8), projects: s.projects.map((p) => (p.id === a.id ? { ...p, views: p.views + 1 } : p)) };
    case 'VIEW_ADD': return toast({ ...s, savedViews: [...s.savedViews, { id: uid('v'), name: a.name, filters: a.filters }] }, { kind: 'ok', title: 'View saved', msg: a.name });
    case 'VIEW_DEL': return { ...s, savedViews: s.savedViews.filter((v) => v.id !== a.id) };

    case 'ASSIGN': {
      const p = s.projects.find((x) => x.id === a.projectId); if (!p) return s;
      let n = { ...s, projects: s.projects.map((x) => (x.id === a.projectId ? { ...x, facultyId: a.facultyId, status: x.status === 'draft' ? 'pending' : x.status } : x)) };
      n = notify(n, a.facultyId, 'assigned', `Assigned by admin: ${p.title}`, `${U(s, p.ownerId).name} · ${p.dept}`, p.id);
      return toast(n, { kind: 'ok', title: 'Assignment updated', msg: `${p.title} → ${U(s, a.facultyId).name}` });
    }
    case 'FLAG': return toast({ ...s, projects: s.projects.map((p) => (p.id === a.id ? { ...p, flagged: !p.flagged, status: !p.flagged ? 'flagged' : p.feedback.length ? 'approved' : 'pending' } : p)) }, { kind: 'warn', title: 'Moderation updated', msg: a.title });
    case 'USER_PATCH': return { ...s, users: s.users.map((u) => (u.id === a.id ? { ...u, ...a.patch } : u)) };

    case 'RESET': {
      try { localStorage.removeItem(KEY); localStorage.removeItem('techloop.explore.prefs'); } catch {}
      return toast(base(), { kind: 'info', title: 'Demo archive reset', msg: 'Seed data restored. Sign in again.' });
    }
    default: return s;
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, init);

  useEffect(() => {
    const { toasts, undo, ...persist } = state;
    try { localStorage.setItem(KEY, JSON.stringify(persist)); } catch {}
  }, [state.projects, state.notifications, state.savedViews, state.session, state.auth, state.theme, state.users, state.recent]);

  useEffect(() => {
    const r = document.documentElement;
    r.classList.toggle('dark', state.theme === 'dark');
    r.classList.toggle('light', state.theme === 'light');
  }, [state.theme]);

  const me = state.users.find((u) => u.id === state.session) || null;
  const value = useMemo(() => ({ state, dispatch, me }), [state, me]);
  return <Store.Provider value={value}>{children}</Store.Provider>;
}

export const useStore = () => useContext(Store);
export const useTheme = () => {
  const { state, dispatch } = useStore();
  return { theme: state.theme, toggle: () => dispatch({ type: 'THEME', value: state.theme === 'dark' ? 'light' : 'dark' }) };
};
export const userById = (s, id) => s.users.find((u) => u.id === id) || s.users[0];
export const myProjects = (s) => s.projects.filter((p) => p.ownerId === s.session || teamOf(p).some((t) => t?.userId === s.session));
export const assignedTo = (s, id) => s.projects.filter((p) => p.facultyId === id);
export const visibleTo = (s) => s.projects.filter((p) => {
  if (p.ownerId === s.session || teamOf(p).some((t) => t?.userId === s.session)) return true;
  const me = s.users.find((u) => u.id === s.session);
  if (me?.role === 'admin') return true;
  if (p.visibility === 'public' || p.visibility === 'college') return true;
  if (p.visibility === 'faculty' && me?.role === 'faculty' && p.facultyId === me.id) return true;
  return false;
});
export const homeFor = (role) => (role === 'faculty' ? '/faculty' : role === 'admin' ? '/admin' : '/home');