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
  Trophy,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';
import { getNotificationsByUser, markAsRead, markAllAsRead } from '../data/NotificationStore';
import {
  getAssignedTeamIds,
  getJudgingProjects,
  getMyProjects,
  getProjectById,
  isProjectAdmin,
} from '../data/ProjectStore';

function getProjectIdFromPath(pathname) {
  return pathname.match(/^\/(?:project|judge\/project)\/(\d+)(?:\/|$)/)?.[1] || null;
}

function getProjectNavigation(projectId, email, t) {
  if (!projectId || !email) return { type: 'none', items: [] };
  if (isProjectAdmin(projectId, email)) {
    return {
      type: 'admin',
      items: [
        {
          label: t('ภาพรวม', 'Overview', { compact: true }),
          path: `/project/${projectId}/dashboard`,
          section: 'Overview',
        },
        {
          label: t('ทีมและกลุ่ม', 'Teams & Groups', { compact: true }),
          path: `/project/${projectId}/teams`,
          section: 'Competition management',
        },
        {
          label: t('กรรมการ', 'Judges', { compact: true }),
          path: `/project/${projectId}/judges`,
          section: 'Competition management',
        },
        {
          label: t('มอบหมายทีม', 'Assignments', { compact: true }),
          path: `/project/${projectId}/assignments`,
          section: 'Competition management',
        },
        {
          label: t('เกณฑ์ประเมิน', 'Criteria', { compact: true }),
          path: `/project/${projectId}/criteria`,
          section: 'Competition management',
        },
        {
          label: t('ติดตามผล', 'Monitor', { compact: true }),
          path: `/project/${projectId}/evaluations`,
          section: 'Evaluation',
        },
        {
          label: t('จัดอันดับ', 'Leaderboard', { compact: true }),
          path: `/project/${projectId}/leaderboard`,
          section: 'Results',
        },
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
      {
        label: t('ประเมินทีม', 'Evaluate Teams', { compact: true }),
        path: `/judge/project/${projectId}/teams`,
        section: 'Evaluation',
      },
      ...(assignedTeams.length > 1
        ? [
            {
              label: t('ประเมินเปรียบเทียบ', 'Matrix View', { compact: true }),
              path: `/judge/project/${projectId}/evaluate-multi`,
              section: 'Evaluation',
            },
          ]
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
      className={({ isActive }) =>
        `flex items-center whitespace-nowrap border-b-2 px-3.5 py-3 text-sm font-medium transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-precision-blue ${
          mobile
            ? `w-full rounded-lg border-l-2 border-b-0 px-4 py-3 ${
                isActive
                  ? 'border-l-precision-blue bg-blue-50/80 font-semibold text-precision-blue'
                  : 'border-l-transparent text-slate-700 hover:bg-slate-50'
              }`
            : isActive
              ? 'border-precision-blue font-semibold text-precision-blue'
              : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-primary-text'
        }`
      }
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
  userEmail,
  t,
}) {
  if (!project) return null;

  return (
    <div className={`relative ${mobile ? 'w-full' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        onClick={onToggle}
        className={`group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200/90 bg-slate-50/60 text-left shadow-2xs transition-all hover:border-blue-200 hover:bg-blue-50/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue ${
          mobile ? 'w-full px-3 py-2.5' : 'ml-4 max-w-[min(36vw,22rem)] px-3 py-1.5'
        }`}
        aria-label="Current competition"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-controls={menuId}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100/80 text-precision-blue">
          <Building2 className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {t('โครงการปัจจุบัน', 'Competition', { compact: true })}
          </span>
          <span className="block truncate text-sm font-semibold text-primary-text">
            {project.name}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          className={`absolute left-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-xl ring-1 ring-slate-900/5 ${
            mobile ? 'w-full' : 'w-[min(24rem,calc(100vw-2rem))]'
          }`}
          role="region"
          aria-label="Choose competition"
        >
          <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              {t('สลับโครงการ', 'Switch Competition', { compact: true })}
            </p>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {t(
                `ทั้งหมด ${projects.length} โครงการที่คุณมีส่วนร่วม`,
                `${projects.length} competitions available`
              )}
            </p>
          </div>
          <ul className="max-h-72 overflow-y-auto p-1.5">
            {projects.map((entry) => {
              const isSelected = Number(entry.id) === Number(project.id);
              const isOwner = isProjectAdmin(entry.id, userEmail);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => onSelect(entry)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-precision-blue ${
                      isSelected
                        ? 'bg-blue-50 text-precision-blue'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected ? 'bg-white text-precision-blue shadow-2xs' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Building2 className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${
                          isSelected ? 'font-bold' : 'font-medium'
                        }`}
                      >
                        {entry.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {isOwner
                          ? t('เจ้าของโครงการ', 'Project Admin', { compact: true })
                          : t('กรรมการประเมิน', 'Judge', { compact: true })}
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
  const { t } = useLanguage();
  const projectId = getProjectIdFromPath(location.pathname);
  const project = projectId ? getProjectById(projectId) : null;
  const routeNavigation = getProjectNavigation(projectId, user?.email, t);

  const navigation =
    user?.role === 'SYSTEM_ADMIN'
      ? {
          type: 'system-admin',
          items: [
            {
              label: t('จัดการผู้ใช้งาน', 'User Management', { compact: true }),
              path: '/admin/users',
              section: 'Administration',
            },
          ],
        }
      : routeNavigation.type === 'none'
        ? {
            type: 'workspace',
            items: [
              {
                label: t('พื้นที่ทำงาน', 'Workspace', { compact: true }),
                path: '/workspace',
                section: 'Overview',
              },
            ],
          }
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

  const displayName = user?.name || t('ผู้ใช้งาน', 'User');
  const roleLabel =
    user?.role === 'SYSTEM_ADMIN'
      ? t('ผู้ดูแลระบบ', 'System Admin', { compact: true })
      : routeNavigation.type === 'admin'
        ? t('เจ้าของโครงการ', 'Project Admin', { compact: true })
        : routeNavigation.type === 'judge'
          ? t('กรรมการ', 'Judge', { compact: true })
          : t('สมาชิก', 'Member', { compact: true });

  const avatarInitial = displayName.charAt(0).toUpperCase();
  const [menuState, setMenuState] = useState({ locationKey: location.key });
  const [notifications, setNotifications] = useState(() =>
    user?.email ? getNotificationsByUser(user.email) : []
  );

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

  const updateMenuState = useCallback(
    (changes) => {
      setMenuState((previous) => ({
        ...(previous.locationKey === location.key ? previous : {}),
        ...changes,
        locationKey: location.key,
      }));
    },
    [location.key]
  );

  const closeMenus = useCallback(
    () =>
      updateMenuState({
        notifOpen: false,
        profileOpen: false,
        moreOpen: false,
        mobileNavOpen: false,
        projectOpen: false,
      }),
    [updateMenuState]
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuState({ locationKey: location.key });
  }, [location.key]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target))
        updateMenuState({ notifOpen: false });
      if (profileRef.current && !profileRef.current.contains(event.target))
        updateMenuState({ profileOpen: false });
      if (moreRef.current && !moreRef.current.contains(event.target))
        updateMenuState({ moreOpen: false });
      if (
        !projectDesktopRef.current?.contains(event.target) &&
        !projectMobileRef.current?.contains(event.target)
      )
        updateMenuState({ projectOpen: false });
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
      const hadOpenMenu =
        isNotifOpen || isProfileOpen || isMoreOpen || isMobileNavOpen || isProjectOpen;
      closeMenus();
      if (isMobileNavOpen) mobileToggleRef.current?.focus();
      else if (isMoreOpen) moreButtonRef.current?.focus();
      else if (isProjectOpen) {
        const button = window.matchMedia('(min-width: 768px)').matches
          ? projectDesktopButtonRef.current
          : projectMobileButtonRef.current;
        button?.focus();
      } else if (isNotifOpen) notifButtonRef.current?.focus();
      else if (isProfileOpen) profileButtonRef.current?.focus();
      else if (hadOpenMenu) document.activeElement?.blur();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [
    isNotifOpen,
    isProfileOpen,
    isMoreOpen,
    isMobileNavOpen,
    isProjectOpen,
    closeMenus,
    location.key,
  ]);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const tabletMoreItems = navigation.items.slice(4);

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
    navigate(
      isOwner
        ? `/project/${nextProject.id}/dashboard`
        : `/judge/project/${nextProject.id}/teams`
    );
  };

  const brandPath = isSystemAdmin ? '/admin/users' : '/workspace';
  const onNavigation = () => {
    closeMenus();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6 max-[360px]:flex-wrap">
        <Link
          to={brandPath}
          className="flex shrink-0 items-center gap-2.5 rounded-lg text-ink-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-precision-blue"
          aria-label="MultiRole home"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xs">
            <Trophy className="h-4.5 w-4.5 text-amber-300" />
          </span>
          <div className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-slate-900">
              MultiRole
            </span>
            <span className="hidden text-[10px] font-medium text-slate-500 sm:block">
              Evaluation Platform
            </span>
          </div>
        </Link>

        {project && projects.length > 0 && (
          <div className="hidden min-w-0 flex-1 md:block" ref={projectDesktopRef}>
            <ProjectSelector
              project={project}
              projects={projects}
              isOpen={isProjectOpen}
              triggerRef={projectDesktopButtonRef}
              menuId="competition-picker-desktop"
              userEmail={user?.email}
              t={t}
              onToggle={() =>
                updateMenuState({
                  projectOpen: !isProjectOpen,
                  notifOpen: false,
                  profileOpen: false,
                  moreOpen: false,
                })
              }
              onSelect={navigateToProject}
            />
          </div>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 max-[360px]:w-full max-[360px]:justify-end">
          <LanguageSwitcher />

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
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-precision-blue"
              aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
              aria-haspopup="dialog"
              aria-expanded={isNotifOpen}
            >
              <Bell className="h-4.5 w-4.5" aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white"
                  aria-hidden="true"
                >
                  {unreadCount}
                </span>
              )}
            </button>
            {isNotifOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-xl ring-1 ring-slate-900/5"
                role="dialog"
                aria-label="Notifications"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-3.5">
                  <div>
                    <h2 className="text-sm font-bold text-primary-text">
                      {t('การแจ้งเตือน', 'Notifications', { compact: true })}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {unreadCount
                        ? t(`ยังไม่ได้อ่าน ${unreadCount} รายการ`, `${unreadCount} unread notifications`)
                        : t('อัปเดตจากการแข่งขันของคุณ', 'Updates from your competitions')}
                    </p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-precision-blue hover:bg-blue-50"
                    >
                      <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />{' '}
                      {t('อ่านทั้งหมด', 'Mark all read', { compact: true })}
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
                            className={`w-full border-l-2 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 ${
                              !notification.isRead
                                ? 'border-l-precision-blue bg-blue-50/40'
                                : 'border-l-transparent'
                            }`}
                          >
                            <span className="flex items-start justify-between gap-3">
                              <span
                                className={`text-sm ${
                                  !notification.isRead
                                    ? 'font-semibold text-primary-text'
                                    : 'text-slate-700'
                                }`}
                              >
                                {notification.title}
                              </span>
                              {!notification.isRead && (
                                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-precision-blue" />
                              )}
                            </span>
                            <span className="mt-1 block line-clamp-2 text-xs text-slate-600">
                              {notification.message}
                            </span>
                            <span className="mt-1.5 block text-[10px] text-slate-400">
                              {new Date(notification.createdAt).toLocaleString('th-TH')}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-4 py-8 text-center text-sm text-slate-500">
                      {t('ไม่มีการแจ้งเตือนใหม่', 'No notifications yet')}
                    </p>
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
              className="flex items-center gap-2 rounded-xl border border-transparent px-1.5 py-1 text-left transition-colors hover:border-slate-200 hover:bg-slate-50 sm:px-2"
              aria-label="User profile menu"
              aria-haspopup="menu"
              aria-expanded={isProfileOpen}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-100 font-bold text-precision-blue ring-1 ring-blue-200/60">
                {avatarInitial}
              </span>
              <span className="hidden max-w-40 text-left sm:block">
                <span className="block truncate text-sm font-semibold text-primary-text">
                  {displayName}
                </span>
                <span className="block truncate text-[11px] text-slate-500">{roleLabel}</span>
              </span>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" aria-hidden="true" />
            </button>
            {isProfileOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-surface shadow-xl ring-1 ring-slate-900/5"
                role="menu"
              >
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-precision-blue">
                    {avatarInitial}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-primary-text">
                      {displayName}
                    </span>
                    <span className="block truncate text-xs text-slate-500">{user?.email}</span>
                    <span className="mt-0.5 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                      {roleLabel}
                    </span>
                  </span>
                </div>
                <div className="p-1.5">
                  {!isSystemAdmin && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMenus();
                        navigate('/workspace');
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <Building2 className="h-4 w-4 text-slate-500" aria-hidden="true" />
                      {t('กลับหน้า Workspace รวม', 'All Competitions (Workspace)', { compact: true })}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {t('ออกจากระบบ', 'Sign Out', { compact: true })}
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            ref={mobileToggleRef}
            type="button"
            onClick={() => updateMenuState({ mobileNavOpen: !isMobileNavOpen })}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 md:hidden"
            aria-label={isMobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileNavOpen}
            aria-controls="primary-navigation-mobile"
          >
            {isMobileNavOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
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
            userEmail={user?.email}
            t={t}
            onToggle={() =>
              updateMenuState({
                projectOpen: !isProjectOpen,
                notifOpen: false,
                profileOpen: false,
                moreOpen: false,
              })
            }
            onSelect={navigateToProject}
          />
        </div>
      )}

      <div className="hidden border-t border-slate-100 bg-slate-50/40 md:block">
        <nav
          className="mx-auto flex h-12 max-w-[1600px] items-stretch justify-between gap-2 overflow-visible px-4 sm:px-6"
          aria-label="Primary navigation"
        >
          <div className="flex min-w-0 items-stretch">
            {navigation.items.map((item, index) => (
              <div
                key={item.path}
                className={`flex items-stretch ${
                  index > 0 && item.section !== navigation.items[index - 1].section
                    ? 'border-l border-slate-200/80 pl-2'
                    : ''
                }`}
              >
                <div className={`${index < 4 ? '' : 'hidden lg:flex'} items-stretch`}>
                  <NavigationLink item={item} />
                </div>
              </div>
            ))}
          </div>
          {tabletMoreItems.length > 0 && (
            <div className="relative flex items-center lg:hidden" ref={moreRef}>
              <button
                ref={moreButtonRef}
                type="button"
                onClick={() => {
                  updateMenuState({
                    moreOpen: !isMoreOpen,
                    notifOpen: false,
                    profileOpen: false,
                    projectOpen: false,
                  });
                }}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
              >
                {t('เพิ่มเติม', 'More', { compact: true })}{' '}
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </button>
              {isMoreOpen && (
                <div
                  className="absolute right-0 top-full z-50 mt-1 min-w-56 overflow-hidden rounded-xl border border-slate-200 bg-surface p-1.5 shadow-xl"
                  role="menu"
                  aria-label="More navigation"
                >
                  {tabletMoreItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end
                      role="menuitem"
                      onClick={() => updateMenuState({ moreOpen: false })}
                      className={({ isActive }) =>
                        `block rounded-lg px-3 py-2 text-sm font-medium ${
                          isActive
                            ? 'bg-blue-50 text-precision-blue'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`
                      }
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
          className="absolute inset-x-0 top-full z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-slate-200 bg-surface shadow-xl md:hidden"
          aria-label="Primary navigation"
        >
          <div className="mx-auto max-w-[1600px] px-4 py-3">
            {isSystemAdmin ? (
              <NavigationLink
                item={{
                  label: t('จัดการผู้ใช้งาน', 'User Management', { compact: true }),
                  path: '/admin/users',
                }}
                mobile
                onNavigate={onNavigation}
              />
            ) : (
              <>
                <div className="border-b border-slate-100 pb-2">
                  <p className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    {navigation.type === 'admin'
                      ? t('จัดการโครงการ', 'Competition Management', { compact: true })
                      : navigation.type === 'judge'
                        ? t('การประเมินผล', 'Evaluation', { compact: true })
                        : t('เมนูหลัก', 'Overview', { compact: true })}
                  </p>
                  {navigation.items.length ? (
                    navigation.items.map((item) => (
                      <NavigationLink
                        key={item.path}
                        item={item}
                        mobile
                        onNavigate={onNavigation}
                      />
                    ))
                  ) : (
                    <NavigationLink
                      item={{
                        label: t('พื้นที่ทำงาน', 'Workspace', { compact: true }),
                        path: '/workspace',
                      }}
                      mobile
                      onNavigate={onNavigation}
                    />
                  )}
                </div>
                <div className="pt-2">
                  {projects.length > 0 && (
                    <p className="px-4 pb-1 pt-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('โครงการของคุณ', 'Your Competitions', { compact: true })}
                    </p>
                  )}
                  {projects.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => {
                        navigateToProject(entry);
                        onNavigation();
                      }}
                      className={`w-full rounded-lg px-4 py-2.5 text-left text-sm ${
                        Number(entry.id) === Number(projectId)
                          ? 'bg-blue-50/70 font-semibold text-precision-blue'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {entry.name}
                    </button>
                  ))}
                  <NavigationLink
                    item={{
                      label: t('พื้นที่ทำงานรวม', 'Workspace', { compact: true }),
                      path: '/workspace',
                    }}
                    mobile
                    onNavigate={onNavigation}
                  />
                  <NavigationLink
                    item={{
                      label: t('+ สร้างโครงการใหม่', '+ Create Competition', { compact: true }),
                      path: '/projects/new',
                    }}
                    mobile
                    onNavigate={onNavigation}
                  />
                </div>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}
