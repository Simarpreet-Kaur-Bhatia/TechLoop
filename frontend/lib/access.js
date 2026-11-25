export const ROLE_META = {
  student: { label: 'Student', tone: 'cyan', icon: 'GraduationCap', home: '/home', scope: 'Student workspace' },
  faculty: { label: 'Faculty', tone: 'violet', icon: 'ShieldCheck', home: '/faculty', scope: 'Faculty evaluation' },
  admin: { label: 'Administrator', tone: 'rose', icon: 'Database', home: '/admin', scope: 'Institutional control' },
};

export const ROUTES = [
  { path: '/home', label: 'Home', desc: 'Trending, recommendations & the product loop', icon: 'Zap', roles: ['student'], nav: true },
  { path: '/dashboard', label: 'Dashboard', desc: 'My projects, submissions & faculty feedback', icon: 'LayoutDashboard', roles: ['student'], nav: true },
  { path: '/create', label: 'Create project', desc: 'Six-step record wizard, then submit for review', icon: 'Plus', roles: ['student'], nav: false },
  { path: '/explore', label: 'Explore', desc: 'Semantic search across the verified archive', icon: 'Compass', roles: ['student', 'faculty', 'admin'], nav: true },
  { path: '/ai', label: 'TechLoop AI', desc: 'Grounded assistant with cited source projects', icon: 'Sparkles', roles: ['student', 'faculty', 'admin'], nav: true },
  { path: '/saved', label: 'Saved', desc: 'Bookmarks, followed work & your profile', icon: 'Bookmark', roles: ['student', 'faculty', 'admin'], nav: true },
  { path: '/faculty', label: 'Evaluation', desc: 'Only the projects assigned to you', icon: 'ShieldCheck', roles: ['faculty'], nav: true },
  { path: '/admin', label: 'Admin', desc: 'Users, assignments, moderation & reports', icon: 'LayoutDashboard', roles: ['admin'], nav: true },
];

const OPEN_PREFIXES = ['/explore', '/ai', '/saved', '/project', '/login'];

export const metaFor = (role) => ROLE_META[role] || ROLE_META.student;
export const homeFor = (role) => metaFor(role).home;

export const navFor = (role) => ROUTES.filter((r) => r.nav && r.roles.includes(role));

export function routeFor(pathname) {
  return ROUTES.find((r) => pathname === r.path || pathname.startsWith(r.path + '/')) || null;
}

export function canAccess(role, pathname) {
  if (!role) return false;
  if (pathname === '/' || pathname === '/login') return true;
  if (OPEN_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) return true;
  const r = routeFor(pathname);
  return r ? r.roles.includes(role) : true;
}

export function deniedReason(role, pathname) {
  const r = routeFor(pathname);
  if (!r) return null;
  const owners = r.roles.map((x) => metaFor(x).label).join(' or ');
  return { need: owners, area: r.label, mine: metaFor(role).label };
}

export function canSeeProject(state, p) {
  if (!p || !state?.session) return false;
  const me = state.users.find((u) => u.id === state.session);
  if (!me) return false;
  if (p.ownerId === me.id) return true;
  if (Array.isArray(p.team) && p.team.some((t) => t?.userId === me.id)) return true;
  if (me.role === 'admin') return true;
  if (p.visibility === 'public' || p.visibility === 'college') return true;
  if (p.visibility === 'faculty' && me.role === 'faculty' && p.facultyId === me.id) return true;
  return false;
}

export function paletteFor(role, projects) {
  const pages = ROUTES
    .filter((r) => r.roles.includes(role))
    .map((r) => ({ kind: 'page', t: r.label, s: r.desc, icon: r.icon, go: r.path }));
  const records = projects.map((p) => ({
    kind: 'record',
    t: p.title,
    s: `${p.dept} · Batch ${p.academicYear} · ${(p.tech || []).slice(0, 3).join(', ')}`,
    icon: 'FolderGit2',
    go: '/project/' + p.id,
  }));
  return { pages, records };
}