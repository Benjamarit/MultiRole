import { useMemo, useRef, useState } from 'react';
import Button from './Button';
import CriteriaModal from './CriteriaModal';
import { useLanguage } from '../context/LanguageContext';
import { parseTeamWorksheet, readTeamWorkbook, teamImportErrorMessage } from '../data/teams/TeamImport';

async function downloadTemplate() {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teams');

  sheet.columns = [
    { header: 'ชื่อทีม', key: 'name', width: 24 },
    { header: 'รายละเอียดผลงาน', key: 'description', width: 50 },
    { header: 'ลิงก์ผลงาน', key: 'link', width: 40 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({
    name: 'Team Alpha',
    description: 'ตัวอย่าง: แอปจัดการงานสำหรับทีมขนาดเล็ก',
    link: 'https://github.com/example/team-alpha',
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'team-import-template.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function TeamImportModal({ isOpen, onImport, onClose, isImporting = false, existingTeamNames = [] }) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [workbook, setWorkbook] = useState(null);
  const [sheetId, setSheetId] = useState('');
  const [hasHeader, setHasHeader] = useState(true);
  const [readDetails, setReadDetails] = useState('');
  const [importError, setImportError] = useState('');
  const parseVersion = useRef(0);
  const confirmInFlight = useRef(false);
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false);

  const preview = useMemo(() => {
    try { return { rows: parseTeamWorksheet(workbook?.worksheets.find(sheet => String(sheet.id) === sheetId), { hasHeader, t }), error: null }; }
    catch (error) { return { rows: [], error }; }
  }, [workbook, sheetId, hasHeader, t]);
  const parsedRows = preview.rows;
  const rows = useMemo(() => {
    const names = new Set(existingTeamNames.map(name => name.trim().toLowerCase()));
    return parsedRows.map(row => {
      const name = row.name.toLowerCase();
      const duplicate = !row.error && names.has(name);
      if (!row.error) names.add(name);
      return { ...row, duplicate };
    });
  }, [parsedRows, existingTeamNames]);
  if (!isOpen) return null;
  const validRows = rows.filter(row => !row.error && !row.duplicate);
  const invalidRows = rows.filter(row => row.error);
  const duplicateRows = rows.filter(row => row.duplicate);
  const readError = parseError || (preview.error ? teamImportErrorMessage(preview.error, t) : '');
  const errorDetails = readDetails || preview.error?.message;

  const reset = () => {
    setFileName('');
    parseVersion.current += 1;
    setWorkbook(null);
    setSheetId('');
    setHasHeader(true);
    setReadDetails('');
    setImportError('');
    setIsParsing(false);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isImporting || confirmInFlight.current) return;
    reset();
    onClose();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || isImporting) return;
    const version = ++parseVersion.current;
    setFileName(file.name);
    setParseError('');
    setReadDetails('');
    setImportError('');
    setWorkbook(null);
    setSheetId('');
    setHasHeader(true);
    setIsParsing(true);
    try {
      const loaded = await readTeamWorkbook(file);
      if (version !== parseVersion.current) return;
      setWorkbook(loaded);
      const first = loaded.worksheets.find(sheet => sheet.state !== 'veryHidden' && sheet.actualRowCount > 0) || loaded.worksheets[0];
      setSheetId(String(first.id));
    } catch (error) {
      if (version !== parseVersion.current) return;
      setParseError(teamImportErrorMessage(error, t));
      setReadDetails(error.cause?.message || '');
    } finally {
      if (version === parseVersion.current) setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!validRows.length || isParsing || isImporting || confirmInFlight.current) return;
    confirmInFlight.current = true;
    setImportError('');
    try {
      const result = await onImport(validRows.map(({ name, description, link }) => ({ name, description, link })));
      if (result !== false) reset();
    } catch (error) {
      setImportError(error.message || t('นำเข้าไม่สำเร็จ รายการยังอยู่ให้ลองใหม่', 'Import failed. Your preview is retained for retry.'));
    } finally { confirmInFlight.current = false; }
  };

  const handleDownloadTemplate = async () => {
    setIsTemplateDownloading(true);
    try {
      await downloadTemplate();
    } catch {
      setImportError(t('สร้างเทมเพลตไม่สำเร็จ กรุณาลองอีกครั้ง', 'Could not generate the template. Please retry.'));
    } finally {
      setIsTemplateDownloading(false);
    }
  };

  return (
    <CriteriaModal
      isOpen={isOpen}
      onClose={handleClose}
      closeDisabled={isImporting}
      title={t('นำเข้าทีมจากไฟล์ Excel', 'Import Teams from Excel')}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <p className="text-sm leading-6 text-slate-600">
            {t(
              'ใช้คอลัมน์ชื่อทีม รายละเอียดผลงาน และลิงก์ผลงาน โดยบังคับเฉพาะชื่อทีม หากไม่มีหัวตารางให้เรียงตามลำดับนี้',
              'Use Team Name, Description, and Submission Link; only Team Name is required. Without headers, use this column order.'
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={isTemplateDownloading || isImporting}
          >
            {isTemplateDownloading
              ? t('กำลังสร้างไฟล์...', 'Generating...')
              : t('↓ ดาวน์โหลดเทมเพลต', '↓ Download Template')}
          </Button>
        </div>

        <div>
          <label
            htmlFor="team-import-file"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            {t('เลือกไฟล์ Excel (.xlsx)', 'Select Excel File (.xlsx)')}
          </label>
          <input
            id="team-import-file"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            disabled={isImporting}
            onChange={handleFileChange}
            className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          {fileName && !isParsing && (
            <p className="mt-1.5 text-xs text-slate-500">
              {t('ไฟล์ที่เลือก:', 'Selected file:')} {fileName}
            </p>
          )}
        </div>

        {workbook && <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1"><label htmlFor="team-import-sheet" className="mb-1 block text-xs font-semibold text-slate-600">{t('ชีตที่จะนำเข้า', 'Worksheet to import')}</label><select id="team-import-sheet" disabled={isImporting} value={sheetId} onChange={event => { setSheetId(event.target.value); setImportError(''); }} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">{workbook.worksheets.map(sheet => <option key={sheet.id} value={String(sheet.id)}>{sheet.name}</option>)}</select></div>
          <label className="flex items-center gap-2 text-xs text-slate-700"><input type="checkbox" checked={hasHeader} disabled={isImporting} onChange={event => { setHasHeader(event.target.checked); setImportError(''); }} className="h-4 w-4 accent-blue-600" />{t('แถวแรกเป็นหัวตาราง', 'First populated row is a header')}</label>
        </div>}
        {workbook && !rows.length && !readError && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{t('ไม่พบรายชื่อทีมในชีตนี้ ลองเลือกชีตอื่น หรือตรวจว่าไฟล์มีหัวตารางหรือไม่', 'No team rows found. Choose another worksheet or check the header option.')}</p>}
        {isParsing && (
          <p className="text-sm text-slate-500">
            {t('กำลังอ่านไฟล์...', 'Reading file...')}
          </p>
        )}

        {readError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {readError}
          </p>
        )}

        {errorDetails && <details className="rounded-lg border border-slate-200 p-3 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">{t('รายละเอียดข้อผิดพลาด', 'Error details')}</summary><p className="mt-2 break-words">{errorDetails}</p></details>}
        {importError && <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm leading-6 text-red-700">{importError}</p>}
        {rows.length > 0 && !isParsing && (
          <div>
            <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold">
              <span className="text-slate-600">
                {t(`พบทั้งหมด ${rows.length} แถว`, `Found ${rows.length} rows`)}
              </span>
              <span className="text-emerald-600">
                {t(`พร้อมนำเข้า ${validRows.length} แถว`, `Valid: ${validRows.length}`)}
              </span>
              {duplicateRows.length > 0 && <span className="text-amber-700">{t(`ข้ามชื่อซ้ำ ${duplicateRows.length} แถว`, `Skip ${duplicateRows.length} duplicate rows`)}</span>}
              {invalidRows.length > 0 && (
                <span className="text-red-600">
                  {t(`มีปัญหา ${invalidRows.length} แถว`, `Invalid: ${invalidRows.length}`)}
                </span>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50">
                  <tr className="text-left text-xs font-semibold text-slate-500">
                    <th className="px-3 py-2">{t('แถว', 'Row')}</th>
                    <th className="px-3 py-2">{t('ชื่อทีม', 'Team Name')}</th>
                    <th className="px-3 py-2">{t('รายละเอียด', 'Description')}</th>
                    <th className="px-3 py-2">{t('ลิงก์', 'Link')}</th>
                    <th className="px-3 py-2">{t('สถานะ', 'Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr
                      key={row.rowNumber}
                      className={row.error ? 'bg-red-50/50' : ''}
                    >
                      <td className="px-3 py-2 text-slate-400">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {row.name || '—'}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-2 text-slate-600">
                        {row.description || '—'}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-slate-600">
                        {row.link || '—'}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">
                        {row.error ? (
                          <span className="text-red-600">✕ {row.error}</span>
                        ) : row.duplicate ? <span className="text-amber-700">{t('ข้ามชื่อซ้ำ', 'Skip duplicate')}</span> : (
                          <span className="text-emerald-600">
                            ✓ {t('พร้อม', 'Ready')}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="secondary" disabled={isImporting} onClick={handleClose}>
            {t('ยกเลิก', 'Cancel')}
          </Button>
          <Button onClick={handleConfirmImport} isLoading={isImporting} disabled={validRows.length === 0 || isParsing || isImporting}>
            {t(
              `นำเข้า ${validRows.length > 0 ? `${validRows.length} ทีม` : ''}`,
              `Import ${validRows.length > 0 ? `${validRows.length} Teams` : ''}`
            )}
          </Button>
        </div>
      </div>
    </CriteriaModal>
  );
}
