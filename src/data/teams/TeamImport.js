export class TeamImportError extends Error {
  constructor(code, cause) {
    super(code, { cause });
    this.code = code;
  }
}

export async function readTeamWorkbook(file) {
  if (!/\.xlsx$/i.test(file.name)) throw new TeamImportError('FILE_TYPE');
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!bytes.length) throw new TeamImportError('EMPTY_FILE');
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) throw new TeamImportError('ENCRYPTED_OR_LEGACY');
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new TeamImportError('NOT_XLSX');
  try {
    const module = await import('exceljs');
    const ExcelJS = module.default || module;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(bytes, {
      // Only cell contents and hyperlinks are needed; skip unrelated worksheet formatting.
      ignoreNodes: ['dataValidations', 'conditionalFormatting', 'extLst', 'sheetProtection', 'pageSetup', 'headerFooter', 'printOptions'],
    });
    if (!workbook.worksheets.length) throw new TeamImportError('NO_SHEETS');
    return workbook;
  } catch (error) {
    if (error instanceof TeamImportError) throw error;
    throw new TeamImportError('READ_FAILED', error);
  }
}

export function teamImportErrorMessage(error, t) {
  switch (error.code) {
    case 'FILE_TYPE': return t('รองรับไฟล์ .xlsx กรุณาเปิดไฟล์ใน Excel แล้วบันทึกเป็น Excel Workbook (.xlsx)', 'Use an .xlsx file. Open it in Excel and save as Excel Workbook (.xlsx).');
    case 'EMPTY_FILE': return t('ไฟล์นี้ไม่มีข้อมูล กรุณาเลือกไฟล์ใหม่', 'This file is empty. Choose another file.');
    case 'ENCRYPTED_OR_LEGACY': return t('ไฟล์อาจมีรหัสผ่านเปิดไฟล์ หรือเป็น Excel รูปแบบเก่า กรุณาบันทึกเป็น .xlsx ที่ไม่มีรหัสผ่านเปิดไฟล์', 'This may be an encrypted or legacy Excel file. Save an .xlsx copy without an opening password.');
    case 'NOT_XLSX': return t('ข้อมูลในไฟล์ไม่ใช่รูปแบบ .xlsx การเปลี่ยนชื่อไฟล์อย่างเดียวไม่พอ กรุณาใช้บันทึกเป็น Excel Workbook (.xlsx)', 'The file contents are not .xlsx. Renaming the extension is not enough; save as Excel Workbook (.xlsx).');
    case 'NO_SHEETS': return t('ไม่พบชีตข้อมูลในไฟล์นี้', 'No worksheets found.');
    default: return t('อ่านไฟล์นี้ไม่สำเร็จ ลองเปิดใน Excel แล้วบันทึกเป็นไฟล์ .xlsx ใหม่ หรือแนบไฟล์ให้ผู้ดูแลตรวจสอบ', 'Could not read this file. Open it in Excel and save a new .xlsx copy, or share it with your administrator.');
  }
}

function cellText(cell, useHyperlink = false) {
  const value = cell?.value;
  if (value == null) return '';
  if (useHyperlink && typeof value === 'object') {
    if (value.hyperlink) return String(value.hyperlink).trim();
    const hyperlink = value.formula?.match(/^\s*HYPERLINK\s*\(\s*"((?:[^"]|"")*)"/i);
    if (hyperlink) return hyperlink[1].replaceAll('""', '"').trim();
  }
  if (typeof value === 'object' && value.richText) return value.richText.map(part => part.text || '').join('').trim();
  if (typeof value === 'object' && (value.formula || value.sharedFormula || 'result' in value)) return String(cell.result ?? value.result ?? '').trim();
  return String(cell.text ?? value).trim();
}

const normalizeHeader = value => value.normalize('NFKC').toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^\p{L}\p{M}\p{N}]/gu, '');
const headers = {
  name: ['ชื่อทีม', 'ทีม', 'teamname', 'team', 'name'],
  description: ['รายละเอียดผลงาน', 'รายละเอียด', 'คำอธิบายผลงาน', 'description', 'projectdescription', 'projectdetail'],
  link: ['ลิงก์ผลงาน', 'ลิงค์ผลงาน', 'ลิงก์', 'ลิงค์', 'submissionlink', 'projecturl', 'projectlink', 'link', 'url'],
};

export function parseTeamWorksheet(worksheet, { hasHeader = true, t = text => text } = {}) {
  if (!worksheet) return [];
  const nonempty = [];
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    let hasData = false;
    row.eachCell({ includeEmpty: false }, cell => { if (cellText(cell)) hasData = true; });
    if (hasData) nonempty.push({ row, rowNumber });
  });
  if (!nonempty.length) return [];
  let columns = { name: 1, description: 2, link: 3 };
  if (hasHeader) {
    const found = {};
    nonempty[0].row.eachCell({ includeEmpty: false }, (cell, index) => {
      const text = normalizeHeader(cellText(cell));
      for (const [key, aliases] of Object.entries(headers)) if (aliases.includes(text) && !found[key]) found[key] = index;
    });
    if (found.name) columns = found;
  }
  return nonempty.slice(hasHeader ? 1 : 0).flatMap(({ row, rowNumber }) => {
    const cells = Object.fromEntries(Object.entries(columns).map(([key, index]) => [key, row.getCell(index)]));
    const name = cellText(cells.name);
    const description = cellText(cells.description);
    const link = cellText(cells.link, true);
    if (!name && !description && !link) return [];
    let error = null;
    if (Object.values(cells).some(cell => cell?.value?.error || cell?.result?.error)) error = t('มีเซลล์ผิดพลาดใน Excel กรุณาแก้ไขก่อนนำเข้า', 'Fix the Excel cell error before importing.');
    else if (!name) error = t('ไม่มีชื่อทีม', 'Missing team name');
    else if (name.length > 150) error = t('ชื่อทีมยาวเกิน 150 ตัวอักษร', 'Team name exceeds 150 characters');
    else if (description.length > 255) error = t('รายละเอียดผลงานยาวเกิน 255 ตัวอักษร', 'Description exceeds 255 characters');
    else if (link.length > 255) error = t('ลิงก์ยาวเกิน 255 ตัวอักษร', 'Link exceeds 255 characters');
    else if (link) {
      try { const url = new URL(link); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
      catch { error = t('ลิงก์ต้องเป็น URL ที่ขึ้นต้นด้วย http:// หรือ https://', 'Use a valid http:// or https:// URL'); }
    }
    return [{ rowNumber, name, description, link, error }];
  });
}
