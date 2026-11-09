import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search, UserRound, X } from 'lucide-react';
import Button from './Button';
import CriteriaModal from './CriteriaModal';
import { useLanguage } from '../context/LanguageContext';

export default function JudgeUserPicker({ availableUsers, onAssign, onClose, isAssigning = false }) {
  const { t } = useLanguage();
  const inputId = useId();
  const listId = `${inputId}-options`;
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const [query, setQuery] = useState('');
  const [selectedEmail, setSelectedEmail] = useState('');
  const [isListOpen, setIsListOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedUser = availableUsers.find(user => user.email === selectedEmail);
  const matchingUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return availableUsers.filter(user => !search || user.email.toLowerCase().includes(search) ||
      (user.name || '').toLowerCase().includes(search));
  }, [availableUsers, query]);
  const safeActiveIndex = activeIndex < matchingUsers.length ? activeIndex : 0;

  useEffect(() => {
    if (isListOpen) listRef.current?.children[safeActiveIndex]?.scrollIntoView({ block: 'nearest' });
  }, [isListOpen, safeActiveIndex, query]);

  const selectUser = user => {
    inputRef.current?.focus();
    setSelectedEmail(user.email);
    setQuery('');
    setIsListOpen(false);
  };
  const handleKeyDown = event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setIsListOpen(true);
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex(isListOpen && matchingUsers.length ?
        (safeActiveIndex + step + matchingUsers.length) % matchingUsers.length :
        event.key === 'ArrowUp' ? Math.max(0, matchingUsers.length - 1) : 0);
    } else if (event.key === 'Enter' && isListOpen) {
      event.preventDefault();
      if (matchingUsers[safeActiveIndex]) selectUser(matchingUsers[safeActiveIndex]);
    } else if (event.key === 'Escape' && isListOpen) {
      event.preventDefault(); event.stopPropagation(); setIsListOpen(false);
    } else if (event.key === 'Tab') setIsListOpen(false);
  };

  return <CriteriaModal isOpen onClose={onClose} closeDisabled={isAssigning}
    title={t('เชิญกรรมการเข้าโครงการ', 'Invite Judge to Competition')} maxWidth="max-w-lg">
    <form className="space-y-4" onSubmit={event => {
      event.preventDefault();
      if (selectedUser && !isAssigning) onAssign(selectedUser.email.trim().toLowerCase());
    }}>
      <p className="text-sm text-slate-600">{t('ค้นหาด้วยชื่อหรืออีเมล แล้วเลือกผู้ใช้ที่ต้องการเชิญ', 'Search by name or email, then select a user to invite.')}</p>
      <div onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setIsListOpen(false); }}>
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700">{t('เลือกกรรมการ', 'Select a judge')}</label>
        {availableUsers.length ? <>
          <div className="flex items-center rounded-lg border border-slate-200 bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100">
            <Search className="ml-3 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input ref={inputRef} id={inputId} type="text" role="combobox" autoComplete="off"
              aria-autocomplete="list" aria-expanded={isListOpen} aria-controls={listId}
              aria-activedescendant={isListOpen && matchingUsers.length ? `${listId}-${safeActiveIndex}` : undefined}
              aria-describedby={`${inputId}-help`} disabled={isAssigning} autoFocus
              className="judge-user-picker-input min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none disabled:text-slate-400"
              placeholder={t('ค้นหาชื่อหรืออีเมล…', 'Search name or email…')}
              value={selectedUser ? `${selectedUser.name || selectedUser.email} · ${selectedUser.email}` : query}
              onFocus={() => setIsListOpen(true)} onKeyDown={handleKeyDown}
              onChange={event => { setQuery(event.target.value); setSelectedEmail(''); setActiveIndex(0); setIsListOpen(true); }} />
            {(query || selectedUser) && <button type="button" disabled={isAssigning}
              aria-label={t('ล้างการเลือกกรรมการ', 'Clear judge selection')}
              className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-500"
              onClick={() => { setSelectedEmail(''); setQuery(''); setActiveIndex(0); inputRef.current?.focus(); setIsListOpen(true); }}><X className="h-4 w-4" /></button>}
            <button type="button" disabled={isAssigning} aria-label={t('เปิดหรือปิดรายชื่อกรรมการ', 'Toggle judge list')}
              className="mr-1 rounded-md p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-blue-500"
              onClick={() => { const next = !isListOpen; inputRef.current?.focus(); setIsListOpen(next); }}>
              <ChevronDown className={`h-4 w-4 transition-transform ${isListOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {isListOpen && <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500" role="status">{t(`พบ ${matchingUsers.length} คน`, `${matchingUsers.length} users found`)}</div>
            <ul ref={listRef} id={listId} role="listbox" aria-label={t('ผู้ใช้ที่สามารถเชิญได้', 'Available users')}
              className="max-h-56 overflow-y-auto overscroll-contain p-1">
              {matchingUsers.map((user, index) => <li key={user.email} id={`${listId}-${index}`} role="option"
                aria-selected={user.email === selectedEmail}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${index === safeActiveIndex ? 'bg-blue-50 text-blue-900' : 'text-slate-700 hover:bg-slate-50'}`}
                onMouseEnter={() => setActiveIndex(index)} onMouseDown={event => event.preventDefault()}
                onClick={() => { if (!isAssigning) selectUser(user); }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600"><UserRound className="h-4 w-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{user.name || user.email}</span><span className="block break-all text-xs text-slate-500">{user.email}</span></span>
                {user.email === selectedEmail && <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />}
              </li>)}
            </ul>
            {!matchingUsers.length && <p className="px-4 py-6 text-center text-sm text-slate-500">{t('ไม่พบผู้ใช้ที่ตรงกับคำค้น หรือผู้ใช้นี้ถูกเชิญแล้ว', 'No matching users found, or the user has already been invited.')}</p>}
          </div>}
          <p id={`${inputId}-help`} className="mt-2 text-xs text-slate-500">{selectedUser ? t('เลือกแล้ว พร้อมเชิญเข้าโครงการ', 'Selected and ready to invite') : t('เลือกรายชื่อก่อนกดเชิญ · ใช้ปุ่ม ↑ ↓ และ Enter เพื่อเลือกได้', 'Select a user before inviting · Use ↑ ↓ and Enter to select')}</p>
        </> : <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-500">{t('ยังไม่มีผู้ใช้อื่นที่สามารถเชิญเข้าโครงการนี้ได้', 'No additional registered users available to invite.')}</p>}
      </div>
      <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isAssigning}>{t('ยกเลิก', 'Cancel', { compact: true })}</Button>
        <Button type="submit" isLoading={isAssigning} disabled={!selectedUser || isAssigning}>{isAssigning ? t('กำลังเชิญ…', 'Inviting…') : t('เชิญเข้าโครงการ', 'Invite Judge', { compact: true })}</Button>
      </div>
    </form>
  </CriteriaModal>;
}
