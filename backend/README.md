# MultiRole Backend

Java 17 / Spring Boot / MySQL ส่วน Backend ของ Repo `Benjamarit/MultiRole` ให้แก้และรันโค้ดจากโฟลเดอร์นี้ตั้งแต่ย้ายเข้า Repo เดียว ไม่ต้องใช้ remote ของ Repo Backend เก่า

## รันบนเครื่อง

1. ติดตั้ง JDK 17 และเปิด MySQL
2. คัดลอก `config/application-local.properties.example` เป็น `config/application-local.properties`
3. ใส่ค่าฐานข้อมูล คีย์สุ่มลับที่ยาวอย่างน้อย 32 ตัวอักษร และ Brevo ที่ยืนยันผู้ส่งแล้ว ค่าจริงจะไม่เข้า Git หรือ Docker image
4. ในโฟลเดอร์นี้ รัน:

```powershell
.\mvnw.cmd spring-boot:run
```

หรือใช้ `Start-Backend.ps1` ที่เริ่มจากโฟลเดอร์นี้ให้อัตโนมัติ Linux/macOS ใช้ `./mvnw spring-boot:run`

Backend ปกติใช้พอร์ต 8080 และ Frontend ใช้ 5173 ค่า JWT secret และคีย์เข้ารหัสอีเมลต้องคงที่หลัง restart อย่าเปลี่ยนคีย์เข้ารหัสขณะที่ยังมีอีเมลรอส่ง เพราะจะอ่านข้อมูลในคิวเดิมไม่ได้

## ทดสอบและสร้างไฟล์

```powershell
.\mvnw.cmd verify
```

ได้ `target/MultiRole-0.0.1-SNAPSHOT.jar` ซึ่งไม่ต้อง push ชุดทดสอบใช้ H2 และปิดงานส่งอีเมล/แจ้งเตือนอัตโนมัติ บริการส่งอีเมลใน integration tests ใช้ HTTP mock

## Production environment

ดูชื่อค่าทั้งหมดใน `.env.example` และตั้งค่าจริงผ่าน Hosting:

| ชื่อ | ค่า |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `PORT` | พอร์ตของบริการ ถ้าไม่กำหนดใช้ 8080 |
| `DB_URL` | JDBC URL เช่น `jdbc:mysql://PRIVATE_HOST:3306/DATABASE?serverTimezone=Asia/Bangkok` ปรับ TLS ตามบริการฐานข้อมูล |
| `DB_USERNAME` / `DB_PASSWORD` | บัญชีฐานข้อมูลเฉพาะแอป |
| `DB_DDL_AUTO` | `validate` หลังสร้างตารางครบแล้ว |
| `FRONTEND_URL` | URL HTTPS ของ Frontend ใช้สำหรับ CORS และลิงก์ยืนยัน/รีเซ็ตรหัสผ่าน |
| `JWT_SECRET` | ค่าสุ่มลับคงที่อย่างน้อย 32 ตัวอักษร |
| `MAIL_ENCRYPTION_KEY` | ค่าสุ่มลับอีกชุด แยกจาก JWT และเก็บคงที่ |
| `BREVO_API_KEY` | คีย์ส่ง Transactional Email ที่ใช้งานจริง |
| `BREVO_SENDER_EMAIL` | อีเมลผู้ส่งที่ยืนยันแล้วใน Brevo |

Spring Boot ไม่อ่าน `.env` อัตโนมัติ ถ้าใช้ Docker ต้องส่งผ่าน `--env-file` หรือ `-e` ถ้าใช้ Hosting ให้ตั้งในหน้า Variables โดยตรง ห้ามใส่ค่าลับใน Frontend หรือ `VITE_*`

Production profile บังคับให้มีค่าฐานข้อมูลและค่าลับ ไม่มีรหัสจริงหรือ JWT secret สำเร็จรูปใน source และปิด SQL logging แล้ว

### สร้างฐานข้อมูลครั้งแรก

สร้าง database เปล่าบน Hosting ก่อน ครั้งแรกกำหนด `DB_DDL_AUTO=update` เพื่อให้ Hibernate สร้างตาราง หลังเริ่มสำเร็จและตรวจ schema แล้ว เปลี่ยนเป็น `validate` และ redeploy ค่าเริ่มต้น production เป็น `validate` จึงตั้งใจให้ปฏิเสธฐานที่ตารางยังไม่พร้อม ห้ามใช้ `create` หรือ `create-drop` กับข้อมูลจริง

การอัปเดต schema ในอนาคตควรตรวจบนฐานทดสอบ สำรองข้อมูล และใช้ migration ที่ตรวจสอบได้ก่อนปรับฐานจริง

### Docker

จากโฟลเดอร์นี้:

```sh
docker build -t multirole-backend .
docker run --rm --env-file .env -p 8080:8080 multirole-backend
```

Dockerfile build จาก source ด้วย Maven แล้วรัน JAR ด้วย Java 17 ภายใต้ UID ที่ไม่ใช่ root ค่าเริ่มต้นใช้ profile `prod` ขั้น Docker build ข้าม tests จึงต้องผ่าน `mvnw verify` ก่อนนำไปเผยแพร่

`.dockerignore` กัน config จริง `.env` และ target ไม่ให้เข้า build context Docker image ไม่บรรจุรหัสจากเครื่องผู้พัฒนา

### Railway จาก Repo เดียว

เลือก Repo `Benjamarit/MultiRole` และตั้ง Root Directory ของบริการ Backend เป็น `/backend` จากนั้นใช้ Dockerfile, เพิ่ม Variables ตามตาราง, เชื่อม MySQL และเปิด public domain ของ Backend ตั้ง Frontend `VITE_API_URL` เป็น URL นี้ตามด้วย `/api`

ควรเริ่มด้วย Backend instance เดียวสำหรับการใช้งานสาธิต ให้ scheduler ทำงานต่อเนื่องสำหรับคิวอีเมลและ reminder และทดสอบหลายบัญชี ลิงก์อีเมล เวลาปิดรับคะแนน การส่งออกและการสำรองข้อมูลหลัง Deploy อีกครั้ง

รายละเอียดอีเมล: [EMAIL_SETUP.md](EMAIL_SETUP.md)
