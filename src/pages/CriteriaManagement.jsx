import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Badge from '../components/Badge';
import Input from '../components/Input';
import Select from '../components/Select';
import Modal from '../components/CriteriaModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { deleteCriterion, getCriteriaByProject, saveCriterion } from '../data/CriteriaStore';

const SCORING_TYPES = [
  { value: 'STAR', label: 'Star Rating (1-5 ดาว)' },
  { value: 'NUMERIC', label: 'Numeric (กรอกตัวเลข)' },
  { value: 'PERCENTAGE', label: 'Percentage (0-100%)' },
  { value: 'PASS_FAIL', label: 'Pass / Fail (ผ่าน / ไม่ผ่าน)' }
];

const SCORING_LIMITS = {
  STAR: { min: 1, max: 5 },
  NUMERIC: { min: 1, max: 100 },
  PERCENTAGE: { min: 0, max: 100 },
  PASS_FAIL: { min: 0, max: 1 }
};

const getFixedMaxScore = (type) => {
  if (type === 'STAR') return 5;
  if (type === 'PERCENTAGE') return 100;
  if (type === 'PASS_FAIL') return 1;
  return null;
};

const isFixedScoreType = (type) =>
  type === 'STAR' || type === 'PERCENTAGE' || type === 'PASS_FAIL';

export default function CriteriaManagement() {
  const { id } = useParams();

  const [criteria, setCriteria] = useState(() => getCriteriaByProject(id));

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'STAR',
    weight: '10',
    maxScore: 5
  });

  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowData, setEditRowData] = useState(null);
  const [descriptionEditItem, setDescriptionEditItem] = useState(null);
  const [descriptionDraft, setDescriptionDraft] = useState('');

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // คำนวณน้ำหนักรวม
  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  }, [criteria]);

  const remainingWeight = 100 - totalWeight;

  // ฟังก์ชันตรวจสอบ Max Score
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

  // ฟังก์ชันบันทึกข้อมูล *เพิ่มใหม่* ผ่าน Modal
  const handleAddNew = (e) => {
    e.preventDefault();

    const name = formData.name.trim();
    const weightValue = Number(formData.weight);

    if (!name) {
      toast.error('กรุณาระบุชื่อหัวข้อประเมิน');
      return;
    }

    const description = formData.description.trim();
    if (!description) {
      toast.error('กรุณาระบุคำอธิบายเกณฑ์การประเมิน');
      return;
    }

    // Validation น้ำหนักรวมไม่เกิน 100
    if (totalWeight + weightValue > 100) {
      toast.error(`น้ำหนักรวมเกิน 100% (เหลือโควต้าเพิ่มได้สูงสุด ${remainingWeight}%)`);
      return;
    }

    // Validation น้ำหนักต้องเป็นหลักสิบ
    if (weightValue % 10 !== 0 || weightValue <= 0) {
      toast.error('กรุณาระบุน้ำหนักคะแนนเป็นหลักสิบ (เช่น 10, 20, 30)');
      return;
    }

    const fixedMaxScore = getFixedMaxScore(formData.type);

    // STAR / PERCENTAGE / PASS_FAIL ใช้คะแนนเต็มแบบ Fixed
    // NUMERIC สามารถกำหนดคะแนนเต็มได้ 1-100
    const maxScore =
      fixedMaxScore !== null ? fixedMaxScore : Number(formData.maxScore);

    if (!validateMaxScore(formData.type, maxScore)) {
      toast.error(
        formData.type === 'NUMERIC'
          ? 'คะแนนเต็มของ Numeric ต้องอยู่ระหว่าง 1-100'
          : 'รูปแบบคะแนนที่เลือกมีคะแนนเต็มที่กำหนดไว้แล้ว'
      );
      return;
    }

    const newCriterion = saveCriterion(id, {
      id: Date.now(),
      name,
      description,
      type: formData.type,
      weight: weightValue,
      maxScore
    });

    setCriteria((prev) => [...prev, newCriterion]);
    setIsModalOpen(false);
    setFormData({
      name: '',
      description: '',
      type: 'STAR',
      weight: '10',
      maxScore: 5
    });
    toast.success('เพิ่มเกณฑ์ประเมินเรียบร้อย');
  };

  const handleAddClick = () => {
    if (totalWeight >= 100) {
      toast.error('น้ำหนักคะแนนรวมครบ 100% แล้ว ไม่สามารถเพิ่มเกณฑ์ได้อีก');
      return;
    }

    setFormData({
      name: '',
      description: '',
      type: 'STAR',
      weight: '10',
      maxScore: 5
    });
    setIsModalOpen(true);
  };

  // ----------------------------------------------------
  // ฟังก์ชันสำหรับ Inline Edit
  // ----------------------------------------------------
  const startEditing = (item) => {
    setEditingRowId(item.id);
    setEditRowData({
      ...item,
      maxScore: isFixedScoreType(item.type)
        ? getFixedMaxScore(item.type)
        : item.maxScore
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
        }
      }

      return updated;
    });
  };

  const openDescriptionEditor = (item) => {
    setDescriptionEditItem(item);
    setDescriptionDraft(item.description || '');
  };

  const saveDescription = () => {
    const description = descriptionDraft.trim();
    if (!description) {
      toast.error('กรุณาระบุคำอธิบายเกณฑ์การประเมิน');
      return;
    }

    const savedCriterion = saveCriterion(id, {
      ...descriptionEditItem,
      description,
    });

    setCriteria((prev) =>
      prev.map((item) => item.id === savedCriterion.id ? savedCriterion : item)
    );
    setDescriptionEditItem(null);
    setDescriptionDraft('');
    toast.success('อัปเดตคำอธิบายเกณฑ์เรียบร้อย');
  };

  const saveInlineEdit = () => {
    if (!editRowData) return;

    const name = editRowData.name.trim();
    const weightValue = Number(editRowData.weight);
    const originalItem = criteria.find((c) => c.id === editingRowId);

    if (!originalItem) {
      toast.error('ไม่พบเกณฑ์ประเมินที่ต้องการแก้ไข');
      return;
    }

    if (!name) {
      toast.error('กรุณาระบุชื่อหัวข้อประเมิน');
      return;
    }

    const newTotalWeight =
      totalWeight - Number(originalItem.weight) + weightValue;

    const maxAllowedForThisRow =
      remainingWeight + Number(originalItem.weight);

    // Validation น้ำหนักรวมไม่เกิน 100
    if (newTotalWeight > 100) {
      toast.error(
        `น้ำหนักรวมเกิน 100% (ข้อนี้ปรับเพิ่มได้สูงสุด ${maxAllowedForThisRow}%)`
      );
      return;
    }

    // Validation น้ำหนักต้องเป็นหลักสิบ
    if (weightValue % 10 !== 0 || weightValue <= 0) {
      toast.error('กรุณาระบุน้ำหนักคะแนนเป็นหลักสิบ (เช่น 10, 20, 30)');
      return;
    }

    const fixedMaxScore = getFixedMaxScore(editRowData.type);

    // STAR / PERCENTAGE / PASS_FAIL ใช้คะแนนเต็มแบบ Fixed
    // NUMERIC สามารถกำหนดคะแนนเต็มได้ 1-100
    const maxScore =
      fixedMaxScore !== null ? fixedMaxScore : Number(editRowData.maxScore);

    if (!validateMaxScore(editRowData.type, maxScore)) {
      toast.error(
        editRowData.type === 'NUMERIC'
          ? 'คะแนนเต็มของ Numeric ต้องอยู่ระหว่าง 1-100'
          : 'รูปแบบคะแนนที่เลือกมีคะแนนเต็มที่กำหนดไว้แล้ว'
      );
      return;
    }

    const savedCriterion = saveCriterion(id, {
      ...editRowData,
      name,
      weight: weightValue,
      maxScore
    });

    setCriteria((prev) =>
      prev.map((item) =>
        item.id === editingRowId ? savedCriterion : item
      )
    );

    setEditingRowId(null);
    setEditRowData(null);
    toast.success('อัปเดตเกณฑ์ประเมินเรียบร้อย');
  };

  // ----------------------------------------------------

  const confirmDelete = () => {
    deleteCriterion(id, deleteId);
    setCriteria((prev) =>
      prev.filter((criterion) => criterion.id !== deleteId)
    );
    setIsConfirmOpen(false);
    setDeleteId(null);
    toast.success('ลบเกณฑ์ประเมินเรียบร้อย');
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'STAR':
        return <Badge variant="warning">STAR 1-5</Badge>;
      case 'NUMERIC':
        return <Badge variant="info">NUMERIC</Badge>;
      case 'PERCENTAGE':
        return <Badge variant="purple">PERCENTAGE</Badge>;
      case 'PASS_FAIL':
        return <Badge variant="default">PASS/FAIL</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link
        to={`/project/${id}/dashboard`}
        className="text-sm text-blue-600 hover:underline mb-2 inline-block"
      >
        &larr; กลับไปหน้า Dashboard โครงการ
      </Link>

      <PageHeader
        title="จัดการเกณฑ์ประเมิน (Criteria Management)"
        description="กำหนดหัวข้อ รูปแบบการให้คะแนน และน้ำหนัก (Weight) สำหรับโครงการนี้"
        action={
          <Button onClick={handleAddClick} disabled={totalWeight >= 100}>
            + เพิ่มเกณฑ์ประเมิน
          </Button>
        }
      />

      <Card
        className={`${
          totalWeight === 100
            ? 'bg-green-50 border-green-200'
            : totalWeight > 100
              ? 'bg-red-50 border-red-200'
              : 'bg-amber-50 border-amber-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">
              น้ำหนักคะแนนรวม (Total Weight)
            </h3>
            <p className="text-sm text-gray-600">
              น้ำหนักรวมทั้งหมดควรเป็น 100% เพื่อให้ระบบคำนวณผลลัพธ์ได้อย่างถูกต้อง
            </p>
          </div>

          <div className="text-right">
            <span
              className={`text-3xl font-bold ${
                totalWeight === 100
                  ? 'text-green-700'
                  : totalWeight > 100
                    ? 'text-red-600'
                    : 'text-amber-600'
              }`}
            >
              {totalWeight}%
            </span>
          </div>
        </div>
      </Card>

      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-4 font-medium w-1/3">
                  ชื่อหัวข้อประเมิน
                </th>
                <th className="px-6 py-4 font-medium">
                  รูปแบบ (Scoring Type)
                </th>
                <th className="px-6 py-4 font-medium text-center w-24">
                  คะแนนเต็ม
                </th>
                <th className="px-6 py-4 font-medium text-center w-24">
                  น้ำหนัก %
                </th>
                <th className="px-6 py-4 font-medium text-right w-40">
                  จัดการ
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-200">
              {criteria.map((item) => {
                const isEditing = editingRowId === item.id;

                // คำนวณ max weight เฉพาะของแถวที่กำลังแก้
                const maxAllowedForThisRow =
                  remainingWeight + Number(item.weight);

                return (
                  <tr
                    key={item.id}
                    className={`${
                      isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'
                    } text-sm transition-colors`}
                  >
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                          value={editRowData.name}
                          onChange={(e) =>
                            handleInlineChange('name', e.target.value)
                          }
                        />
                      ) : (
                        item.name
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {isEditing ? (
                        <select
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                          value={editRowData.type}
                          onChange={(e) =>
                            handleInlineChange('type', e.target.value)
                          }
                        >
                          {SCORING_TYPES.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        getTypeBadge(item.type)
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min={
                            editRowData.type === 'NUMERIC'
                              ? SCORING_LIMITS.NUMERIC.min
                              : getFixedMaxScore(editRowData.type) ?? 1
                          }
                          max={
                            editRowData.type === 'NUMERIC'
                              ? SCORING_LIMITS.NUMERIC.max
                              : getFixedMaxScore(editRowData.type) ?? 1
                          }
                          step="1"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
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
                        <span className="font-mono text-gray-600">
                          {item.type === 'PASS_FAIL' ? '-' : item.maxScore}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          min="10"
                          max={maxAllowedForThisRow}
                          step="10"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                          value={editRowData.weight}
                          onChange={(e) =>
                            handleInlineChange('weight', e.target.value)
                          }
                        />
                      ) : (
                        <span className="font-semibold text-gray-700">
                          {item.weight}%
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={saveInlineEdit}
                            >
                              บันทึก
                            </Button>
                            <Button
                              variant="text"
                              size="sm"
                              onClick={cancelEditing}
                            >
                              ยกเลิก
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="text"
                              size="sm"
                              onClick={() => openDescriptionEditor(item)}
                            >
                              รายละเอียด
                            </Button>
                            <Button
                              variant="text"
                              size="sm"
                              onClick={() => startEditing(item)}
                            >
                              แก้ไข
                            </Button>

                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setDeleteId(item.id);
                                setIsConfirmOpen(true);
                              }}
                            >
                              ลบ
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {criteria.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    ยังไม่มีการกำหนดเกณฑ์ประเมิน
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="เพิ่มเกณฑ์ประเมินใหม่"
      >
        <form onSubmit={handleAddNew} className="space-y-4">
          <Input
            label="ชื่อหัวข้อประเมิน (Criteria Name)"
            placeholder="เช่น Innovation, ความคิดสร้างสรรค์"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />

          <div>
            <label htmlFor="criterion-description" className="block text-sm font-medium text-gray-700 mb-1.5">
              คำอธิบายเกณฑ์การประเมิน
            </label>
            <textarea
              id="criterion-description"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="อธิบายว่าเกณฑ์นี้ใช้ประเมินอะไร และกรรมการควรพิจารณาประเด็นใด"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
              required
            />
          </div>

          <Select
            label="รูปแบบการให้คะแนน (Scoring Type)"
            options={SCORING_TYPES}
            value={formData.type}
            onChange={(e) => {
              const type = e.target.value;
              setFormData({
                ...formData,
                type,
                maxScore: getFixedMaxScore(type) ?? formData.maxScore
              });
            }}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="น้ำหนัก (Weight %)"
              type="number"
              min="10"
              max={remainingWeight}
              step="10"
              placeholder="10, 20, 30..."
              value={formData.weight}
              onChange={(e) =>
                setFormData({ ...formData, weight: e.target.value })
              }
              required
            />

            <div>
              <Input
                label="คะแนนเต็มสูงสุด (Max Score)"
                type="number"
                min={
                  formData.type === 'NUMERIC'
                    ? SCORING_LIMITS.NUMERIC.min
                    : getFixedMaxScore(formData.type) ?? 1
                }
                max={
                  formData.type === 'NUMERIC'
                    ? SCORING_LIMITS.NUMERIC.max
                    : getFixedMaxScore(formData.type) ?? 1
                }
                step="1"
                value={
                  isFixedScoreType(formData.type)
                    ? getFixedMaxScore(formData.type)
                    : formData.maxScore
                }
                onChange={(e) =>
                  setFormData({ ...formData, maxScore: e.target.value })
                }
                disabled={isFixedScoreType(formData.type)}
              />

              <p className="mt-1 text-xs text-gray-500">
                {formData.type === 'STAR' &&
                  'STAR ใช้คะแนน 1-5 ดาวแบบกำหนดตายตัว'}
                {formData.type === 'NUMERIC' &&
                  'กำหนดคะแนนเต็มได้ตั้งแต่ 1-100'}
                {formData.type === 'PERCENTAGE' &&
                  'Percentage ใช้คะแนนเต็ม 100% แบบกำหนดตายตัว'}
                {formData.type === 'PASS_FAIL' &&
                  'Pass / Fail ใช้ 1 = ผ่าน และ 0 = ไม่ผ่าน'}
              </p>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              ยกเลิก
            </Button>
            <Button type="submit">เพิ่มเกณฑ์ประเมิน</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(descriptionEditItem)}
        onClose={() => setDescriptionEditItem(null)}
        title={`คำอธิบายเกณฑ์: ${descriptionEditItem?.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-criterion-description" className="block text-sm font-medium text-gray-700 mb-1.5">
              คำอธิบายเกณฑ์การประเมิน
            </label>
            <textarea
              id="edit-criterion-description"
              rows={4}
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              placeholder="อธิบายว่าเกณฑ์นี้ใช้ประเมินอะไร และกรรมการควรพิจารณาประเด็นใด"
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm resize-y focus:outline-none focus:ring-2 focus:border-blue-500 focus:ring-blue-200"
              required
            />
          </div>
          <div className="pt-4 flex justify-end gap-3 border-t">
            <Button variant="secondary" onClick={() => setDescriptionEditItem(null)}>
              ยกเลิก
            </Button>
            <Button onClick={saveDescription}>บันทึกคำอธิบาย</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="ยืนยันการลบเกณฑ์ประเมิน"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบเกณฑ์ประเมินนี้? หากมีการให้คะแนนไปแล้วอาจส่งผลกระทบต่อผลรวม"
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsConfirmOpen(false);
          setDeleteId(null);
        }}
        confirmText="ลบเกณฑ์"
      />
    </div>
  );
}
