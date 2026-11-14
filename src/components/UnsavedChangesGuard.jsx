import { useCallback, useEffect } from 'react';
import { useBeforeUnload, useBlocker } from 'react-router-dom';
import ConfirmDialog from './ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';

export default function UnsavedChangesGuard({ when, busy = false, message }) {
  const { t } = useLanguage();
  const blocker = useBlocker(({ currentLocation, nextLocation }) => Boolean(when) &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search));
  useBeforeUnload(useCallback(event => {
    if (!when) return;
    event.preventDefault();
    event.returnValue = '';
  }, [when]));
  useEffect(() => {
    if (!when && blocker.state === 'blocked') blocker.reset();
  }, [when, blocker]);
  return <ConfirmDialog isOpen={blocker.state === 'blocked'} isLoading={busy}
    title={t('มีข้อมูลที่ยังไม่บันทึก', 'Unsaved changes')}
    message={busy ? t('กำลังบันทึกข้อมูล กรุณารอให้เสร็จก่อนออกจากหน้า', 'Saving your work. Please wait before leaving.') :
      (message || t('คะแนนหรือความคิดเห็นที่แก้ไขยังไม่ได้บันทึก หากออกจากหน้านี้ข้อมูลส่วนที่ยังไม่บันทึกจะหายไป', 'Your score or feedback changes have not been saved. Leaving will discard unsaved input.'))}
    confirmText={t('ออกโดยไม่บันทึก', 'Leave without saving')}
    cancelText={t('อยู่หน้านี้ต่อ', 'Stay on this page')}
    onConfirm={() => blocker.proceed?.()} onCancel={() => blocker.reset?.()} />;
}
