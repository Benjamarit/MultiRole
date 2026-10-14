import { useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Plus } from 'lucide-react';
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

  // กดปุ่ม "+ เพิ่มเกณฑ์ประเมิน" -> เพิ่มแถว Inline ในตารางทันทีโดยไม่ต้องเปิด Popup
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
      type: 'STAR',
      weight: Math.min(10, Math.max(1, remainingWeight)),
      maxScore: 5,
    });
  };

  const startEditing = (item) => {
    setEditingRowId(item.id);
    setEditRowData({
      ...item,
      description: item.description || '',
      maxScore: isFixedScoreType(item.type)
        ? getFixedMaxScore(item.type)
        : item.maxScore,
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
      }
      return updated;
    });
  };

  const saveInlineEdit = () => {
    if (!editRowData) return;

    const isAddingNew = editingRowId === NEW_ROW_ID;
    const name = (editRowData.name || '').trim();
    const description = (editRowData.description || '').trim();
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
      ...(isAddingNew ? { id: Date.now() } : editRowData),
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
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      saveInlineEdit();
    } else if (e.key === 'Escape') {
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
          'กำหนดหัวข้อ รูปแบบการให้คะแนน และค่าน้ำหนักรวมให้ครบ 100% สำหรับโครงการนี้',
          'Define evaluation criteria, scoring formats, and weights totaling 100%.'
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
                <th className="w-2/5 px-6 py-3.5">
                  {t('หัวข้อและคำอธิบายเกณฑ์', 'Criterion & Description')}
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

                return (
                  <tr
                    key={item.id}
                    onKeyDown={isEditing ? handleRowKeyDown : undefined}
                    className={`${
                      isEditing ? 'bg-blue-50/60' : 'hover:bg-slate-50/70'
                    } text-sm transition-colors`}
                  >
                    <td className="px-6 py-4 align-top">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            autoFocus
                            placeholder={t(
                              'ระบุชื่อหัวข้อประเมิน เช่น Innovation...',
                              'Criterion name (e.g. Innovation)...'
                            )}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                            value={editRowData.name}
                            onChange={(e) =>
                              handleInlineChange('name', e.target.value)
                            }
                          />
                          <input
                            type="text"
                            placeholder={t(
                              'คำอธิบายเกณฑ์เพิ่มเติม (ไม่บังคับ)...',
                              'Optional description for judges...'
                            )}
                            className="w-full rounded-lg border border-slate-200 bg-white/90 px-3 py-1 text-xs text-slate-600 focus:border-blue-500 focus:bg-white focus:outline-none"
                            value={editRowData.description || ''}
                            onChange={(e) =>
                              handleInlineChange('description', e.target.value)
                            }
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          {item.description ? (
                            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
                              {item.description}
                            </p>
                          ) : null}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 align-top">
                      {isEditing ? (
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                          value={editRowData.type}
                          onChange={(e) => handleInlineChange('type', e.target.value)}
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
                          step="1"
                          className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500"
                          value={
                            isFixedScoreType(editRowData.type)
                              ? getFixedMaxScore(editRowData.type)
                              : editRowData.maxScore
                          }
                          onChange={(e) =>
                            handleInlineChange('maxScore', e.target.value)
                          }
                          disabled={isFixedScoreType(editRowData.type)}
                        />
                      ) : (
                        <span className="font-mono font-medium text-slate-700">
                          {item.type === 'PASS_FAIL' ? 'Pass/Fail' : item.maxScore}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center align-top">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          max={maxAllowedForThisRow}
                          step="1"
                          className="w-20 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-center text-sm font-bold focus:border-blue-500 focus:outline-none"
                          value={editRowData.weight}
                          onChange={(e) => handleInlineChange('weight', e.target.value)}
                        />
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-xs font-bold text-slate-800">
                          {item.weight}%
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={saveInlineEdit}
                            >
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
                  <td colSpan="5" className="px-6 py-10 text-center text-sm text-slate-500">
                    {t(
                      'ยังไม่มีการกำหนดเกณฑ์ประเมิน กด "+ เพิ่มเกณฑ์ประเมิน" เพื่อเพิ่มแถวใหม่ในตาราง',
                      'No scoring criteria yet. Click "+ Add Criterion" to add a row.'
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t('ยืนยันการลบเกณฑ์ประเมิน', 'Confirm Deleting Criterion')}
        message={t(
          'คุณแน่ใจหรือไม่ว่าต้องการลบเกณฑ์ประเมินนี้? หากมีการให้คะแนนไปแล้วอาจส่งผลกระทบต่อผลรวม',
          'Are you sure you want to delete this criterion? Existing evaluations may be affected.'
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
