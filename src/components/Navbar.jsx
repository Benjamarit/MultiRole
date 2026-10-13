import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  Check,
  CheckCheck,
  ChevronDown,
  LogOut,
  Menu,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNotificationsByUser, markAsRead, markAllAsRead } from '../data/NotificationStore';
import {
  getAssignedTeamIds,
  getJudgingProjects,
  getMyProjects,
  getProjectById,
  isProjectAdmin,
} from '../data/ProjectStore';

const roleLabels = {
  SYSTEM_ADMIN: 'System Admin',
  PROJECT_ADMIN: 'Project Admin',
  JUDGE: 'Judge',
  USER: 'Member',
};

function getProjectIdFromPath(pathname) {
  return pathname.match(/^\/(?:project|judge\/project)\/(\d+)(?:\/|$)/)?.[1] || null;
}

function getProjectNavigation(projectId, email) {
  if (!projectId || !email) return { type: 'none', items: [] };
  if (isProjectAdmin(projectId, email)) {
    return {
      type: 'admin',
      items: [
        { label: 'Overview', path: `/project/${projectId}/dashboard`, section: 'Overview' },
        { label: 'Teams & Groups', path: `/project/${projectId}/teams`, section: 'Competition management' },
        { label: 'Judges', path: `/project/${projectId}/judges`, section: 'Competition management' },
        { label: 'Assignments', path: `/project/${projectId}/assignments`, section: 'Competition management' },
        { label: 'Criteria', path: `/project/${projectId}/criteria`, section: 'Competition management' },
        { label: 'Evaluation Monitor', path: `/project/${projectId}/evaluations`, section: 'Evaluation' },
        { label: 'Leaderboard', path: `/project/${projectId}/leaderboard`, section: 'Results' },
      ],
    };
  }

  const judgeProject = getJudgingProjects(email).find(
    (project) => Number(project.id) === Number(projectId)
  );
  if (!judgeProject) return { type: 'none', items: [] };

  const assignedTeams = getAssignedTeamIds(projectId, email);
  return {
    type: 'judge',
    items: [
      { label: 'Evaluate Teams', path: `/judge/project/${projectId}/teams`, section: 'Evaluation' },
      ...(assignedTeams.length > 1
        ? [{
          label: 'Multi-Evaluation',
          path: `/judge/project/${projectId}/evaluate-multi`,
          section: 'Evaluation',
        }]
        : []),
    ],
  };
}

function NavigationLink({ item, onNavigate, mobile = false }) {
  return (
    <NavLink
      to={item.path}
      end
      onClick={onNavigate}
      className={({ isActive }) => `flex items-center whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-precision-blue ${
        mobile
          ? `w-full rounded-sm border-l-2 border-b-0 px-4 py-3.5 ${isActive
            ? 'border-l-precision-blue bg-blue-50 text-precision-blue'
            : 'border-l-transparent text-slate-700 hover:bg-slate-50'}`
          : isActive
            ? 'border-precision-blue text-precision-blue'
            : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-primary-text'
      }`}
      aria-label={item.label}
    >
      {item.label}
    </NavLink>
  );
}

function ProjectSelector({
  project,
  projects,
  isOpen,
  onToggle,
  onSelect,
  mobile = false,
  triggerRef,
  menuId,
}) {
  if (!project) return null;

  return (
    <div className={`relative ${mobile ? 'w-full' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={`group flex min-w-0 items-center gap-3 rounded-md border border-border bg-surface text-left transition-colors hover:border-slate-400 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue ${
          mobile ? 'w-full px-3 py-2.5' : 'ml-4 max-w-[min(36vw,22rem)] px-3 py-2'
        }`}
        aria-label="Current competition"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-blue-50 text-precision-blue">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">
            Competition
          </span>
          <span className="block truncate text-sm font-semibold text-primary-text">{project.name}</span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          className={`absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-border bg-surface shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5 ${
            mobile ? 'w-full' : 'w-[min(22rem,calc(100vw-2rem))]'
          }`}
          role="region"
          aria-label="Choose competition"
        >
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Switch competition
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {projects.length} {projects.length === 1 ? 'competition available' : 'competitions available'}
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {projects.map((entry) => {
              const isSelected = Number(entry.id) === Number(project.id);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => onSelect(entry)}
                    className={`flex w-full items-center gap-3 rounded-sm px-2.5 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-precision-blue ${
                      isSelected
                        ? 'bg-blue-50 text-precision-blue'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${
                      isSelected ? 'bg-white text-precision-blue' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-sm ${isSelected ? 'font-semibold' : 'font-medium'}`}>
                        {entry.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {isProjectAdmin(entry.id, entry.ownerEmail) ? 'Competition workspace' : 'Judging workspace'}
                      </span>
                    </span>
                    {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const projectId = getProjectIdFromPath(location.pathname);
  const project = projectId ? getProjectById(projectId) : null;
  const routeNavigation = getProjectNavigation(projectId, user?.email);
  const navigation = user?.role === 'SYSTEM_ADMIN'
    ? {
      type: 'system-admin',
      items: [{ label: 'User Management', path: '/admin/users', section: 'Administration' }],
    }
    : routeNavigation.type === 'none'
      ? { type: 'workspace', items: [{ label: 'Workspace', path: '/workspace', section: 'Overview' }] }
      : routeNavigation;
  const isSystemAdmin = user?.role === 'SYSTEM_ADMIN';
  const projects = (() => {
    if (isSystemAdmin || !user?.email) return [];
    const unique = new Map();
    [...getMyProjects(user.email), ...getJudgingProjects(user.email)].forEach((entry) => {
      unique.set(Number(entry.id), entry);
    });
    return [...unique.values()];
  })();
  const displayName = user?.name || 'ผู้ใช้งาน';
  const roleLabel = roleLabels[user?.role] || user?.role || '-';
  const avatarInitial = displayName.charAt(0);
  const [menuState, setMenuState] = useState({ locationKey: location.key });
  const [notifications, setNotifications] = useState(() => (
    user?.email ? getNotificationsByUser(user.email) : []
  ));
  const activeMenuState = menuState.locationKey === location.key ? menuState : {};
  const isNotifOpen = Boolean(activeMenuState.notifOpen);
  const isProfileOpen = Boolean(activeMenuState.profileOpen);
  const isMoreOpen = Boolean(activeMenuState.moreOpen);
  const isMobileNavOpen = Boolean(activeMenuState.mobileNavOpen);
  const isProjectOpen = Boolean(activeMenuState.projectOpen);
  const notifRef = useRef(null);
  const notifButtonRef = useRef(null);
  const profileRef = useRef(null);
  const profileButtonRef = useRef(null);
  const moreRef = useRef(null);
  const moreButtonRef = useRef(null);
  const projectDesktopRef = useRef(null);
  const projectMobileRef = useRef(null);
  const projectDesktopButtonRef = useRef(null);
  const projectMobileButtonRef = useRef(null);
  const mobileNavRef = useRef(null);
  const mobileToggleRef = useRef(null);

  const updateMenuState = useCallback((changes) => {
    setMenuState((previous) => ({
      ...(previous.locationKey === location.key ? previous : {}),
      ...changes,
      locationKey: location.key,
    }));
  }, [location.key]);
  const closeMenus = useCallback(() => updateMenuState({
    notifOpen: false,
    profileOpen: false,
    moreOpen: false,
    mobileNavOpen: false,
    projectOpen: false,
  }), [updateMenuState]);

  useEffect(() => {
    // Clear stale popovers on back/forward navigation as well as link clicks.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuState({ locationKey: location.key });
  }, [location.key]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) updateMenuState({ notifOpen: false });
      if (profileRef.current && !profileRef.current.contains(event.target)) updateMenuState({ profileOpen: false });
      if (moreRef.current && !moreRef.current.contains(event.target)) updateMenuState({ moreOpen: false });
      if (
        !projectDesktopRef.current?.contains(event.target) &&
        !projectMobileRef.current?.contains(event.target)
      ) updateMenuState({ projectOpen: false });
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [location.key, updateMenuState]);

  useEffect(() => {
    if (isMobileNavOpen) {
      mobileNavRef.current?.querySelector('a, button')?.focus();
    }
  }, [isMobileNavOpen]);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key !== 'Escape') return;
      const hadOpenMenu = isNotifOpen || isProfileOpen || isMoreOpen || isMobileNavOpen || isProjectOpen;
      closeMenus();
      if (isMobileNavOpen) mobileToggleRef.current?.focus();
      else if (isMoreOpen) moreButtonRef.current?.focus();
      else if (isProjectOpen) {
        const button = window.matchMedia('(min-width: 768px)').matches
          ? projectDesktopButtonRef.current
          : projectMobileButtonRef.current;
        button?.focus();
      }
      else if (isNotifOpen) notifButtonRef.current?.focus();
      else if (isProfileOpen) profileButtonRef.current?.focus();
      else if (hadOpenMenu) document.activeElement?.blur();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isNotifOpen, isProfileOpen, isMoreOpen, isMobileNavOpen, isProjectOpen, closeMenus, location.key]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const tabletMoreItems = navigation.items.slice(3);

  const handleLogout = () => {
    closeMenus();
    logout();
    navigate('/login');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead && user?.email) {
      markAsRead(notification.id);
      setNotifications(getNotificationsByUser(user.email));
    }
    updateMenuState({ notifOpen: false });
    if (notification.projectId) navigate(`/judge/project/${notification.projectId}/teams`);
  };

  const handleMarkAllRead = () => {
    if (!user?.email) return;
    markAllAsRead(user.email);
    setNotifications(getNotificationsByUser(user.email));
  };

  const navigateToProject = (nextProject) => {
    const isOwner = isProjectAdmin(nextProject.id, user?.email);
    closeMenus();
    navigate(isOwner
      ? `/project/${nextProject.id}/dashboard`
      : `/judge/project/${nextProject.id}/teams`);
  };

  const brandPath = isSystemAdmin ? '/admin/users' : '/workspace';
  const onNavigation = () => {
    closeMenus();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
        <Link
          to={brandPath}
          className="flex shrink-0 items-center gap-2 rounded-sm text-ink-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-precision-blue"
          aria-label="MultiRole home"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-ink-navy text-sm font-bold text-white">M</span>
          <span className="text-lg font-semibold tracking-tight">MultiRole</span>
        </Link>

        {project && projects.length > 0 && (
          <div className="hidden min-w-0 flex-1 md:block" ref={projectDesktopRef}>
            <ProjectSelector
              project={project}
              projects={projects}
              isOpen={isProjectOpen}
              triggerRef={projectDesktopButtonRef}
              menuId="competition-picker-desktop"
              onToggle={() => updateMenuState({
                projectOpen: !isProjectOpen,
                notifOpen: false,
                profileOpen: false,
                moreOpen: false,
              })}
              onSelect={navigateToProject}
            />
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-3">
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              ref={notifButtonRef}
              onClick={() => {
                if (!isNotifOpen && user?.email) {
                  setNotifications(getNotificationsByUser(user.email));
                }
                updateMenuState({
                  notifOpen: !isNotifOpen,
                  profileOpen: false,
                  moreOpen: false,
                  projectOpen: false,
                });
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-haspopup="dialog"
              aria-expanded={isNotifOpen}
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-600" aria-hidden="true" />
              )}
            </button>
            {isNotifOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-surface shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
                  <div>
                    <h2 className="text-sm font-semibold text-primary-text">การแจ้งเตือน</h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {unreadCount ? `ยังไม่ได้อ่าน ${unreadCount} รายการ` : 'อัปเดตจากการแข่งขันของคุณ'}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 rounded-sm px-2 py-1.5 text-xs font-semibold text-precision-blue hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue"
                    >
                      <CheckCheck className="h-3 w-3" aria-hidden="true" /> อ่านทั้งหมด
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length ? (
                    <ul className="divide-y divide-slate-100">
                      {notifications.map((notification) => (
                        <li key={notification.id}>
                          <button
                            type="button"
                            onClick={() => handleNotificationClick(notification)}
                            className={`w-full border-l-2 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-precision-blue ${!notification.isRead ? 'border-l-precision-blue bg-blue-50/50' : 'border-l-transparent'}`}
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span className={`text-sm ${!notification.isRead ? 'font-semibold text-primary-text' : 'text-slate-700'}`}>
                                {notification.title}
                              </span>
                              {!notification.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-precision-blue" />}
                            </span>
                            <span className="mt-1 block line-clamp-2 text-xs text-slate-500">{notification.message}</span>
                            <span className="mt-1 block text-[10px] text-slate-400">
                              {new Date(notification.createdAt).toLocaleString('th-TH')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">ไม่มีการแจ้งเตือนใหม่</p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                updateMenuState({
                  profileOpen: !isProfileOpen,
                  notifOpen: false,
                  moreOpen: false,
                  projectOpen: false,
                });
              }}
              ref={profileButtonRef}
              className="flex items-center gap-2 rounded-sm px-1.5 py-1 text-left hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue sm:px-2"
              aria-label="User profile menu"
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-blue-50 font-semibold text-precision-blue">
                {avatarInitial}
              </span>
              <span className="hidden max-w-40 text-left sm:block">
                <span className="block truncate text-sm font-semibold text-primary-text">{displayName}</span>
                <span className="block text-xs text-slate-500">{roleLabel}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-500 sm:block" aria-hidden="true" />
            </button>
            {isProfileOpen && (
              <div className="absolute right-0 top-full z-50 mt-2 w-[min(17rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-surface shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5" role="menu">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-blue-100 font-semibold text-precision-blue">
                    {avatarInitial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-primary-text">{displayName}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{roleLabel}</span>
                  </span>
                </div>
                <div className="p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    ออกจากระบบ
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            ref={mobileToggleRef}
            type="button"
            onClick={() => updateMenuState({ mobileNavOpen: !isMobileNavOpen })}
            className="flex h-10 w-10 items-center justify-center rounded-sm text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue md:hidden"
            aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileNavOpen}
            aria-controls="primary-navigation-mobile"
          >
            {isMobileNavOpen
              ? <X className="h-5 w-5" aria-hidden="true" />
              : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {project && projects.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2 md:hidden" ref={projectMobileRef}>
          <ProjectSelector
            project={project}
            projects={projects}
            mobile
            isOpen={isProjectOpen}
            triggerRef={projectMobileButtonRef}
            menuId="competition-picker-mobile"
            onToggle={() => updateMenuState({
              projectOpen: !isProjectOpen,
              notifOpen: false,
              profileOpen: false,
              moreOpen: false,
            })}
            onSelect={navigateToProject}
          />
        </div>
      )}

      <div className="hidden border-t border-slate-100 md:block">
        <nav className="mx-auto flex h-12 max-w-[1600px] items-stretch justify-between gap-2 overflow-visible px-4 sm:px-6" aria-label="Primary navigation">
          <div className="flex min-w-0 items-stretch">
            {navigation.items.map((item, index) => (
              <div key={item.path} className={`flex items-stretch ${index > 0 && item.section !== navigation.items[index - 1].section ? 'border-l border-slate-200 pl-2' : ''}`}>
                <div className={`${index < 3 ? '' : 'hidden lg:flex'} items-stretch`}>
                  <NavigationLink item={item} />
                </div>
              </div>
            ))}
          </div>
          {tabletMoreItems.length > 0 && (
            <div className="relative flex items-center lg:hidden" ref={moreRef}>
              <button
                type="button"
                onClick={() => {
                  updateMenuState({
                    moreOpen: !isMoreOpen,
                    notifOpen: false,
                    profileOpen: false,
                    projectOpen: false,
                  });
                }}
                className="flex items-center gap-1 rounded-sm px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue"
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
              >
                More <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
              {isMoreOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 min-w-56 overflow-hidden rounded-md border border-border bg-surface p-1.5 shadow-[0_12px_32px_-12px_rgba(15,23,42,0.28)] ring-1 ring-slate-900/5" role="menu" aria-label="More navigation">
                  {tabletMoreItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end
                      role="menuitem"
                      onClick={() => updateMenuState({ moreOpen: false })}
                      className={({ isActive }) => `block rounded-sm px-3 py-2.5 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue ${isActive
                        ? 'bg-blue-50 text-precision-blue'
                        : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {isMobileNavOpen && (
        <nav
          id="primary-navigation-mobile"
          ref={mobileNavRef}
          className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-surface shadow-lg md:hidden"
          aria-label="Primary navigation"
        >
          <div className="mx-auto max-w-[1600px] px-4 py-3">
            {isSystemAdmin ? (
              <NavigationLink item={{ label: 'User Management', path: '/admin/users' }} mobile onNavigate={onNavigation} />
            ) : (
              <>
                <div className="border-b border-slate-100 pb-2">
                  <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {navigation.type === 'admin' ? 'Competition management' : navigation.type === 'judge' ? 'Evaluation' : 'Overview'}
                  </p>
                  {navigation.items.length ? (
                    navigation.items.map((item) => (
                      <NavigationLink key={item.path} item={item} mobile onNavigate={onNavigation} />
                    ))
                  ) : (
                    <NavigationLink item={{ label: 'Workspace', path: '/workspace' }} mobile onNavigate={onNavigation} />
                  )}
                </div>
                <div className="pt-2">
                  {projects.length > 0 && (
                    <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Your competitions</p>
                  )}
                  {projects.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        navigateToProject(entry);
                        onNavigation();
                      }}
                      className={`w-full rounded-sm px-4 py-3 text-left text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue ${Number(entry.id) === Number(projectId)
                        ? 'font-semibold text-precision-blue'
                        : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      {entry.name}
                    </button>
                  ))}
                  <NavigationLink item={{ label: 'Workspace', path: '/workspace' }} mobile onNavigate={onNavigation} />
                  <NavigationLink item={{ label: 'Create a competition', path: '/projects/new' }} mobile onNavigate={onNavigation} />
                </div>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
