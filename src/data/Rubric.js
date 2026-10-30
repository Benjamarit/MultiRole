// Shared by the editor and both evaluation views so saved descriptions round-trip.
export function parseRubricLevels(description) {
  if (!description || !String(description).trim()) return [];
  const normalized = String(description).trim().replace(
    /\s*((?:[★⭐•]\s*)\d+(?:\s*[-–]\s*\d+)?\s*(?:ดาว|คะแนน|แต้ม|stars?|points?|pts|%)\s*[:：])/gi,
    '\n$1'
  );
  return normalized.split(/\r?\n+/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const match = /^([^:：]{1,80})[:：]\s*(.*)$/.exec(line);
    if (match && !/^https?:\/\//i.test(line)) return { label: match[1].trim(), detail: match[2].trim() };
    return { label: null, detail: line };
  });
}

export function serializeRubricRows(rows) {
  return (rows || []).filter((row) => String(row.detail || '').trim()).map((row) => {
    const label = String(row.label || '').trim();
    const detail = String(row.detail).trim();
    return label ? `${label}: ${detail}` : detail;
  }).join('\n');
}

export function hydrateRubricRowsFromDescription(type, maxScore, description) {
  const defaults = buildDefaultRubricRows(type, maxScore);
  const parsed = parseRubricLevels(description);
  if (parsed.length === 0) return defaults;
  // Keep prose, custom labels, and ranges from existing criteria instead of replacing
  // them with empty defaults when an administrator edits an older criterion.
  return parsed.map((item) => ({ ...item, label: item.label || '',
    fixedLabel: defaults.some((row) => row.fixedLabel && row.label === item.label) }));
}

export function buildDefaultRubricRows(type, maxScore = 100) {
  if (type === 'STAR') return [5, 4, 3, 2, 1].map((star) => ({ label: `★ ${star} ดาว`, detail: '', fixedLabel: true }));
  if (type === 'PASS_FAIL') return ['ผ่าน (Pass)', 'ไม่ผ่าน (Fail)'].map((label) => ({ label, detail: '', fixedLabel: true }));
  if (type === 'PERCENTAGE') return ['80-100%', '60-79%', '40-59%', '0-39%'].map((label) => ({ label, detail: '', fixedLabel: false }));
  const max = Number(maxScore) > 0 ? Number(maxScore) : 100;
  if (max < 4) return Array.from({ length: Math.floor(max) + 1 }, (_, index) => ({
    label: `${Math.floor(max) - index} คะแนน`, detail: '', fixedLabel: false,
  }));
  if (max === 10) return ['9-10 คะแนน', '7-8 คะแนน', '5-6 คะแนน', '0-4 คะแนน'].map((label) => ({ label, detail: '', fixedLabel: false }));
  const q3 = Math.round(max * 0.8);
  const q2 = Math.round(max * 0.6);
  const q1 = Math.round(max * 0.4);
  return [`${q3}-${max} คะแนน`, `${q2}-${q3 - 1} คะแนน`, `${q1}-${q2 - 1} คะแนน`, `0-${Math.max(0, q1 - 1)} คะแนน`]
    .map((label) => ({ label, detail: '', fixedLabel: false }));
}
