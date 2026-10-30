# MultiRole

ระบบจัดการและประเมินการแข่งขัน รองรับเจ้าของโครงการ กรรมการ และ System Admin โดย Frontend และ Backend อยู่ใน repository เดียวกัน

## โครงสร้าง

```text
MultiRole/
├── src/                  # React + Vite frontend
├── tests/                # Frontend tests
├── package.json
└── backend/              # Java 17 + Spring Boot + MySQL
    ├── src/main/
    ├── src/test/
    ├── config/           # ตัวอย่างการตั้งค่า; ค่าจริงไม่เข้า Git
    ├── pom.xml
    ├── Dockerfile
    └── README.md
```

## รันบนเครื่อง

Frontend ใช้ Node.js 22.12+ หรือรุ่นที่ตรงตาม engines ของ Vite:

```sh
npm ci
npm run dev
```

Frontend ที่ http://localhost:5173 ส่ง `/api` ผ่าน Vite ไป Backend ที่ http://localhost:8080

Backend ใช้ Java 17 และ MySQL ดูการตั้งค่าใน [backend/README.md](backend/README.md) และเริ่มจากโฟลเดอร์ `backend/`:

```powershell
.\mvnw.cmd spring-boot:run
```

ข้อมูลโครงการ ทีม กลุ่ม สิทธิ์และผลประเมินอยู่ใน Backend/MySQL ไม่ได้ใช้ localStorage เป็นฐานข้อมูลหลัก Frontend เก็บ JWT สำหรับเข้าสู่ระบบและเรียก API โดย Backend ตรวจสิทธิ์และกติกาสำคัญซ้ำ

## ตรวจสอบ

```sh
npm test
npm run lint
npm run build
```

Backend: รัน `mvnw.cmd verify` ใน `backend/` (Linux/macOS: `./mvnw verify`) ชุดทดสอบใช้ H2 แยกจากข้อมูล MySQL จริง และใช้บริการอีเมลจำลอง

## Deploy แยกบริการจาก Repo เดียว

| บริการ | Root directory | การตั้งค่าหลัก |
|---|---|---|
| Frontend / Vercel | ราก Repo | `npm run build`, output `dist`, ตั้ง `VITE_API_URL=https://BACKEND_DOMAIN/api` |
| Backend / Railway หรือ Docker hosting | `backend` | ใช้ Dockerfile และค่าลับจาก environment ดู backend/README.md |
| MySQL | แยกบริการฐานข้อมูล | ให้ Backend เชื่อมผ่านเครือข่ายส่วนตัวของ Hosting และตั้งสำรองข้อมูล |

ยังต้องตั้ง SPA rewrite สำหรับ Vercel ก่อนเปิดเว็บจริง เพื่อให้การเปิดลิงก์ภายในและลิงก์ยืนยันอีเมลโดยตรงไม่เกิด 404 การเพิ่ม Backend ใน Repo ไม่ได้เป็นการ Deploy อัตโนมัติ

## กติกาการประเมิน

- มอบหมายกรรมการให้ทีมชัดเจน หนึ่งทีมมีกรรมการได้หลายคน
- รวมคะแนนรายเกณฑ์ตามน้ำหนัก แล้วเฉลี่ยเฉพาะผลที่กรรมการส่งแล้ว คะแนนร่างไม่รวมในอันดับ
- กรรมการแก้คะแนนของตัวเองได้ขณะเปิดรับคะแนนและยังไม่ถึง Deadline มีประวัติแก้คะแนน
- หลังเปิดรับคะแนนครั้งแรก ล็อกข้อมูลโครงการ ทีม กลุ่ม เกณฑ์ กรรมการ และการมอบหมาย แม้พักกลับ Draft
- เปลี่ยน Deadline ผ่านหน้าต่างยืนยันได้ พร้อมประวัติผู้เปลี่ยนและค่าเดิม/ใหม่
- การเชิญสมาชิกแจ้งเตือนในเว็บ การเตือนให้ประเมินรองรับทั้งในเว็บและอีเมล

ห้าม commit รหัสฐานข้อมูล JWT secret คีย์เข้ารหัสอีเมล Brevo API key หรือไฟล์ข้อมูลสำรองจริง `.env` และ `backend/config/application-local.properties` ถูก ignore แล้ว
