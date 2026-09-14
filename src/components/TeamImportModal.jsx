import { useRef, useState } from 'react';
import Button from './Button';

// คอลัมน์ที่คาดหวังในไฟล์: A=ชื่อทีม (บังคับ), B=รายละเอียดผลงาน (ไม่บังคับ), C=ลิงก์ผลงาน (ไม่บังคับ)
// แถวที่ 1 ถือเป็นหัวตาราง จะข้ามเสมอ
const URL_PATTERN = /^https?:\/\/.+/i;

function parseRow(row, rowNumber) {
  const name = (row.getCell(1).text || '').trim();
  const description = (row.getCell(2).text || '').trim();
  const link = (row.getCell(3).text || '').trim();

  let error = null;
  if (!name) {
    error = 'ไม่มีชื่อทีม (คอลัมน์ A)';
  } else if (link && !URL_PATTERN.test(link)) {
    error = 'ลิงก์ต้องขึ้นต้นด้วย http:// หรือ https://';
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

/**
 * <TeamImportModal
 *   isOpen={isImportOpen}
 *   onImport={(teams) => ...}   // teams: [{ name, description, link }]
 *   onClose={() => ...}
 * />
 */
export default function TeamImportModal({ isOpen, onImport, onClose }) {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]); // parsed rows, [] = ยังไม่เลือกไฟล์
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
        setParseError('ไม่พบชีตข้อมูลในไฟล์นี้');
        return;
      }

      const parsedRows = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // แถวหัวตาราง
        parsedRows.push(parseRow(row, rowNumber));
      });

      if (parsedRows.length === 0) {
        setParseError('ไม่พบข้อมูลทีมในไฟล์ (ต้องมีอย่างน้อย 1 แถวใต้หัวตาราง)');
      }
      setRows(parsedRows);
    } catch {
      setParseError('ไม่สามารถอ่านไฟล์นี้ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx ที่ถูกต้อง');
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (validRows.length === 0) return;
    onImport(validRows.map(({ name, description, link }) => ({ name, description, link })));
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="team-import-title"
    >
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="team-import-title" className="text-lg font-semibold text-gray-900">
              นำเข้าทีมจาก Excel
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              ไฟล์ต้องมีคอลัมน์ตามลำดับ: ชื่อทีม (บังคับ), รายละเอียดผลงาน, ลิงก์ผลงาน
              โดยแถวแรกเป็นหัวตาราง
            </p>
          </div>
          <Button
            variant="text"
            size="sm"
            onClick={handleDownloadTemplate}
            disabled={isTemplateDownloading}
          >
            {isTemplateDownloading ? 'กำลังสร้างไฟล์...' : '↓ ดาวน์โหลดเทมเพลต'}
          </Button>
        </div>

        <div className="mt-5">
          <label
            htmlFor="team-import-file"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            เลือกไฟล์ Excel (.xlsx)
          </label>
          <input
            id="team-import-file"
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
          />
          {fileName && !isParsing && (
            <p className="mt-1 text-xs text-gray-400">ไฟล์ที่เลือก: {fileName}</p>
          )}
        </div>

        {isParsing && <p className="mt-4 text-sm text-gray-500">กำลังอ่านไฟล์...</p>}

        {parseError && (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{parseError}</p>
        )}

        {rows.length > 0 && !isParsing && (
          <div className="mt-5">
            <div className="flex flex-wrap gap-3 text-sm mb-3">
              <span className="text-gray-600">พบทั้งหมด {rows.length} แถว</span>
              <span className="text-green-600 font-medium">พร้อมนำเข้า {validRows.length} แถว</span>
              {invalidRows.length > 0 && (
                <span className="text-red-600 font-medium">มีปัญหา {invalidRows.length} แถว</span>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto border border-gray-200 rounded-md">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-500">
                    <th className="px-3 py-2 font-medium">แถว</th>
                    <th className="px-3 py-2 font-medium">ชื่อทีม</th>
                    <th className="px-3 py-2 font-medium">รายละเอียดผลงาน</th>
                    <th className="px-3 py-2 font-medium">ลิงก์</th>
                    <th className="px-3 py-2 font-medium">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className={row.error ? 'bg-red-50/50' : ''}>
                      <td className="px-3 py-2 text-gray-400">{row.rowNumber}</td>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">
                        {row.description || '—'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">
                        {row.link || '—'}
                      </td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="text-red-600">✕ {row.error}</span>
                        ) : (
                          <span className="text-green-600">✓ พร้อม</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="text" onClick={handleClose}>
            ยกเลิก
          </Button>
          <Button onClick={handleConfirmImport} disabled={validRows.length === 0}>
            นำเข้า {validRows.length > 0 ? `${validRows.length} ทีม` : ''}
          </Button>
        </div>
      </div>
    </div>
  );
}
