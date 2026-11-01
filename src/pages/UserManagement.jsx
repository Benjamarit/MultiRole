import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, AlertTriangle, ArrowRight, FolderKanban, LockKeyhole, RefreshCw, Settings2, ShieldCheck, ShieldOff, Trash2, Users, X } from 'lucide-react';
import apiClient from '../api/client';
import { loadSystemAdminData } from '../api/systemAdmin';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import SystemMonitoringOverview from '../components/SystemMonitoringOverview';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { MonitoringStat, MonitoringTabs, MonitoringSearch, MonitoringEmpty, MonitoringPagination, MonitoringSkeleton } from '../components/MonitoringUI';
import { useLanguage } from '../context/LanguageContext';
import { useVisiblePolling } from '../hooks/useVisiblePolling';
import {
  deleteRegisteredUser,
  getRegisteredUsers,
  setRegisteredUsersCache,
  updateRegisteredUser,
} from '../context/authStore';

const PAGE_SIZE = 10;

export default function UserManagement() {
  const { t, lang } = useLanguage();
  const [users, setUsers] = useState(() => getRegisteredUsers());
  const [usersUpdatedAt, setUsersUpdatedAt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [monitoring, setMonitoring] = useState(null);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [creationTarget, setCreationTarget] = useState(null);
  const [changingAccess, setChangingAccess] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  const [ownerId, setOwnerId] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedId, setSelectedId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);
  const selectionHeading = useRef(null);
  useEffect(() => { selectionHeading.current?.focus(); }, [selectedId]);


  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const { loading: isLoading, error: refreshError, updatedAt, refresh: fetchUsers } = useVisiblePolling(async isActive => {
      await loadSystemAdminData({
        isActive,
        onUsers: loadedUsers => {
          setUsers(loadedUsers);
          setRegisteredUsersCache(loadedUsers);
          setUsersUpdatedAt(new Date());
        },
        onMonitoring: setMonitoring,
      });
  }, 30000, 'system-admin', !actionBusy && !changingAccess);
  const loadError = refreshError?.message;
  const partialRefreshFailure = refreshError?.failures?.length === 1;

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const signals = new Map((monitoring?.users || []).map(u => [u.id, u]));
    return users.filter((user) => {
      if (statusFilter !== 'ALL' && user.status !== statusFilter) return false;
      if (reviewOnly && !signals.get(user.id)?.signals.length) return false;
      return (
        !query ||
        (user.name || '').toLowerCase().includes(query) ||
        (user.email || '').toLowerCase().includes(query)
      );
    });
  }, [users, searchTerm, reviewOnly, monitoring, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const activeCount = users.filter((u) => (u.status || 'Active') === 'Active').length;
  const suspendedCount = users.filter((u) => u.status === 'Suspended').length;

  const updateSearch = (value) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleToggleStatus = async (targetUser) => {
    if (actionBusy) return;
    setActionBusy(true);
    const nextStatus =
      (targetUser.status || 'Active') === 'Active' ? 'Suspended' : 'Active';
    try {
      if (targetUser.id) {
        await apiClient.patch(`/admin/users/${targetUser.id}/status`, {
          status: nextStatus,
        });
      }
    } catch (error) {
      toast.error(error.message);
      return;
    } finally { setActionBusy(false); }
    setStatusTarget(null);
    updateRegisteredUser(targetUser.email, { status: nextStatus });
    setUsers((prevUsers) =>
      prevUsers.map((u) =>
        u.email === targetUser.email ? { ...u, status: nextStatus } : u
      )
    );
    toast.success(
      t(
        `เปลี่ยนสถานะเป็น ${nextStatus} เรียบร้อยแล้ว`,
        `Status updated to ${nextStatus}`
      )
    );
  };

  const changeCreationAccess = async () => {
    if (!creationTarget || changingAccess) return;
    setChangingAccess(true);
    try {
      await apiClient.patch(`/admin/users/${creationTarget.id}/project-creation`, { blocked: !creationTarget.blocked });
      setCreationTarget(null);
      await fetchUsers();
      toast.success(t('เปลี่ยนสิทธิ์สร้างโครงการแล้ว', 'Project creation access updated'));
    } catch (error) { toast.error(error.message); }
    finally { setChangingAccess(false); }
  };
  const monitoredById = new Map((monitoring?.users || []).map(u => [u.id, u]));

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete || actionBusy) return;
    setActionBusy(true);
    try {
      if (userToDelete.id) {
        await apiClient.delete(`/admin/users/${userToDelete.id}`);
      }
    } catch (error) {
      setActionBusy(false);
      toast.error(error.message);
      return;
    }
    setActionBusy(false);
    deleteRegisteredUser(userToDelete.email);
    setUsers((prevUsers) =>
      prevUsers.filter((u) => u.email !== userToDelete.email)
    );
    setIsConfirmOpen(false);
    setUserToDelete(null);
    setSelectedId(null);
    await fetchUsers();
    toast.success(t('ลบผู้ใช้งานสำเร็จ', 'User deleted successfully'));
  };

  const selectedUser = users.find(u => u.id === selectedId);
  const selectedMonitor = monitoredById.get(selectedId);
  const flaggedCount = monitoring?.users.filter(u => u.signals.length).length ?? 0;
  const blockedCount = monitoring?.users.filter(u => u.projectCreationBlocked).length ?? 0;
  const formatDate = date => date ? new Date(date).toLocaleDateString(lang === 'EN' ? 'en-GB' : 'th-TH', { dateStyle: 'medium' }) : '—';
  const resetFilters = () => { setSearchTerm(''); setReviewOnly(false); setStatusFilter('ALL'); setPage(1); };
  const showProjects = id => { setOwnerId(id); setActiveTab('projects'); };
  const tabs = [
    { id: 'users', label: t('ผู้ใช้งาน', 'Users'), icon: Users, count: users.length },
    { id: 'projects', label: t('โครงการ', 'Projects'), icon: FolderKanban, count: monitoring?.totalProjects },
    { id: 'activity', label: t('กิจกรรม', 'Activity'), icon: Activity, count: monitoring?.activities.length },
  ];
  const identity = user => <div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${user.role === 'SYSTEM_ADMIN' ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>{(user.name || user.email || '?').slice(0, 1)}</span><div className="min-w-0"><p className="break-words font-semibold text-slate-900">{user.name}</p><p className="break-all text-xs text-slate-500">{user.email}</p>{user.role === 'SYSTEM_ADMIN' && <span className="text-[11px] font-medium text-violet-600">System Admin</span>}</div></div>;
  const userStatus = user => <Badge variant={user.status === 'Suspended' ? 'error' : 'success'}>{user.status === 'Suspended' ? t('ระงับบัญชี', 'Suspended') : t('ใช้งานปกติ', 'Active')}</Badge>;
  const signals = user => { const info = monitoredById.get(user.id); if (!info) return <span className="text-xs text-slate-400">{t('ยังไม่มีข้อมูลติดตาม', 'Monitoring data unavailable')}</span>; return <div className="flex flex-wrap gap-1.5">{info?.signals.length > 0 ? <Badge variant="warning"><AlertTriangle className="h-3 w-3" />{t('ควรตรวจสอบ', 'Review needed')} · {info.signals.length}</Badge> : <span className="text-xs text-slate-400">{t('ไม่พบสัญญาณ', 'No signals')}</span>}{info?.projectCreationBlocked && <Badge variant="error"><LockKeyhole className="h-3 w-3" />{t('ระงับการสร้าง', 'Creation blocked')}</Badge>}</div>; };

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:p-6 lg:p-8">
      <PageHeader title={t('ดูแลและติดตามระบบ', 'System Administration')} subtitle="SYSTEM ADMIN" badge={<Badge variant="info"><ShieldCheck className="h-3 w-3" />{t('ผู้ดูแลระบบ', 'Administrator')}</Badge>} action={<div className="flex flex-wrap items-center gap-3"><span className="text-xs text-slate-400">{t('อัปเดตทุก 30 วินาที', 'Updates every 30 seconds')}</span><span className="text-xs text-slate-400" role="status">{updatedAt && t(`อัปเดต ${updatedAt.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`, `Updated ${updatedAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`)}</span><Button variant="secondary" onClick={fetchUsers} disabled={isLoading || actionBusy || changingAccess}><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />{t('รีเฟรชข้อมูล', 'Refresh')}</Button></div>} />
      {loadError && <div role="alert" className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${partialRefreshFailure ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-red-200 bg-red-50 text-red-700'}`}><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-semibold">{partialRefreshFailure ? t('อัปเดตข้อมูลบางส่วนไม่สำเร็จ', 'Some data could not be refreshed') : t('อัปเดตข้อมูลไม่สำเร็จ', 'Could not refresh data')}</p><p className="mt-1 whitespace-pre-line">{loadError}</p><p className="mt-1">{t('ข้อมูลส่วนที่โหลดสำเร็จยังแสดงได้ ระบบจะลองอัปเดตใหม่อัตโนมัติ', 'Successfully loaded data remains available. Retrying automatically.')}</p></div></div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MonitoringStat icon={Users} label={t('ผู้ใช้ทั้งหมด', 'Total users')} value={isLoading && !usersUpdatedAt ? '—' : users.length} hint={t(`${activeCount} ปกติ · ${suspendedCount} ระงับ`, `${activeCount} active · ${suspendedCount} suspended`)} onClick={() => { resetFilters(); setActiveTab('users'); }} />
        <MonitoringStat icon={FolderKanban} label={t('โครงการทั้งหมด', 'Total projects')} value={monitoring?.totalProjects ?? '—'} onClick={() => showProjects('')} />
        <MonitoringStat icon={AlertTriangle} tone="amber" label={t('บัญชีที่ควรตรวจสอบ', 'Accounts to review')} value={monitoring ? flaggedCount : '—'} onClick={() => { setReviewOnly(true); setPage(1); setActiveTab('users'); }} active={activeTab === 'users' && reviewOnly} />
        <MonitoringStat icon={LockKeyhole} tone="slate" label={t('ระงับการสร้างโครงการ', 'Creation access blocked')} value={monitoring ? blockedCount : '—'} hint={t('สิทธิ์แยกจากสถานะบัญชี', 'Separate from account status')} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3"><MonitoringTabs id="system" label={t('ส่วนจัดการระบบ', 'Administration sections')} items={tabs} value={activeTab} onChange={setActiveTab} /><span className="text-xs text-slate-400">{t('ข้อมูลเฉพาะผู้ดูแลระบบ', 'Administrator access only')}</span></div>
      {activeTab === 'users' ? <section role="tabpanel" id="system-users-panel" aria-labelledby="system-users-tab" className="space-y-4">
        <Card noPadding>
          <div className="space-y-4 border-b border-slate-100 p-4 sm:p-6"><div><h2 className="font-bold text-slate-900">{t('บัญชีผู้ใช้งาน', 'User accounts')}</h2><p className="mt-1 text-xs leading-5 text-slate-500">{t('ตรวจสอบสัญญาณก่อนเลือกจัดการสิทธิ์ การแจ้งเตือนไม่ได้หมายความว่าบัญชีกระทำผิด', 'Review signals before changing access. A signal does not establish misuse.')}</p></div><div className="flex flex-col gap-3 sm:flex-row"><MonitoringSearch id="user-search" label={t('ค้นหาชื่อหรืออีเมล', 'Search name or email')} value={searchTerm} onChange={updateSearch} /><select aria-label={t('กรองสถานะบัญชี', 'Filter account status')} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"><option value="ALL">{t('ทุกสถานะ', 'All statuses')}</option><option value="Active">{t('ใช้งานปกติ', 'Active')}</option><option value="Suspended">{t('ระงับบัญชี', 'Suspended')}</option></select><Button variant={reviewOnly ? 'primary' : 'secondary'} aria-pressed={reviewOnly} onClick={() => { setReviewOnly(!reviewOnly); setPage(1); }}><AlertTriangle className="h-4 w-4" />{t('ควรตรวจสอบ', 'Needs review')}</Button></div></div>
          {isLoading && !usersUpdatedAt ? <MonitoringSkeleton /> : !pagedUsers.length ? <MonitoringEmpty title={t('ไม่พบบัญชีที่ตรงกับเงื่อนไข', 'No matching accounts')} description={t('ลองค้นหาด้วยชื่อ อีเมล หรือเลือกสถานะอื่น', 'Try a different name, email, or account status.')} onReset={searchTerm || reviewOnly || statusFilter !== 'ALL' ? resetFilters : undefined} /> : <>
            <div className="hidden overflow-x-auto md:block"><table className="w-full text-left text-sm"><thead><tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-500">{[t('ผู้ใช้งาน', 'User'), t('สถานะบัญชี', 'Account status'), t('โครงการ', 'Projects'), t('สัญญาณ / สิทธิ์สร้าง', 'Signals / Creation access'), t('จัดการ', 'Manage')].map(h => <th scope="col" className="px-5 py-3.5" key={h}>{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{pagedUsers.map(user => <tr key={user.id} className={`transition-colors hover:bg-slate-50/70 ${selectedId === user.id ? 'bg-blue-50/40' : ''}`}><td className="px-5 py-4">{identity(user)}<p className="ml-13 mt-1 text-[11px] text-slate-400">{t('สมัคร ', 'Joined ')}{formatDate(user.createdAt)}</p></td><td className="px-5 py-4">{userStatus(user)}</td><td className="px-5 py-4"><button className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline" onClick={() => showProjects(user.id)} aria-label={t(`ดูโครงการของ ${user.name}`, `View projects owned by ${user.name}`)}>{monitoredById.get(user.id)?.projectCount ?? '—'}<ArrowRight className="h-3 w-3" /></button><p className="mt-1 text-[11px] text-slate-400">{monitoredById.get(user.id)?.createdLast24Hours ?? '—'} {t('ใน 24 ชม.', 'in 24h')}</p></td><td className="max-w-64 px-5 py-4">{signals(user)}</td><td className="px-5 py-4"><Button variant="secondary" size="sm" onClick={() => setSelectedId(user.id)} aria-expanded={selectedId === user.id} aria-controls="selected-user-access"><Settings2 className="h-3.5 w-3.5" />{t('จัดการสิทธิ์', 'Manage access')}</Button></td></tr>)}</tbody></table></div>
            <div className="divide-y divide-slate-100 md:hidden">{pagedUsers.map(user => <div key={user.id} className="space-y-3 p-4">{identity(user)}<div className="flex flex-wrap items-center gap-2">{userStatus(user)}{signals(user)}</div><div className="flex items-center justify-between gap-2"><button onClick={() => showProjects(user.id)} className="text-xs font-semibold text-blue-700 hover:underline">{monitoredById.get(user.id)?.projectCount ?? '—'} {t('โครงการ', 'projects')} →</button><Button variant="secondary" size="sm" onClick={() => setSelectedId(user.id)} aria-controls="selected-user-access"><Settings2 className="h-3.5 w-3.5" />{t('จัดการสิทธิ์', 'Manage access')}</Button></div></div>)}</div>
          </>}
          <MonitoringPagination page={currentPage} pages={totalPages} count={filteredUsers.length} onChange={setPage} />
        </Card>
        {selectedUser && <Card noPadding><section id="selected-user-access" className="p-4 sm:p-6"><div className="flex items-start justify-between gap-3"><div><h2 ref={selectionHeading} tabIndex={-1} className="font-bold text-slate-900">{t('จัดการสิทธิ์บัญชี', 'Account access')}</h2><p className="mt-1 break-all text-sm text-slate-500">{selectedUser.name} · {selectedUser.email}</p></div><Button size="sm" variant="textGray" aria-label={t('ปิดรายละเอียดบัญชี', 'Close account details')} onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button></div><div className="mt-4 flex flex-wrap gap-2">{userStatus(selectedUser)}{signals(selectedUser)}</div>{selectedMonitor?.signals.length > 0 && <ul className="mt-4 space-y-1 rounded-lg border border-amber-100 bg-amber-50/60 p-3 text-xs leading-6 text-amber-800">{selectedMonitor.signals.map(signal => <li key={signal}>• {signal}</li>)}</ul>}
          {selectedUser.role === 'SYSTEM_ADMIN' ? <p className="mt-4 flex gap-2 text-sm text-slate-500"><ShieldCheck className="h-4 w-4 shrink-0" />{t('บัญชีผู้ดูแลระบบได้รับการป้องกันการระงับและลบ', 'Administrator accounts are protected from suspension and deletion.')}</p> : <div className="mt-5 grid gap-3 lg:grid-cols-3"><div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">{t('สิทธิ์สร้างโครงการ', 'Project creation')}</p><p className="mb-3 mt-1 text-xs leading-5 text-slate-500">{t('เปลี่ยนเฉพาะการสร้างโครงการ การให้คะแนนยังใช้ได้ตามสิทธิ์', 'Changes creation access; existing evaluation permissions are preserved.')}</p><Button variant="secondary" size="sm" disabled={isLoading || !monitoring || changingAccess} onClick={() => setCreationTarget({ ...selectedUser, blocked: selectedMonitor?.projectCreationBlocked })}><LockKeyhole className="h-3.5 w-3.5" />{selectedMonitor?.projectCreationBlocked ? t('คืนสิทธิ์สร้าง', 'Restore creation') : t('ระงับการสร้าง', 'Block creation')}</Button></div><div className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold">{t('การเข้าถึงระบบ', 'Account access')}</p><p className="mb-3 mt-1 text-xs leading-5 text-slate-500">{t('บัญชีที่ถูกระงับจะไม่สามารถใช้งานระบบได้จนกว่าจะเปิดใช้', 'A suspended account cannot use the system until reactivated.')}</p><Button variant="secondary" size="sm" disabled={actionBusy} onClick={() => setStatusTarget(selectedUser)}><ShieldOff className="h-3.5 w-3.5" />{selectedUser.status === 'Suspended' ? t('เปิดใช้งานบัญชี', 'Activate account') : t('ระงับบัญชี', 'Suspend account')}</Button></div><div className="rounded-xl border border-red-100 bg-red-50/30 p-4"><p className="text-sm font-semibold text-red-800">{t('ลบบัญชีผู้ใช้', 'Delete account')}</p><p className="mb-3 mt-1 text-xs leading-5 text-slate-500">{t('การลบเป็นการถาวร ควรตรวจสอบโครงการที่เกี่ยวข้องก่อน', 'Deletion is permanent. Review related projects first.')}</p><Button variant="danger" size="sm" disabled={actionBusy} onClick={() => handleDeleteClick(selectedUser)}><Trash2 className="h-3.5 w-3.5" />{t('ลบผู้ใช้', 'Delete user')}</Button></div></div>}
        </section></Card>}
      </section> : <section role="tabpanel" id={`system-${activeTab}-panel`} aria-labelledby={`system-${activeTab}-tab`}><SystemMonitoringOverview key={activeTab} data={monitoring} users={users} mode={activeTab} ownerId={ownerId} onOwnerChange={setOwnerId} loading={isLoading} /></section>}
      {monitoring && <details className="rounded-xl border border-slate-200/80 bg-white/60 px-4 py-3 text-xs text-slate-500"><summary className="cursor-pointer font-medium text-slate-600">{t('นโยบายการสร้างโครงการและข้อมูลการติดตาม', 'Creation policy and monitoring information')}</summary><p className="mt-3 leading-6">{t(`โควตาต่อบัญชี: ${monitoring.burstLimit} โครงการ / 10 นาที · ${monitoring.dailyLimit} โครงการ / 24 ชั่วโมง · คงอยู่ไม่เกิน ${monitoring.totalLimit} โครงการ`, `Per account: ${monitoring.burstLimit} projects / 10 minutes · ${monitoring.dailyLimit} / 24 hours · ${monitoring.totalLimit} existing projects`)}</p><p className="mt-1 leading-6">{t('ประวัติเริ่มบันทึกหลังเปิดใช้ระบบติดตาม และแสดงเหตุการณ์ล่าสุดสูงสุด 100 รายการทั้งระบบ', 'History begins when monitoring is enabled. The latest 100 events across the system are available.')}</p></details>}
      <ConfirmDialog isOpen={Boolean(creationTarget)} isLoading={changingAccess} isDanger={!creationTarget?.blocked} title={creationTarget?.blocked ? t('คืนสิทธิ์สร้างโครงการ', 'Restore creation access') : t('ระงับสิทธิ์สร้างโครงการ', 'Block creation access')} message={t(`เปลี่ยนสิทธิ์สร้างโครงการของ ${creationTarget?.name}? ผู้ใช้ยังดูโครงการเดิมและให้คะแนนได้ตามสิทธิ์`, `Change project creation access for ${creationTarget?.name}? Existing project and evaluation access is preserved.`)} onConfirm={changeCreationAccess} onCancel={() => setCreationTarget(null)} />
      <ConfirmDialog isOpen={Boolean(statusTarget)} isLoading={actionBusy} isDanger={statusTarget?.status !== 'Suspended'} title={statusTarget?.status === 'Suspended' ? t('เปิดใช้งานบัญชี', 'Activate account') : t('ระงับบัญชีผู้ใช้', 'Suspend account')} message={statusTarget?.status === 'Suspended' ? t(`เปิดใช้งานบัญชี ${statusTarget?.name} อีกครั้ง? ผู้ใช้จะกลับเข้าใช้งานระบบได้ตามสิทธิ์เดิม`, `Reactivate ${statusTarget?.name}? This restores system access with their existing permissions.`) : t(`ระงับบัญชี ${statusTarget?.name}? ผู้ใช้จะไม่สามารถเข้าถึงระบบได้จนกว่าจะเปิดใช้งานอีกครั้ง`, `Suspend ${statusTarget?.name}? This prevents system access until the account is reactivated.`)} onConfirm={() => handleToggleStatus(statusTarget)} onCancel={() => setStatusTarget(null)} />
      <ConfirmDialog isOpen={isConfirmOpen} isLoading={actionBusy} title={t('ยืนยันการลบผู้ใช้งาน', 'Confirm user deletion')} message={t(`ลบผู้ใช้งาน “${userToDelete?.name}” อย่างถาวร? กรุณาตรวจสอบโครงการที่เกี่ยวข้องก่อนดำเนินการ`, `Permanently delete “${userToDelete?.name}”? Review related projects before continuing.`)} onConfirm={confirmDelete} onCancel={() => setIsConfirmOpen(false)} confirmText={t('ลบผู้ใช้ถาวร', 'Delete permanently')} />
    </div>
  );
}
