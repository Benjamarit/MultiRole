import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  Plus,
  Trash2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import { useLanguage } from '../context/LanguageContext';
import {
  deleteCriterion,
  getCriteriaByProject,
  saveCriterion,
} from '../data/CriteriaStore';

const SCORING_LIMITS = {
  STAR: { min: 1, max: 5 },
  NUMERIC: { min: 1, max: 100 },
  PERCENTAGE: { min: 0, max: 100 },
  PASS_FAIL: { min: 0, max: 1 },
};

const getFixedMaxScore = (type) => {
  if (type === 'STAR') return 5;
  if (type === 'PERCENTAGE') return 100;
  if (type === 'PASS_FAIL') return 1;
  return null;
};

const isFixedScoreType = (type) =>
  type === 'STAR' || type === 'PERCENTAGE' || type === 'PASS_FAIL';

const NEW_ROW_ID = '__NEW_CRITERION__';

/**
 * แยกข้อความคำอธิบายเกณฑ์ (Rubric) ออกเป็นระดับคะแนนย่อยอัตโนมัติ
 */
function parseRubricLevels(description) {
  if (!description || !String(description).trim()) return [];
  const raw = String(description).trim();

  const normalized = raw.replace(
    /\s*((?:[★⭐•]\s*)?\d+(?:\s*-\s*\d+)?\s*(?:ดาว|คะแนน|แต้ม|stars?|points?|pts)\s*[:：]|[★⭐•]\s+)/gi,
    '\n$1'
  );

  const segments = normalized
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter((s) => s && !/^[★⭐•\-]+$/.test(s));

  return segments.map((seg) => {
    const colonMatch = seg.match(/^([^:：]{1,35})[:：]\s*(.+)$/);
    if (colonMatch) {
      return {
        label: colonMatch[1].trim(),
        detail: colonMatch[2].trim(),
      };
    }
    return {
      label: null,
      detail: seg,
    };
  });
}

/**
 * สร้างโครงร่างแถว Rubric มาตรฐานตามประเภทคะแนน (STAR, NUMERIC, PERCENTAGE, PASS_FAIL)
 */
function buildDefaultRubricRows(type, maxScore = 100) {
  if (type === 'STAR') {
    return [
      { label: '★ 5 ดาว', detail: '', fixedLabel: true },
      { label: '★ 4 ดาว', detail: '', fixedLabel: true },
      { label: '★ 3 ดาว', detail: '', fixedLabel: true },
      { label: '★ 2 ดาว', detail: '', fixedLabel: true },
      { label: '★ 1 ดาว', detail: '', fixedLabel: true },
    ];
  }
  if (type === 'PASS_FAIL') {
    return [
      { label: 'ผ่าน (Pass)', detail: '', fixedLabel: true },
      { label: 'ไม่ผ่าน (Fail)', detail: '', fixedLabel: true },
    ];
  }
  if (type === 'PERCENTAGE') {
    return [
      { label: '80-100%', detail: '', fixedLabel: false },
      { label: '60-79%', detail: '', fixedLabel: false },
      { label: '40-59%', detail: '', fixedLabel: false },
      { label: '0-39%', detail: '', fixedLabel: false },
    ];
  }
  // NUMERIC: คำนวณช่วงคะแนนตาม maxScore อัตโนมัติ
  const max = Number(maxScore) > 0 ? Number(maxScore) : 100;
  if (max === 10) {
    return [
      { label: '9-10 คะแนน', detail: '', fixedLabel: false },
      { label: '7-8 คะแนน', detail: '', fixedLabel: false },
      { label: '5-6 คะแนน', detail: '', fixedLabel: false },
      { label: '0-4 คะแนน', detail: '', fixedLabel: false },
    ];
  }
  const q3 = Math.round(max * 0.8);
  const q2 = Math.round(max * 0.6);
  const q1 = Math.round(max * 0.4);
  return [
    { label: `${q3}-${max} คะแนน`, detail: '', fixedLabel: false },
    { label: `${q2}-${q3 - 1} คะแนน`, detail: '', fixedLabel: false },
    { label: `${q1}-${q2 - 1} คะแนน`, detail: '', fixedLabel: false },
    { label: `0-${Math.max(0, q1 - 1)} คะแนน`, detail: '', fixedLabel: false },
  ];
}

/**
 * แปลงข้อความ description เดิมกลับมาเป็นรายการแถวสำหรับแก้ไขใน Rubric Builder
 */
function hydrateRubricRowsFromDescription(type, maxScore, description) {
  const defaults = buildDefaultRubricRows(type, maxScore);
  const parsed = parseRubricLevels(description).filter((item) => item.label);
  if (parsed.length === 0) {
    return defaults;
  }

  if (type === 'STAR') {
    return [5, 4, 3, 2, 1].map((star) => {
      const matched = parsed.find((p) => p.label.includes(String(star)));
      return {
        label: `★ ${star} ดาว`,
        detail: matched ? matched.detail : '',
        fixedLabel: true,
      };
    });
  }

  if (type === 'PASS_FAIL') {
    const passRow = parsed.find(
      (p) =>
        p.label.includes('ผ่าน') &&
        !p.label.includes('ไม่ผ่าน')
    );
    const failRow = parsed.find(
      (p) =>
        p.label.includes('ไม่ผ่าน') ||
        p.label.toLowerCase().includes('fail')
    );
    if (passRow || failRow) {
      return [
        { label: 'ผ่าน (Pass)', detail: passRow ? passRow.detail : '', fixedLabel: true },
        { label: 'ไม่ผ่าน (Fail)', detail: failRow ? failRow.detail : '', fixedLabel: true },
      ];
    }
  }

  return parsed.map((p) => ({
    label: p.label,
    detail: p.detail,
    fixedLabel: false,
  }));
}

/**
 * รวมแถว Rubric ที่กรอกไว้กลับเป็น String เดียวเพื่อบันทึกลงคอลัมน์ description
 */
function serializeRubricRows(rows) {
  return (rows || [])
    .filter((r) => r.detail && String(r.detail).trim())
    .map((r) => `${(r.label || '').trim()}: ${String(r.detail).trim()}`)
    .join('\n');
}

export default function CriteriaManagement() {
  const { id } = useParams();
  const { t, tDesc } = useLanguage();

  const scoringTypes = useMemo(
    () => [
      { value: 'STAR', label: t('Star Rating (1-5 ดาว)', 'Star Rating (1-5 Stars)') },
      { value: 'NUMERIC', label: t('Numeric (กรอกตัวเลข)', 'Numeric (0-Max)') },
      { value: 'PERCENTAGE', label: t('Percentage (0-100%)', 'Percentage (0-100%)') },
      { value: 'PASS_FAIL', label: t('Pass / Fail (ผ่าน / ไม่ผ่าน)', 'Pass / Fail') },
    ],
    [t]
  );

  const [criteria, setCriteria] = useState(() => getCriteriaByProject(id));

  // editingRowId เก็บ id ของแถวที่กำลังแก้ไข หรือ NEW_ROW_ID หากเป็นแถวที่เพิ่งกด "+ เพิ่มเกณฑ์ประเมิน"
  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowData, setEditRowData] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  }, [criteria]);

  const remainingWeight = 100 - totalWeight;

  const validateMaxScore = (type, value) => {
    const fixedMaxScore = getFixedMaxScore(type);
    if (fixedMaxScore !== null) {
      return Number(value) === fixedMaxScore;
    }
    const numericMaxScore = Number(value);
    const limits = SCORING_LIMITS[type];
    if (!limits) return false;
    return (
      Number.isFinite(numericMaxScore) &&
      numericMaxScore >= limits.min &&
      numericMaxScore <= limits.max
    );
  };

  // กดปุ่ม "+ เพิ่มเกณฑ์ประเมิน" -> เพิ่มแถว Inline ในตารางทันที พร้อมตาราง Rubric แยกระดับคะแนน
  const handleAddClick = () => {
    if (totalWeight >= 100) {
      toast.error(
        t(
          'น้ำหนักคะแนนรวมครบ 100% แล้ว ไม่สามารถเพิ่มเกณฑ์ได้อีก',
          'Total weight is already 100%'
        )
      );
      return;
    }

    if (editingRowId === NEW_ROW_ID) {
      return;
    }

    setEditingRowId(NEW_ROW_ID);
    setEditRowData({
      id: NEW_ROW_ID,
      name: '',
      description: '',
      rubricRows: buildDefaultRubricRows('STAR', 5),
      type: 'STAR',
      weight: Math.min(10, Math.max(1, remainingWeight)),
      maxScore: 5,
    });
  };

  const startEditing = (item) => {
    const resolvedMaxScore = isFixedScoreType(item.type)
      ? getFixedMaxScore(item.type)
      : item.maxScore;

    setEditingRowId(item.id);
    setEditRowData({
      ...item,
      description: item.description || '',
      rubricRows: hydrateRubricRowsFromDescription(
        item.type,
        resolvedMaxScore,
        item.description || ''
      ),
      maxScore: resolvedMaxScore,
    });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditRowData(null);
  };

  const handleInlineChange = (field, value) => {
    setEditRowData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'type') {
        const fixedMaxScore = getFixedMaxScore(value);
        if (fixedMaxScore !== null) {
          updated.maxScore = fixedMaxScore;
        } else if (!updated.maxScore || Number(updated.maxScore) <= 5) {
          updated.maxScore = 100;
        }
        // ปรับชุดแถว Rubric ให้ตรงกับประเภทคะแนนที่เพิ่งเปลี่ยนใหม่
        updated.rubricRows = buildDefaultRubricRows(value, updated.maxScore);
      }
      return updated;
    });
  };

  const handleRubricRowChange = (rowIndex, field, value) => {
    setEditRowData((prev) => {
      if (!prev) return prev;
      const nextRows = (prev.rubricRows || []).map((row, idx) =>
        idx === rowIndex ? { ...row, [field]: value } : row
      );
      return {
        ...prev,
        rubricRows: nextRows,
      };
    });
  };

  const handleAddRubricRow = () => {
    setEditRowData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rubricRows: [
          ...(prev.rubricRows || []),
          { label: '', detail: '', fixedLabel: false },
        ],
      };
    });
  };

  const handleRemoveRubricRow = (rowIndex) => {
    setEditRowData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        rubricRows: (prev.rubricRows || []).filter((_, idx) => idx !== rowIndex),
      };
    });
  };

  const saveInlineEdit = () => {
    if (!editRowData) return;

    const isAddingNew = editingRowId === NEW_ROW_ID;
    const name = (editRowData.name || '').trim();
    const description = serializeRubricRows(editRowData.rubricRows);
    const weightValue = Number(editRowData.weight);
    const originalItem = isAddingNew
      ? null
      : criteria.find((c) => c.id === editingRowId);

    if (!isAddingNew && !originalItem) {
      toast.error(t('ไม่พบเกณฑ์ประเมินที่ต้องการแก้ไข', 'Criterion not found'));
      return;
    }

    if (!name) {
      toast.error(t('กรุณาระบุชื่อหัวข้อประเมิน', 'Please enter a criterion name'));
      return;
    }

    const previousRowWeight = isAddingNew ? 0 : Number(originalItem.weight);
    const newTotalWeight = totalWeight - previousRowWeight + weightValue;
    const maxAllowedForThisRow = remainingWeight + previousRowWeight;

    if (newTotalWeight > 100) {
      toast.error(
        t(
          `น้ำหนักรวมเกิน 100% (ตั้งค่าได้สูงสุด ${maxAllowedForThisRow}%)`,
          `Total weight exceeds 100% (max allowed: ${maxAllowedForThisRow}%)`
        )
      );
      return;
    }

    if (!Number.isInteger(weightValue) || weightValue <= 0) {
      toast.error(
        t('กรุณาระบุน้ำหนักเป็นจำนวนเต็มมากกว่า 0', 'Weight must be a positive integer')
      );
      return;
    }

    const fixedMaxScore = getFixedMaxScore(editRowData.type);
    const maxScore =
      fixedMaxScore !== null ? fixedMaxScore : Number(editRowData.maxScore);

    if (!validateMaxScore(editRowData.type, maxScore)) {
      toast.error(
        editRowData.type === 'NUMERIC'
          ? t('คะแนนเต็มของ Numeric ต้องอยู่ระหว่าง 1-100', 'Numeric max score must be 1-100')
          : t('รูปแบบคะแนนที่เลือกมีคะแนนเต็มที่กำหนดไว้แล้ว', 'Invalid max score')
      );
      return;
    }

    const savedCriterion = saveCriterion(id, {
      ...(isAddingNew ? { id: Date.now() } : originalItem),
      name,
      description,
      type: editRowData.type,
      weight: weightValue,
      maxScore,
    });

    if (isAddingNew) {
      setCriteria((prev) => [...prev, savedCriterion]);
      toast.success(t('เพิ่มเกณฑ์ประเมินเรียบร้อย', 'Criterion added'));
    } else {
      setCriteria((prev) =>
        prev.map((item) => (item.id === editingRowId ? savedCriterion : item))
      );
      toast.success(t('อัปเดตเกณฑ์ประเมินเรียบร้อย', 'Criterion updated'));
    }

    setEditingRowId(null);
    setEditRowData(null);
  };

  const handleRowKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const confirmDelete = () => {
    deleteCriterion(id, deleteId);
    setCriteria((prev) => prev.filter((criterion) => criterion.id !== deleteId));
    setIsConfirmOpen(false);
    setDeleteId(null);
    toast.success(t('ลบเกณฑ์ประเมินเรียบร้อย', 'Criterion deleted'));
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'STAR':
        return <Badge variant="warning">STAR 1–5</Badge>;
      case 'NUMERIC':
        return <Badge variant="info">NUMERIC</Badge>;
      case 'PERCENTAGE':
        return <Badge variant="purple">PERCENTAGE %</Badge>;
      case 'PASS_FAIL':
        return <Badge variant="default">PASS / FAIL</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  // รวมรายการเกณฑ์เดิม เข้ากับแถวใหม่ (ถ้ากำลังกด + เพิ่มเกณฑ์ประเมิน)
  const displayRows = useMemo(() => {
    if (editingRowId === NEW_ROW_ID && editRowData) {
      return [...criteria, editRowData];
    }
    return criteria;
  }, [criteria, editingRowId, editRowData]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <BackButton to={`/project/${id}/dashboard`}>
        {t('กลับไปหน้า Dashboard โครงการ', 'Back to Dashboard')}
      </BackButton>
      <PageHeader
        title={t('จัดการเกณฑ์ประเมิน', 'Scoring Criteria Management')}
        description={tDesc(
          'กำหนดหัวข้อ รูปแบบการให้คะแนน คำอธิบายเกณฑ์ (Rubric) และค่าน้ำหนักรวมให้ครบ 100% สำหรับโครงการนี้',
          'Define evaluation criteria, scoring formats, rubric levels, and weights totaling 100%.'
        )}
        action={
          <Button
            onClick={handleAddClick}
            disabled={totalWeight >= 100 || editingRowId === NEW_ROW_ID}
          >
            <Plus className="h-4 w-4" />
            {t('เพิ่มเกณฑ์ประเมิน', 'Add Criterion')}
          </Button>
        }
      />

      <Card
        className={`${
          totalWeight === 100
            ? 'border-emerald-200 bg-emerald-50/60'
            : totalWeight > 100
              ? 'border-red-200 bg-red-50/60'
              : 'border-amber-200 bg-amber-50/60'
        }`}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">
                {t('น้ำหนักคะแนนรวม', 'Total Criteria Weight')}
              </h3>
              {totalWeight === 100 && (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
            </div>
            <p className="mt-0.5 text-sm text-slate-600">
              {totalWeight === 100
                ? t(
                    'น้ำหนักรวมครบ 100% พอดี โครงการพร้อมเปิดรับการประเมิน',
                    'Total weight is 100%. Ready for evaluation.'
                  )
                : t(
                    `ยังขาดอีก ${remainingWeight}% เพื่อให้ครบ 100%`,
                    `Remaining weight to allocate: ${remainingWeight}%`
                  )}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`font-mono text-3xl font-extrabold ${
                totalWeight === 100
                  ? 'text-emerald-700'
                  : totalWeight > 100
                    ? 'text-red-600'
                    : 'text-amber-600'
              }`}
            >
              {totalWeight}%
            </span>
            <span className="ml-1 text-sm text-slate-500">/ 100%</span>
          </div>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/80">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              totalWeight === 100
                ? 'bg-emerald-500'
                : totalWeight > 100
                  ? 'bg-red-500'
                  : 'bg-amber-500'
            }`}
            style={{ width: `${Math.min(100, totalWeight)}%` }}
          />
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="w-1/2 px-6 py-3.5">
                  {t(
                    'หัวข้อและเกณฑ์การให้คะแนน (Rubric)',
                    'Criterion & Scoring Rubric'
                  )}
                </th>
                <th className="px-6 py-3.5">
                  {t('รูปแบบคะแนน', 'Scoring Type')}
                </th>
                <th className="w-28 px-6 py-3.5 text-center">
                  {t('คะแนนเต็ม', 'Max Score')}
                </th>
                <th className="w-28 px-6 py-3.5 text-center">
                  {t('น้ำหนัก %', 'Weight %')}
                </th>
                <th className="w-44 px-6 py-3.5 text-right">
                  {t('จัดการ', 'Actions')}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {displayRows.map((item) => {
                const isEditing = editingRowId === item.id;
                const isNewRow = item.id === NEW_ROW_ID;
                const maxAllowedForThisRow =
                  remainingWeight + (isNewRow ? 0 : Number(item.weight || 0));
                const rubricPreviewItems = !isEditing
                  ? parseRubricLevels(item.description)
                  : [];

                return (
                  <tr
                    key={item.id}
                    onKeyDown={isEditing ? handleRowKeyDown : undefined}
                    className={`${
                      isEditing ? 'bg-blue-50/50' : 'hover:bg-slate-50/70'
                    } text-sm transition-colors`}
                  >
                    <td className="px-6 py-4 align-top">
                      {isEditing ? (
                        <div className="space-y-3">
                          {/* 1. ช่องกรอกชื่อหัวข้อเกณฑ์ประเมิน */}
                          <div>
                            <label className="mb-1 block text-xs font-bold text-slate-700">
                              {t('ชื่อหัวข้อประเมิน *', 'Criterion Name *')}
                            </label>
                            <input
                              type="text"
                              autoFocus
                              placeholder={t(
                                'ระบุชื่อหัวข้อประเมิน เช่น 1. ความคิดริเริ่มสร้างสรรค์...',
                                'Criterion name (e.g. 1. Innovation)...'
                              )}
                              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              value={editRowData.name}
                              onChange={(e) =>
                                handleInlineChange('name', e.target.value)
                              }
                            />
                          </div>

                          {/* 2. ตารางกำหนด Rubric แยกระดับคะแนน */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                            <div className="mb-2 flex items-center gap-1.5">
                              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
                              <span className="text-xs font-bold text-slate-700">
                                {t(
                                  'ตาราง Rubric แยกระดับคะแนน',
                                  'Level-by-Level Scoring Rubric'
                                )}
                              </span>
                            </div>

                            <div className="space-y-2">
                              <p className="text-[11px] text-slate-500">
                                {t(
                                  'กรอกคำอธิบายในแต่ละระดับคะแนน (ระดับไหนไม่ต้องการระบุสามารถเว้นว่างไว้ได้ ระบบจะข้ามให้อัตโนมัติ)',
                                  'Fill in descriptions for each score level (leave blank any level you wish to omit).'
                                )}
                              </p>

                              <div className="space-y-1.5">
                                {(editRowData.rubricRows || []).map(
                                  (row, rIdx) => (
                                    <div
                                      key={rIdx}
                                      className="flex items-center gap-2"
                                    >
                                      {row.fixedLabel ? (
                                        <span className="inline-flex w-28 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-800">
                                          {row.label}
                                        </span>
                                      ) : (
                                        <input
                                          type="text"
                                          value={row.label}
                                          onChange={(e) =>
                                            handleRubricRowChange(
                                              rIdx,
                                              'label',
                                              e.target.value
                                            )
                                          }
                                          placeholder={t(
                                            'เช่น 80-100 คะแนน',
                                            'e.g. 80-100 pts'
                                          )}
                                          className="w-32 shrink-0 rounded-lg border border-amber-300 bg-amber-50/70 px-2.5 py-1.5 text-xs font-bold text-amber-900 placeholder-amber-400 focus:border-blue-500 focus:bg-white focus:outline-none"
                                        />
                                      )}

                                      <input
                                        type="text"
                                        value={row.detail}
                                        onChange={(e) =>
                                          handleRubricRowChange(
                                            rIdx,
                                            'detail',
                                            e.target.value
                                          )
                                        }
                                        placeholder={t(
                                          `อธิบายเกณฑ์ของระดับ "${row.label || 'นี้'}"...`,
                                          `Describe criteria for "${row.label || 'this level'}"...`
                                        )}
                                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:bg-white focus:outline-none"
                                      />

                                      {!row.fixedLabel &&
                                        (editRowData.rubricRows || []).length >
                                          1 && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveRubricRow(rIdx)
                                            }
                                            title={t(
                                              'ลบช่วงคะแนนนี้',
                                              'Remove level'
                                            )}
                                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                                          >
                                            <Trash2 className="h-3.5 w-3.5" />
                                          </button>
                                        )}
                                    </div>
                                  )
                                )}
                              </div>

                              {(editRowData.type === 'NUMERIC' ||
                                editRowData.type === 'PERCENTAGE') && (
                                <button
                                  type="button"
                                  onClick={handleAddRubricRow}
                                  className="mt-1 inline-flex items-center gap-1 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100/70"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                  {t('+ เพิ่มช่วงคะแนน', '+ Add Score Range')}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          {item.description ? (
                            rubricPreviewItems.some((r) => r.label) ? (
                              <div className="mt-2 overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/70">
                                <div className="divide-y divide-slate-200/60">
                                  {rubricPreviewItems.map((rItem, rIdx) => (
                                    <div
                                      key={rIdx}
                                      className="flex items-start gap-2.5 bg-white/80 px-3 py-1.5 text-xs leading-relaxed text-slate-700"
                                    >
                                      {rItem.label && (
                                        <span className="mt-0.5 shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                                          {rItem.label}
                                        </span>
                                      )}
                                      <span className="flex-1">
                                        {rItem.detail}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <p className="mt-1 whitespace-pre-wrap text-xs text-slate-500">
                                {item.description}
                              </p>
                            )
                          ) : null}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 align-top">
                      {isEditing ? (
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          value={editRowData.type}
                          onChange={(e) =>
                            handleInlineChange('type', e.target.value)
                          }
                        >
                          {scoringTypes.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        getTypeBadge(item.type)
                      )}
                    </td>

                    <td className="px-6 py-4 text-center align-top">
                      {isEditing ? (
                        <input
                          type="number"
                          min={
                            editRowData.type === 'NUMERIC'
                              ? SCORING_LIMITS.NUMERIC.min
                              : (getFixedMaxScore(editRowData.type) ?? 1)
                          }
                          max={
                            editRowData.type === 'NUMERIC'
                              ? SCORING_LIMITS.NUMERIC.max
                              : (getFixedMaxScore(editRowData.type) ?? 1)
                          }
                          disabled={isFixedScoreType(editRowData.type)}
                          className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-center font-mono text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                          value={
                            isFixedScoreType(editRowData.type)
                              ? getFixedMaxScore(editRowData.type)
                              : editRowData.maxScore
                          }
                          onChange={(e) =>
                            handleInlineChange('maxScore', e.target.value)
                          }
                        />
                      ) : (
                        <span className="font-mono font-medium text-slate-700">
                          {item.maxScore}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center align-top">
                      {isEditing ? (
                        <div className="flex flex-col items-center">
                          <input
                            type="number"
                            min="1"
                            max={Math.max(1, maxAllowedForThisRow)}
                            className="w-20 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-center font-mono text-sm font-bold text-blue-700 focus:border-blue-500 focus:outline-none"
                            value={editRowData.weight}
                            onChange={(e) =>
                              handleInlineChange('weight', e.target.value)
                            }
                          />
                          <span className="mt-0.5 text-[10px] text-slate-400">
                            {t(
                              `สูงสุด ${maxAllowedForThisRow}%`,
                              `max ${maxAllowedForThisRow}%`
                            )}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 font-mono text-xs font-bold text-blue-700">
                          {item.weight}%
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right align-top">
                      <div className="inline-flex items-center gap-1.5">
                        {isEditing ? (
                          <>
                            <Button size="sm" onClick={saveInlineEdit}>
                              {t('บันทึก', 'Save')}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              {t('ยกเลิก', 'Cancel')}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => startEditing(item)}
                            >
                              {t('แก้ไข', 'Edit')}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setDeleteId(item.id);
                                setIsConfirmOpen(true);
                              }}
                            >
                              {t('ลบ', 'Delete')}
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {displayRows.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <p className="text-sm font-medium text-slate-600">
                      {t(
                        'ยังไม่มีเกณฑ์การประเมินในโครงการนี้',
                        'No evaluation criteria defined yet'
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {t(
                        'คลิกปุ่ม "+ เพิ่มเกณฑ์ประเมิน" ด้านบนขวาเพื่อเพิ่มแถวกรอกข้อมูลได้ทันที',
                        'Click "+ Add Criterion" above to add an inline row immediately.'
                      )}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t('ยืนยันการลบเกณฑ์ประเมิน', 'Delete Evaluation Criterion')}
        message={t(
          'คุณแน่ใจหรือไม่ว่าต้องการลบเกณฑ์ประเมินนี้? คะแนนที่กรรมการเคยให้ในเกณฑ์นี้อาจได้รับผลกระทบ',
          'Are you sure you want to delete this criterion?'
        )}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeleteId(null);
        }}
        confirmText={t('ลบเกณฑ์', 'Delete')}
      />
    </div>
  );
}