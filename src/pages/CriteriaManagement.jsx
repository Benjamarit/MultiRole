import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast'; // อย่าลืม import toast
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
  { value: 'STAR', label: 'Star Rating (ให้คะแนนเป็นดาว)' },
  { value: 'NUMERIC', label: 'Numeric (กรอกตัวเลข)' },
  { value: 'PERCENTAGE', label: 'Percentage (เปอร์เซ็นต์ 0-100%)' },
  { value: 'PASS_FAIL', label: 'Pass / Fail (ผ่าน / ไม่ผ่าน)' }
];

export default function CriteriaManagement() {
  const { id } = useParams();

  const [criteria, setCriteria] = useState(() => getCriteriaByProject(id));

  // States สำหรับจัดการ Modal Form (ใช้สำหรับ *เพิ่มข้อมูลใหม่* เท่านั้น)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', type: 'STAR', weight: '', maxScore: 5 });

  // States สำหรับ Inline Edit (แก้ไขบนตาราง)
  const [editingRowId, setEditingRowId] = useState(null);
  const [editRowData, setEditRowData] = useState(null);

  // States สำหรับลบข้อมูล
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // คำนวณน้ำหนักรวม
  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  }, [criteria]);

  // ฟังก์ชันบันทึกข้อมูล *เพิ่มใหม่* ผ่าน Modal
  const handleAddNew = (e) => {
    e.preventDefault();
    const maxScore =
      formData.type === 'PERCENTAGE' ? 100 : formData.type === 'PASS_FAIL' ? 1 : Number(formData.maxScore);

    const newCriterion = saveCriterion(id, {
      id: Date.now(),
      name: formData.name,
      type: formData.type,
      weight: Number(formData.weight),
      maxScore,
    });
    
    setCriteria((prev) => [...prev, newCriterion]);
    setIsModalOpen(false);
    setFormData({ name: '', type: 'STAR', weight: '', maxScore: 5 });
    toast.success('เพิ่มเกณฑ์ประเมินเรียบร้อย');
  };

  const handleAddClick = () => {
    setFormData({ name: '', type: 'STAR', weight: '', maxScore: 5 });
    setIsModalOpen(true);
  };

  // ----------------------------------------------------
  // ฟังก์ชันสำหรับ Inline Edit
  // ----------------------------------------------------
  const startEditing = (item) => {
    setEditingRowId(item.id);
    setEditRowData({ ...item });
  };

  const cancelEditing = () => {
    setEditingRowId(null);
    setEditRowData(null);
  };

  const handleInlineChange = (field, value) => {
    setEditRowData((prev) => {
      const updated = { ...prev, [field]: value };
      // ปรับ maxScore อัตโนมัติตาม type เหมือนในฟอร์ม
      if (field === 'type') {
        if (value === 'PERCENTAGE') updated.maxScore = 100;
        if (value === 'PASS_FAIL') updated.maxScore = 1;
      }
      return updated;
    });
  };

  const saveInlineEdit = () => {
    const maxScore =
      editRowData.type === 'PERCENTAGE' ? 100 : editRowData.type === 'PASS_FAIL' ? 1 : Number(editRowData.maxScore);

    const savedCriterion = saveCriterion(id, {
      ...editRowData,
      weight: Number(editRowData.weight),
      maxScore,
    });
    
    setCriteria((prev) => prev.map((item) => (item.id === editingRowId ? savedCriterion : item)));
    setEditingRowId(null);
    setEditRowData(null);
    toast.success('อัปเดตเกณฑ์ประเมินเรียบร้อย');
  };

  // ----------------------------------------------------

  const confirmDelete = () => {
    deleteCriterion(id, deleteId);
    setCriteria((prev) => prev.filter((criterion) => criterion.id !== deleteId));
    setIsConfirmOpen(false);
    toast.success('ลบเกณฑ์ประเมินเรียบร้อย');
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'STAR': return <Badge variant="warning">STAR</Badge>;
      case 'NUMERIC': return <Badge variant="info">NUMERIC</Badge>;
      case 'PERCENTAGE': return <Badge variant="purple">PERCENTAGE</Badge>;
      case 'PASS_FAIL': return <Badge variant="default">PASS/FAIL</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <Link to={`/project/${id}/dashboard`} className="text-sm text-blue-600 hover:underline mb-2 inline-block">
        &larr; กลับไปหน้า Dashboard โครงการ
      </Link>

      <PageHeader 
        title="จัดการเกณฑ์ประเมิน (Criteria Management)" 
        description="กำหนดหัวข้อ รูปแบบการให้คะแนน และน้ำหนัก (Weight) สำหรับโครงการนี้"
        action={<Button onClick={handleAddClick}>+ เพิ่มเกณฑ์ประเมิน</Button>}
      />

      <Card className={`${totalWeight === 100 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">น้ำหนักคะแนนรวม (Total Weight)</h3>
            <p className="text-sm text-gray-600">น้ำหนักรวมทั้งหมดควรเป็น 100% เพื่อให้ระบบคำนวณผลลัพธ์ได้อย่างถูกต้อง</p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold ${totalWeight === 100 ? 'text-green-700' : 'text-amber-600'}`}>
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
                <th className="px-6 py-4 font-medium w-1/3">ชื่อหัวข้อประเมิน</th>
                <th className="px-6 py-4 font-medium">รูปแบบ (Scoring Type)</th>
                <th className="px-6 py-4 font-medium text-center w-24">คะแนนเต็ม</th>
                <th className="px-6 py-4 font-medium text-center w-24">น้ำหนัก %</th>
                <th className="px-6 py-4 font-medium text-right w-40">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {criteria.map((item) => {
                const isEditing = editingRowId === item.id;

                return (
                  <tr key={item.id} className={`${isEditing ? 'bg-blue-50' : 'hover:bg-gray-50'} text-sm transition-colors`}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {isEditing ? (
                        <input
                          type="text"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500"
                          value={editRowData.name}
                          onChange={(e) => handleInlineChange('name', e.target.value)}
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
                          onChange={(e) => handleInlineChange('type', e.target.value)}
                        >
                          {SCORING_TYPES.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      ) : (
                        getTypeBadge(item.type)
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                          value={editRowData.maxScore}
                          onChange={(e) => handleInlineChange('maxScore', e.target.value)}
                          disabled={editRowData.type === 'PERCENTAGE' || editRowData.type === 'PASS_FAIL'}
                        />
                      ) : (
                        <span className="font-mono text-gray-600">{item.type === 'PASS_FAIL' ? '-' : item.maxScore}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-blue-500"
                          value={editRowData.weight}
                          onChange={(e) => handleInlineChange('weight', e.target.value)}
                        />
                      ) : (
                        <span className="font-semibold text-gray-700">{item.weight}%</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                        {isEditing ? (
                          <>
                            <Button variant="primary" size="sm" onClick={saveInlineEdit}>บันทึก</Button>
                            <Button variant="text" size="sm" onClick={cancelEditing}>ยกเลิก</Button>
                          </>
                        ) : (
                          <>
                            <Button variant="text" size="sm" onClick={() => startEditing(item)}>แก้ไข</Button>
                            <Button variant="danger" size="sm" onClick={() => { setDeleteId(item.id); setIsConfirmOpen(true); }}>
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
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">ยังไม่มีการกำหนดเกณฑ์ประเมิน</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal เพิ่มเกณฑ์ประเมิน (เหลือแค่สำหรับเพิ่มใหม่) */}
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
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            required
          />
          
          <Select 
            label="รูปแบบการให้คะแนน (Scoring Type)"
            options={SCORING_TYPES}
            value={formData.type}
            onChange={(e) => setFormData({...formData, type: e.target.value})}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="น้ำหนัก (Weight %)" 
              type="number"
              min="1" max="100"
              placeholder="0-100"
              value={formData.weight}
              onChange={(e) => setFormData({...formData, weight: e.target.value})}
              required
            />
            
            <Input 
              label="คะแนนเต็มสูงสุด (Max Score)" 
              type="number"
              min="1"
              value={formData.type === 'PERCENTAGE' ? 100 : formData.maxScore}
              onChange={(e) => setFormData({...formData, maxScore: e.target.value})}
              disabled={formData.type === 'PERCENTAGE' || formData.type === 'PASS_FAIL'}
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t mt-6">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>ยกเลิก</Button>
            <Button type="submit">เพิ่มเกณฑ์ประเมิน</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog 
        isOpen={isConfirmOpen}
        title="ยืนยันการลบเกณฑ์ประเมิน"
        message="คุณแน่ใจหรือไม่ว่าต้องการลบเกณฑ์ประเมินนี้? หากมีการให้คะแนนไปแล้วอาจส่งผลกระทบต่อผลรวม"
        onConfirm={confirmDelete}
        onCancel={() => setIsConfirmOpen(false)}
        confirmText="ลบเกณฑ์"
      />
    </div>
  );
}