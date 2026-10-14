import { useRef, useState } from 'react';
import Button from './Button';
import CriteriaModal from './CriteriaModal';
import { useLanguage } from '../context/LanguageContext';

const URL_PATTERN = /^https?:\/\/.+/i;

function parseRow(row, rowNumber, t) {
  const name = (row.getCell(1).text || '').trim();
  const description = (row.getCell(2).text || '').trim();
  const link = (row.getCell(3).text || '').trim();

  let error = null;
  if (!name) {
    error = t('ไม่มีชื่อทีม (คอลัมน์ A)', 'Missing team name (Column A)');
  } else if (link && !URL_PATTERN.test(link)) {
    error = t(
      'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://',
      'Link must start with http:// or https://'
    );
  }

  return { rowNumber, name, description, link, error };
}

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
  link.click();
  URL.revokeObjectURL(url);
}

export default function TeamImportModal({ isOpen, onImport, onClose }) {
  const { t } = useLanguage();
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isTemplateDownloading, setIsTemplateDownloading] = useState(false);

  if (!isOpen) return null;

  const validRows = rows.filter((row) => !row.error);
  const invalidRows = rows.filter((row) => row.error);

  const reset = () => {
    setFileName('');
    setRows([]);
    setParseError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError('');
    setRows([]);
    setIsParsing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { default: ExcelJS } = await import('exceljs');
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        setParseError(t('ไม่พบชีตข้อมูลในไฟล์นี้', 'No worksheet found in this file'));
        return;
      }

      const parsedRows = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return;
        parsedRows.push(parseRow(row, rowNumber, t));
      });

      if (parsedRows.length === 0) {
        setParseError(
          t(
            'ไม่พบข้อมูลทีมในไฟล์ (ต้องมีอย่างน้อย 1 แถวใต้หัวตาราง)',
            'No team rows found under the header row'
          )
        );
      }
      setRows(parsedRows);
    } catch {
      setParseError(
        t(
          'ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx ที่ถูกต้อง',
          'Could not read file. Please upload a valid .xlsx file.'
        )
      );
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;
    onImport(
      validRows.map(({ name, description, link }) => ({ name, description, link }))
    );
    reset();
  };

  const handleDownloadTemplate = async () => {
    setIsTemplateDownloading(true);
    try {
      await downloadTemplate();
    } finally {
      setIsTemplateDownloading(false);
    }
  };

  return (
    <CriteriaModal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('นำเข้าทีมจากไฟล์ Excel', 'Import Teams from Excel')}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <p className="text-sm leading-6 text-slate-600">
            {t(
              'ไฟล์ต้องมีคอลัมน์ตามลำดับ: ชื่อทีม (บังคับ), รายละเอียดผลงาน, ลิงก์ผลงาน โดยแถวแรกเป็นหัวตาราง',
              'Columns required in order: Team Name (required), Description, Submission Link. Row 1 is skipped as header.'
            )}
          </p>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={isTemplateDownloading}
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
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3.5 file:py-2 file:text-xs file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
          />
          {fileName && !isParsing && (
            <p className="mt-1.5 text-xs text-slate-500">
              {t('ไฟล์ที่เลือก:', 'Selected file:')} {fileName}
            </p>
          )}
        </div>

        {isParsing && (
          <p className="text-sm text-slate-500">
            {t('กำลังอ่านไฟล์...', 'Reading file...')}
          </p>
        )}

        {parseError && (
          <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-600">
            {parseError}
          </p>
        )}

        {rows.length > 0 && !isParsing && (
          <div>
            <div className="mb-3 flex flex-wrap gap-3 text-xs font-semibold">
              <span className="text-slate-600">
                {t(`พบทั้งหมด ${rows.length} แถว`, `Found ${rows.length} rows`)}
              </span>
              <span className="text-emerald-600">
                {t(`พร้อมนำเข้า ${validRows.length} แถว`, `Valid: ${validRows.length}`)}
              </span>
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
                        ) : (
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
          <Button variant="secondary" onClick={handleClose}>
            {t('ยกเลิก', 'Cancel')}
          </Button>
          <Button onClick={handleConfirmImport} disabled={validRows.length === 0}>
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
