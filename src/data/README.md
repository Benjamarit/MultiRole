# โมดูลข้อมูลและกฎการทำงาน

จัดตามส่วนของระบบเพื่อให้อ่านโค้ดและตามการทำงานได้ง่ายขึ้น โดย Store เป็นตัวอ่าน cache/เรียก API ส่วนไฟล์กฎและการคำนวณแยกอยู่ในหมวดเดียวกับงานที่ใช้

| โฟลเดอร์ | หน้าที่ | ไฟล์หลัก |
|---|---|---|
| [projects](projects/) | โครงการ ความพร้อมและการล็อกโครงสร้าง | ProjectStore, ProjectReadiness, ProjectLock |
| [teams](teams/) | ทีม กลุ่ม การเรียงและนำเข้า Excel | TeamStore, GroupStore, TeamOrdering, TeamImport |
| [judges](judges/) | ตัวตนกรรมการและการมอบหมายทีม | JudgeIdentity, JudgeTeamAssignmentStore |
| [evaluations](evaluations/) | ใบประเมิน เกณฑ์ สูตรคะแนน Rubric และส่งหลายทีม | EvaluationStore, CriteriaStore, Scoring, Rubric, BatchSubmission |
| [notifications](notifications/) | แจ้งเตือนในเว็บและคำขอเตือนประเมิน | NotificationStore |

การเชื่อมต่อ HTTP อยู่ที่ `src/api/client.js` ส่วน cache และการโหลดโครงการอยู่ที่ `src/api/workspace.js` เช่นเดิม โมดูลในหมวดต่าง ๆ import กันได้เมื่อเกี่ยวข้อง แต่การตรวจสิทธิ์จริงและการบันทึกข้อมูลยังอยู่ที่ Backend

ชื่อไฟล์และ exports เดิมคงไว้ การย้ายวันที่ 1 พฤศจิกายน 2026 เปลี่ยนเฉพาะตำแหน่งและ import ไม่เปลี่ยน API, schema หรือกฎคะแนน ดูรายละเอียดแต่ละฟังก์ชันใน [รายงาน Frontend](../../docs/technical-report/FRONTEND.md)
