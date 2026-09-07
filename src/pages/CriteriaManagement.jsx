import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
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

  // States สำหรับจัดการ Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = โหมดเพิ่มใหม่
  const [formData, setFormData] = useState({ name: '', type: 'STAR', weight: '', maxScore: 5 });

  // States สำหรับลบข้อมูล
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  // คำนวณน้ำหนักรวม (ควรให้ได้ 100%)
  const totalWeight = useMemo(() => {
    return criteria.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  }, [criteria]);

  // ฟังก์ชันจัดการฟอร์ม (ใช้ทั้งเพิ่มใหม่และแก้ไข แยกกันด้วย editingId)
  const handleSave = (e) => {
    e.preventDefault();
    const maxScore =
      formData.type === 'PERCENTAGE' ? 100 : formData.type === 'PASS_FAIL' ? 1 : Number(formData.maxScore);

    if (editingId) {
      const savedCriterion = saveCriterion(id, {
        id: editingId,
        name: formData.name,
        type: formData.type,
        weight: Number(formData.weight),
        maxScore,
      });
      setCriteria((prev) => prev.map((item) => (item.id === editingId ? savedCriterion : item)));
    } else {
      const newCriterion = saveCriterion(id, {
        id: Date.now(),
        name: formData.name,
        type: formData.type,
        weight: Number(formData.weight),
        maxScore,
      });
      setCriteria((prev) => [...prev, newCriterion]);
    }

    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', type: 'STAR', weight: '', maxScore: 5 }); // Reset Form
  };

  // เปิดฟอร์มโหมดเพิ่มใหม่
  const handleAddClick = () => {
    setEditingId(null);
    setFormData({ name: '', type: 'STAR', weight: '', maxScore: 5 });
    setIsModalOpen(true);
  };

  // เปิดฟอร์มโหมดแก้ไข พร้อม pre-fill ข้อมูลเดิม
  const handleEditClick = (item) => {
    setEditingId(item.id);
    setFormData({ name: item.name, type: item.type, weight: String(item.weight), maxScore: item.maxScore });
    setIsModalOpen(true);
  };

  const confirmDelete = () => {
    deleteCriterion(id, deleteId);
    setCriteria((prev) => prev.filter((criterion) => criterion.id !== deleteId));
    setIsConfirmOpen(false);
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

      {/* กล่องสรุปสถานะ Weight */}
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

      {/* ตารางแสดง Criteria */}
      <Card noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                <th className="px-6 py-4 font-medium">ชื่อหัวข้อประเมิน</th>
                <th className="px-6 py-4 font-medium">รูปแบบ (Scoring Type)</th>
                <th className="px-6 py-4 font-medium text-center">คะแนนเต็ม (Max)</th>
                <th className="px-6 py-4 font-medium text-center">น้ำหนัก (Weight)</th>
                <th className="px-6 py-4 font-medium text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {criteria.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 text-sm">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                  <td className="px-6 py-4">{getTypeBadge(item.type)}</td>
                  <td className="px-6 py-4 text-center font-mono text-gray-600">
                    {item.type === 'PASS_FAIL' ? '-' : item.maxScore}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-gray-700">{item.weight}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                      <Button variant="text" size="sm" onClick={() => handleEditClick(item)}>แก้ไข</Button>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => { setDeleteId(item.id); setIsConfirmOpen(true); }}
                      >
                        ลบ
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {criteria.length === 0 && (
                <tr><td colSpan="5" className="px-6 py-10 text-center text-gray-500">ยังไม่มีการกำหนดเกณฑ์ประเมิน</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal เพิ่มเกณฑ์ประเมิน */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => { setIsModalOpen(false); setEditingId(null); }} 
        title={editingId ? 'แก้ไขเกณฑ์ประเมิน' : 'เพิ่มเกณฑ์ประเมินใหม่'}
      >
        <form onSubmit={handleSave} className="space-y-4">
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
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); setEditingId(null); }}>ยกเลิก</Button>
            <Button type="submit">{editingId ? 'บันทึกการแก้ไข' : 'บันทึกเกณฑ์ประเมิน'}</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Dialog สำหรับลบ */}
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