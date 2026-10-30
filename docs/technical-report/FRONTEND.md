# รายละเอียด Frontend

[กลับสารบัญ](README.md)

ข้อมูลโครงการจริงเก็บที่ MySQL ผ่าน Backend ไฟล์ชื่อ Store เป็น cache/ตัวประสาน API ไม่ใช่ localStorage database การ normalize เป็นขั้นตอนแปลง field ไม่ได้เพิ่มสิทธิ์ให้ผู้ใช้

## แผนที่เส้นทางหน้าจอ

| Path | Component |
| --- | --- |
| / | Navigate |
| /login | Login |
| /signup | SignUp |
| /verify-email | VerifyEmail |
| /reset-password | ResetPassword |
| /admin/users | UserManagement |
| /workspace | WorkSpace |
| /projects/new | CreateProject |
| /project/:id/dashboard | ProjectDashboard |
| /project/:id/teams | ProjectTeams |
| /project/:id/groups | ProjectGroups |
| /project/:id/judges | ProjectJudges |
| /project/:id/assignments | JudgeTeamAssignments |
| /project/:id/criteria | CriteriaManagement |
| /project/:id/evaluations | EvaluationMonitoring |
| /project/:id/leaderboard | ProjectLeaderboard |
| /judge/project/:projectId/scores | JudgeScoreMonitoring |
| /judge/project/:projectId/teams | JudgeProjectTeams |
| /judge/project/:projectId/evaluate/:teamId | JudgeEvaluation |
| /judge/project/:projectId/evaluate-multi | JudgeMultiEvaluation |
| * | Navigate |

เส้นทาง `/login`, `/signup`, `/verify-email`, `/reset-password` เปิดก่อน Login ได้; `/admin/users` ต้อง System Admin; `/project/:id/...` ต้อง Project Admin; `/judge/project/:projectId/...` ต้องบทบาทกรรมการ ProtectedRoute เป็นการควบคุม UI ส่วนสิทธิ์ข้อมูลจริงอยู่ที่ Backend

## `src/api/client.js`

[src/api/client.js](../../src/api/client.js)

สร้าง Axios instance อ่าน VITE_API_URL แนบ Bearer JWT และจัดการ error/401 ส่วนกลาง

ไม่มี named function ที่ประกาศตรงในไฟล์; ใช้ top-level initialization และ callback ดังอธิบายต่อไป

`axios.create` ตั้ง baseURL เป็น `VITE_API_URL` หรือ `/api`, timeout 8,000 ms; request interceptor อ่าน `ce_token` แล้วแนบ Authorization; response interceptor เลือกข้อความ error และ dispatch `ce:unauthorized` เมื่อ 401 ของ endpoint ที่ไม่ใช่ `/auth/`

## `src/api/workspace.js`

[src/api/workspace.js](../../src/api/workspace.js)

cache ข้อมูลตอบกลับจาก API และตัวโหลดข้อมูลโครงการ แปลง UUID และรูป DTO ให้หน้าจอใช้ร่วมกัน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `clearWorkspace` | 8 | เพิ่ม generation และล้าง cache ผู้ใช้/โครงการ/แจ้งเตือน เพื่อไม่รับผลเก่าหลัง Logout |
| `projectPath` | 12 | ประกอบ path API ของโครงการจาก UUID |
| `detail` | 13 | อ่านรายละเอียดโครงการจาก cache หรือคืนโครงสร้างรายการว่าง |
| `normalizeUser` | 14 | แปลง userId/fullName/role/status จาก API ให้ตรงกับรูปแบบ Frontend |
| `normalizeTeam` | 17 | แปลง TeamResponse เป็น id/name/description/link/displayOrder |
| `normalizeCriterion` | 18 | แปลง CriteriaResponse เป็น id/name/type/maxScore/weight |
| `normalizeEvaluation` | 19 | แปลง EvaluationResponse พร้อมคะแนน array เป็น object keyed by criterionId และ resolve ตัวตนกรรมการ |
| `loadProject` | 25 | เรียกข้อมูลหลัก ทีม เกณฑ์ กลุ่ม assignment สมาชิกตามสิทธิ์ และผลประเมิน ก่อนอัปเดต cache โครงการ |
| `refreshNotifications` | 49 | ดึงแจ้งเตือนผู้ใช้ปัจจุบันและป้องกันผลเก่ากลับเข้าหลังล้าง session |
| `loadWorkspace` | 56 | โหลดรายชื่อโครงการและรายละเอียดทุกโครงการ รักษา cache เดิมระหว่างรอ ตัดรายการที่ไม่มีแล้วเมื่อโหลดสำเร็จ |
| `competitionRequest` | 70 | แปลงข้อมูลแบบฟอร์มโครงการเป็น title/description/category/evaluationDeadline |

## `src/App.css`

[src/App.css](../../src/App.css)

stylesheet จาก scaffold; ไม่พบการ import ใน source ปัจจุบัน

## `src/App.jsx`

[src/App.jsx](../../src/App.jsx)

ประกอบ Routes ของทุกหน้า วาง Toaster และกำหนด route guard ตามระดับสิทธิ์

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `App` | 25 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/assets/hero.png`

[src/assets/hero.png](../../src/assets/hero.png)

ไฟล์ภาพ/ไอคอนใน source; ไม่พบการอ้างอิงชื่อไฟล์นี้จาก JS/JSX ปัจจุบัน จึงไม่ถือว่าเป็นความสามารถที่เปิดใช้งาน

## `src/assets/react.svg`

[src/assets/react.svg](../../src/assets/react.svg)

ไฟล์ภาพ/ไอคอนใน source; ไม่พบการอ้างอิงชื่อไฟล์นี้จาก JS/JSX ปัจจุบัน จึงไม่ถือว่าเป็นความสามารถที่เปิดใช้งาน

## `src/assets/vite.svg`

[src/assets/vite.svg](../../src/assets/vite.svg)

ไฟล์ภาพ/ไอคอนใน source; ไม่พบการอ้างอิงชื่อไฟล์นี้จาก JS/JSX ปัจจุบัน จึงไม่ถือว่าเป็นความสามารถที่เปิดใช้งาน

## `src/components/AuthPasswordField.jsx`

[src/components/AuthPasswordField.jsx](../../src/components/AuthPasswordField.jsx)

ช่องกรอกรหัสผ่านที่เปิด/ซ่อนตัวอักษรได้ พร้อมข้อกำหนดรหัสผ่าน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `AuthPasswordField` | 5 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/BackButton.jsx`

[src/components/BackButton.jsx](../../src/components/BackButton.jsx)

ลิงก์ย้อนกลับที่ใช้รูปแบบเดียวกันทั้งระบบ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `BackButton` | 4 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/Badge.jsx`

[src/components/Badge.jsx](../../src/components/Badge.jsx)

ป้ายสถานะและสีตาม variant

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `Badge` | 1 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/BatchSubmissionDialog.jsx`

[src/components/BatchSubmissionDialog.jsx](../../src/components/BatchSubmissionDialog.jsx)

หน้าต่างตรวจรายการพร้อมส่ง/ไม่ครบ/ซ่อนจาก filter และผลส่งหลายทีม พร้อมควบคุม focus

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `BatchSubmissionDialog` | 8 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `onKeyDown` | 28 | จัดการ keyboard ภายใน dialog/แท็บ เช่น Escape, Tab หรือเลื่อน focus ตามบริบท component |

## `src/components/Button.jsx`

[src/components/Button.jsx](../../src/components/Button.jsx)

ปุ่มกลางที่รองรับ variant, size, disabled และวงกลมหมุนเมื่อ isLoading

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `Button` | 1 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/Card.jsx`

[src/components/Card.jsx](../../src/components/Card.jsx)

กรอบข้อมูลกลางพร้อม padding และรูปแบบพื้นฐาน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `Card` | 1 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/ConfirmDialog.jsx`

[src/components/ConfirmDialog.jsx](../../src/components/ConfirmDialog.jsx)

หน้าต่างยืนยันการกระทำ รองรับสถานะรอและปิดการกดซ้ำ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `ConfirmDialog` | 5 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/CriteriaModal.jsx`

[src/components/CriteriaModal.jsx](../../src/components/CriteriaModal.jsx)

กรอบ modal สำหรับรายละเอียดเกณฑ์และเนื้อหาแบบกำหนดเอง

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `CriteriaModal` | 3 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/CriteriaScoreInput.jsx`

[src/components/CriteriaScoreInput.jsx](../../src/components/CriteriaScoreInput.jsx)

แสดง input ให้เหมาะกับ STAR, NUMERIC, PERCENTAGE, PASS_FAIL และรองรับ readonly

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `CriterionScoreInput` | 11 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/DeadlineHistory.jsx`

[src/components/DeadlineHistory.jsx](../../src/components/DeadlineHistory.jsx)

เปิดดูประวัติการเปลี่ยน deadline ของโครงการ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `DeadlineHistory` | 5 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `date` | 20 | จัดรูปแบบวันเวลาเพื่อแสดงตามภาษาและกรณีไม่มีค่า |

## `src/components/EvaluationDeadlineNotice.jsx`

[src/components/EvaluationDeadlineNotice.jsx](../../src/components/EvaluationDeadlineNotice.jsx)

แถบแสดงกำหนดส่งและสถานะการเปิดให้แก้คะแนน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `EvaluationDeadlineNotice` | 3 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/EvaluationHistory.jsx`

[src/components/EvaluationHistory.jsx](../../src/components/EvaluationHistory.jsx)

เปิดประวัติใบประเมินแบบแบ่งหน้าและแสดงค่าเดิม/ใหม่รายเกณฑ์

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `same` | 8 | เปรียบเทียบค่าคะแนนก่อน/หลังเพื่อเน้นเฉพาะส่วนที่เปลี่ยน |
| `EvaluationHistory` | 9 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `value` | 28 | จัดรูปแบบค่าคะแนนหรือความคิดเห็นในประวัติ รวมกรณีไม่มีค่า |
| `change` | 29 | สร้างข้อความ/ส่วนแสดงความต่างของค่าก่อนและหลัง |

## `src/components/Input.jsx`

[src/components/Input.jsx](../../src/components/Input.jsx)

ช่อง input กลางพร้อม label/error

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `Input` | 3 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/JudgeAssignModal.jsx`

[src/components/JudgeAssignModal.jsx](../../src/components/JudgeAssignModal.jsx)

ค้นหา/เลือกอีเมลกรรมการและส่งคำขอเพิ่มสมาชิกให้หน้าเจ้าของโครงการ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `JudgeAssignModal` | 6 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `handleAssign` | 27 | ตรวจอีเมลที่เลือกและเรียก callback มอบหมายกรรมการ |

## `src/components/LanguageSwitcher.jsx`

[src/components/LanguageSwitcher.jsx](../../src/components/LanguageSwitcher.jsx)

สลับภาษาไทย/อังกฤษโดยใช้ LanguageContext

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `LanguageSwitcher` | 9 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/MonitoringUI.jsx`

[src/components/MonitoringUI.jsx](../../src/components/MonitoringUI.jsx)

ชุดส่วนประกอบสถิติ แท็บ ค้นหา empty state pagination และ skeleton สำหรับหน้าติดตาม

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `MonitoringStat` | 5 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `MonitoringTabs` | 22 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `onKeyDown` | 23 | จัดการ keyboard ภายใน dialog/แท็บ เช่น Escape, Tab หรือเลื่อน focus ตามบริบท component |
| `MonitoringSearch` | 37 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `MonitoringEmpty` | 42 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `MonitoringPagination` | 47 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `MonitoringSkeleton` | 52 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/Navbar.jsx`

[src/components/Navbar.jsx](../../src/components/Navbar.jsx)

เมนูตามบทบาท ตัวเลือกโครงการ เมนูมือถือ โปรไฟล์ และแจ้งเตือนที่ดึงทุก 30 วินาที

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getProjectIdFromPath` | 30 | อ่าน UUID โครงการจากรูปแบบ pathname ของผู้ดูแลหรือกรรมการ |
| `getProjectNavigation` | 34 | สร้างรายการเมนูตามบทบาทในโครงการและบัญชีปัจจุบัน |
| `NavigationLink` | 115 | render NavLink พร้อม active state และตัวเลือกเมนู |
| `ProjectSelector` | 141 | render dropdown เปลี่ยนโครงการและสถานะเปิด/ปิด |
| `Navbar` | 255 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `updateMenuState` | 338 | ปรับสถานะเปิด/ปิดของเมนูเป้าหมายใน Navbar |
| `closeMenus` | 349 | ปิดเมนู popup ที่เปิดอยู่เพื่อไม่ซ้อนทับกัน |
| `handleOutsideClick` | 367 | ปิด popup เมื่อคลิกนอกพื้นที่เมนู |
| `handleEscape` | 391 | ปิดเมนูด้วย Escape และคืน focus ตามบริบท |
| `handleLogout` | 427 | ล้าง session ปิดเมนู และไปหน้า Login |
| `handleNotificationClick` | 433 | ทำเครื่องหมายอ่าน โหลดข้อมูลโครงการถ้าจำเป็น และนำทางตามประเภทแจ้งเตือน |
| `handleMarkAllRead` | 453 | เรียก API อ่านแจ้งเตือนทั้งหมดแล้วปรับรายการที่แสดง |
| `navigateToProject` | 463 | เปลี่ยนโครงการและเลือกเส้นทางที่บัญชีมีสิทธิ์เข้า |
| `onNavigation` | 474 | ปิดเมนูที่เปิดอยู่เมื่อนำทาง |

## `src/components/PageHeader.jsx`

[src/components/PageHeader.jsx](../../src/components/PageHeader.jsx)

หัวข้อหน้า subtitle description badge และพื้นที่ action ให้รูปแบบสม่ำเสมอ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `PageHeader` | 1 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/ProjectStructureLock.jsx`

[src/components/ProjectStructureLock.jsx](../../src/components/ProjectStructureLock.jsx)

แจ้งว่าโครงสร้างโครงการถูกล็อกเมื่อเปิดรับคะแนนแล้ว

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `ProjectStructureLock` | 6 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/ProtectedRoute.jsx`

[src/components/ProtectedRoute.jsx](../../src/components/ProtectedRoute.jsx)

ตรวจบัญชีและบทบาทก่อนเข้า route ฝั่ง browser; Backend ยังต้องตรวจสิทธิ์จริงซ้ำ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `ProtectedRoute` | 16 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/Select.jsx`

[src/components/Select.jsx](../../src/components/Select.jsx)

select กลางพร้อม label/error

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `Select` | 4 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/components/SystemMonitoringOverview.jsx`

[src/components/SystemMonitoringOverview.jsx](../../src/components/SystemMonitoringOverview.jsx)

รายการโครงการและกิจกรรมสำหรับ System Admin พร้อมค้นหา filter เจ้าของและ pagination

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `SystemMonitoringOverview` | 8 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `date` | 14 | จัดรูปแบบวันเวลาเพื่อแสดงตามภาษาและกรณีไม่มีค่า |
| `reset` | 27 | ล้างค่าชั่วคราว/ตัวกรองตามแบบฟอร์มหรือหน้ารายการนั้น |

## `src/components/TeamFormModal.jsx`

[src/components/TeamFormModal.jsx](../../src/components/TeamFormModal.jsx)

แบบฟอร์มเพิ่ม/แก้ทีม ตรวจชื่อ รายละเอียด และ URL ก่อนเรียก callback บันทึก

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `TeamFormModal` | 9 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `handleChange` | 32 | อัปเดต field ของแบบฟอร์มตามชื่อ input |
| `validate` | 36 | ตรวจข้อมูลจำเป็นและรูปแบบก่อนส่งแบบฟอร์มตามกฎของหน้า |
| `handleSave` | 62 | ตรวจแบบฟอร์มแล้วเรียก callback บันทึก พร้อมคงสถานะรอ/ข้อผิดพลาด |

## `src/components/TeamGroupManagement.jsx`

[src/components/TeamGroupManagement.jsx](../../src/components/TeamGroupManagement.jsx)

จัดกลุ่มทีม เลือกหลายทีม ย้ายกลุ่มพร้อมกัน ค้นหาและแบ่งหน้า

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `SelectionCheckbox` | 14 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `TeamGroupManagement` | 20 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `mutate` | 55 | ครอบคำขอแก้ไขกลุ่ม ตั้ง busy โหลดข้อมูลหลังสำเร็จ และแจ้งข้อผิดพลาดรวมถึงกรณีโครงสร้างล็อก |
| `handleCreateGroup` | 72 | ตรวจชื่อกลุ่มและส่งคำขอสร้างกลุ่ม |
| `handleRenameGroup` | 76 | บันทึกชื่อใหม่ของกลุ่มที่เลือก |
| `handleMoveTeam` | 80 | ย้ายทีมหนึ่งทีมไปกลุ่มที่เลือก |
| `handleBulkMove` | 86 | ย้ายชุดทีมที่เลือกพร้อมกันและปรับ selection หลังสำเร็จ |
| `confirmDeleteGroup` | 97 | ยืนยันลบกลุ่มที่เลือกแล้วโหลดข้อมูลใหม่ |
| `changeFilter` | 107 | เปลี่ยนตัวกรองกลุ่ม/ทีมและคืนเลขหน้าให้เหมาะสม |
| `resetFilters` | 108 | คืนค่าค้นหา ตัวกรอง การเรียงและเลขหน้ากลับค่าเริ่มต้นของหน้า |
| `toggleTeam` | 109 | สลับ selection ของทีมที่ระบุในชุดทีมที่เลือก |
| `selectPage` | 110 | เลือกหรือยกเลิกเลือกทุกทีมในหน้าปัจจุบัน |
| `teamCheckbox` | 122 | สร้าง checkbox selection ของทีมพร้อม label ที่เข้าถึงได้ |
| `groupSelect` | 123 | สร้างตัวเลือกกลุ่มสำหรับทีมหนึ่งรายการ |

## `src/components/TeamImportModal.jsx`

[src/components/TeamImportModal.jsx](../../src/components/TeamImportModal.jsx)

อ่าน Excel เลือก worksheet ตรวจข้อมูลแถว แสดงตัวอย่าง และยืนยันนำเข้า พร้อมดาวน์โหลด template

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `downloadTemplate` | 7 | สร้าง workbook ตัวอย่างสามคอลัมน์ชื่อทีม รายละเอียด และลิงก์ให้ดาวน์โหลด |
| `TeamImportModal` | 38 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `reset` | 74 | ล้างค่าชั่วคราว/ตัวกรองตามแบบฟอร์มหรือหน้ารายการนั้น |
| `handleClose` | 87 | ปิด modal และล้างค่าชั่วคราวเมื่อไม่ได้กำลังดำเนินงาน |
| `handleFileChange` | 93 | อ่านไฟล์ที่เลือก โหลดชีต และตั้งข้อมูล preview หรือข้อความผิดพลาด |
| `handleConfirmImport` | 121 | ส่งเฉพาะแถวที่ผ่านการตรวจไป callback นำเข้าและจัดการผลสำเร็จ/ล้มเหลว |
| `handleDownloadTemplate` | 133 | จัดสถานะขณะสร้าง/ดาวน์โหลด template และแจ้ง error |

## `src/components/UsageHelp.jsx`

[src/components/UsageHelp.jsx](../../src/components/UsageHelp.jsx)

ส่วนช่วยเหลือแบบเปิดดูรายละเอียดเมื่อจำเป็น

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `UsageHelp` | 4 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/context/AuthContext.jsx`

[src/context/AuthContext.jsx](../../src/context/AuthContext.jsx)

สถานะบัญชี Login/Logout/restore session และโหลด cache หลังยืนยัน JWT

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `AuthProvider` | 7 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น และเปิด context ให้ลูกอ่านข้อมูล |
| `logout` | 12 | ล้างบัญชี cache และ token จาก localStorage |
| `hydrate` | 20 | ดึง /auth/me โหลด workspace และ directory ก่อนเปิดหน้าที่ต้อง Login |
| `restore` | 29 | ตรวจ token ที่เก็บไว้และกู้ session พร้อมแยกเครือข่ายผิดพลาดจาก 401/403 |
| `expired` | 43 | ล้าง session เมื่อได้รับ event ce:unauthorized |
| `login` | 49 | ส่ง credentials เก็บ token แล้ว hydrate; หากโหลด session ไม่สำเร็จจะล้างข้อมูล |
| `register` | 56 | ส่งชื่อ อีเมล และรหัสผ่านไป API สมัครสมาชิก |
| `refresh` | 59 | เรียกการอัปเดตตามขอบเขตของไฟล์; ใน AuthContext โหลด workspace/directory และเพิ่ม revision; ใน useVisiblePolling สั่งดึงทันทีผ่าน controller เดิม |
| `useAuth` | 78 | อ่าน AuthContext และปฏิเสธการใช้นอก Provider |

`revision` ทำให้ consumer อ่าน snapshot cache ใหม่หลัง refresh; Auth token อยู่ใน localStorage จึงต้องป้องกัน XSS; ไม่มี refresh-token endpoint ในโค้ดนี้

## `src/context/authStore.js`

[src/context/authStore.js](../../src/context/authStore.js)

cache รายชื่อผู้ใช้ฝั่ง browser เพื่อ resolve ชื่อ/แสดงผล ไม่ใช่แหล่งตรวจสิทธิ์แทน Backend

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getRegisteredUsers` | 2 | อ่านรายชื่อผู้ใช้จาก cache |
| `setRegisteredUsersCache` | 3 | แทนที่รายชื่อผู้ใช้ใน cache ด้วยข้อมูลที่โหลดจาก API |
| `updateRegisteredUser` | 4 | แก้รายการใน cache ตามอีเมลหลังเซิร์ฟเวอร์ยืนยันการเปลี่ยนแปลง |
| `deleteRegisteredUser` | 7 | ลบผู้ใช้ออกจาก cache ตามอีเมล |

## `src/context/LanguageContext.jsx`

[src/context/LanguageContext.jsx](../../src/context/LanguageContext.jsx)

เก็บโหมด TH/EN ลง localStorage และให้ฟังก์ชันเลือกข้อความตามภาษา

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `LanguageProvider` | 11 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น และเปิด context ให้ลูกอ่านข้อมูล |
| `setLang` | 21 | เปลี่ยนภาษาและบันทึกค่าลง localStorage |
| `t` | 31 | เลือกข้อความภาษาไทยหรืออังกฤษตามโหมดปัจจุบัน |
| `tDesc` | 39 | เลือกคำอธิบายภาษาไทย/อังกฤษตามโหมดปัจจุบัน |
| `useLanguage` | 55 | อ่าน LanguageContext และตรวจว่ามี Provider |

## `src/data/BatchSubmission.js`

[src/data/BatchSubmission.js](../../src/data/BatchSubmission.js)

จัดกลุ่มทีมที่พร้อมส่ง/ไม่ครบ/ส่งแล้วจากทุกทีมที่ได้รับมอบหมาย ไม่ขึ้นกับ filter ที่มองเห็น

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getBatchSubmissionCandidates` | 4 | ตรวจทุกทีม/ทุกเกณฑ์และคืน ready/incomplete/submitted พร้อม snapshot คะแนนและข้อมูลทีมที่ถูกซ่อนด้วย filter |

## `src/data/CriteriaStore.js`

[src/data/CriteriaStore.js](../../src/data/CriteriaStore.js)

อ่านและเขียนเกณฑ์ผ่าน API แล้วโหลด cache โครงการใหม่

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getCriteriaByProject` | 3 | อ่านเกณฑ์ของโครงการจาก cache |
| `getTotalCriteriaWeight` | 4 | รวมเปอร์เซ็นต์น้ำหนักเกณฑ์ของโครงการ |
| `hasCompleteCriteriaWeights` | 5 | ตรวจว่ามีเกณฑ์และน้ำหนักรวมครบ 100 |
| `saveCriterion` | 6 | POST หรือ PUT เกณฑ์ จากนั้นโหลดโครงการใหม่และคืนเกณฑ์ที่ normalize แล้ว |
| `deleteCriterion` | 14 | DELETE เกณฑ์และโหลด cache โครงการใหม่ |

## `src/data/EvaluationStore.js`

[src/data/EvaluationStore.js](../../src/data/EvaluationStore.js)

แปลงคะแนนจาก object ของหน้าจอเป็น score array ส่ง API และนำผลที่เซิร์ฟเวอร์ยืนยันกลับเข้า cache

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getEvaluationsByProject` | 3 | อ่านใบประเมินของโครงการที่ API อนุญาตให้เห็น |
| `getEvaluation` | 4 | ค้นใบประเมินตามโครงการ ทีม และกรรมการ |
| `saveEvaluation` | 5 | ส่งสถานะ/คะแนน/ความคิดเห็น อ่านใบของตนกลับ และ refresh cache; ไม่ส่ง totalScore ให้ Backend เชื่อถือ |
| `submitEvaluationsBatch` | 16 | ส่งหลายทีมด้วย request เดียว timeout 60 วินาที และใส่เฉพาะใบที่เซิร์ฟเวอร์ยืนยันลง cache ของ session เดิม |

## `src/data/GroupStore.js`

[src/data/GroupStore.js](../../src/data/GroupStore.js)

อ่านกลุ่มและเรียก API เพิ่ม เปลี่ยนชื่อ ย้ายทีมเดี่ยว/หลายทีม และลบกลุ่ม

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getGroupsByProject` | 3 | อ่านกลุ่มของโครงการ |
| `getGroupForTeam` | 4 | หากลุ่มที่มี teamId เป้าหมาย |
| `getTeamIdsInGroup` | 5 | คืนรายการ teamId ของกลุ่ม |
| `createGroup` | 6 | สร้างกลุ่มผ่าน API และโหลดข้อมูลกลับ |
| `renameGroup` | 10 | เปลี่ยนชื่อกลุ่มผ่าน API และโหลดข้อมูลกลับ |
| `moveTeamToGroup` | 14 | ย้ายทีมเดี่ยวหรือเอาออกจากกลุ่มด้วย groupId null |
| `moveTeamsToGroup` | 18 | ย้ายหลายทีมในคำขอเดียว timeout 30 วินาที แล้วใช้ผลตอบกลับอัปเดต cache |
| `deleteGroup` | 27 | ลบกลุ่มและโหลดข้อมูลล่าสุด; ไม่ใช่คำสั่งลบทีมในกลุ่ม |

## `src/data/JudgeIdentity.js`

[src/data/JudgeIdentity.js](../../src/data/JudgeIdentity.js)

resolve ชื่อ/อีเมลกรรมการจากข้อมูลใบประเมินหรือสมาชิก ป้องกันแสดง UUID แทนชื่อ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `resolveJudgeIdentity` | 1 | เลือกชื่อ/อีเมลจากข้อมูลใบประเมิน สมาชิก และ fallback โดยไม่ใช้ UUID เป็นชื่อ |

## `src/data/JudgeTeamAssignmentStore.js`

[src/data/JudgeTeamAssignmentStore.js](../../src/data/JudgeTeamAssignmentStore.js)

อ่าน mapping ทีม-กรรมการและเทียบรายการเดิมกับรายการใหม่เพื่อเพิ่ม/ยกเลิก assignment

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getTeamIdsForJudge` | 3 | หา teamId ที่มอบหมายให้กรรมการ |
| `getJudgeIdsForTeam` | 4 | หา judgeId ที่ได้รับมอบหมายทีม |
| `replaceJudgeTeamAssignments` | 5 | เทียบ selection กับ assignment เดิม ลบส่วนที่เอาออกและ POST ส่วนเพิ่ม แล้วโหลดโครงการใน finally |

## `src/data/NotificationStore.js`

[src/data/NotificationStore.js](../../src/data/NotificationStore.js)

อ่านแจ้งเตือนปัจจุบัน สร้าง reminder และทำเครื่องหมายอ่านผ่าน API

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getNotificationsByUser` | 3 | คืนแจ้งเตือนจาก cache เมื่ออีเมลตรงกับ session ปัจจุบัน |
| `addNotification` | 4 | ส่ง manual reminder ไป Backend โดยแปลง userId ที่ UI ใช้เป็น email ผู้รับ |
| `markAsRead` | 8 | PATCH แจ้งเตือนหนึ่งรายการแล้วโหลดรายการใหม่ |
| `markAllAsRead` | 12 | PATCH อ่านทั้งหมดแล้วโหลดรายการใหม่ |

## `src/data/ProjectLock.js`

[src/data/ProjectLock.js](../../src/data/ProjectLock.js)

กฎ Frontend ว่าโครงสร้างถูกล็อกหรือไม่ โดยดู flag และสถานะโครงการ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `isProjectStructureLocked` | 1 | ตรวจ flag criteriaLocked หรือสถานะ Active/Closed เพื่อปิดการแก้โครงสร้างฝั่ง UI |

## `src/data/ProjectReadiness.js`

[src/data/ProjectReadiness.js](../../src/data/ProjectReadiness.js)

ตรวจรายการเตรียมโครงการ เกณฑ์ครบ 100 ทีม กรรมการ การมอบหมาย และ deadline

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getProjectSetupReadiness` | 1 | ประเมินเกณฑ์ ทีม กรรมการ และความครอบคลุมการมอบหมาย เพื่อแสดงขั้นตอนที่พร้อม/ยังขาด |
| `isActivationDeadlineValid` | 19 | ตรวจว่า deadline ถ้ามีต้องอยู่ในอนาคตก่อนเปิดรับคะแนน |

## `src/data/ProjectStore.js`

[src/data/ProjectStore.js](../../src/data/ProjectStore.js)

อ่านโครงการตามบทบาท/สมาชิก ประเมินสิทธิ์และช่วงเวลา พร้อมคำขอสร้าง/ลบ/เชิญ/เปลี่ยนสถานะและข้อมูล

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getAllProjects` | 5 | คืนโครงการทั้งหมดที่อยู่ใน cache ซึ่งถูกจำกัดโดย API ตามสิทธิ์แล้ว |
| `getProjectById` | 6 | หาโครงการตาม UUID |
| `getMyProjects` | 7 | กรองโครงการที่ผู้ใช้มีสิทธิ์จัดการ |
| `getJudgingProjects` | 8 | กรองโครงการที่ผู้ใช้มีบทบาทกรรมการ |
| `isProjectAdmin` | 9 | ตรวจสิทธิ์จัดการจากเจ้าของ/บทบาทโครงการใน cache |
| `isProjectNameTaken` | 10 | ตรวจชื่อโครงการซ้ำในข้อมูลที่ Frontend มองเห็น; Backend ตรวจฐานจริงซ้ำ |
| `getJudgeAssignments` | 11 | คืนรายชื่อสมาชิกที่มีหน้าที่กรรมการ |
| `getAssignedTeamIds` | 12 | หา teamId ที่ได้รับมอบหมายตาม judge identifier |
| `getJudgeIdsAssignedToTeam` | 13 | คืนรายการกรรมการจาก judgeAssignments ที่มี ID มอบหมายทีมนี้ แม้ชื่อฟังก์ชันมีคำว่า Ids แต่ค่าที่คืนเป็น object กรรมการ |
| `isJudgeAssignedToTeam` | 14 | ตรวจ mapping ว่ากรรมการคนนี้ได้รับทีมนี้หรือไม่ |
| `isProjectReadyForEvaluation` | 16 | ตรวจสถานะ Active และน้ำหนักเกณฑ์ครบ 100 ไม่ใช่ readiness ครบทุกขั้นของ ProjectReadiness |
| `isBeforeEvaluationDeadline` | 17 | ตรวจเฉพาะ deadline ว่ายังไม่ถึงหรือไม่ได้ตั้งเวลา โดยผู้เรียกต้องตรวจสถานะ Active แยก |
| `addProject` | 20 | POST สร้างโครงการและโหลดข้อมูลโครงการที่ได้กลับมา |
| `deleteProject` | 24 | DELETE โครงการแล้วลบออกจาก cache |
| `inviteJudgeToProject` | 30 | POST สมาชิกบทบาท JUDGE ด้วยอีเมลและโหลดข้อมูลโครงการ |
| `removeJudgeAssignment` | 34 | DELETE สมาชิกกรรมการจากโครงการและโหลดโครงการกลับ |
| `updateProjectStatus` | 38 | PATCH สถานะโครงการและโหลดโครงการล่าสุด |
| `updateProjectDetails` | 43 | PUT ข้อมูลโครงการ/กำหนดส่งและโหลดข้อมูลล่าสุด |

## `src/data/Rubric.js`

[src/data/Rubric.js](../../src/data/Rubric.js)

แปลงรายละเอียด rubric ระหว่างข้อความที่บันทึกกับแถวระดับคะแนนในฟอร์ม

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `parseRubricLevels` | 2 | แยกข้อความคำอธิบายเป็นรายการ label/detail ของระดับคะแนน |
| `serializeRubricRows` | 15 | ประกอบ rubricRows กลับเป็นข้อความสำหรับบันทึกใน description |
| `hydrateRubricRowsFromDescription` | 23 | นำ description เดิมมาสร้างแถวแก้ไข rubric ให้เหมาะกับ scoring type |
| `buildDefaultRubricRows` | 33 | สร้างรายการ rubric เริ่มต้นตามประเภทคะแนนและคะแนนเต็ม |

## `src/data/Scoring.js`

[src/data/Scoring.js](../../src/data/Scoring.js)

คำนวณตัวอย่างคะแนนถ่วงน้ำหนักและตรวจช่วงคะแนนฝั่ง Frontend

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `normalizedScore` | 1 | แปลงคะแนนรายเกณฑ์เป็นสเกล 0–100; PASS_FAIL ใช้ 0/100 |
| `calculateWeightedScore` | 6 | รวมคะแนน normalized ตามสัดส่วนน้ำหนักแล้วปัดหนึ่งตำแหน่งเพื่อแสดงผล |
| `isValidCriterionScore` | 17 | ตรวจค่าตัวเลข ช่วงคะแนน และ PASS_FAIL; ค่า null/undefined อนุญาตสำหรับ draft |

## `src/data/TeamImport.js`

[src/data/TeamImport.js](../../src/data/TeamImport.js)

ตรวจไบต์และโครงสร้าง .xlsx อ่านค่าเซลล์/สูตร/ลิงก์ และแปลงแถวเป็นข้อมูลทีมพร้อมข้อผิดพลาด

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `constructor` | 2 | สร้าง TeamImportError พร้อม code และ cause สำหรับแยกเหตุไฟล์อ่านไม่ได้ |
| `readTeamWorkbook` | 8 | ตรวจนามสกุล ไบต์ ZIP/ไฟล์เก่าหรือเข้ารหัส แล้วโหลด workbook ด้วย ExcelJS |
| `teamImportErrorMessage` | 30 | แปลงรหัสผิดพลาดนำเข้าเป็นข้อความสองภาษาที่แก้ปัญหาได้ |
| `cellText` | 41 | อ่าน plain text, rich text, cached formula result และ hyperlink จากเซลล์ Excel |
| `normalizeHeader` | 54 | normalize Unicode และตัดสัญลักษณ์เพื่อจับคู่ชื่อหัวคอลัมน์ |
| `parseTeamWorksheet` | 61 | หา header ไทย/อังกฤษและตรวจแถว ชื่อ ความยาว error cell และ URL ก่อนทำ preview |

## `src/data/TeamOrdering.js`

[src/data/TeamOrdering.js](../../src/data/TeamOrdering.js)

เรียงชื่อแบบตัวเลขธรรมชาติ ใช้ displayOrder กรอง/เรียงทีม และ helper ย้ายลำดับที่ยังคงอยู่ในโค้ด

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `compareTeamNames` | 1 | เปรียบเทียบชื่อทีมแบบ natural numeric sorting |
| `orderTeams` | 3 | เรียงตาม displayOrder ที่บันทึก และใช้ชื่อเป็น fallback |
| `position` | 6 | อ่านตำแหน่ง displayOrder เพื่อประกอบการเรียงทีม |
| `filterAndSortTeams` | 10 | กรองทีมและเรียงตามตัวเลือกที่รับมาโดยรักษาลำดับตามข้อมูล |
| `moveTeamInOrder` | 30 | สลับตำแหน่งทีมหนึ่งขั้นและคืน permutation ที่ครบทุกทีม; helper ยังมีแต่ UI ปรับลำดับถูกเอาออก |

## `src/data/TeamStore.js`

[src/data/TeamStore.js](../../src/data/TeamStore.js)

CRUD ทีมและ API ลำดับทีม; หน้าจัดกลุ่มปัจจุบันไม่มีปุ่มปรับลำดับ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getTeamsByProject` | 3 | อ่านทีมของโครงการจาก cache |
| `saveTeam` | 4 | POST หรือ PUT ทีมและโหลด cache ล่าสุด |
| `deleteTeam` | 11 | DELETE ทีมและโหลดโครงการกลับ |
| `reorderTeams` | 15 | PUT teamIds ทั้งชุดเพื่อบันทึก displayOrder; ยังมี API แต่ไม่ได้แสดงปุ่มในหน้าจัดกลุ่มปัจจุบัน |

## `src/hooks/useDeadline.js`

[src/hooks/useDeadline.js](../../src/hooks/useDeadline.js)

ตั้ง timeout เพื่อให้ UI render ใหม่เมื่อถึง deadline ไม่ได้ fetch API

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `useDeadline` | 4 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/hooks/useVisiblePolling.js`

[src/hooks/useVisiblePolling.js](../../src/hooks/useVisiblePolling.js)

hook รวม loading, updatedAt, error และ manual refresh ของ polling; ปิดชั่วคราวได้ระหว่างแก้สิทธิ์

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `useVisiblePolling` | 4 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `refresh` | 27 | เรียกการอัปเดตตามขอบเขตของไฟล์; ใน AuthContext โหลด workspace/directory และเพิ่ม revision; ใน useVisiblePolling สั่งดึงทันทีผ่าน controller เดิม |

taskRef รับ callback ล่าสุดโดยไม่เริ่ม timer ใหม่ทุก render; effect เริ่ม controller ตาม interval/scope/enabled; cleanup หยุด timer และผลที่กลับมาช้าจะไม่ setState ของหน้าที่ออกแล้ว

## `src/index.css`

[src/index.css](../../src/index.css)

Tailwind/theme tokens รูปแบบพื้นฐานของทั้งเว็บ และ animation CSS; ถูก import จาก main.jsx

## `src/layouts/AppLayout.jsx`

[src/layouts/AppLayout.jsx](../../src/layouts/AppLayout.jsx)

โครงหน้าที่ Login แล้ว ประกอบ Navbar และ Outlet ตาม pathname

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `AppLayout` | 4 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/layouts/AuthLayout.jsx`

[src/layouts/AuthLayout.jsx](../../src/layouts/AuthLayout.jsx)

โครงหน้ากลุ่ม Login/สมัคร/รีเซ็ตให้ใช้ธีมเดียวกัน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `AuthLayout` | 5 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/main.jsx`

[src/main.jsx](../../src/main.jsx)

จุดเริ่มต้น React DOM ครอบ BrowserRouter, AuthProvider และ LanguageProvider ก่อน render App

ไม่มี named function ที่ประกาศตรงในไฟล์; ใช้ top-level initialization และ callback ดังอธิบายต่อไป

React root อยู่ใน StrictMode; effects อาจ mount/cleanup ซ้ำใน development จึงไม่ควรใช้จำนวน request ตอน dev แทนตัวเลข production

## `src/pages/CreateProject.jsx`

[src/pages/CreateProject.jsx](../../src/pages/CreateProject.jsx)

แบบฟอร์มสร้างโครงการและแสดง quota จาก Backend

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `CreateProject` | 15 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `loadQuota` | 27 | โหลดจำนวนโครงการและสิทธิ์สร้างล่าสุดจาก Backend |
| `handleChange` | 37 | อัปเดต field ของแบบฟอร์มตามชื่อ input |
| `validate` | 41 | ตรวจข้อมูลจำเป็นและรูปแบบก่อนส่งแบบฟอร์มตามกฎของหน้า |
| `handleSubmit` | 55 | ตรวจข้อมูลและดำเนินการส่งแบบฟอร์มของหน้านั้น พร้อมสถานะ loading/error |

## `src/pages/CriteriaManagement.jsx`

[src/pages/CriteriaManagement.jsx](../../src/pages/CriteriaManagement.jsx)

เพิ่ม/แก้/ลบเกณฑ์แบบ inline และ rubric ตรวจน้ำหนักรวม พร้อม spinner และกันกดซ้ำขณะบันทึก

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `getFixedMaxScore` | 33 | คืนคะแนนเต็มตายตัวสำหรับ STAR=5, PERCENTAGE=100 และ PASS_FAIL=1 |
| `isFixedScoreType` | 40 | ตรวจประเภทที่ผู้ใช้ไม่ต้องแก้คะแนนเต็มเอง |
| `CriteriaManagement` | 47 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `reportWriteError` | 53 | แจ้ง write error และโหลดโครงการใหม่เมื่อ 409 เพื่อสะท้อนการล็อกจากเซิร์ฟเวอร์ |
| `validateMaxScore` | 91 | ตรวจคะแนนเต็มให้สอดคล้องประเภทและขอบเขตที่ UI กำหนด |
| `handleAddClick` | 107 | เปิดแถวเกณฑ์ใหม่พร้อม rubric เริ่มต้นเมื่อยังไม่ล็อกและน้ำหนักยังไม่ครบ |
| `startEditing` | 136 | คัดลอกเกณฑ์เดิมมาเป็นข้อมูลแก้ไขรวมถึง rubricRows |
| `cancelEditing` | 156 | ยกเลิกแถวแก้ไข; ไม่ยกเลิกระหว่างกำลังบันทึก |
| `handleInlineChange` | 162 | แก้ข้อมูลเกณฑ์ และปรับคะแนนเต็ม/rubric เมื่อเปลี่ยน scoring type |
| `handleRubricRowChange` | 179 | แก้ label หรือ detail ของ rubric แถวที่เลือก |
| `handleAddRubricRow` | 192 | เพิ่มแถวช่วงคะแนน rubric |
| `handleRemoveRubricRow` | 205 | ลบแถวช่วงคะแนน rubric ที่เลือก |
| `saveInlineEdit` | 215 | ตรวจชื่อ น้ำหนัก คะแนนเต็ม แล้วรอ API พร้อม spinner กันกดซ้ำ และอัปเดตรายการเมื่อสำเร็จ |
| `handleRowKeyDown` | 304 | รับ Escape เพื่อยกเลิกการแก้เกณฑ์เมื่อไม่ได้กำลังบันทึก |
| `confirmDelete` | 311 | ยืนยันลบรายการเป้าหมายของหน้านั้นผ่าน API และปรับ cache/selection หลังสำเร็จ |
| `getTypeBadge` | 324 | เลือกป้ายแสดง STAR/NUMERIC/PERCENTAGE/PASS_FAIL |

## `src/pages/EvaluationMonitoring.jsx`

[src/pages/EvaluationMonitoring.jsx](../../src/pages/EvaluationMonitoring.jsx)

ผู้ดูแลติดตามกรรมการ/ทีม ดูคะแนนย่อย กรอง/เรียงชื่อทีม และส่ง reminder; polling 15 วินาที

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `formatTime` | 27 | จัดเวลาชั่วโมงนาทีวินาทีสำหรับเวลาอัปเดตข้อมูล |
| `scoreLabel` | 35 | แปลงค่าคะแนนเป็นข้อความตามประเภทเกณฑ์เพื่อแสดงรายละเอียด |
| `EvaluationMonitoring` | 43 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `getStatusBadge` | 145 | เลือกป้าย/สีตามสถานะทีม กรรมการ หรือโครงการในหน้านั้น |
| `handleNotify` | 162 | ส่ง manual reminder ให้กรรมการที่ยังประเมินไม่ครบและบันทึกเวลาเตือนในหน้าจอ |

## `src/pages/JudgeEvaluation.jsx`

[src/pages/JudgeEvaluation.jsx](../../src/pages/JudgeEvaluation.jsx)

ประเมินทีมเดียว บันทึก draft ส่งผล และแก้ผลที่ส่งแล้วก่อน deadline

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `scoreLabel` | 32 | แปลงค่าคะแนนเป็นข้อความตามประเภทเกณฑ์เพื่อแสดงรายละเอียด |
| `JudgeEvaluation` | 43 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `cancelChanges` | 82 | คืนข้อมูลแก้ไขที่ยังไม่บันทึกเป็นค่าที่โหลดล่าสุด |
| `handleScoreChange` | 101 | อัปเดตคะแนนของเกณฑ์/ทีมใน state โดยตรวจว่าขณะนี้ยังแก้ไขได้ |
| `handleCriterionCommentChange` | 106 | อัปเดตความคิดเห็นรายเกณฑ์ใน state |
| `toggleRubric` | 111 | เปิด/ปิดคำอธิบายเกณฑ์บนหน้าประเมิน |
| `handleSaveDraft` | 118 | บันทึกข้อมูลที่กรอกเป็น draft โดยไม่บังคับให้ครบทุกเกณฑ์ |
| `handleSubmit` | 154 | ตรวจว่ากรอกครบทุกเกณฑ์และอยู่ในช่วงประเมิน แล้วเปิดหน้าต่างยืนยันส่งคะแนน |
| `confirmSubmit` | 160 | ส่งคะแนนทีมที่ยืนยันแล้วและจัดการสถานะ SUBMITTED/ข้อผิดพลาด |

## `src/pages/JudgeMultiEvaluation.jsx`

[src/pages/JudgeMultiEvaluation.jsx](../../src/pages/JudgeMultiEvaluation.jsx)

ประเมินหลายทีมแบบตาราง รองรับ draft รายทีม ความคิดเห็น กรอง/จัดมุมมอง และตรวจรายการก่อน batch submit

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `normalizedScore` | 42 | แปลงคะแนนรายเกณฑ์เป็นสเกล 0–100; PASS_FAIL ใช้ 0/100 |
| `JudgeMultiEvaluation` | 56 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `isTeamEditable` | 165 | ตรวจสิทธิ์ สถานะทีม และ deadline ก่อนเปิดแก้ไขช่องคะแนน |
| `filterTeamsByVisualStatus` | 204 | กรองทีมตามสถานะที่แสดง รวมการเปลี่ยนแปลงใน state ของหน้าตาราง |
| `moveCriterionOrder` | 282 | ขยับตำแหน่งคอลัมน์เกณฑ์ในมุมมองตารางของผู้ใช้ |
| `sortCriteriaOrder` | 298 | เรียงคอลัมน์เกณฑ์ตามตัวเลือกของผู้ใช้ ไม่เปลี่ยนโครงสร้างเกณฑ์ในฐาน |
| `stepFocusedCriterion` | 326 | เลื่อนเกณฑ์ที่กำลังโฟกัสเพื่อกรอกคะแนนได้สะดวก |
| `toggleCriterionRubric` | 340 | เปิด/ปิด rubric ของเกณฑ์หนึ่งรายการในตาราง |
| `isCriterionRubricVisible` | 347 | ตรวจว่าควรแสดง rubric เกณฑ์นั้นในมุมมองปัจจุบันหรือไม่ |
| `handleToggleAllRubrics` | 354 | สลับการแสดง rubric ทุกเกณฑ์ในหน้าตาราง |
| `isTeamAnswered` | 360 | ตรวจว่าทีมมีค่าคะแนนกรอกไว้หรือไม่เพื่อแสดงสถานะ/ตัวกรอง |
| `handleScoreChange` | 368 | อัปเดตคะแนนของเกณฑ์/ทีมใน state โดยตรวจว่าขณะนี้ยังแก้ไขได้ |
| `handleCriterionCommentChange` | 381 | อัปเดตความคิดเห็นรายเกณฑ์ใน state |
| `toggleCommentCell` | 394 | เปิด/ปิดช่องความคิดเห็นรายทีม/เกณฑ์ |
| `handleCommentChange` | 402 | แก้ความคิดเห็นรวมของทีมใน state |
| `cancelTeamChanges` | 409 | คืนค่าคะแนน/ความคิดเห็นทีมหนึ่งกลับ snapshot ที่บันทึกล่าสุด |
| `handleSaveDraft` | 417 | บันทึกข้อมูลที่กรอกเป็น draft โดยไม่บังคับให้ครบทุกเกณฑ์ |
| `confirmSubmit` | 454 | ส่งคะแนนทีมที่ยืนยันแล้วและจัดการสถานะ SUBMITTED/ข้อผิดพลาด |
| `openBatchReview` | 500 | รวบรวมทีมพร้อมส่งและไม่ครบ แล้วเปิดหน้าต่างตรวจสอบก่อนส่งหลายทีม |
| `closeBatch` | 507 | ปิดหน้าต่างส่งหลายทีมเมื่อไม่มีคำขอกำลังทำงาน |
| `sendBatch` | 508 | ส่ง snapshot รายการที่ยืนยันไป API batch และแสดงผลแยกทีมพร้อมอัปเดต state |
| `fixIncompleteTeam` | 541 | นำผู้ใช้กลับไปยังทีม/เกณฑ์ที่ยังกรอกไม่ครบจากหน้าต่างตรวจรายการ |

การจัดลำดับคอลัมน์ rubric ในมุมมองตารางเป็น state ของ UI ไม่แก้ weight หรือ scoring criteria ในฐาน; การส่ง batch ใช้ snapshot ที่ตรวจสอบ ไม่ใช้เพียงทีมที่กำลังแสดงจาก filter

## `src/pages/JudgeProjectTeams.jsx`

[src/pages/JudgeProjectTeams.jsx](../../src/pages/JudgeProjectTeams.jsx)

รายชื่อทีมที่กรรมการต้องประเมินพร้อมสถานะและลิงก์เข้าประเมิน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `JudgeProjectTeams` | 20 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `getStatusBadge` | 48 | เลือกป้าย/สีตามสถานะทีม กรรมการ หรือโครงการในหน้านั้น |

## `src/pages/JudgeScoreMonitoring.jsx`

[src/pages/JudgeScoreMonitoring.jsx](../../src/pages/JudgeScoreMonitoring.jsx)

แสดงเฉพาะคะแนนของกรรมการปัจจุบัน ตัวกรอง คะแนนย่อยและประวัติ; polling 15 วินาที

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `JudgeScoreMonitoring` | 19 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `date` | 53 | จัดรูปแบบวันเวลาเพื่อแสดงตามภาษาและกรณีไม่มีค่า |
| `filter` | 54 | เปลี่ยนตัวกรองสถานะและกลับไปหน้าแรกของรายการคะแนน |
| `reset` | 55 | ล้างค่าชั่วคราว/ตัวกรองตามแบบฟอร์มหรือหน้ารายการนั้น |

## `src/pages/JudgeTeamAssignments.jsx`

[src/pages/JudgeTeamAssignments.jsx](../../src/pages/JudgeTeamAssignments.jsx)

เลือกกรรมการและเลือกหลายทีมเพื่อบันทึกการมอบหมาย เปรียบเทียบรายการที่เปลี่ยน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `JudgeTeamAssignments` | 35 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `getAssignedJudgesForTeam` | 110 | คำนวณรายชื่อกรรมการที่ได้รับมอบหมายทีม |
| `toggleTeam` | 112 | สลับ selection ของทีมที่ระบุในชุดทีมที่เลือก |
| `setFilteredTeamsSelected` | 124 | เลือก/ยกเลิกทีมที่ผ่าน filter ในหน้ามอบหมาย |
| `cancelChanges` | 137 | คืนข้อมูลแก้ไขที่ยังไม่บันทึกเป็นค่าที่โหลดล่าสุด |
| `saveAssignments` | 145 | บันทึกชุดทีมที่เลือกให้กรรมการผ่าน store และโหลดข้อมูลผลลัพธ์กลับ |
| `resetTeamFilters` | 194 | ล้างคำค้นหาหรือตัวกรองทีมในหน้ามอบหมาย |

## `src/pages/Login.jsx`

[src/pages/Login.jsx](../../src/pages/Login.jsx)

เข้าสู่ระบบและโหมดขอลิงก์ลืมรหัสผ่าน จัดการกรณีต้องยืนยันอีเมล

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `Login` | 11 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `handleLogin` | 23 | ส่งบัญชีเข้าสู่ระบบและนำทางตามบทบาท รวมกรณี EMAIL_NOT_VERIFIED |
| `handleForgotPassword` | 44 | ขอลิงก์ตั้งรหัสใหม่โดยแสดงข้อความที่ไม่เปิดเผยว่าบัญชีมีอยู่จริงหรือไม่ |
| `changeMode` | 63 | สลับแบบฟอร์ม Login กับลืมรหัสผ่านและล้างข้อความสถานะเก่า |

## `src/pages/ProjectDashboard.jsx`

[src/pages/ProjectDashboard.jsx](../../src/pages/ProjectDashboard.jsx)

ภาพรวมความพร้อม ขั้นตอนเตรียมโครงการ เปิด/พัก/ปิดรับคะแนน และเปลี่ยน deadline พร้อมยืนยัน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `statusVariant` | 42 | แปลงสถานะโครงการเป็นสี badge |
| `ProjectDashboard` | 53 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `handleToggleStatus` | 171 | เปลี่ยนสถานะโครงการผ่าน API พร้อมตรวจ readiness ก่อนเปิดรับคะแนนและจัดการ error |
| `handleDeadlineChange` | 189 | ยืนยันแล้วบันทึก deadline ใหม่และปรับข้อมูลที่แสดง |
| `requestDeadlineChange` | 205 | ตรวจเวลาที่กรอกและเปิดหน้าต่างยืนยันผลกระทบก่อนเปลี่ยนกำหนดส่ง |

## `src/pages/ProjectGroups.jsx`

[src/pages/ProjectGroups.jsx](../../src/pages/ProjectGroups.jsx)

หน้าเส้นทางกลุ่มที่ใช้ส่วนจัดการทีม/กลุ่มร่วมกัน

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `ProjectGroups` | 3 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |

## `src/pages/ProjectJudge.jsx`

[src/pages/ProjectJudge.jsx](../../src/pages/ProjectJudge.jsx)

จัดการกรรมการในโครงการ รวมเพิ่มเจ้าของโครงการเป็นกรรมการและถอดหน้าที่โดยรักษาสิทธิ์ ADMIN

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `ProjectJudges` | 26 | ประกอบหน้ารายชื่อกรรมการและแบบฟอร์มเชิญ/ถอดกรรมการตามสิทธิ์จัดการโครงการ |
| `handleAssignJudge` | 76 | เพิ่มอีเมลกรรมการรวมกรณีเจ้าของเพิ่มตนเองและโหลดรายการกลับ |
| `handleRemoveClick` | 93 | เก็บกรรมการเป้าหมายและเปิดคำถามยืนยันถอดกรรมการ |
| `confirmRemove` | 98 | เรียก API ถอดกรรมการและอัปเดตข้อมูลหลังสำเร็จ |

## `src/pages/ProjectLeaderboard.jsx`

[src/pages/ProjectLeaderboard.jsx](../../src/pages/ProjectLeaderboard.jsx)

คำนวณอันดับและ podium จากผล SUBMITTED เฉลี่ยต่อทีม ส่งออก CSV สรุป/ละเอียด; polling 15 วินาที

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `formatCriterionRawScore` | 33 | จัดรูปแบบคะแนนดิบแต่ละประเภทสำหรับไฟล์ CSV |
| `ProjectLeaderboard` | 40 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `handleExportSummaryCSV` | 156 | สร้าง CSV สรุปอันดับ ค่าเฉลี่ยรายเกณฑ์ จำนวนกรรมการและสถานะทีม |
| `escapeCsv` | 175 | ครอบค่าด้วยเครื่องหมายคำพูดและ escape quote เพื่อให้ CSV ไม่แตกคอลัมน์ |
| `handleExportDetailedCSV` | 219 | สร้าง CSV แบบละเอียดรายทีม กรรมการ เกณฑ์ คะแนนและความคิดเห็น |
| `escapeCsv` | 253 | ครอบค่าด้วยเครื่องหมายคำพูดและ escape quote เพื่อให้ CSV ไม่แตกคอลัมน์ |

อันดับคำนวณจาก `SUBMITTED` และกรรมการที่ยังมี assignment ของทีมนั้น เรียง averageScore มากไปน้อยแล้วให้ rank=index+1; คะแนนเท่ากันไม่ได้แชร์ rank เดียวกัน คะแนนรวมใบละหนึ่งตำแหน่ง แต่ UI อาจแสดงสองตำแหน่ง

## `src/pages/ProjectTeams.jsx`

[src/pages/ProjectTeams.jsx](../../src/pages/ProjectTeams.jsx)

จัดการทีม สลับแท็บกลุ่ม นำเข้า Excel และจัดการสถานะรอบันทึก/ลบ

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `ProjectTeams` | 24 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `resetFilters` | 58 | คืนค่าค้นหา ตัวกรอง การเรียงและเลขหน้ากลับค่าเริ่มต้นของหน้า |
| `setActiveTab` | 60 | สลับแท็บทีม/กลุ่มผ่าน search parameter เพื่อให้แชร์และกลับมามุมมองเดิมได้ |
| `handleSaveTeam` | 67 | รอคำขอเพิ่ม/แก้ทีมพร้อมกันกดซ้ำ ปิดแบบฟอร์มหลังสำเร็จ |
| `handleImportTeams` | 85 | ตัดชื่อซ้ำใน UI แล้วบันทึกทีละทีม แจ้งจำนวนสำเร็จก่อนหยุดเมื่อบางแถวล้มเหลว |
| `handleDeleteClick` | 123 | เก็บรายการเป้าหมายและเปิดหน้าต่างยืนยันลบ |
| `confirmDelete` | 128 | ยืนยันลบรายการเป้าหมายของหน้านั้นผ่าน API และปรับ cache/selection หลังสำเร็จ |

Excel ถูกอ่านใน browser แล้ว POST ทีละทีม ไม่มี API upload Excel หรือ transaction ครอบทั้งไฟล์; หากขัดข้องอาจนำเข้าสำเร็จบางทีมและคงแถวที่เหลือสำหรับลองใหม่

## `src/pages/ResetPassword.jsx`

[src/pages/ResetPassword.jsx](../../src/pages/ResetPassword.jsx)

ตรวจ reset token และตั้งรหัสผ่านใหม่ตามลิงก์อีเมล

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `ResetPassword` | 10 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `handleSubmit` | 35 | ตรวจข้อมูลและดำเนินการส่งแบบฟอร์มของหน้านั้น พร้อมสถานะ loading/error |

## `src/pages/SignUp.jsx`

[src/pages/SignUp.jsx](../../src/pages/SignUp.jsx)

ตรวจข้อมูลสมัครและรหัสผ่านยืนยัน ส่งสมัคร แล้วนำไปหน้ายืนยันอีเมล

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `SignUp` | 11 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `handleSubmit` | 22 | ตรวจข้อมูลและดำเนินการส่งแบบฟอร์มของหน้านั้น พร้อมสถานะ loading/error |

## `src/pages/UserManagement.jsx`

[src/pages/UserManagement.jsx](../../src/pages/UserManagement.jsx)

System Admin ดูผู้ใช้ โครงการ สัญญาณและกิจกรรม เปลี่ยนสิทธิ์/สถานะ/ลบ; polling 30 วินาที

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `UserManagement` | 24 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `updateSearch` | 81 | แก้ข้อความค้นหาผู้ใช้และกลับหน้าแรกของรายการ |
| `handleToggleStatus` | 86 | เปลี่ยน Active/Suspended ของบัญชีผ่าน API แล้วอัปเดตรายการหลังเซิร์ฟเวอร์ยืนยัน |
| `changeCreationAccess` | 116 | บล็อกหรือคืนสิทธิ์สร้างโครงการและโหลดภาพรวมใหม่ |
| `handleDeleteClick` | 129 | เก็บรายการเป้าหมายและเปิดหน้าต่างยืนยันลบ |
| `confirmDelete` | 134 | ยืนยันลบรายการเป้าหมายของหน้านั้นผ่าน API และปรับ cache/selection หลังสำเร็จ |
| `formatDate` | 162 | แปลงวันเวลาสำหรับรายการผู้ใช้ตามภาษา |
| `resetFilters` | 163 | คืนค่าค้นหา ตัวกรอง การเรียงและเลขหน้ากลับค่าเริ่มต้นของหน้า |
| `showProjects` | 164 | เลือกเจ้าของและสลับไปแท็บโครงการที่เกี่ยวข้อง |
| `identity` | 170 | render ชื่อ อีเมล avatar และ badge บทบาทของผู้ใช้ |
| `userStatus` | 171 | render badge สถานะบัญชี |
| `signals` | 172 | render สัญญาณควรตรวจสอบและสถานะบล็อกการสร้างโครงการ |

## `src/pages/VerifyEmail.jsx`

[src/pages/VerifyEmail.jsx](../../src/pages/VerifyEmail.jsx)

อ่าน token ใน URL ให้กดยืนยันบัญชี หรือขอส่งลิงก์ใหม่เมื่อไม่มี token

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `VerifyEmail` | 9 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `verify` | 27 | POST token ยืนยันอีเมล แสดงผลสำเร็จและล้าง token จาก URL เมื่อจบ |
| `resend` | 39 | POST ขออีเมลยืนยันใหม่และเริ่ม cooldown 60 วินาทีในหน้าจอ |

## `src/pages/WorkSpace.jsx`

[src/pages/WorkSpace.jsx](../../src/pages/WorkSpace.jsx)

รายการโครงการของผู้ใช้/งานกรรมการ ค้นหา filter เรียงและลบโครงการ; polling 30 วินาที

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `statusVariant` | 37 | แปลงสถานะโครงการเป็นสี badge |
| `getJudgeProgress` | 48 | นับทีมที่มอบหมายให้กรรมการและจำนวนใบที่ส่งแล้ว |
| `compareByUpcomingDeadline` | 69 | เรียงโครงการตาม deadline ที่ใกล้ถึงก่อน ตามด้วยที่หมดเวลาแล้วและที่ไม่มี deadline |
| `Workspace` | 90 | ประกอบ UI/สถานะและ callback ตามหน้าที่ไฟล์ข้างต้น |
| `confirmDeleteProject` | 138 | ยืนยัน DELETE โครงการและนำรายการออกจาก Workspace หลังเซิร์ฟเวอร์ยืนยัน |

## `src/utils/visiblePolling.js`

[src/utils/visiblePolling.js](../../src/utils/visiblePolling.js)

ตัวจัดเวลา polling ที่รอคำขอเสร็จ หยุดเมื่อแท็บซ่อน เพิ่มช่วงรอเมื่อผิดพลาด และ cleanup เมื่อออกหน้า

| ฟังก์ชัน | บรรทัด | หน้าที่ |
| --- | --- | --- |
| `startVisiblePolling` | 2 | เริ่มตัวจัดเวลา polling และคืน refresh/stop โดยรองรับ visibility กับ exponential backoff |
| `visible` | 12 | ตรวจว่า document ไม่อยู่ในสถานะ hidden |
| `clear` | 13 | ยกเลิก timer ปัจจุบันและล้าง handle |
| `plan` | 14 | วาง timer รอบถัดไปหลัง request เสร็จ โดยเพิ่ม delay เมื่อผิดพลาดสูงสุด 120 วินาที |
| `run` | 18 | รวมคำขอพร้อมกันเป็น Promise เดียว ดำเนินงาน และวางรอบใหม่เมื่อเสร็จ |
| `onVisibility` | 31 | หยุด timer เมื่อซ่อน และสั่งดึงข้อมูลเมื่อกลับมา |
| `stop` | 36 | ทำให้ผลที่ยังรออยู่ inactive ล้าง timer และถอด listener |

## Callback ที่ไม่มีชื่อ

แต่ละไฟล์อาจใช้ `useEffect` สำหรับ subscription/timer, `useMemo` สำหรับ derived data, array `map/filter/reduce` เพื่อคำนวณ/แสดงรายการ และ JSX onClick/onChange เพื่อเรียก handler หรือ setter ภายใน callback ไม่ได้เป็น endpoint ใหม่ รายการ API ที่ตรวจจากจุดเรียกจริงดู [API.md](API.md)

## Export alias ที่ใช้ร่วมกัน

`ProjectStore.setJudgeAssignedTeams` เป็น alias ของ `JudgeTeamAssignmentStore.replaceJudgeTeamAssignments` ไม่ได้ประกาศ function body ซ้ำ ดูรายละเอียดการลบ/เพิ่ม assignment ในตารางของ store นั้น
