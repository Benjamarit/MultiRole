import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { parseTeamWorksheet, readTeamWorkbook } from '../src/data/TeamImport.js';

async function fileFor(workbook) {
  const buffer = await workbook.xlsx.writeBuffer();
  return { name: 'teams.xlsx', arrayBuffer: async () => Uint8Array.from(buffer).buffer };
}

test('reads real XLSX bytes, Thai rich text and hyperlink targets instead of display labels', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teams');
  sheet.addRow(['ชื่อทีม', 'รายละเอียดผลงาน', 'ลิงก์ผลงาน']);
  sheet.addRow([{ richText: [{ text: 'ทีม ' }, { text: 'ทดสอบ', font: { bold: true } }] }, 'รายละเอียดภาษาไทย', { text: 'เปิดผลงาน', hyperlink: 'https://example.com/project' }]);
  const loaded = await readTeamWorkbook(await fileFor(workbook));
  const rows = parseTeamWorksheet(loaded.worksheets[0]);
  assert.deepEqual(rows, [{ rowNumber: 2, name: 'ทีม ทดสอบ', description: 'รายละเอียดภาษาไทย', link: 'https://example.com/project', error: null }]);
});

test('maps reordered English headers with an ordinal column and ignores empty formatting rows', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Imported');
  sheet.getRow(3).values = ['Order', 'Submission Link', 'Team Name', 'Description'];
  sheet.getRow(4).values = [1, 'https://example.com/a', 'Alpha', 'Project A'];
  sheet.getCell('D800').font = { bold: true };
  const loaded = await readTeamWorkbook(await fileFor(workbook));
  assert.deepEqual(parseTeamWorksheet(loaded.worksheets[0]), [{ rowNumber: 4, name: 'Alpha', description: 'Project A', link: 'https://example.com/a', error: null }]);
});

test('handles a blank first worksheet and preserves the first team when there is no header', async () => {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet('Blank');
  const sheet = workbook.addWorksheet('รายชื่อทีม');
  sheet.addRow(['First team', '', '']);
  sheet.addRow(['Second team', 'Project', 'https://example.com']);
  const loaded = await readTeamWorkbook(await fileFor(workbook));
  assert.equal(parseTeamWorksheet(loaded.worksheets[0]).length, 0);
  assert.equal(parseTeamWorksheet(loaded.worksheets[1]).length, 1);
  assert.equal(parseTeamWorksheet(loaded.worksheets[1], { hasHeader: false })[0].name, 'First team');
  assert.equal(parseTeamWorksheet(loaded.worksheets[1], { hasHeader: false }).length, 2);
});

test('uses optional named columns without importing unrelated column values', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teams');
  sheet.addRow(['ลำดับ', 'ชื่อทีม (Team Name)', 'กลุ่ม']);
  sheet.addRow([1, 'Alpha', 'Do not import as a description']);
  const [row] = parseTeamWorksheet(sheet);
  assert.equal(row.name, 'Alpha');
  assert.equal(row.description, '');
  assert.equal(row.link, '');
  assert.equal(row.error, null);
});

test('validates field limits and URLs before any server write', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teams');
  sheet.addRow(['ชื่อทีม', 'รายละเอียดผลงาน', 'ลิงก์ผลงาน']);
  sheet.addRow(['', 'Missing name', '']);
  sheet.addRow(['x'.repeat(151), '', '']);
  sheet.addRow(['Long description', 'x'.repeat(256), '']);
  sheet.addRow(['Bad URL', '', 'not-a-url']);
  sheet.addRow(['Long URL', '', 'https://example.com/' + 'x'.repeat(256)]);
  sheet.addRow(['Valid', '', '']);
  const rows = parseTeamWorksheet(sheet);
  assert.equal(rows.length, 6);
  assert.equal(rows.filter(row => row.error).length, 5);
  assert.equal(rows.at(-1).error, null);
});

test('reads cached formulas including zero and literal HYPERLINK URLs; rejects Excel cell errors', () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Teams');
  sheet.addRow(['Team Name', 'Description', 'Link']);
  sheet.addRow([{ formula: '1-1', result: 0 }, { formula: '1-1', result: 0 }, { formula: 'HYPERLINK("https://example.com/demo","View")', result: 'View' }]);
  sheet.addRow([{ error: '#REF!' }, '', '']);
  const rows = parseTeamWorksheet(sheet);
  assert.equal(rows[0].name, '0');
  assert.equal(rows[0].description, '0');
  assert.equal(rows[0].link, 'https://example.com/demo');
  assert.equal(rows[0].error, null);
  assert.ok(rows[1].error);
});

test('distinguishes legacy, encrypted, empty, renamed and corrupt files', async () => {
  const file = (name, bytes) => ({ name, arrayBuffer: async () => new Uint8Array(bytes).buffer });
  await assert.rejects(readTeamWorkbook(file('old.xls', [])), { code: 'FILE_TYPE' });
  await assert.rejects(readTeamWorkbook(file('empty.xlsx', [])), { code: 'EMPTY_FILE' });
  await assert.rejects(readTeamWorkbook(file('encrypted.xlsx', [0xd0, 0xcf, 0x11, 0xe0])), { code: 'ENCRYPTED_OR_LEGACY' });
  await assert.rejects(readTeamWorkbook(file('renamed.xlsx', [60, 104, 116, 109, 108])), { code: 'NOT_XLSX' });
  await assert.rejects(readTeamWorkbook(file('corrupt.xlsx', [0x50, 0x4b, 3, 4, 0, 0])), error => error.code === 'READ_FAILED' && !!error.cause);
});
