# รายการ API และจุดเรียก

[กลับสารบัญ](README.md)

ตรวจพบ REST endpoints ของแอป **54 รายการ** จาก `@Get/Post/Put/Patch/DeleteMapping` ไม่รวม CORS preflight, Spring `/error`, static assets และ API ของผู้ให้บริการภายนอก

## การเชื่อมต่อ

- Local: Frontend ส่ง `/api` ผ่าน Vite proxy → `http://localhost:8080`
- Production ที่ใช้: `VITE_API_URL=https://multirole.onrender.com/api`
- path ในตารางรวม `/api` แล้ว หากใช้ Axios baseURL ข้างบนให้ส่ง path `/auth/login` ไม่ใช่ `/api/auth/login` ซ้ำ
- JSON requests ใช้ `Content-Type: application/json`; เส้นทาง Login แล้วแนบ `Authorization: Bearer <JWT>`
- UUID ในตัวอย่างเป็น placeholder ห้ามใช้ ID ของโครงการอื่นแทนเพื่อข้ามสิทธิ์ เพราะ Backend ตรวจขอบเขตซ้ำ
- คำตอบปกติของ Controller เป็น HTTP 200 เว้น getMine ที่อาจ 204; body ว่างไม่ควรบังคับ parse JSON
- ค่า totalScore จาก client ไม่ใช่แหล่งอ้างอิง Backend คำนวณจาก ScoreRequest ใหม่

## สรุปสถานะผิดพลาด

| HTTP | ตัวอย่าง |
|---|---|
| 400 | field ไม่ครบ, น้ำหนักเกิน, คะแนนเกินช่วง, token ผิด/หมดอายุ, batch ซ้ำทีม |
| 401 | ไม่มี JWT, JWT หมดอายุ/ปลอม, บัญชีระงับ/ลบ/version ไม่ตรง, Login ไม่ผ่าน |
| 403 | ไม่ใช่สมาชิก/ผู้ดูแล, ไม่ได้รับ assignment, EMAIL_NOT_VERIFIED, ถูกบล็อกสร้าง |
| 404 | ไม่พบ resource หรือไม่อยู่ในขอบเขตโครงการ/เจ้าของ |
| 409 | โครงสร้างล็อก, สถานะไม่เปิด/หมด deadline, ชื่อ/assignment ซ้ำ, FK conflict |
| 429 | สร้างเกิน quota หรือส่ง reminder ซ้ำในหนึ่งชั่วโมง |

รูป error ไม่ได้เป็น schema เดียวทุก endpoint: มีทั้งข้อความ, object message/detail และ code EMAIL_NOT_VERIFIED ตัว Axios interceptor จึงเลือกข้อความจากหลายรูปแบบ

## AuthController

[backend/src/main/java/org/cesystem/multirole/controller/AuthController.java](../../backend/src/main/java/org/cesystem/multirole/controller/AuthController.java)

### `POST /api/auth/register`

- Handler: `register` (บรรทัด 31)
- หน้าที่: ส่งข้อมูลสมัครให้ AuthService และแปลง validation error เป็น 400
- สิทธิ์: Public
- Request: RegisterRequest {email,password,fullName}
- Response: ข้อความสมัครสำเร็จ
- ผู้เรียก: SignUp → AuthContext.register

### `POST /api/auth/login`

- Handler: `login` (บรรทัด 42)
- หน้าที่: ตรวจ credentials คืน token หรือ 403 EMAIL_NOT_VERIFIED/401 ตามผลตรวจ
- สิทธิ์: Public
- Request: LoginRequest {email,password}
- Response: AuthResponse {token,fullName,role}
- ผู้เรียก: Login → AuthContext.login

### `GET /api/auth/me`

- Handler: `getCurrentUser` (บรรทัด 55)
- หน้าที่: อ่านผู้ใช้ตาม principal แล้วคืนโปรไฟล์ที่ไม่รวมความลับ
- สิทธิ์: Login
- Request: ไม่มี body
- Response: UserProfileDto {userId,email,fullName,role}
- ผู้เรียก: AuthContext.hydrate

### `POST /api/auth/forgot-password`

- Handler: `forgotPassword` (บรรทัด 77)
- หน้าที่: รับอีเมล ส่งคำขอ reset และตอบข้อความทั่วไปไม่ระบุว่าบัญชีมีจริงหรือไม่
- สิทธิ์: Public
- Request: {email}
- Response: ข้อความทั่วไปเหมือนกันเมื่อมี/ไม่มีบัญชี
- ผู้เรียก: Login.handleForgotPassword

### `POST /api/auth/reset-password`

- Handler: `resetPassword` (บรรทัด 84)
- หน้าที่: ตรวจ token และบันทึกรหัสผ่านใหม่ผ่าน PasswordResetService
- สิทธิ์: Public + reset token ใช้ได้
- Request: {token,newPassword}
- Response: ข้อความตั้งรหัสสำเร็จ
- ผู้เรียก: ResetPassword.handleSubmit

### `POST /api/auth/resend-verification`

- Handler: `resendVerification` (บรรทัด 91)
- หน้าที่: ขอสร้างลิงก์ยืนยันอีเมลใหม่โดยไม่เปิดเผยสถานะบัญชีแก่ผู้ขอ
- สิทธิ์: Public
- Request: {email}
- Response: ข้อความขอลิงก์ทั่วไป
- ผู้เรียก: VerifyEmail.resend

### `POST /api/auth/verify-email`

- Handler: `verifyEmail` (บรรทัด 96)
- หน้าที่: ส่ง token ให้ service เปิดใช้งานการยืนยันอีเมล
- สิทธิ์: Public + verification token ใช้ได้
- Request: {token}
- Response: ข้อความยืนยันสำเร็จ
- ผู้เรียก: VerifyEmail.verify

### `GET /api/auth/verify-reset-token`

- Handler: `verifyResetToken` (บรรทัด 101)
- หน้าที่: ตรวจ token และคืน {valid:boolean} สำหรับหน้าตั้งรหัสใหม่
- สิทธิ์: Public
- Request: query token
- Response: {valid:boolean}
- ผู้เรียก: ResetPassword effect ตรวจ token

## CompetitionController

[backend/src/main/java/org/cesystem/multirole/controller/CompetitionController.java](../../backend/src/main/java/org/cesystem/multirole/controller/CompetitionController.java)

### `GET /api/competitions`

- Handler: `list` (บรรทัด 43)
- หน้าที่: คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล
- สิทธิ์: Login เห็นเฉพาะโครงการสมาชิก ยกเว้น System Admin เห็นทั้งหมด
- Request: ไม่มี body
- Response: CompetitionResponse[]
- ผู้เรียก: workspace.loadWorkspace

### `GET /api/competitions/{competitionId}`

- Handler: `get` (บรรทัด 56)
- หน้าที่: คืนรายละเอียดโครงการหลังตรวจสมาชิก
- สิทธิ์: สมาชิกโครงการ / System Admin
- Request: path competitionId
- Response: CompetitionResponse
- ผู้เรียก: workspace.loadProject

### `GET /api/competitions/creation-quota`

- Handler: `quota` (บรรทัด 65)
- หน้าที่: คำนวณจำนวนโครงการ ช่วงเวลาและเหตุผลว่าผู้ใช้ยังสร้างได้หรือไม่
- สิทธิ์: Login
- Request: ไม่มี body
- Response: Quota {owned,createdLast10Minutes,createdLast24Hours,burstLimit,dailyLimit,totalLimit,blocked,allowed,reason}
- ผู้เรียก: CreateProject.loadQuota

### `POST /api/competitions`

- Handler: `create` (บรรทัด 71)
- หน้าที่: ตรวจข้อมูลและสิทธิ์ แล้วสร้าง Entity ตามประเภทของ Controller ใน transaction
- สิทธิ์: Login + quota ผ่าน
- Request: CompetitionRequest {title,description,category,evaluationDeadline}
- Response: CompetitionResponse สถานะ DRAFT
- ผู้เรียก: ProjectStore.addProject → CreateProject

### `PUT /api/competitions/{competitionId}`

- Handler: `update` (บรรทัด 100)
- หน้าที่: ตรวจสิทธิ์และข้อมูล แล้วแก้ Entity เป้าหมาย; Competition อนุญาตเฉพาะ deadline หลังล็อก
- สิทธิ์: Project Admin / System Admin หลังล็อกเปลี่ยนได้เฉพาะ deadline
- Request: CompetitionRequest + path competitionId
- Response: CompetitionResponse
- ผู้เรียก: ProjectStore.updateProjectDetails → ProjectDashboard

### `GET /api/competitions/{competitionId}/deadline-history`

- Handler: `deadlineChanges` (บรรทัด 142)
- หน้าที่: คืนประวัติ deadline ล่าสุดสูงสุด 20 รายการให้ผู้ดูแลโครงการ
- สิทธิ์: Project Admin / System Admin
- Request: path competitionId
- Response: DeadlineChange[] สูงสุด 20 รายการ
- ผู้เรียก: DeadlineHistory effect เมื่อเปิดรายละเอียด

### `PATCH /api/competitions/{competitionId}/status`

- Handler: `updateStatus` (บรรทัด 152)
- หน้าที่: ตรวจ DRAFT/ACTIVE/CLOSED เรียก readiness ก่อน ACTIVE และตั้ง criteriaLocked ถาวรหลังเริ่ม
- สิทธิ์: Project Admin / System Admin + readiness ก่อน ACTIVE
- Request: {status:DRAFT/ACTIVE/CLOSED}
- Response: CompetitionResponse
- ผู้เรียก: ProjectStore.updateProjectStatus → ProjectDashboard

### `DELETE /api/competitions/{competitionId}`

- Handler: `delete` (บรรทัด 179)
- หน้าที่: ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน
- สิทธิ์: Project Admin / System Admin
- Request: path competitionId
- Response: body ว่าง
- ผู้เรียก: ProjectStore.deleteProject → WorkSpace

## CompetitionUserController

[backend/src/main/java/org/cesystem/multirole/controller/CompetitionUserController.java](../../backend/src/main/java/org/cesystem/multirole/controller/CompetitionUserController.java)

### `GET /api/competitions/{competitionId}/members`

- Handler: `list` (บรรทัด 38)
- หน้าที่: คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล
- สิทธิ์: Project Admin / System Admin
- Request: path competitionId
- Response: MemberResponse[]
- ผู้เรียก: workspace.loadProject เฉพาะ admin

### `POST /api/competitions/{competitionId}/members`

- Handler: `add` (บรรทัด 49)
- หน้าที่: เพิ่มสมาชิกหรือเกณฑ์ตาม Controller โดยตรวจข้อมูลซ้ำ สิทธิ์และการล็อก
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: {email,role:ADMIN/JUDGE}
- Response: MemberResponse
- ผู้เรียก: ProjectStore.inviteJudgeToProject → ProjectJudge

### `DELETE /api/competitions/{competitionId}/members/{userId}`

- Handler: `remove` (บรรทัด 102)
- หน้าที่: ถอดสมาชิก/assignment; ADMIN_JUDGE ถอยเป็น ADMIN และห้ามถอดผู้ดูแลคนสุดท้าย
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้ + ห้ามถอด admin สุดท้าย
- Request: path competitionId,userId
- Response: body ว่าง
- ผู้เรียก: ProjectStore.removeJudgeAssignment → ProjectJudge

## CriteriaController

[backend/src/main/java/org/cesystem/multirole/controller/CriteriaController.java](../../backend/src/main/java/org/cesystem/multirole/controller/CriteriaController.java)

### `GET /api/competitions/{competitionId}/criteria`

- Handler: `list` (บรรทัด 37)
- หน้าที่: คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล
- สิทธิ์: สมาชิกโครงการ / System Admin
- Request: path competitionId
- Response: CriteriaResponse[]
- ผู้เรียก: workspace.loadProject

### `POST /api/competitions/{competitionId}/criteria`

- Handler: `add` (บรรทัด 47)
- หน้าที่: เพิ่มสมาชิกหรือเกณฑ์ตาม Controller โดยตรวจข้อมูลซ้ำ สิทธิ์และการล็อก
- สิทธิ์: Project Admin / System Admin + criteria ยังไม่ล็อก
- Request: CriteriaRequest {title,description,scoringType,maxScore,weightPercentage}
- Response: CriteriaResponse
- ผู้เรียก: CriteriaStore.saveCriterion → CriteriaManagement

### `PUT /api/competitions/{competitionId}/criteria/{criterionId}`

- Handler: `update` (บรรทัด 62)
- หน้าที่: ตรวจสิทธิ์และข้อมูล แล้วแก้ Entity เป้าหมาย; Competition อนุญาตเฉพาะ deadline หลังล็อก
- สิทธิ์: Project Admin / System Admin + criteria ยังไม่ล็อก
- Request: CriteriaRequest + path criterionId
- Response: CriteriaResponse
- ผู้เรียก: CriteriaStore.saveCriterion → CriteriaManagement

### `DELETE /api/competitions/{competitionId}/criteria/{criterionId}`

- Handler: `delete` (บรรทัด 77)
- หน้าที่: ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน
- สิทธิ์: Project Admin / System Admin + criteria ยังไม่ล็อก/FK ไม่ขัด
- Request: path competitionId,criterionId
- Response: body ว่าง
- ผู้เรียก: CriteriaStore.deleteCriterion → CriteriaManagement

## EvaluationController

[backend/src/main/java/org/cesystem/multirole/controller/EvaluationController.java](../../backend/src/main/java/org/cesystem/multirole/controller/EvaluationController.java)

### `GET /api/evaluations/{evaluationId}/history`

- Handler: `history` (บรรทัด 35)
- หน้าที่: คืนประวัติใบประเมินหน้า 20 รายการ ตรวจเจ้าของหรือ admin ที่ดูผล SUBMITTED และซ่อน draft ผู้อื่น
- สิทธิ์: เจ้าของใบ หรือ Project Admin/System Admin เมื่อใบ SUBMITTED โดยตัด draft
- Request: path evaluationId + query page เริ่ม 0
- Response: Page<Response> {content,totalPages,totalElements,...}
- ผู้เรียก: EvaluationHistory effect

### `GET /api/evaluations/competition/{competitionId}/mine`

- Handler: `listMine` (บรรทัด 56)
- หน้าที่: คืนใบประเมินของกรรมการปัจจุบันในโครงการ
- สิทธิ์: สมาชิกโครงการ
- Request: path competitionId
- Response: EvaluationResponse[] เฉพาะเจ้าของ
- ผู้เรียก: JudgeScoreMonitoring polling

### `POST /api/evaluations/submit-batch`

- Handler: `submitBatch` (บรรทัด 65)
- หน้าที่: ส่ง request ไป BatchEvaluationService ให้ตรวจและประมวลผลรายทีม
- สิทธิ์: สมาชิก + assignment/status/deadline ของแต่ละทีม
- Request: BatchEvaluationDtos.Request {competitionId,teams:[{teamId,comment,scores}]}
- Response: {results:[{teamId,outcome,httpStatus,message,evaluation}]}
- ผู้เรียก: EvaluationStore.submitEvaluationsBatch → JudgeMultiEvaluation.sendBatch

### `POST /api/evaluations/save`

- Handler: `saveEvaluation` (บรรทัด 71)
- หน้าที่: เรียก upsertEvaluation ด้วย principal และรักษา HTTP status ของ business exception
- สิทธิ์: Login + assignment + ACTIVE + ก่อน deadline
- Request: EvaluationRequest {competitionId,teamId,status,comment,scores:[{criterionId,scoreValue,comment}]}
- Response: ข้อความบันทึกสำเร็จ ไม่มี total ใน response นี้
- ผู้เรียก: EvaluationStore.saveEvaluation → JudgeEvaluation/JudgeMultiEvaluation

### `GET /api/evaluations/competition/{competitionId}`

- Handler: `listByCompetition` (บรรทัด 92)
- หน้าที่: admin เห็น SUBMITTED และใบของตน; judge เห็นเฉพาะใบตนเอง
- สิทธิ์: สมาชิก: Judge เห็นของตน Admin เห็น SUBMITTED และของตน
- Request: path competitionId
- Response: EvaluationResponse[] ตามสิทธิ์
- ผู้เรียก: workspace.loadProject → monitor/leaderboard และหน้าประเมิน

### `GET /api/evaluations/competition/{competitionId}/team/{teamId}/mine`

- Handler: `getMine` (บรรทัด 108)
- หน้าที่: ค้นใบของกรรมการปัจจุบันสำหรับทีม คืน 200 หรือ 204 เมื่อยังไม่มี
- สิทธิ์: สมาชิกโครงการ เฉพาะใบ principal
- Request: path competitionId,teamId
- Response: EvaluationResponse หรือ 204 ไม่มี body เมื่อยังไม่มีใบ
- ผู้เรียก: EvaluationStore.saveEvaluation อ่านผลหลังบันทึก

## JudgeAssignmentController

[backend/src/main/java/org/cesystem/multirole/controller/JudgeAssignmentController.java](../../backend/src/main/java/org/cesystem/multirole/controller/JudgeAssignmentController.java)

### `GET /api/competitions/{competitionId}/assignments`

- Handler: `list` (บรรทัด 36)
- หน้าที่: คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล
- สิทธิ์: สมาชิก Admin เห็นทั้งโครงการ Judge เห็นเฉพาะของตน
- Request: path competitionId
- Response: AssignmentResponse[]
- ผู้เรียก: workspace.loadProject

### `POST /api/competitions/{competitionId}/assignments`

- Handler: `assign` (บรรทัด 49)
- หน้าที่: ตรวจสมาชิกที่มีหน้าที่กรรมการ ทีมในโครงการ และคู่กรรมการ-ทีมไม่ซ้ำก่อนสร้าง
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: {judgeId,teamId}
- Response: AssignmentResponse
- ผู้เรียก: JudgeTeamAssignmentStore.replaceJudgeTeamAssignments

### `DELETE /api/competitions/{competitionId}/assignments/{assignmentId}`

- Handler: `unassign` (บรรทัด 86)
- หน้าที่: ลบ mapping assignment ที่อยู่ในโครงการ; ไม่ได้ลบใบประเมินเดิมโดยตรง
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: path competitionId,assignmentId
- Response: body ว่าง
- ผู้เรียก: JudgeTeamAssignmentStore.replaceJudgeTeamAssignments

## NotificationController

[backend/src/main/java/org/cesystem/multirole/controller/NotificationController.java](../../backend/src/main/java/org/cesystem/multirole/controller/NotificationController.java)

### `POST /api/notifications`

- Handler: `remind` (บรรทัด 30)
- หน้าที่: เลือกโครงการ ACTIVE ที่ deadline อยู่ใน 24 ชั่วโมงเพื่อสร้าง automatic reminders
- สิทธิ์: Project Admin / System Admin + เงื่อนไข reminder/cooldown ผ่าน
- Request: {competitionId,email,title?,message?,type?}
- Response: NotificationResponse
- ผู้เรียก: NotificationStore.addNotification → EvaluationMonitoring.handleNotify

### `GET /api/notifications`

- Handler: `list` (บรรทัด 40)
- หน้าที่: คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล
- สิทธิ์: Login อ่านเฉพาะของตน
- Request: query unreadOnly ค่าเริ่ม false
- Response: NotificationResponse[]
- ผู้เรียก: workspace.refreshNotifications → Navbar polling

### `GET /api/notifications/unread-count`

- Handler: `unreadCount` (บรรทัด 51)
- หน้าที่: นับแจ้งเตือนที่ยังไม่อ่านของ principal
- สิทธิ์: Login อ่านเฉพาะของตน
- Request: ไม่มี body
- Response: {count:number}
- ผู้เรียก: ไม่พบ Frontend เรียก ปัจจุบันนับ unread จากรายการใน cache

### `PATCH /api/notifications/{notificationId}/read`

- Handler: `markRead` (บรรทัด 57)
- หน้าที่: เปลี่ยน isRead ของแจ้งเตือนที่เป็นของผู้ใช้เท่านั้น
- สิทธิ์: Login และเป็นเจ้าของแจ้งเตือน
- Request: path notificationId
- Response: NotificationResponse
- ผู้เรียก: NotificationStore.markAsRead → Navbar

### `PATCH /api/notifications/read-all`

- Handler: `markAllRead` (บรรทัด 68)
- หน้าที่: bulk update แจ้งเตือนของผู้ใช้และคืนจำนวนที่เปลี่ยน
- สิทธิ์: Login อ่านเฉพาะของตน
- Request: ไม่มี body
- Response: {updated:number}
- ผู้เรียก: NotificationStore.markAllAsRead → Navbar

## SystemMonitoringController

[backend/src/main/java/org/cesystem/multirole/controller/SystemMonitoringController.java](../../backend/src/main/java/org/cesystem/multirole/controller/SystemMonitoringController.java)

### `GET /api/admin/monitoring`

- Handler: `monitoring` (บรรทัด 32)
- หน้าที่: รวมจำนวนโครงการ quota/denied ต่อบัญชี รายการโครงการ และกิจกรรมล่าสุด 100 รายการ
- สิทธิ์: System Admin
- Request: ไม่มี body
- Response: Monitoring {totalProjects,users,projects,activities,burstLimit,dailyLimit,totalLimit}
- ผู้เรียก: UserManagement polling 30 วินาที

### `PATCH /api/admin/users/{id}/project-creation`

- Handler: `creationAccess` (บรรทัด 57)
- หน้าที่: ล็อกบัญชีเป้าหมาย เปลี่ยน projectCreationBlocked และเก็บกิจกรรม โดยห้ามใช้กับ System Admin
- สิทธิ์: System Admin + เป้าหมายไม่ใช่ System Admin
- Request: {blocked:boolean}
- Response: body ว่าง
- ผู้เรียก: UserManagement.changeCreationAccess

## TeamController

[backend/src/main/java/org/cesystem/multirole/controller/TeamController.java](../../backend/src/main/java/org/cesystem/multirole/controller/TeamController.java)

### `GET /api/competitions/{competitionId}/teams`

- Handler: `list` (บรรทัด 37)
- หน้าที่: คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล
- สิทธิ์: สมาชิกโครงการ / System Admin
- Request: path competitionId
- Response: TeamResponse[]
- ผู้เรียก: workspace.loadProject

### `POST /api/competitions/{competitionId}/teams`

- Handler: `create` (บรรทัด 47)
- หน้าที่: ตรวจข้อมูลและสิทธิ์ แล้วสร้าง Entity ตามประเภทของ Controller ใน transaction
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: TeamRequest {teamName,projectDescription,projectUrl}
- Response: TeamResponse
- ผู้เรียก: TeamStore.saveTeam → ProjectTeams รวม import Excel ทีละทีม

### `PUT /api/competitions/{competitionId}/teams/{teamId}`

- Handler: `update` (บรรทัด 65)
- หน้าที่: ตรวจสิทธิ์และข้อมูล แล้วแก้ Entity เป้าหมาย; Competition อนุญาตเฉพาะ deadline หลังล็อก
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: TeamRequest + path teamId
- Response: TeamResponse
- ผู้เรียก: TeamStore.saveTeam → ProjectTeams

### `PUT /api/competitions/{competitionId}/teams/order`

- Handler: `reorder` (บรรทัด 79)
- หน้าที่: รับ teamIds ที่ครบทุกทีมไม่ซ้ำ แล้วบันทึก displayOrder 1..N
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: {teamIds:UUID[] ครบทุกทีมไม่ซ้ำ}
- Response: TeamResponse[] ตามลำดับใหม่
- ผู้เรียก: TeamStore.reorderTeams ยังมี แต่ไม่พบหน้า UI เรียกปัจจุบัน

### `DELETE /api/competitions/{competitionId}/teams/{teamId}`

- Handler: `delete` (บรรทัด 98)
- หน้าที่: ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: path competitionId,teamId
- Response: body ว่าง
- ผู้เรียก: TeamStore.deleteTeam → ProjectTeams

## TeamGroupController

[backend/src/main/java/org/cesystem/multirole/controller/TeamGroupController.java](../../backend/src/main/java/org/cesystem/multirole/controller/TeamGroupController.java)

### `GET /api/competitions/{competitionId}/groups`

- Handler: `list` (บรรทัด 40)
- หน้าที่: คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล
- สิทธิ์: สมาชิกโครงการ / System Admin
- Request: path competitionId
- Response: GroupResponse[] {groupId,groupName,teamIds}
- ผู้เรียก: workspace.loadProject

### `POST /api/competitions/{competitionId}/groups`

- Handler: `create` (บรรทัด 60)
- หน้าที่: ตรวจข้อมูลและสิทธิ์ แล้วสร้าง Entity ตามประเภทของ Controller ใน transaction
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: {groupName}
- Response: GroupResponse
- ผู้เรียก: GroupStore.createGroup → TeamGroupManagement

### `PUT /api/competitions/{competitionId}/groups/{groupId}`

- Handler: `rename` (บรรทัด 80)
- หน้าที่: ตรวจชื่อกลุ่มซ้ำในโครงการแล้วบันทึกชื่อใหม่
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: {groupName} + path groupId
- Response: GroupResponse
- ผู้เรียก: GroupStore.renameGroup → TeamGroupManagement

### `DELETE /api/competitions/{competitionId}/groups/{groupId}`

- Handler: `delete` (บรรทัด 105)
- หน้าที่: ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: path competitionId,groupId
- Response: body ว่าง ทีมยังอยู่
- ผู้เรียก: GroupStore.deleteGroup → TeamGroupManagement

### `PUT /api/competitions/{competitionId}/teams/{teamId}/group`

- Handler: `moveTeam` (บรรทัด 120)
- หน้าที่: ตรวจทีม/กลุ่ม ลบ membership เดิมและ flush ก่อนใส่กลุ่มใหม่ หรือเอาออกเมื่อ groupId null
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้
- Request: {groupId:UUID/null} + path teamId
- Response: body ว่าง
- ผู้เรียก: GroupStore.moveTeamToGroup → TeamGroupManagement

### `PUT /api/competitions/{competitionId}/teams/group`

- Handler: `moveTeams` (บรรทัด 149)
- หน้าที่: ตรวจทั้งชุดก่อนแก้ ย้ายเฉพาะทีมที่เปลี่ยนจริงใน transaction เดียว คืน movedCount/unchangedCount/groups
- สิทธิ์: Project Admin / System Admin + โครงสร้างยังแก้ได้ ตรวจทั้งชุดก่อนเขียน
- Request: {teamIds:UUID[],groupId:UUID/null}
- Response: MoveTeamsResponse {movedCount,unchangedCount,groups}
- ผู้เรียก: GroupStore.moveTeamsToGroup → TeamGroupManagement

## UserController

[backend/src/main/java/org/cesystem/multirole/controller/UserController.java](../../backend/src/main/java/org/cesystem/multirole/controller/UserController.java)

### `GET /api/users`

- Handler: `directory` (บรรทัด 34)
- หน้าที่: คืนเฉพาะ id/name/email ของบัญชี ACTIVE ให้ผู้ Login แล้ว; ไม่คืน passwordHash
- สิทธิ์: Login
- Request: ไม่มี body
- Response: DirectoryUser[] {id,email,name} เฉพาะ ACTIVE
- ผู้เรียก: AuthContext.hydrate/refresh

### `GET /api/admin/users`

- Handler: `list` (บรรทัด 41)
- หน้าที่: คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล
- สิทธิ์: System Admin
- Request: ไม่มี body
- Response: UserSummary[] {id,email,name,role,status,createdAt}
- ผู้เรียก: UserManagement polling 30 วินาที

### `PATCH /api/admin/users/{id}/status`

- Handler: `status` (บรรทัด 47)
- หน้าที่: เปลี่ยน ACTIVE/SUSPENDED ของบัญชีหลังตรวจห้ามแก้ System Admin/บัญชีตน
- สิทธิ์: System Admin ห้ามเปลี่ยนบัญชีตน/System Admin อื่น
- Request: {status:ACTIVE/SUSPENDED} + path id
- Response: UserSummary
- ผู้เรียก: UserManagement.handleToggleStatus

### `DELETE /api/admin/users/{id}`

- Handler: `delete` (บรรทัด 61)
- หน้าที่: ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน
- สิทธิ์: System Admin ห้ามลบบัญชีตน/System Admin อื่น
- Request: path id
- Response: body ว่าง
- ผู้เรียก: UserManagement.confirmDelete

## ตัวอย่างรูปข้อมูลที่สำคัญ

### บันทึก draft / ส่งคะแนนทีมเดียว

```json
{
  "competitionId": "COMPETITION_UUID",
  "teamId": "TEAM_UUID",
  "status": "SUBMITTED",
  "comment": "ความคิดเห็นรวม",
  "scores": [
    {"criterionId": "CRITERION_UUID", "scoreValue": 8, "comment": "ความคิดเห็นรายเกณฑ์"}
  ]
}
```

เปลี่ยนเป็น DRAFT เมื่อต้องการบันทึกไม่ครบ แต่ใบที่เคย SUBMITTED แล้วจะยังคง SUBMITTED เมื่อแก้ไข ต้องส่งคะแนนครบทุกเกณฑ์ต่อไป

### Batch submit

```json
{
  "competitionId": "COMPETITION_UUID",
  "teams": [
    {"teamId": "TEAM_UUID", "comment": "", "scores": [
      {"criterionId": "CRITERION_UUID", "scoreValue": 8, "comment": ""}
    ]}
  ]
}
```

ผลลัพธ์แต่ละทีมมี outcome SUBMITTED / ALREADY_SUBMITTED / FAILED และ httpStatus ของทีมนั้น การได้ HTTP 200 ของ request หลักไม่ได้แปลว่าทุกทีมสำเร็จ

### รูป DTO กลาง

- CompetitionResponse: id, ชื่อ, รายละเอียด, category, status, ผู้สร้าง, วันสร้าง, deadline, closedAt, ownerEmail/ownerName, currentRole, criteriaLocked
- EvaluationResponse: evaluationId, competitionId, teamId, judgeId, totalScore, comment, status, updatedAt, submittedAt, scores[], judgeName, judgeEmail
- NotificationResponse: notificationId, competitionId, title, message, type, isRead, createdAt, emailStatus
- ชื่อ field จริงของ CompetitionResponse คือ `competitionId/title/description` ไม่ใช่ `id/name` ที่ UI ใช้หลัง normalize
- schema และชนิด field ทุก DTO ดู [Backend](BACKEND.md) ใน ApiDtos.java และ DTO แต่ละไฟล์

## API ภายนอก: Brevo

`POST https://api.brevo.com/v3/smtp/email` เรียกจาก **BrevoMailGateway.send ฝั่ง Backend เท่านั้น**

Headers: api-key (secret), accept: application/json, content-type: application/json

```json
{
  "sender": {"email": "VERIFIED_SENDER", "name": "MultiRole"},
  "to": [{"email": "RECIPIENT"}],
  "subject": "หัวข้อ",
  "htmlContent": "<html>...</html>"
}
```

รับ messageId เมื่อ provider ตอบ 2xx; connect timeout 5 วินาที request timeout 10 วินาที; retry กรณี 429/5xx/connection ตาม DeliveryException ไม่มี webhook delivered/bounce/open ในโค้ดปัจจุบัน

## จุดเรียก HTTP จริงใน Frontend

ตารางต่อไปนี้แสดง expression จาก source ไม่ใส่ token/รหัสจริง `path` บางรายการประกอบจาก projectPath หรือ template string ต้องอ่านคู่กับรายการ endpoint ด้านบน การโหลดโครงการหนึ่งครั้งเรียกหลาย API ไม่ใช่หนึ่ง request

| จุดเรียก | Expression ตาม source |
| --- | --- |
| [src/api/client.js](../../src/api/client.js) (บรรทัด 5) | ``axios.create({ baseURL: import.meta.env.VITE_API_URL \|\| '/api', timeout: 8000, headers: { 'Content-Type': 'application/json', }, })`` |
| [src/api/workspace.js](../../src/api/workspace.js) (บรรทัด 27) | ``api.get(projectPath(id))`` |
| [src/api/workspace.js](../../src/api/workspace.js) (บรรทัด 29) | ``api.get(`${projectPath(id)}/${path}`)`` |
| [src/api/workspace.js](../../src/api/workspace.js) (บรรทัด 31) | ``api.get(`${projectPath(id)}/members`)`` |
| [src/api/workspace.js](../../src/api/workspace.js) (บรรทัด 32) | ``api.get(`/evaluations/competition/${id}`)`` |
| [src/api/workspace.js](../../src/api/workspace.js) (บรรทัด 51) | ``api.get('/notifications')`` |
| [src/api/workspace.js](../../src/api/workspace.js) (บรรทัด 59) | ``api.get('/competitions')`` |
| [src/components/DeadlineHistory.jsx](../../src/components/DeadlineHistory.jsx) (บรรทัด 15) | ``api.get(`/competitions/${projectId}/deadline-history`)`` |
| [src/components/EvaluationHistory.jsx](../../src/components/EvaluationHistory.jsx) (บรรทัด 23) | ``api.get(`/evaluations/${evaluationId}/history`, { params: { page } })`` |
| [src/context/AuthContext.jsx](../../src/context/AuthContext.jsx) (บรรทัด 21) | ``apiClient.get('/auth/me')`` |
| [src/context/AuthContext.jsx](../../src/context/AuthContext.jsx) (บรรทัด 24) | ``apiClient.get('/users')`` |
| [src/context/AuthContext.jsx](../../src/context/AuthContext.jsx) (บรรทัด 51) | ``apiClient.post('/auth/login', credentials)`` |
| [src/context/AuthContext.jsx](../../src/context/AuthContext.jsx) (บรรทัด 57) | ``apiClient.post('/auth/register', { fullName: name, email: email.trim().toLowerCase(), password })`` |
| [src/context/AuthContext.jsx](../../src/context/AuthContext.jsx) (บรรทัด 61) | ``apiClient.get('/users')`` |
| [src/data/CriteriaStore.js](../../src/data/CriteriaStore.js) (บรรทัด 8) | ``api[criterion.id ? 'put' : 'post'](criterion.id ? path + '/' + criterion.id : path, { title: criterion.name, description: criterion.description \|\| '', scoringType: criterion.type, maxScore: criterion.maxScore, weightPercentage: criterion.weight })`` |
| [src/data/CriteriaStore.js](../../src/data/CriteriaStore.js) (บรรทัด 15) | ``api.delete(projectPath(id) + '/criteria/' + criterionId)`` |
| [src/data/EvaluationStore.js](../../src/data/EvaluationStore.js) (บรรทัด 6) | ``api.post('/evaluations/save', { competitionId: e.projectId, teamId: e.teamId, comment: e.comment \|\| '', status: e.status, scores: Object.entries(e.scores \|\| {}).filter(([, value]) => value !== null && value !== undefined) .map(([criterionId, scoreValue]) => ({ criterionId, scoreValue, comment: e.criteriaComments?.[criterionId] \|\| '' })) })`` |
| [src/data/EvaluationStore.js](../../src/data/EvaluationStore.js) (บรรทัด 10) | ``api.get('/evaluations/competition/' + e.projectId + '/team/' + e.teamId + '/mine')`` |
| [src/data/EvaluationStore.js](../../src/data/EvaluationStore.js) (บรรทัด 18) | ``api.post('/evaluations/submit-batch', { competitionId: projectId, teams: entries.map(entry => ({ teamId: entry.teamId, comment: entry.comment \|\| '', scores: Object.entries(entry.scores).filter(([, value]) => value !== null && value !== undefined) .map(([criterionId, scoreValue]) => ({ criterionId, scoreValue, comment: entry.criteriaComments?.[criterionId] \|\| '' })) })), }, { timeout: 60000 })`` |
| [src/data/GroupStore.js](../../src/data/GroupStore.js) (บรรทัด 7) | ``api.post(projectPath(id) + '/groups', { groupName: name.trim() })`` |
| [src/data/GroupStore.js](../../src/data/GroupStore.js) (บรรทัด 11) | ``api.put(projectPath(id) + '/groups/' + groupId, { groupName: name.trim() })`` |
| [src/data/GroupStore.js](../../src/data/GroupStore.js) (บรรทัด 15) | ``api.put(projectPath(id) + '/teams/' + teamId + '/group', { groupId: groupId \|\| null })`` |
| [src/data/GroupStore.js](../../src/data/GroupStore.js) (บรรทัด 21) | ``api.put(projectPath(id) + '/teams/group', { teamIds, groupId: groupId \|\| null }, { timeout: 30000 })`` |
| [src/data/GroupStore.js](../../src/data/GroupStore.js) (บรรทัด 28) | ``api.delete(projectPath(id) + '/groups/' + groupId)`` |
| [src/data/JudgeTeamAssignmentStore.js](../../src/data/JudgeTeamAssignmentStore.js) (บรรทัด 10) | ``api.delete(path + '/' + a.assignmentId)`` |
| [src/data/JudgeTeamAssignmentStore.js](../../src/data/JudgeTeamAssignmentStore.js) (บรรทัด 12) | ``api.post(path, { judgeId, teamId })`` |
| [src/data/NotificationStore.js](../../src/data/NotificationStore.js) (บรรทัด 5) | ``api.post('/notifications', { competitionId: n.projectId, email: n.userId, title: n.title, message: n.message, type: n.type })`` |
| [src/data/NotificationStore.js](../../src/data/NotificationStore.js) (บรรทัด 9) | ``api.patch('/notifications/' + id + '/read')`` |
| [src/data/NotificationStore.js](../../src/data/NotificationStore.js) (บรรทัด 13) | ``api.patch('/notifications/read-all')`` |
| [src/data/ProjectStore.js](../../src/data/ProjectStore.js) (บรรทัด 21) | ``api.post('/competitions', competitionRequest(p))`` |
| [src/data/ProjectStore.js](../../src/data/ProjectStore.js) (บรรทัด 25) | ``api.delete(projectPath(id))`` |
| [src/data/ProjectStore.js](../../src/data/ProjectStore.js) (บรรทัด 31) | ``api.post(projectPath(id) + '/members', { email, role: 'JUDGE' })`` |
| [src/data/ProjectStore.js](../../src/data/ProjectStore.js) (บรรทัด 35) | ``api.delete(projectPath(id) + '/members/' + judgeId)`` |
| [src/data/ProjectStore.js](../../src/data/ProjectStore.js) (บรรทัด 39) | ``api.patch(projectPath(id) + '/status', { status: status.toUpperCase() })`` |
| [src/data/ProjectStore.js](../../src/data/ProjectStore.js) (บรรทัด 44) | ``api.put(projectPath(id), competitionRequest({ ...getProjectById(id), ...details }))`` |
| [src/data/TeamStore.js](../../src/data/TeamStore.js) (บรรทัด 6) | ``api[team.id ? 'put' : 'post'](team.id ? path + '/' + team.id : path, { teamName: team.name, projectDescription: team.description \|\| '', projectUrl: team.link \|\| '' })`` |
| [src/data/TeamStore.js](../../src/data/TeamStore.js) (บรรทัด 12) | ``api.delete(projectPath(id) + '/teams/' + teamId)`` |
| [src/data/TeamStore.js](../../src/data/TeamStore.js) (บรรทัด 16) | ``api.put(`${projectPath(id)}/teams/order`, { teamIds })`` |
| [src/pages/CreateProject.jsx](../../src/pages/CreateProject.jsx) (บรรทัด 28) | ``api.get('/competitions/creation-quota')`` |
| [src/pages/JudgeScoreMonitoring.jsx](../../src/pages/JudgeScoreMonitoring.jsx) (บรรทัด 29) | ``api.get(`/evaluations/competition/${projectId}/mine`)`` |
| [src/pages/Login.jsx](../../src/pages/Login.jsx) (บรรทัด 54) | ``apiClient.post('/auth/forgot-password', { email: email.trim().toLowerCase() })`` |
| [src/pages/ResetPassword.jsx](../../src/pages/ResetPassword.jsx) (บรรทัด 27) | ``apiClient.get('/auth/verify-reset-token', { params: { token } })`` |
| [src/pages/ResetPassword.jsx](../../src/pages/ResetPassword.jsx) (บรรทัด 47) | ``apiClient.post('/auth/reset-password', { token, newPassword })`` |
| [src/pages/UserManagement.jsx](../../src/pages/UserManagement.jsx) (บรรทัด 47) | ``apiClient.get('/admin/users')`` |
| [src/pages/UserManagement.jsx](../../src/pages/UserManagement.jsx) (บรรทัด 47) | ``apiClient.get('/admin/monitoring')`` |
| [src/pages/UserManagement.jsx](../../src/pages/UserManagement.jsx) (บรรทัด 93) | ``apiClient.patch(`/admin/users/${targetUser.id}/status`, { status: nextStatus, })`` |
| [src/pages/UserManagement.jsx](../../src/pages/UserManagement.jsx) (บรรทัด 120) | ``apiClient.patch(`/admin/users/${creationTarget.id}/project-creation`, { blocked: !creationTarget.blocked })`` |
| [src/pages/UserManagement.jsx](../../src/pages/UserManagement.jsx) (บรรทัด 139) | ``apiClient.delete(`/admin/users/${userToDelete.id}`)`` |
| [src/pages/VerifyEmail.jsx](../../src/pages/VerifyEmail.jsx) (บรรทัด 31) | ``apiClient.post('/auth/verify-email', { token })`` |
| [src/pages/VerifyEmail.jsx](../../src/pages/VerifyEmail.jsx) (บรรทัด 44) | ``apiClient.post('/auth/resend-verification', { email: email.trim().toLowerCase() })`` |

## Backend endpoints ที่ไม่ได้เป็นฟีเจอร์หน้าเว็บใหม่

`GET /notifications/unread-count` มีใน Backend แต่ Navbar นับจาก cache; `PUT /competitions/{competitionId}/teams/order` มี store/helper แต่ปุ่มเรียงในหน้าจัดกลุ่มถูกนำออก; ไม่พบ API upload Excel, /leaderboard, WebSocket/SSE, OAuth Google/GitHub หรือ public API สร้าง System Admin ใน source นี้
