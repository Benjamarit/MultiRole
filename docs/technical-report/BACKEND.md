# รายละเอียด Backend

[กลับสารบัญ](README.md)

โครงหลัก: Controller รับ JSON/Principal → Access/Policy ตรวจสิทธิ์ → Service ทำธุรกิจและ transaction → Repository อ่าน/เขียน Entity → DTO เลือก field สำหรับตอบ API การใช้ `@Transactional` อยู่ทั้ง Controller และ Service จึงไม่ใช่ทุก endpoint ที่ต้องผ่าน Service แยกชั้น

ทุก Repository สืบทอด JpaRepository จึงมี findById/findAll/save/saveAll/delete/flush และ pagination ที่ framework สร้างให้ ส่วนด้านล่างระบุ method ที่เขียนเพิ่มจริง

## `backend/src/main/java/org/cesystem/multirole/config/ApplicationTimeZone.java`

[backend/src/main/java/org/cesystem/multirole/config/ApplicationTimeZone.java](../../backend/src/main/java/org/cesystem/multirole/config/ApplicationTimeZone.java)

ตั้ง TimeZone ของ JVM เป็น Asia/Bangkok ตาม app.time-zone และเปิด scheduling

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `ApplicationTimeZone` | 9 | constructor: ตั้ง TimeZone ของ JVM เป็น Asia/Bangkok ตาม app.time-zone และเปิด scheduling |

## `backend/src/main/java/org/cesystem/multirole/config/CriteriaLockMigration.java`

[backend/src/main/java/org/cesystem/multirole/config/CriteriaLockMigration.java](../../backend/src/main/java/org/cesystem/multirole/config/CriteriaLockMigration.java)

ApplicationRunner ล็อกเกณฑ์โครงการเดิมที่เคยเปิดรับคะแนน/มีผลประเมินเมื่อเริ่มระบบ

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `run` | 18 | อัปเดต flag lock ของโครงการ legacy ตามเงื่อนไขก่อนเปิดให้ใช้งาน |

## `backend/src/main/java/org/cesystem/multirole/controller/AuthController.java`

[backend/src/main/java/org/cesystem/multirole/controller/AuthController.java](../../backend/src/main/java/org/cesystem/multirole/controller/AuthController.java)

REST สำหรับสมัคร Login โปรไฟล์ ขอรีเซ็ต ตั้งรหัส ยืนยันอีเมลและตรวจ reset token

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `register` | 32 | ส่งข้อมูลสมัครให้ AuthService และแปลง validation error เป็น 400 |
| `login` | 43 | ตรวจ credentials คืน token หรือ 403 EMAIL_NOT_VERIFIED/401 ตามผลตรวจ |
| `getCurrentUser` | 56 | อ่านผู้ใช้ตาม principal แล้วคืนโปรไฟล์ที่ไม่รวมความลับ |
| `forgotPassword` | 78 | รับอีเมล ส่งคำขอ reset และตอบข้อความทั่วไปไม่ระบุว่าบัญชีมีจริงหรือไม่ |
| `resetPassword` | 85 | ตรวจ token และบันทึกรหัสผ่านใหม่ผ่าน PasswordResetService |
| `resendVerification` | 92 | ขอสร้างลิงก์ยืนยันอีเมลใหม่โดยไม่เปิดเผยสถานะบัญชีแก่ผู้ขอ |
| `verifyEmail` | 97 | ส่ง token ให้ service เปิดใช้งานการยืนยันอีเมล |
| `verifyResetToken` | 102 | ตรวจ token และคืน {valid:boolean} สำหรับหน้าตั้งรหัสใหม่ |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `VerifyEmailRequest` | String token |

## `backend/src/main/java/org/cesystem/multirole/controller/CompetitionController.java`

[backend/src/main/java/org/cesystem/multirole/controller/CompetitionController.java](../../backend/src/main/java/org/cesystem/multirole/controller/CompetitionController.java)

CRUD โครงการ ตรวจ quota เปลี่ยนสถานะและเก็บประวัติ deadline

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `list` | 45 | คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล |
| `get` | 58 | คืนรายละเอียดโครงการหลังตรวจสมาชิก |
| `quota` | 67 | คำนวณจำนวนโครงการ ช่วงเวลาและเหตุผลว่าผู้ใช้ยังสร้างได้หรือไม่ |
| `create` | 73 | ตรวจข้อมูลและสิทธิ์ แล้วสร้าง Entity ตามประเภทของ Controller ใน transaction |
| `update` | 102 | ตรวจสิทธิ์และข้อมูล แล้วแก้ Entity เป้าหมาย; Competition อนุญาตเฉพาะ deadline หลังล็อก |
| `deadlineChanges` | 144 | คืนประวัติ deadline ล่าสุดสูงสุด 20 รายการให้ผู้ดูแลโครงการ |
| `updateStatus` | 154 | ตรวจ DRAFT/ACTIVE/CLOSED เรียก readiness ก่อน ACTIVE และตั้ง criteriaLocked ถาวรหลังเริ่ม |
| `delete` | 181 | ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `DeadlineChange` | UUID id, String actorName, String actorEmail, LocalDateTime previousDeadline, LocalDateTime newDeadline, LocalDateTime changedAt |

## `backend/src/main/java/org/cesystem/multirole/controller/CompetitionUserController.java`

[backend/src/main/java/org/cesystem/multirole/controller/CompetitionUserController.java](../../backend/src/main/java/org/cesystem/multirole/controller/CompetitionUserController.java)

จัดการสมาชิกโครงการและบทบาทกรรมการ/ผู้ดูแล พร้อมแจ้งคำเชิญในเว็บ

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `list` | 40 | คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล |
| `add` | 51 | เพิ่มสมาชิกหรือเกณฑ์ตาม Controller โดยตรวจข้อมูลซ้ำ สิทธิ์และการล็อก |
| `notifyInvitation` | 89 | สร้าง PROJECT_INVITATION ในเว็บพร้อมผู้เชิญและบทบาท ไม่สร้าง email outbox และไม่เตือนเมื่อเชิญตนเอง |
| `remove` | 104 | ถอดสมาชิก/assignment; ADMIN_JUDGE ถอยเป็น ADMIN และห้ามถอดผู้ดูแลคนสุดท้าย |

## `backend/src/main/java/org/cesystem/multirole/controller/CriteriaController.java`

[backend/src/main/java/org/cesystem/multirole/controller/CriteriaController.java](../../backend/src/main/java/org/cesystem/multirole/controller/CriteriaController.java)

CRUD เกณฑ์ ตรวจน้ำหนักรวม ประเภทคะแนน และล็อกการเปลี่ยนแปลงหลังเปิดรับ

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `list` | 39 | คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล |
| `add` | 49 | เพิ่มสมาชิกหรือเกณฑ์ตาม Controller โดยตรวจข้อมูลซ้ำ สิทธิ์และการล็อก |
| `update` | 64 | ตรวจสิทธิ์และข้อมูล แล้วแก้ Entity เป้าหมาย; Competition อนุญาตเฉพาะ deadline หลังล็อก |
| `delete` | 79 | ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน |
| `find` | 94 | ค้น Entity ตาม ID และตรวจขอบเขตโครงการเมื่อเกี่ยวข้อง ไม่พบตอบ 404 |
| `apply` | 101 | ตรวจและคัดลอก field จาก request ลง Team หรือ Criteria; Criteria ตรวจประเภท/น้ำหนักรวม |

## `backend/src/main/java/org/cesystem/multirole/controller/EvaluationController.java`

[backend/src/main/java/org/cesystem/multirole/controller/EvaluationController.java](../../backend/src/main/java/org/cesystem/multirole/controller/EvaluationController.java)

บันทึก/ส่งคะแนน อ่านผลตามสิทธิ์ ดูใบของตนและประวัติ รวม batch endpoint

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `history` | 37 | คืนประวัติใบประเมินหน้า 20 รายการ ตรวจเจ้าของหรือ admin ที่ดูผล SUBMITTED และซ่อน draft ผู้อื่น |
| `listMine` | 58 | คืนใบประเมินของกรรมการปัจจุบันในโครงการ |
| `submitBatch` | 66 | ส่ง request ไป BatchEvaluationService ให้ตรวจและประมวลผลรายทีม |
| `saveEvaluation` | 72 | เรียก upsertEvaluation ด้วย principal และรักษา HTTP status ของ business exception |
| `listByCompetition` | 94 | admin เห็น SUBMITTED และใบของตน; judge เห็นเฉพาะใบตนเอง |
| `getMine` | 110 | ค้นใบของกรรมการปัจจุบันสำหรับทีม คืน 200 หรือ 204 เมื่อยังไม่มี |

## `backend/src/main/java/org/cesystem/multirole/controller/JudgeAssignmentController.java`

[backend/src/main/java/org/cesystem/multirole/controller/JudgeAssignmentController.java](../../backend/src/main/java/org/cesystem/multirole/controller/JudgeAssignmentController.java)

อ่าน เพิ่มและยกเลิก mapping กรรมการ-ทีม โดยตรวจว่าอยู่โครงการเดียวกัน

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `list` | 38 | คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล |
| `assign` | 51 | ตรวจสมาชิกที่มีหน้าที่กรรมการ ทีมในโครงการ และคู่กรรมการ-ทีมไม่ซ้ำก่อนสร้าง |
| `unassign` | 88 | ลบ mapping assignment ที่อยู่ในโครงการ; ไม่ได้ลบใบประเมินเดิมโดยตรง |

## `backend/src/main/java/org/cesystem/multirole/controller/NotificationController.java`

[backend/src/main/java/org/cesystem/multirole/controller/NotificationController.java](../../backend/src/main/java/org/cesystem/multirole/controller/NotificationController.java)

อ่านแจ้งเตือนของตน ส่ง manual reminder และทำเครื่องหมายอ่าน

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `remind` | 31 | เลือกโครงการ ACTIVE ที่ deadline อยู่ใน 24 ชั่วโมงเพื่อสร้าง automatic reminders |
| `list` | 42 | คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล |
| `unreadCount` | 52 | นับแจ้งเตือนที่ยังไม่อ่านของ principal |
| `markRead` | 59 | เปลี่ยน isRead ของแจ้งเตือนที่เป็นของผู้ใช้เท่านั้น |
| `markAllRead` | 69 | bulk update แจ้งเตือนของผู้ใช้และคืนจำนวนที่เปลี่ยน |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `ReminderRequest` | UUID competitionId, String email, String title, String message, String type |

## `backend/src/main/java/org/cesystem/multirole/controller/SystemMonitoringController.java`

[backend/src/main/java/org/cesystem/multirole/controller/SystemMonitoringController.java](../../backend/src/main/java/org/cesystem/multirole/controller/SystemMonitoringController.java)

สรุปทั้งระบบและสัญญาณ quota พร้อมเปลี่ยนสิทธิ์สร้างโครงการของบัญชี

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `requireAdmin` | 29 | ตรวจว่าบัญชีปัจจุบันเป็น System Admin ไม่ใช่เพียง Project Admin |
| `monitoring` | 33 | รวมจำนวนโครงการ quota/denied ต่อบัญชี รายการโครงการ และกิจกรรมล่าสุด 100 รายการ |
| `creationAccess` | 58 | ล็อกบัญชีเป้าหมาย เปลี่ยน projectCreationBlocked และเก็บกิจกรรม โดยห้ามใช้กับ System Admin |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `MonitoredUser` | UUID id, long projectCount, long createdLast10Minutes, long createdLast24Hours, long deniedLast24Hours, boolean projectCreationBlocked, List<String> signals |
| `ProjectSummary` | UUID id, String title, String status, UUID ownerId, String ownerName, String ownerEmail, LocalDateTime createdAt |
| `ActivitySummary` | UUID id, UUID userId, String name, String email, String action, String detail, LocalDateTime occurredAt |
| `Monitoring` | long totalProjects, List<MonitoredUser> users, List<ProjectSummary> projects, List<ActivitySummary> activities, int burstLimit, int dailyLimit, int totalLimit |
| `CreationAccessRequest` | boolean blocked |

## `backend/src/main/java/org/cesystem/multirole/controller/TeamController.java`

[backend/src/main/java/org/cesystem/multirole/controller/TeamController.java](../../backend/src/main/java/org/cesystem/multirole/controller/TeamController.java)

CRUD ทีมและบันทึกลำดับ พร้อมตรวจสิทธิ์/ล็อกโครงสร้าง

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `list` | 39 | คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล |
| `create` | 49 | ตรวจข้อมูลและสิทธิ์ แล้วสร้าง Entity ตามประเภทของ Controller ใน transaction |
| `update` | 67 | ตรวจสิทธิ์และข้อมูล แล้วแก้ Entity เป้าหมาย; Competition อนุญาตเฉพาะ deadline หลังล็อก |
| `reorder` | 81 | รับ teamIds ที่ครบทุกทีมไม่ซ้ำ แล้วบันทึก displayOrder 1..N |
| `delete` | 100 | ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน |
| `find` | 114 | ค้น Entity ตาม ID และตรวจขอบเขตโครงการเมื่อเกี่ยวข้อง ไม่พบตอบ 404 |
| `apply` | 120 | ตรวจและคัดลอก field จาก request ลง Team หรือ Criteria; Criteria ตรวจประเภท/น้ำหนักรวม |

## `backend/src/main/java/org/cesystem/multirole/controller/TeamGroupController.java`

[backend/src/main/java/org/cesystem/multirole/controller/TeamGroupController.java](../../backend/src/main/java/org/cesystem/multirole/controller/TeamGroupController.java)

จัดการกลุ่มและย้ายทีมเดี่ยว/หลายทีมแบบ transaction

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `list` | 42 | คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล |
| `groupResponses` | 49 | รวมกลุ่มกับรายการ teamIds จาก membership ของโครงการ |
| `create` | 62 | ตรวจข้อมูลและสิทธิ์ แล้วสร้าง Entity ตามประเภทของ Controller ใน transaction |
| `rename` | 82 | ตรวจชื่อกลุ่มซ้ำในโครงการแล้วบันทึกชื่อใหม่ |
| `delete` | 107 | ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน |
| `moveTeam` | 122 | ตรวจทีม/กลุ่ม ลบ membership เดิมและ flush ก่อนใส่กลุ่มใหม่ หรือเอาออกเมื่อ groupId null |
| `moveTeams` | 151 | ตรวจทั้งชุดก่อนแก้ ย้ายเฉพาะทีมที่เปลี่ยนจริงใน transaction เดียว คืน movedCount/unchangedCount/groups |
| `findGroup` | 190 | ค้นกลุ่มและยืนยันว่าอยู่ในโครงการที่ระบุ |

## `backend/src/main/java/org/cesystem/multirole/controller/UserController.java`

[backend/src/main/java/org/cesystem/multirole/controller/UserController.java](../../backend/src/main/java/org/cesystem/multirole/controller/UserController.java)

directory ผู้ใช้ที่ใช้งานได้ และ API System Admin สำหรับรายชื่อ เปลี่ยนสถานะและลบ

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `from` | 25 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `directory` | 35 | คืนเฉพาะ id/name/email ของบัญชี ACTIVE ให้ผู้ Login แล้ว; ไม่คืน passwordHash |
| `list` | 42 | คืนรายการตามขอบเขตโครงการ/ผู้ใช้และสิทธิ์ที่ Controller นี้ดูแล |
| `status` | 49 | เปลี่ยน ACTIVE/SUSPENDED ของบัญชีหลังตรวจห้ามแก้ System Admin/บัญชีตน |
| `delete` | 63 | ตรวจสิทธิ์/ข้อจำกัดของ Entity นั้นก่อนลบ; ผล cascade/restrict ขึ้นกับ model และฐาน |
| `requireAdmin` | 71 | ตรวจว่าบัญชีปัจจุบันเป็น System Admin ไม่ใช่เพียง Project Admin |
| `find` | 76 | ค้น Entity ตาม ID และตรวจขอบเขตโครงการเมื่อเกี่ยวข้อง ไม่พบตอบ 404 |
| `protectAdmin` | 79 | ปฏิเสธการระงับหรือลบ System Admin และบัญชีผู้ดูแลปัจจุบัน |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `UserSummary` | UUID id, String email, String name, String role, String status, LocalDateTime createdAt |
| `DirectoryUser` | UUID id, String email, String name |
| `StatusRequest` | String status |

## `backend/src/main/java/org/cesystem/multirole/dto/ApiDtos.java`

[backend/src/main/java/org/cesystem/multirole/dto/ApiDtos.java](../../backend/src/main/java/org/cesystem/multirole/dto/ApiDtos.java)

record request/response ของ API หลักและ mapper จาก Entity โดยไม่ส่ง passwordHash ออก

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `from` | 29 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `from` | 32 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `from` | 46 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `from` | 59 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `from` | 69 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `from` | 90 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `from` | 98 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `from` | 107 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |
| `from` | 120 | แปลง Entity เป็น response record ของชนิดนั้นโดยเลือกเฉพาะ field ที่ API เปิดเผย |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `CompetitionRequest` | String title, String description, String category, LocalDateTime evaluationDeadline |
| `StatusRequest` | String status |
| `CompetitionResponse` | UUID competitionId, String title, String description, String category, String status, UUID createdBy, LocalDateTime createdAt, LocalDateTime evaluationDeadline, LocalDateTime closedAt, String ownerEmail, String ownerName, String currentRole, boolean criteriaLocked |
| `CriteriaRequest` | String title, String description, String scoringType, BigDecimal maxScore, BigDecimal weightPercentage |
| `CriteriaResponse` | UUID criterionId, UUID competitionId, String title, String description, String scoringType, BigDecimal maxScore, BigDecimal weightPercentage |
| `TeamRequest` | String teamName, String projectDescription, String projectUrl |
| `TeamOrderRequest` | List<UUID> teamIds |
| `TeamResponse` | UUID teamId, UUID competitionId, String teamName, String projectDescription, String projectUrl, Integer displayOrder |
| `MemberRequest` | String email, String role |
| `MemberResponse` | UUID userId, String email, String fullName, String role |
| `GroupRequest` | String groupName |
| `MoveTeamRequest` | UUID groupId |
| `MoveTeamsRequest` | List<UUID> teamIds, UUID groupId |
| `MoveTeamsResponse` | int movedCount, int unchangedCount, List<GroupResponse> groups |
| `GroupResponse` | UUID groupId, String groupName, List<UUID> teamIds |
| `AssignmentRequest` | UUID judgeId, UUID teamId |
| `AssignmentResponse` | UUID assignmentId, UUID judgeId, UUID teamId |
| `ScoreResponse` | UUID criterionId, BigDecimal scoreValue, String comment |
| `EvaluationResponse` | UUID evaluationId, UUID competitionId, UUID teamId, UUID judgeId, BigDecimal totalScore, String comment, String status, LocalDateTime updatedAt, LocalDateTime submittedAt, List<ScoreResponse> scores, String judgeName, String judgeEmail |
| `NotificationResponse` | UUID notificationId, UUID competitionId, String title, String message, String type, boolean isRead, LocalDateTime createdAt, String emailStatus |
| `ForgotPasswordRequest` | String email |
| `ResetPasswordRequest` | String token, String newPassword |

## `backend/src/main/java/org/cesystem/multirole/dto/AuthResponse.java`

[backend/src/main/java/org/cesystem/multirole/dto/AuthResponse.java](../../backend/src/main/java/org/cesystem/multirole/dto/AuthResponse.java)

DTO ตอบ Login ได้แก่ token, fullName และ role

| Field | Java type |
| --- | --- |
| token | String |
| fullName | String |
| role | String |

Lombok สร้าง accessor/constructor ตาม annotation ของแต่ละ class; ไม่มี business logic ภายใน DTO

## `backend/src/main/java/org/cesystem/multirole/dto/BatchEvaluationDtos.java`

[backend/src/main/java/org/cesystem/multirole/dto/BatchEvaluationDtos.java](../../backend/src/main/java/org/cesystem/multirole/dto/BatchEvaluationDtos.java)

record Request, TeamEntry, Result, Response สำหรับ batch แบบรายทีม

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `Request` | UUID competitionId, List<TeamEntry> teams |
| `TeamEntry` | UUID teamId, String comment, List<EvaluationRequest.ScoreRequest> scores |
| `Result` | UUID teamId, String outcome, int httpStatus, String message, EvaluationResponse evaluation |
| `Response` | List<Result> results |

## `backend/src/main/java/org/cesystem/multirole/dto/EvaluationRequest.java`

[backend/src/main/java/org/cesystem/multirole/dto/EvaluationRequest.java](../../backend/src/main/java/org/cesystem/multirole/dto/EvaluationRequest.java)

DTO รับ competitionId, teamId, status, comment และ ScoreRequest รายเกณฑ์

| Field | Java type |
| --- | --- |
| competitionId | UUID |
| teamId | UUID |
| comment | String |
| status | String |
| criterionId | UUID |
| scoreValue | BigDecimal |
| comment | String |

Lombok สร้าง accessor/constructor ตาม annotation ของแต่ละ class; ไม่มี business logic ภายใน DTO

## `backend/src/main/java/org/cesystem/multirole/dto/LoginRequest.java`

[backend/src/main/java/org/cesystem/multirole/dto/LoginRequest.java](../../backend/src/main/java/org/cesystem/multirole/dto/LoginRequest.java)

DTO รับ email และ password สำหรับ Login

| Field | Java type |
| --- | --- |
| email | String |
| password | String |

Lombok สร้าง accessor/constructor ตาม annotation ของแต่ละ class; ไม่มี business logic ภายใน DTO

## `backend/src/main/java/org/cesystem/multirole/dto/RegisterRequest.java`

[backend/src/main/java/org/cesystem/multirole/dto/RegisterRequest.java](../../backend/src/main/java/org/cesystem/multirole/dto/RegisterRequest.java)

DTO รับ email, password และ fullName สำหรับสมัคร ไม่มี field ให้เลือก System Admin

| Field | Java type |
| --- | --- |
| email | String |
| password | String |
| fullName | String |

Lombok สร้าง accessor/constructor ตาม annotation ของแต่ละ class; ไม่มี business logic ภายใน DTO

## `backend/src/main/java/org/cesystem/multirole/dto/UserProfileDto.java`

[backend/src/main/java/org/cesystem/multirole/dto/UserProfileDto.java](../../backend/src/main/java/org/cesystem/multirole/dto/UserProfileDto.java)

DTO โปรไฟล์ userId, email, fullName และ role

| Field | Java type |
| --- | --- |
| userId | UUID |
| email | String |
| fullName | String |
| role | String |

Lombok สร้าง accessor/constructor ตาม annotation ของแต่ละ class; ไม่มี business logic ภายใน DTO

## `backend/src/main/java/org/cesystem/multirole/exception/GlobalExceptionHandler.java`

[backend/src/main/java/org/cesystem/multirole/exception/GlobalExceptionHandler.java](../../backend/src/main/java/org/cesystem/multirole/exception/GlobalExceptionHandler.java)

แปลงข้อผิดพลาดที่ Controller ไม่จัดการให้เป็น HTTP status/message ที่เหมาะสม

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `handleStatus` | 20 | แปลง ResponseStatusException เป็น status และข้อความธุรกิจ |
| `handleUnreadable` | 27 | แปลง request body/ข้อมูลชนิดผิดที่อ่านไม่ได้เป็นคำตอบ 400 |
| `handleIntegrity` | 33 | แปลงข้อผิดพลาด unique/FK เป็นคำตอบ conflict โดยไม่เปิดรายละเอียด SQL ภายใน |
| `text` | 37 | เลือก reason ของข้อผิดพลาดหรือข้อความ fallback |

## `backend/src/main/java/org/cesystem/multirole/MultiRoleApplication.java`

[backend/src/main/java/org/cesystem/multirole/MultiRoleApplication.java](../../backend/src/main/java/org/cesystem/multirole/MultiRoleApplication.java)

จุดเริ่ม Spring Boot และ component scan ของ package org.cesystem.multirole

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `main` | 9 | เริ่ม SpringApplication ของระบบ |

## `backend/src/main/java/org/cesystem/multirole/repository/CompetitionRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/CompetitionRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/CompetitionRepository.java)

JPA Repository สำหรับ `Competition`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByStatusAndEvaluationDeadlineBetween` | 8 | ค้นโครงการตามสถานะและช่วง deadline สำหรับงานเตือนอัตโนมัติ |
| `lockLegacyCriteria` | 11 | bulk update ล็อกเกณฑ์ของโครงการเก่าที่เปิดแล้วหรือมีผลประเมิน |
| `countByCreatedBy_UserId` | 12 | นับโครงการที่บัญชีเป็นผู้สร้างและยังคงอยู่ |
| `countByCreatedBy_UserIdAndCreatedAtAfter` | 13 | นับโครงการที่บัญชีสร้างหลังเวลาที่ระบุเพื่อเทียบ quota |
| `findByCreatedBy_UserId` | 14 | อ่านโครงการที่สร้างโดยบัญชีเป้าหมาย |
| `existsByTitleIgnoreCase` | 15 | ตรวจชื่อโครงการซ้ำโดยไม่สนตัวพิมพ์ |
| `existsByTitleIgnoreCaseAndCompetitionIdNot` | 16 | ตรวจชื่อซ้ำยกเว้นโครงการที่กำลังแก้ |

## `backend/src/main/java/org/cesystem/multirole/repository/CompetitionUserRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/CompetitionUserRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/CompetitionUserRepository.java)

JPA Repository สำหรับ `CompetitionUser`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByCompetition_CompetitionId` | 13 | อ่านรายการของ Entity นี้ที่อยู่ในการแข่งขันเป้าหมาย |
| `findByUser_UserId` | 15 | อ่านรายการที่ผูกกับผู้ใช้เป้าหมาย |
| `findByCompetition_CompetitionIdAndUser_UserId` | 17 | อ่านสมาชิกโครงการของบัญชีหนึ่ง |
| `countByCompetition_CompetitionIdAndRole` | 19 | นับสมาชิกตามบทบาทเดียวในโครงการ |
| `countByCompetition_CompetitionIdAndRoleIn` | 20 | นับสมาชิกในหลายบทบาท เช่นผู้ดูแลรวม ADMIN_JUDGE |

## `backend/src/main/java/org/cesystem/multirole/repository/CriteriaRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/CriteriaRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/CriteriaRepository.java)

JPA Repository สำหรับ `Criteria`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByCompetition_CompetitionId` | 10 | อ่านรายการของ Entity นี้ที่อยู่ในการแข่งขันเป้าหมาย |

## `backend/src/main/java/org/cesystem/multirole/repository/DeadlineHistoryRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/DeadlineHistoryRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/DeadlineHistoryRepository.java)

JPA Repository สำหรับ `DeadlineHistory`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findTop20ByCompetition_CompetitionIdOrderByChangedAtDescIdDesc` | 9 | อ่านประวัติ deadline ล่าสุด 20 รายการ เรียงเวลา/ID ย้อนหลัง |

## `backend/src/main/java/org/cesystem/multirole/repository/EmailOutboxRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/EmailOutboxRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/EmailOutboxRepository.java)

JPA Repository สำหรับ `EmailOutbox`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findTop20ByStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc` | 7 | หยิบอีเมลที่ถึงเวลาส่งไม่เกิน 20 รายการตามสถานะ เรียงเก่าก่อน |
| `findByUserIdOrderByCreatedAtDesc` | 8 | อ่าน outbox ของบัญชีเรียงล่าสุด |
| `countByStatus` | 9 | นับ outbox ตามสถานะ |

## `backend/src/main/java/org/cesystem/multirole/repository/EmailVerificationTokenRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/EmailVerificationTokenRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/EmailVerificationTokenRepository.java)

JPA Repository สำหรับ `EmailVerificationToken`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByTokenHash` | 6 | ค้น token ด้วย hash แทน raw token |
| `findFirstByUser_UserIdOrderByCreatedAtDesc` | 7 | อ่าน token ล่าสุดของบัญชีเพื่อคุม cooldown |
| `findByUser_UserIdAndUsedAtIsNull` | 8 | อ่าน token ที่ยังไม่ถูกใช้/ยกเลิกของบัญชี |

## `backend/src/main/java/org/cesystem/multirole/repository/EvaluationHistoryRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/EvaluationHistoryRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/EvaluationHistoryRepository.java)

JPA Repository สำหรับ `EvaluationHistory`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByEvaluationId` | 10 | อ่านประวัติของใบประเมินแบบ Page |
| `findByEvaluationIdAndEventTypeNot` | 11 | อ่านประวัติใบประเมินโดยตัด DRAFT_SAVED เมื่อผู้ดูไม่ใช่เจ้าของ |

## `backend/src/main/java/org/cesystem/multirole/repository/EvaluationReminderRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/EvaluationReminderRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/EvaluationReminderRepository.java)

JPA Repository สำหรับ `EvaluationReminder`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `existsByDedupeKey` | 7 | ตรวจว่าได้สร้าง automatic reminder key นี้ไปแล้วหรือยัง |
| `existsByCompetitionIdAndUserIdAndCreatedAtAfter` | 8 | ตรวจช่วงเวลาเตือนล่าสุดของผู้ใช้ในโครงการ |

## `backend/src/main/java/org/cesystem/multirole/repository/EvaluationRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/EvaluationRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/EvaluationRepository.java)

JPA Repository สำหรับ `Evaluation`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByCompetition_CompetitionId` | 14 | อ่านรายการของ Entity นี้ที่อยู่ในการแข่งขันเป้าหมาย |
| `existsByCompetition_CompetitionId` | 15 | ตรวจว่ามีใบประเมินใด ๆ ในโครงการแล้วหรือไม่เพื่อบังคับ lock |
| `findByCompetitionAndTeamAndJudge` | 16 | ค้นใบประเมินคู่โครงการ/ทีม/กรรมการเพื่อ upsert ใบเดิม |
| `findByCompetition_CompetitionIdAndStatus` | 17 | อ่านใบประเมินในโครงการเฉพาะสถานะ |
| `findByCompetition_CompetitionIdAndJudge_UserId` | 18 | อ่านใบประเมินหรือ assignment ของกรรมการในโครงการ |
| `findByJudge_UserIdAndTeam_TeamId` | 19 | ค้นใบประเมินของกรรมการต่อทีม |

## `backend/src/main/java/org/cesystem/multirole/repository/JudgeAssignmentRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/JudgeAssignmentRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/JudgeAssignmentRepository.java)

JPA Repository สำหรับ `JudgeAssignment`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByCompetition_CompetitionId` | 11 | อ่านรายการของ Entity นี้ที่อยู่ในการแข่งขันเป้าหมาย |
| `findByCompetition_CompetitionIdAndJudge_UserId` | 13 | อ่านใบประเมินหรือ assignment ของกรรมการในโครงการ |
| `existsByJudge_UserIdAndTeam_TeamId` | 15 | ตรวจว่ามี assignment กรรมการต่อทีมนี้หรือไม่ |
| `deleteByCompetition_CompetitionIdAndJudge_UserId` | 18 | ลบ assignments ของกรรมการในโครงการเมื่อถอดหน้าที่ |

## `backend/src/main/java/org/cesystem/multirole/repository/NotificationRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/NotificationRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/NotificationRepository.java)

JPA Repository สำหรับ `Notification`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByUser_UserIdOrderByCreatedAtDesc` | 15 | อ่านแจ้งเตือนบัญชีเรียงล่าสุด |
| `findUnreadByUser` | 18 | อ่านแจ้งเตือนที่ยังไม่อ่านของบัญชี |
| `countUnreadByUser` | 21 | นับแจ้งเตือนที่ยังไม่อ่าน |
| `markAllRead` | 26 | bulk update isRead เฉพาะบัญชีเป้าหมาย |

## `backend/src/main/java/org/cesystem/multirole/repository/PasswordResetTokenRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/PasswordResetTokenRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/PasswordResetTokenRepository.java)

JPA Repository สำหรับ `PasswordResetToken`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findFirstByUser_UserIdOrderByCreatedAtDesc` | 12 | อ่าน token ล่าสุดของบัญชีเพื่อคุม cooldown |
| `findByTokenHash` | 14 | ค้น token ด้วย hash แทน raw token |
| `findByUser_UserIdAndUsedAtIsNull` | 16 | อ่าน token ที่ยังไม่ถูกใช้/ยกเลิกของบัญชี |

## `backend/src/main/java/org/cesystem/multirole/repository/ProjectActivityRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/ProjectActivityRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/ProjectActivityRepository.java)

JPA Repository สำหรับ `ProjectActivity`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `countByUserIdAndActionAndOccurredAtAfter` | 9 | นับกิจกรรมบัญชีตาม action หลังเวลาที่กำหนดเพื่อ quota/สัญญาณ |
| `findTop100ByOrderByOccurredAtDesc` | 10 | อ่านกิจกรรมระบบล่าสุดไม่เกิน 100 รายการ |

## `backend/src/main/java/org/cesystem/multirole/repository/ScoreRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/ScoreRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/ScoreRepository.java)

JPA Repository สำหรับ `Score`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByEvaluation_EvaluationId` | 11 | อ่านคะแนนรายเกณฑ์ของใบประเมิน |
| `existsByCriteria_CriterionId` | 13 | ตรวจคะแนนที่อ้างอิงเกณฑ์ก่อนพิจารณาการเปลี่ยนแปลง |

## `backend/src/main/java/org/cesystem/multirole/repository/TeamGroupMemberRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/TeamGroupMemberRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/TeamGroupMemberRepository.java)

JPA Repository สำหรับ `TeamGroupMember`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByCompetition_CompetitionId` | 13 | อ่านรายการของ Entity นี้ที่อยู่ในการแข่งขันเป้าหมาย |
| `findByTeamGroup_GroupId` | 15 | อ่าน membership ของกลุ่มทีม |
| `findByTeam_TeamId` | 17 | อ่าน membership กลุ่มของทีมหนึ่งทีม |

## `backend/src/main/java/org/cesystem/multirole/repository/TeamGroupRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/TeamGroupRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/TeamGroupRepository.java)

JPA Repository สำหรับ `TeamGroup`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByCompetition_CompetitionId` | 11 | อ่านรายการของ Entity นี้ที่อยู่ในการแข่งขันเป้าหมาย |
| `existsByCompetition_CompetitionIdAndGroupNameIgnoreCase` | 13 | ตรวจชื่อกลุ่มซ้ำในโครงการ |

## `backend/src/main/java/org/cesystem/multirole/repository/TeamRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/TeamRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/TeamRepository.java)

JPA Repository สำหรับ `Team`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `findByCompetition_CompetitionId` | 10 | อ่านรายการของ Entity นี้ที่อยู่ในการแข่งขันเป้าหมาย |

## `backend/src/main/java/org/cesystem/multirole/repository/UserRepository.java`

[backend/src/main/java/org/cesystem/multirole/repository/UserRepository.java](../../backend/src/main/java/org/cesystem/multirole/repository/UserRepository.java)

JPA Repository สำหรับ `User`; ใช้ derived query/JPQL ตาม method และ annotation ของไฟล์

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `lockById` | 11 | ค้นและล็อกแถวผู้ใช้ด้วย PESSIMISTIC_WRITE เพื่อ serialize งานที่แข่งกัน |
| `findByEmail` | 12 | ค้นบัญชีด้วยอีเมล |

## `backend/src/main/java/org/cesystem/multirole/security/JwtAuthenticationFilter.java`

[backend/src/main/java/org/cesystem/multirole/security/JwtAuthenticationFilter.java](../../backend/src/main/java/org/cesystem/multirole/security/JwtAuthenticationFilter.java)

ตรวจ Bearer JWT และสถานะบัญชี/verification/tokenVersion จากฐานทุกคำขอ ก่อนตั้ง SecurityContext

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `doFilterInternal` | 34 | อ่าน JWT ตรวจลายเซ็น/expiry และค้นบัญชี ACTIVE verified/version ตรง แล้วส่งต่อ filter chain |
| `authoritiesOf` | 71 | สร้าง ROLE_USER และเพิ่ม ROLE_SYSTEM_ADMIN เมื่อ flag บัญชีเป็นจริง |

## `backend/src/main/java/org/cesystem/multirole/security/JwtUtil.java`

[backend/src/main/java/org/cesystem/multirole/security/JwtUtil.java](../../backend/src/main/java/org/cesystem/multirole/security/JwtUtil.java)

ออกและตรวจ JWT ด้วยคีย์คงที่ พร้อมวันหมดอายุและ version ของบัญชี

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `JwtUtil` | 27 | constructor: ออกและตรวจ JWT ด้วยคีย์คงที่ พร้อมวันหมดอายุและ version ของบัญชี |
| `generateToken` | 38 | ออก JWT มี subject อีเมล ver issuedAt และ expiry; overload หนึ่งใช้ version 0 |
| `extractVersion` | 41 | อ่าน claim ver เพื่อเทียบ tokenVersion ในฐาน |
| `generateToken` | 45 | ออก JWT มี subject อีเมล ver issuedAt และ expiry; overload หนึ่งใช้ version 0 |
| `extractEmail` | 56 | อ่าน subject จาก JWT |
| `extractClaim` | 60 | ใช้ resolver อ่าน claim หลังตรวจ token |
| `extractAllClaims` | 64 | ตรวจลายเซ็นและ parse claims; token ผิด/หมดอายุโยน exception |
| `isTokenValid` | 69 | ตรวจ subject ตรงกับอีเมลและวันหมดอายุยังไม่ผ่าน |

## `backend/src/main/java/org/cesystem/multirole/security/SecurityConfig.java`

[backend/src/main/java/org/cesystem/multirole/security/SecurityConfig.java](../../backend/src/main/java/org/cesystem/multirole/security/SecurityConfig.java)

PasswordEncoder BCrypt, stateless filter chain, public auth routes, 401 และ CORS ตาม FRONTEND_URL

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `passwordEncoder` | 35 | สร้าง BCryptPasswordEncoder สำหรับรหัสผ่าน |
| `filterChain` | 40 | กำหนด stateless security/public auth paths/CORS/401 และวาง JWT filter ก่อน username password filter |
| `corsConfigurationSource` | 70 | อนุญาต origin ตาม frontend-url พร้อม HTTP methods และ headers ที่ระบบใช้ |

## `backend/src/main/java/org/cesystem/multirole/service/AccessService.java`

[backend/src/main/java/org/cesystem/multirole/service/AccessService.java](../../backend/src/main/java/org/cesystem/multirole/service/AccessService.java)

กฎกลางของบัญชี สมาชิกโครงการและสิทธิ์ ADMIN/JUDGE/SYSTEM_ADMIN

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `hasAdminRole` | 27 | ตรวจ ADMIN หรือ ADMIN_JUDGE ของสมาชิกโครงการ |
| `hasJudgeRole` | 31 | ตรวจ JUDGE หรือ ADMIN_JUDGE ของสมาชิกโครงการ |
| `competitionRole` | 35 | คืนบทบาทผู้ใช้ในโครงการหรือสิทธิ์พิเศษของ System Admin |
| `currentUser` | 43 | อ่าน principal และตรวจบัญชีจากฐาน ไม่พบ/ระงับไม่มีสิทธิ์ |
| `isSystemAdmin` | 56 | ตรวจ flag isSystemAdmin ของบัญชี |
| `getCompetition` | 60 | ค้นการแข่งขันตาม UUID หรือ 404 |
| `membership` | 65 | อ่านแถวสมาชิกคู่ competition/user |
| `isCompetitionAdmin` | 70 | ตรวจ System Admin หรือสมาชิกที่มีหน้าที่จัดการโครงการ |
| `requireMember` | 76 | บังคับให้เป็นสมาชิกหรือ System Admin ก่อนคืนการแข่งขัน |
| `requireCompetitionAdmin` | 85 | บังคับสิทธิ์จัดการโครงการก่อนคืนการแข่งขัน |

## `backend/src/main/java/org/cesystem/multirole/service/AuthService.java`

[backend/src/main/java/org/cesystem/multirole/service/AuthService.java](../../backend/src/main/java/org/cesystem/multirole/service/AuthService.java)

ตรวจข้อมูลสมัคร hash รหัสผ่านและ Login พร้อมบังคับยืนยันอีเมลสำหรับบัญชีใหม่

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `EmailNotVerifiedException` | 37 | constructor: ตรวจข้อมูลสมัคร hash รหัสผ่านและ Login พร้อมบังคับยืนยันอีเมลสำหรับบัญชีใหม่ |
| `registerUser` | 41 | validate อีเมล/ชื่อ/password 8 ตัวขึ้นไปและไม่เกิน 72 UTF-8 bytes hash ด้วย BCrypt สร้าง USER และเข้าคิวยืนยัน |
| `loginUser` | 88 | ตรวจ password/status/verification แล้วออก token พร้อม version และ role |

## `backend/src/main/java/org/cesystem/multirole/service/BatchEvaluationService.java`

[backend/src/main/java/org/cesystem/multirole/service/BatchEvaluationService.java](../../backend/src/main/java/org/cesystem/multirole/service/BatchEvaluationService.java)

ตรวจชุดทีมและเรียก transaction ส่งคะแนนแยกทีม คืนผลสำเร็จ/ล้มเหลวรายรายการ

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `submit` | 22 | ตรวจ batch ว่าไม่ว่างและ teamId ไม่ซ้ำ แล้วส่งแต่ละทีมแยก transaction จับ error กลับรายทีม |

## `backend/src/main/java/org/cesystem/multirole/service/BrevoMailGateway.java`

[backend/src/main/java/org/cesystem/multirole/service/BrevoMailGateway.java](../../backend/src/main/java/org/cesystem/multirole/service/BrevoMailGateway.java)

แปลง payload เป็น Brevo Transactional Email request และแยก error ที่ควร retry

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `DeliveryException` | 21 | constructor: แปลง payload เป็น Brevo Transactional Email request และแยก error ที่ควร retry |
| `retryable` | 22 | คืน flag ว่าความผิดพลาด Brevo นี้ควรลองส่งใหม่หรือไม่ |
| `send` | 24 | POST JSON ไป Brevo ด้วย api-key คืน messageId หรือ DeliveryException; retry เฉพาะกรณีเครือข่าย/429/5xx ตามกฎ |

## `backend/src/main/java/org/cesystem/multirole/service/CriteriaPolicy.java`

[backend/src/main/java/org/cesystem/multirole/service/CriteriaPolicy.java](../../backend/src/main/java/org/cesystem/multirole/service/CriteriaPolicy.java)

ล็อกแถวการแข่งขันและตัดสินว่าเกณฑ์เปลี่ยนได้หรือไม่

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `lock` | 19 | ล็อกแถว Competition ด้วย PESSIMISTIC_WRITE และ refresh เพื่อ serialize การแก้กับการเปิดรับคะแนน |
| `requireEditable` | 24 | ตรวจและปฏิเสธการเขียนเมื่อโครงสร้าง/เกณฑ์ถูกล็อก พร้อม 409 |
| `isLocked` | 32 | จริงเมื่อ criteriaLocked, สถานะไม่ใช่ DRAFT หรือมีผลประเมินอยู่แล้ว |

## `backend/src/main/java/org/cesystem/multirole/service/EmailDeliveryService.java`

[backend/src/main/java/org/cesystem/multirole/service/EmailDeliveryService.java](../../backend/src/main/java/org/cesystem/multirole/service/EmailDeliveryService.java)

ส่ง outbox หนึ่งรายการใน transaction ล็อกแถว ตรวจความเกี่ยวข้องและ retry/status

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `deliver` | 26 | ล็อก outbox ตรวจ due/relevance ส่ง API และเปลี่ยน ACCEPTED/RETRY/FAILED/CANCELLED โดยล้าง payload เมื่อจบ |
| `stillRelevant` | 54 | ตรวจบัญชี/expiry/token/assignment/deadline และงานที่ยังเหลือก่อนส่ง เพื่อยกเลิกเมลที่ไม่ควรส่งแล้ว |
| `finish` | 65 | ตั้งสถานะปลายทาง ล้าง encryptedPayload และปรับ emailStatus ของแจ้งเตือนที่เชื่อมไว้ |
| `updateNotification` | 66 | ปรับ emailStatus ของ Notification ที่ outbox อ้างถึงถ้ายังมีอยู่ |

## `backend/src/main/java/org/cesystem/multirole/service/EmailJobs.java`

[backend/src/main/java/org/cesystem/multirole/service/EmailJobs.java](../../backend/src/main/java/org/cesystem/multirole/service/EmailJobs.java)

scheduled jobs ส่งคิวทุก 15 วินาที และตรวจ reminder ทุก 60 วินาทีตามค่าเริ่มต้น

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `dispatch` | 21 | เลือก outbox PENDING/RETRY ถึงเวลาไม่เกิน 20 รายการแล้วเรียก deliver แยก transaction |
| `remind` | 29 | เลือกโครงการ ACTIVE ที่ deadline อยู่ใน 24 ชั่วโมงเพื่อสร้าง automatic reminders |

## `backend/src/main/java/org/cesystem/multirole/service/EmailQueue.java`

[backend/src/main/java/org/cesystem/multirole/service/EmailQueue.java](../../backend/src/main/java/org/cesystem/multirole/service/EmailQueue.java)

สร้าง HTML อีเมล escape เนื้อหา เข้ารหัส payload แล้วบันทึกใน transaction เดียวกับงานต้นทาง

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `enqueue` | 19 | สร้าง HTML ที่ escape ข้อมูล เข้ารหัส subject/html แล้วบันทึก outbox ภายใน transaction งานต้นทาง |
| `payload` | 35 | ถอดรหัส outbox payload และ deserialize เป็น subject/html |
| `escape` | 36 | escape อักขระ HTML ของข้อความ/ลิงก์ก่อนประกอบอีเมล |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `Payload` | String subject, String html |

## `backend/src/main/java/org/cesystem/multirole/service/EmailTokens.java`

[backend/src/main/java/org/cesystem/multirole/service/EmailTokens.java](../../backend/src/main/java/org/cesystem/multirole/service/EmailTokens.java)

สร้าง token สุ่มสำหรับ Verify/Reset และ hash ก่อนเก็บในฐาน

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `generate` | 8 | สร้าง token แบบ URL-safe จาก SecureRandom |
| `hash` | 9 | คำนวณ SHA-256 ของ token เพื่อตรวจโดยไม่เก็บ raw token ในตาราง token |

## `backend/src/main/java/org/cesystem/multirole/service/EmailVerificationService.java`

[backend/src/main/java/org/cesystem/multirole/service/EmailVerificationService.java](../../backend/src/main/java/org/cesystem/multirole/service/EmailVerificationService.java)

ขอลิงก์ยืนยันใหม่พร้อม cooldown หมดอายุหนึ่งชั่วโมง และใช้ token ครั้งเดียว

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `required` | 20 | ตรวจว่าบัญชีถูกกำหนดให้ verify และยังไม่ยืนยัน |
| `request` | 23 | ล็อกบัญชี คุม cooldown 60 วินาที ยกเลิก token เดิม สร้าง token อายุหนึ่งชั่วโมงและ outbox ยืนยันอีเมล |
| `verify` | 42 | ตรวจ hash/usedAt/expiry/status แล้วตั้ง emailVerified และ invalidate token ที่เหลือ |
| `invalid` | 52 | สร้างข้อผิดพลาด token ยืนยันไม่ถูกต้อง/หมดอายุ/ใช้แล้ว |

## `backend/src/main/java/org/cesystem/multirole/service/EvaluationHistoryService.java`

[backend/src/main/java/org/cesystem/multirole/service/EvaluationHistoryService.java](../../backend/src/main/java/org/cesystem/multirole/service/EvaluationHistoryService.java)

ถ่าย snapshot คะแนนก่อน/หลัง บันทึก audit ใน transaction เดียว และซ่อน draft ต่อผู้ดูแล

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `snapshot` | 26 | สร้างข้อมูลคะแนนรวม สถานะ ความคิดเห็นและรายเกณฑ์เรียงลำดับคงที่เพื่อเปรียบเทียบ audit |
| `number` | 34 | stripTrailingZeros ของ BigDecimal เพื่อไม่เกิด audit ปลอมจากความต่างของ scale |
| `response` | 57 | deserialize snapshot ประวัติและซ่อน before ที่เป็น draft หากผู้ดูไม่ใช่เจ้าของ |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `CriterionSnapshot` | UUID criterionId, String title, String scoringType, BigDecimal maxScore, BigDecimal weightPercentage, BigDecimal scoreValue, String comment |
| `Snapshot` | String status, BigDecimal totalScore, String comment, List<CriterionSnapshot> scores |
| `Response` | UUID historyId, String eventType, LocalDateTime occurredAt, UUID actorId, String actorName, String actorEmail, String teamName, Snapshot before, Snapshot after |

## `backend/src/main/java/org/cesystem/multirole/service/EvaluationReminderService.java`

[backend/src/main/java/org/cesystem/multirole/service/EvaluationReminderService.java](../../backend/src/main/java/org/cesystem/multirole/service/EvaluationReminderService.java)

manual/automatic reminder เฉพาะกรรมการที่ยังมีทีมไม่ส่งและอยู่ก่อน deadline

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `remaining` | 29 | นับ assignment ของกรรมการที่ยังไม่มีใบ SUBMITTED |
| `manual` | 38 | ตรวจ admin โครงการเปิด มี deadline ผู้รับเหมาะสม มีงานค้าง และเว้นเตือนอย่างน้อยหนึ่งชั่วโมง |
| `automatic` | 54 | เตือนกรรมการที่มีงานค้างเมื่อเหลือไม่เกิน 24 ชั่วโมง ใช้ dedupe ต่อโครงการ/ผู้ใช้และ cooldown หนึ่งชั่วโมง |
| `eligibleMember` | 72 | ตรวจบัญชีใช้งานได้และเป็นสมาชิกที่มีหน้าที่กรรมการ |
| `eligibleAccount` | 76 | ตรวจ ACTIVE และไม่ติดการยืนยันอีเมล |
| `open` | 77 | ตรวจ ACTIVE มี deadline และยังไม่ถึงเวลาปิดรับคะแนน |
| `create` | 80 | สร้าง Notification, dedupe/cooldown record และ EmailOutbox ใน transaction เดียว |
| `automaticKey` | 98 | สร้าง dedupe key AUTO:competitionId:userId; ปัจจุบันไม่ได้แยก key ตาม deadline แต่ละครั้ง |
| `conflict` | 99 | สร้าง ResponseStatusException 409 พร้อมข้อความธุรกิจ |

## `backend/src/main/java/org/cesystem/multirole/service/EvaluationService.java`

[backend/src/main/java/org/cesystem/multirole/service/EvaluationService.java](../../backend/src/main/java/org/cesystem/multirole/service/EvaluationService.java)

ตรวจสิทธิ์ assignment สถานะและ deadline ตรวจคะแนน คำนวณถ่วงน้ำหนัก upsert ใบเดิม และเก็บประวัติ

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `upsertEvaluation` | 57 | ล็อกบัญชีกรรมการแล้วเรียกขั้นตอนตรวจ/บันทึกใบประเมินใน transaction |
| `submitUnsubmitted` | 64 | REQUIRES_NEW ส่งทีมที่ยังไม่ส่ง; ถ้า SUBMITTED แล้วคืน ALREADY_SUBMITTED โดยไม่ทับ |
| `lockJudge` | 73 | ค้นและล็อกบัญชีกรรมการ refresh และปฏิเสธบัญชีไม่ ACTIVE |
| `persistEvaluation` | 84 | ตรวจโครงการ/ทีม/assignment/deadline/คะแนน อัปเดตใบและ Score เดิม คำนวณ total และบันทึก audit |
| `validateRange` | 220 | ตรวจ PASS_FAIL เป็น 0/1 และคะแนนชนิดอื่นระหว่าง 0 กับคะแนนเต็ม |
| `weightedTotal` | 234 | รวม normalized score × สัดส่วนน้ำหนักด้วย BigDecimal แล้วปัด HALF_UP หนึ่งตำแหน่ง |
| `bad` | 250 | สร้าง HTTP 400 สำหรับข้อมูลคะแนนไม่ถูกต้อง |
| `conflict` | 254 | สร้าง ResponseStatusException 409 พร้อมข้อความธุรกิจ |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `SaveOutcome` | Evaluation evaluation, boolean alreadySubmitted |

## `backend/src/main/java/org/cesystem/multirole/service/LeaderboardService.java`

[backend/src/main/java/org/cesystem/multirole/service/LeaderboardService.java](../../backend/src/main/java/org/cesystem/multirole/service/LeaderboardService.java)

คลาสว่าง ไม่มี @Service ไม่มี method และไม่พบผู้เรียก; ไม่ใช่ส่วนคำนวณอันดับที่ใช้งานจริง

ไม่มี method และไม่เป็น Spring bean ปัจจุบันคำนวณ ranking ที่ ProjectLeaderboard.jsx ไม่พบ REST endpoint `/leaderboard`

## `backend/src/main/java/org/cesystem/multirole/service/MailPayloadCipher.java`

[backend/src/main/java/org/cesystem/multirole/service/MailPayloadCipher.java](../../backend/src/main/java/org/cesystem/multirole/service/MailPayloadCipher.java)

สร้างคีย์จาก secret และเข้ารหัส/ถอดรหัส payload อีเมลด้วย AES-GCM พร้อม nonce สุ่ม

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `MailPayloadCipher` | 18 | constructor: สร้างคีย์จาก secret และเข้ารหัส/ถอดรหัส payload อีเมลด้วย AES-GCM พร้อม nonce สุ่ม |
| `encrypt` | 21 | สร้าง nonce สุ่ม เข้ารหัส AES/GCM และคืน nonce+ciphertext เป็น Base64 |
| `decrypt` | 30 | อ่าน nonce จาก payload และตรวจ authentication tag ขณะถอดรหัส AES/GCM |

## `backend/src/main/java/org/cesystem/multirole/service/PasswordResetService.java`

[backend/src/main/java/org/cesystem/multirole/service/PasswordResetService.java](../../backend/src/main/java/org/cesystem/multirole/service/PasswordResetService.java)

ออก reset token อายุ 30 นาที เปลี่ยนรหัส BCrypt และเพิ่ม tokenVersion เพื่อยกเลิก JWT เดิม

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `requestReset` | 25 | ล็อกบัญชี คุมขอซ้ำ 60 วินาที invalidate token เดิม สร้างอายุ 30 นาทีและเข้าคิวอีเมล |
| `resetPassword` | 44 | ตรวจ raw token/expiry/usedAt และ password แล้วเปลี่ยน BCrypt เพิ่ม tokenVersion และ invalidate token ที่เหลือ |
| `verifyToken` | 59 | ตรวจ reset token แบบ read-only และคืน boolean ตาม expiry/usedAt/สถานะบัญชี |
| `invalidLink` | 64 | สร้าง HTTP 400 เมื่อลิงก์รีเซ็ตใช้ไม่ได้ |

## `backend/src/main/java/org/cesystem/multirole/service/ProjectActivityService.java`

[backend/src/main/java/org/cesystem/multirole/service/ProjectActivityService.java](../../backend/src/main/java/org/cesystem/multirole/service/ProjectActivityService.java)

บันทึกกิจกรรมสร้าง/ปฏิเสธ/เปลี่ยนสิทธิ์; denial ใช้ REQUIRES_NEW เพื่อไม่หายตาม rollback ต้นทาง

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `denied` | 13 | เก็บ CREATE_DENIED ใน transaction ใหม่เพื่อไม่หายเมื่อการสร้างโครงการ rollback |
| `record` | 14 | บันทึก event ตาม service; EvaluationHistory บันทึกก่อน/หลังเมื่อข้อมูลเปลี่ยน ส่วน ProjectActivity บันทึก user/action/detail |

## `backend/src/main/java/org/cesystem/multirole/service/ProjectCreationPolicy.java`

[backend/src/main/java/org/cesystem/multirole/service/ProjectCreationPolicy.java](../../backend/src/main/java/org/cesystem/multirole/service/ProjectCreationPolicy.java)

quota เริ่มต้น 3 โครงการ/10 นาที 10/24 ชั่วโมง และคงอยู่ไม่เกิน 30 ต่อบัญชี พร้อม row lock กันแข่งกันสร้าง

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `quota` | 24 | คำนวณจำนวนโครงการ ช่วงเวลาและเหตุผลว่าผู้ใช้ยังสร้างได้หรือไม่ |
| `requireAllowed` | 39 | ล็อกบัญชีแล้วตรวจ quota บันทึก denial และตอบ 403 เมื่อถูกบล็อก หรือ 429 เมื่อเกินโควตา |

### Record / รูปข้อมูล

| Record | Fields ตาม source |
| --- | --- |
| `Quota` | long owned, long createdLast10Minutes, long createdLast24Hours, int burstLimit, int dailyLimit, int totalLimit, boolean blocked, boolean allowed, String reason |

## `backend/src/main/java/org/cesystem/multirole/service/ProjectReadinessService.java`

[backend/src/main/java/org/cesystem/multirole/service/ProjectReadinessService.java](../../backend/src/main/java/org/cesystem/multirole/service/ProjectReadinessService.java)

ตรวจความพร้อมจริงในฐานก่อน ACTIVE ได้แก่เกณฑ์ครบ 100 ทีม กรรมการ assignment ครบทุกทีม และ deadline ถ้ามีต้องเป็นอนาคต

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `requireReady` | 22 | ตรวจเกณฑ์ครบ 100 ทีม กรรมการและ assignment ครบทุกทีม รวม deadline ก่อนอนุญาต ACTIVE |

## `backend/src/main/java/org/cesystem/multirole/service/ProjectStructurePolicy.java`

[backend/src/main/java/org/cesystem/multirole/service/ProjectStructurePolicy.java](../../backend/src/main/java/org/cesystem/multirole/service/ProjectStructurePolicy.java)

ใช้กฎ criteria lock ปฏิเสธการแก้ทีม กลุ่ม สมาชิกและ assignment หลังเริ่มรับคะแนน

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `requireEditable` | 14 | ตรวจและปฏิเสธการเขียนเมื่อโครงสร้าง/เกณฑ์ถูกล็อก พร้อม 409 |

## `backend/src/main/java/org/cesystem/multirole/service/Validation.java`

[backend/src/main/java/org/cesystem/multirole/service/Validation.java](../../backend/src/main/java/org/cesystem/multirole/service/Validation.java)

ฟังก์ชันกลาง trim/required/จำกัดความยาวข้อความก่อนบันทึก

| Method | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `requireText` | 11 | trim ตรวจไม่ว่างและจำกัดความยาวข้อความ |
| `optionalText` | 19 | trim/จัดการค่าว่างและตรวจความยาวข้อความที่ไม่บังคับ |
| `limit` | 26 | ตรวจความยาวข้อความตามขอบเขตและสร้าง error เมื่อเกิน |

## `backend/src/main/resources/application-prod.properties`

[backend/src/main/resources/application-prod.properties](../../backend/src/main/resources/application-prod.properties)

ตั้งค่า Production ที่บังคับ env ฐาน/JWT/อีเมล และ ddl-auto เริ่มต้น validate; ไม่บรรจุค่าลับจริงไว้ในรายงาน

## `backend/src/main/resources/application.properties`

[backend/src/main/resources/application.properties](../../backend/src/main/resources/application.properties)

ตั้งค่า ค่าหลักพอร์ต JDBC การ import local config, JWT, Brevo, scheduler และ timezone; ไม่บรรจุค่าลับจริงไว้ในรายงาน

## Entity และ model

ทุกไฟล์ใน `backend/src/main/java/org/cesystem/multirole/model/` อธิบายราย field และความสัมพันธ์ใน [DATABASE.md](DATABASE.md) โดย Lombok สร้าง getter/setter ให้อัตโนมัติ ไม่ใช่ endpoint สำหรับอ่าน/เขียนข้อมูล
