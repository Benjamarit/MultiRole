import { useState, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  BookOpen,
  LockKeyhole,
  CheckCircle2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import BackButton from '../components/BackButton';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import ConfirmDialog from '../components/ConfirmDialog';
import UnsavedChangesGuard from '../components/UnsavedChangesGuard';
import { criteriaFingerprint } from '../data/evaluations/CriteriaBatch';
import { getProjectById } from '../data/projects/ProjectStore';
import { loadProject } from '../api/workspace';
import { useLanguage } from '../context/LanguageContext';
import {
  getCriteriaByProject,
  saveCriteriaBatch,
} from '../data/evaluations/CriteriaStore';

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

import { parseRubricLevels, buildDefaultRubricRows, hydrateRubricRowsFromDescription, serializeRubricRows } from '../data/evaluations/Rubric';

export default function CriteriaManagement() {
  const { id } = useParams();
  const { t, tDesc } = useLanguage();
  const project = getProjectById(id);
  const locked = Boolean(project?.criteriaLocked) || ['Active', 'Closed'].includes(project?.status);
  const lockMessage = t('เกณฑ์ถูกล็อกหลังเปิดรับคะแนนแล้ว ดูข้อมูลได้เท่านั้น', 'Criteria are locked after scoring opens. View only.');
  const reportWriteError = async error => {
    if (error.response?.status === 409) {
      try {
        await loadProject(id);
        // Keep the local staged list intact so a failed/conflicting batch cannot erase input.
      } catch { /* Keep the original write error if refreshing is unavailable. */ }
    }
    toast.error(error.message);
  };

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
  const [baseline, setBaseline] = useState(() => getCriteriaByProject(id));
  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const isDirty = criteriaFingerprint(criteria) !== criteriaFingerprint(baseline);

  // editingRowId เก็บ id ของแถวที่กำลังแก้ไข หรือ NEW_ROW_ID หากเป็นแถวที่เพิ่งกด "+ เพิ่มเกณฑ์ประเมิน"
  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, item) => sum + Math.round(Number(item.weight || 0) * 100), 0) / 100;
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
    if (savingRef.current) return;
    if (locked) { toast.error(lockMessage); return; }
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
    if (savingRef.current) return;
    if (locked) { toast.error(lockMessage); return; }
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
    if (savingRef.current) return;
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
    if (savingRef.current) return;
    if (locked) { toast.error(lockMessage); return; }
    try {
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

      const savedCriterion = {
        ...(isAddingNew ? {} : originalItem),
        id: isAddingNew ? `local-${crypto.randomUUID()}` : originalItem.id,
        name,
        description,
        type: editRowData.type,
        weight: weightValue,
        maxScore,
      };

      if (isAddingNew) {
        setCriteria((prev) => [...prev, savedCriterion]);
        toast.success(t('เพิ่มในรายการแล้ว กรุณาบันทึกทั้งหมดเมื่อพร้อม', 'Added to the list. Save all criteria when ready.'));
      } else {
        setCriteria((prev) =>
          prev.map((item) => (item.id === editingRowId ? savedCriterion : item))
        );
        toast.success(t('อัปเดตรายการแล้ว ยังไม่บันทึกบนเซิร์ฟเวอร์', 'List updated. Changes have not been saved to the server.'));
      }

      setEditingRowId(null);
      setEditRowData(null);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleRowKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelEditing();
    }
  };

  const confirmDelete = () => {
    if (locked) { toast.error(lockMessage); return; }
    try {
      setCriteria((prev) => prev.filter((criterion) => criterion.id !== deleteId));
      setIsConfirmOpen(false);
      setDeleteId(null);
      toast.success(t('นำออกจากรายการแล้ว กรุณาบันทึกทั้งหมดเพื่อยืนยัน', 'Removed from the list. Save all criteria to confirm.'));
    } catch (error) {
      toast.error(error.message);
    }
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
    if (!locked && editingRowId === NEW_ROW_ID && editRowData) {
      return [...criteria, editRowData];
    }
    return criteria;
  }, [criteria, editingRowId, editRowData, locked]);

  const moveCriterion = (criterionId, offset) => {
    if (locked || savingRef.current || editingRowId) return;
    const index = criteria.findIndex(item => item.id === criterionId);
    if (index < 0 || index + offset < 0 || index + offset >= criteria.length) return;
    const next = [...criteria];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setCriteria(next);
  };

  const submitCriteria = async () => {
    if (locked || savingRef.current || editingRowId || !isDirty) return;
    savingRef.current = true;
    setIsSaving(true);
    setBatchError('');
    try {
      const saved = await saveCriteriaBatch(id, criteria, baseline);
      setCriteria(saved);
      setBaseline(saved);
      setLastSavedAt(new Date());
      toast.success(t(`บันทึกเกณฑ์ทั้งหมดแล้ว ${saved.length} ข้อ`, `Saved all ${saved.length} criteria`));
    } catch (error) {
      setBatchError(error.message);
      await reportWriteError(error);
    } finally { savingRef.current = false; setIsSaving(false); }
  };

  const discardChanges = () => {
    const latest = getCriteriaByProject(id);
    setCriteria(latest); setBaseline(latest);
    setEditingRowId(null); setEditRowData(null);
    setBatchError(''); setIsDiscardOpen(false);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <UnsavedChangesGuard when={isDirty || Boolean(editingRowId) || isSaving} busy={isSaving} message={t('เกณฑ์ที่แก้ไขยังไม่ได้บันทึก หากออกจากหน้านี้รายการที่ยังไม่บันทึกจะหายไป', 'Your criteria changes have not been saved. Leaving will discard unsaved edits.')} />
      <BackButton to={`/project/${id}/dashboard`}>
        {t('กลับไปหน้า Dashboard โครงการ', 'Back to Dashboard')}
      </BackButton>
      <PageHeader
        title={t('จัดการเกณฑ์ประเมิน', 'Scoring Criteria Management')}
        description={locked ? t('ตรวจสอบหัวข้อและรายละเอียดเกณฑ์ที่ใช้ประเมินโครงการนี้', 'Review the scoring criteria and rubric used for this project.') : tDesc(
          'เพิ่ม แก้ไข และจัดลำดับในรายการก่อน แล้วกดบันทึกเกณฑ์ทั้งหมดครั้งเดียว น้ำหนักรวมต้องครบ 100% ก่อนเปิดรับคะแนน',
          'Prepare and reorder the list, then save all criteria together. Weights must total 100% before scoring opens.'
        )}
        action={
          <Button
            onClick={handleAddClick}
            disabled={isSaving || locked || totalWeight >= 100 || Boolean(editingRowId)}
            aria-describedby={locked ? 'criteria-lock-message' : undefined}
          >
            <Plus className="h-4 w-4" />
            {t('เพิ่มเกณฑ์ประเมิน', 'Add Criterion')}
          </Button>
        }
      />

      {locked && <div id="criteria-lock-message" role="status" className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4"><LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" aria-hidden="true" /><div><p className="text-sm font-semibold text-slate-900">{t('เกณฑ์ประเมินถูกล็อกแล้ว', 'Scoring criteria are locked')}</p><p className="mt-1 text-sm leading-6 text-slate-600">{t('โครงการนี้เคยเปิดรับคะแนนแล้ว จึงไม่สามารถเพิ่ม แก้ไข หรือลบเกณฑ์ได้ แม้พักกลับเป็น Draft เพื่อให้ทุกทีมใช้เกณฑ์เดียวกัน', 'Scoring has opened for this project. Criteria cannot be added, edited, or deleted, including while paused, so all teams use the same criteria.')}</p></div></div>}

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
                    'น้ำหนักเกณฑ์ประเมินรวมครบ 100% แล้ว',
                    'Scoring criteria weights total 100%.'
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
        <div role="status" aria-live="polite" className={isSaving ? 'border-b border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700' : 'sr-only'}>
          {isSaving ? t('กำลังบันทึกเกณฑ์ กรุณารอสักครู่…', 'Saving criterion. Please wait…') : ''}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left" aria-busy={isSaving}>
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
              {displayRows.map((item, rowIndex) => {
                const isEditing = !locked && editingRowId === item.id;
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
                              disabled={isSaving}
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
                                          disabled={isSaving}
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
                                        disabled={isSaving}
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
                                            disabled={isSaving}
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
                                  disabled={isSaving}
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
                          <div className="flex items-start gap-3">
                            <span className="pt-0.5 text-xs font-semibold text-slate-400">{rowIndex + 1}</span>
                            <p className="flex-1 font-bold text-slate-900">{item.name}</p>
                            {!locked && <div className="flex shrink-0 gap-1">
                              <Button size="sm" variant="secondary" aria-label={t(`เลื่อน ${item.name} ขึ้น`, `Move ${item.name} up`)} disabled={isSaving || Boolean(editingRowId) || rowIndex === 0} onClick={() => moveCriterion(item.id, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="secondary" aria-label={t(`เลื่อน ${item.name} ลง`, `Move ${item.name} down`)} disabled={isSaving || Boolean(editingRowId) || rowIndex === criteria.length - 1} onClick={() => moveCriterion(item.id, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button>
                            </div>}
                          </div>
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
                          disabled={isSaving}
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
                          disabled={isSaving || isFixedScoreType(editRowData.type)}
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
                            disabled={isSaving}
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
                        {locked ? <span className="inline-flex items-center gap-1 text-xs text-slate-500"><LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />{t('ดูอย่างเดียว', 'View only')}</span> : isEditing ? (
                          <>
                            <Button size="sm" onClick={saveInlineEdit} isLoading={isSaving} disabled={isSaving}>
                              {editingRowId === NEW_ROW_ID ? t('เพิ่มในรายการ', 'Add to list') : t('อัปเดตรายการ', 'Update list')}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={cancelEditing}
                              disabled={isSaving}
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
                              disabled={isSaving || Boolean(editingRowId)}
                            >
                              {t('แก้ไข', 'Edit')}
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={isSaving || Boolean(editingRowId)}
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

      {( !locked || isDirty) && <Card className="sticky bottom-4 z-20 border-blue-200 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div role="status" aria-live="polite">
            <p className="font-semibold text-slate-900">{isDirty ? t('มีการเปลี่ยนแปลงที่ยังไม่บันทึก', 'Unsaved changes') : t('รายการตรงกับข้อมูลที่บันทึกแล้ว', 'All changes saved')}</p>
            <p className="mt-1 text-xs text-slate-500">{editingRowId ? t('เพิ่มหรืออัปเดตแถวที่กำลังแก้ไขให้เสร็จก่อนบันทึกทั้งหมด', 'Finish editing the current row before saving all criteria.') : lastSavedAt ? t(`บันทึกล่าสุด ${lastSavedAt.toLocaleTimeString('th-TH')}`, `Last saved ${lastSavedAt.toLocaleTimeString()}`) : t('บันทึกทั้งหมดจะยังไม่เปิดรับคะแนน', 'Saving does not open scoring.')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={isSaving || (!isDirty && !editingRowId)} onClick={() => setIsDiscardOpen(true)}><RotateCcw className="h-4 w-4" />{t('ยกเลิกการเปลี่ยนแปลง', 'Discard changes')}</Button>
            <Button disabled={locked || isSaving || !isDirty || Boolean(editingRowId)} isLoading={isSaving} onClick={submitCriteria}><Save className="h-4 w-4" />{isSaving ? t('กำลังบันทึกทั้งหมด…', 'Saving all…') : t(`บันทึกเกณฑ์ทั้งหมด (${criteria.length} ข้อ)`, `Save all criteria (${criteria.length})`)}</Button>
          </div>
        </div>
        {batchError && <p role="alert" className="mt-3 text-sm text-red-700">{batchError} {t('ข้อมูลที่แก้ไขยังอยู่ในหน้านี้ หากข้อมูลบนเซิร์ฟเวอร์เปลี่ยน ให้ยกเลิกการเปลี่ยนแปลงเพื่อโหลดรายการล่าสุด', 'Your edits are kept here. If server data changed, discard changes to load the latest list.')}</p>}
      </Card>}

      <ConfirmDialog isOpen={isDiscardOpen} title={t('ยกเลิกการเปลี่ยนแปลงทั้งหมด?', 'Discard all changes?')} message={t('รายการที่ยังไม่บันทึกจะถูกแทนด้วยข้อมูลที่บันทึกไว้ล่าสุด', 'Unsaved edits will be replaced by the latest saved list.')} onConfirm={discardChanges} onCancel={() => setIsDiscardOpen(false)} confirmText={t('ยกเลิกการเปลี่ยนแปลง', 'Discard changes')} />

      <ConfirmDialog
        isOpen={!locked && isConfirmOpen}
        title={t('ยืนยันการลบเกณฑ์ประเมิน', 'Delete Evaluation Criterion')}
        message={t(
          'นำเกณฑ์นี้ออกจากรายการหรือไม่? การลบจะมีผลเมื่อกดบันทึกเกณฑ์ทั้งหมด',
          'Remove this criterion from the list? The deletion takes effect when you save all criteria.'
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
