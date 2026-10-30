# ไฟล์ประกอบและการทดสอบ

[กลับสารบัญ](README.md)

## ไฟล์ config / build / deploy / scripts

| ไฟล์ | หน้าที่ |
| --- | --- |
| [package.json](../../package.json) | dependencies และ scripts dev/build/lint/test ของ Frontend |
| [package-lock.json](../../package-lock.json) | ล็อก dependency tree และ integrity ให้ npm ci ติดตั้งชุดเดิม ไม่ใช่ source ธุรกิจ |
| [vite.config.js](../../vite.config.js) | React/Tailwind/Babel React Compiler plugins และ proxy /api ไป localhost:8080 เฉพาะ dev |
| [vercel.json](../../vercel.json) | SPA rewrite ให้เปิด deep link Verify/Reset/หน้าภายในโดยตรงแล้วเข้า index.html |
| [eslint.config.js](../../eslint.config.js) | กฎตรวจ JavaScript/React hooks ไม่ใช่กฎตรวจสิทธิ์ production |
| [index.html](../../index.html) | HTML entry มี root ที่ React mount และ metadata/favicon ของเว็บ |
| [.env.example](../../.env.example) | ตัวอย่าง environment ของ Frontend ใช้ API URL ไม่มี secret จริง |
| [.gitignore](../../.gitignore) | กัน dependencies ผล build env/config ส่วนตัวและไฟล์ชั่วคราวจากการ commit |
| [MultiRole.code-workspace](../../MultiRole.code-workspace) | ตั้ง VSCode workspace ให้ใช้ monorepo นี้เป็นหลัก |
| [README.md](../../README.md) | วิธีเริ่มงานและสถาปัตยกรรมระดับ repository ไม่ใช่โค้ด runtime |
| [public/favicon.svg](../../public/favicon.svg) | ไอคอนเว็บที่ให้บริการเป็น static asset |
| [public/icons.svg](../../public/icons.svg) | static SVG icons ใน public ไม่ใช่ API หรือโค้ดธุรกิจ |
| [backend/pom.xml](../../backend/pom.xml) | Maven coordinates Spring Boot 4.1.1 Java17 dependencies และ plugins |
| [backend/Dockerfile](../../backend/Dockerfile) | multi-stage Maven build ข้าม tests และรัน JAR แบบ non-root ด้วย prod profile |
| [backend/.dockerignore](../../backend/.dockerignore) | กันไฟล์ local config env .git และ target ไม่เข้า Docker context |
| [backend/.env.example](../../backend/.env.example) | ตัวอย่างชื่อ environment ฝั่ง Backend แยกจากค่าจริงของผู้ใช้ |
| [backend/.gitignore](../../backend/.gitignore) | กัน target local config env และไฟล์ที่ไม่ควร publish |
| [backend/.gitattributes](../../backend/.gitattributes) | กำหนด line endings ของ mvnw/mvnw.cmd ให้ตรงระบบปฏิบัติการ |
| [backend/Start-Backend.ps1](../../backend/Start-Backend.ps1) | เริ่ม Backend จาก directory ที่ถูกต้องและเรียก Maven wrapper เพื่อโหลด config ตามตำแหน่ง |
| [backend/mvnw](../../backend/mvnw) | Maven Wrapper สำหรับ Unix ใช้ Maven distribution ที่ตั้งใน wrapper properties ไม่ใช่ business function ของแอป |
| [backend/mvnw.cmd](../../backend/mvnw.cmd) | Maven Wrapper สำหรับ Windows ใช้ Maven distribution ที่ตั้งใน wrapper properties ไม่ใช่ business function ของแอป |
| [backend/.mvn/wrapper/maven-wrapper.properties](../../backend/.mvn/wrapper/maven-wrapper.properties) | URL/distribution ของ Maven wrapper |
| [backend/config/application-local.properties.example](../../backend/config/application-local.properties.example) | ตัวอย่าง properties สำหรับรันบนเครื่อง สำเนาค่าจริงถูก ignore และไม่อยู่ในรายงาน |
| [backend/scripts/repair-users-timestamp.sql](../../backend/scripts/repair-users-timestamp.sql) | SQL ซ่อม timestamp ผู้ใช้ legacy ใช้เฉพาะเมื่อประเมินปัญหาและสำรองข้อมูลแล้ว ไม่รันอัตโนมัติตอน Deploy |
| [backend/README.md](../../backend/README.md) | คำแนะนำรัน/ทดสอบ/config/Docker ของ Backend หัวข้อ Railway ในไฟล์เป็นแนวทางเดิม ระบบที่ Deploy ใน session ใช้ Render |
| [backend/EMAIL_SETUP.md](../../backend/EMAIL_SETUP.md) | คำแนะนำ Brevo verification/reset/reminder และวิธีตรวจคิวอีเมล |

## Frontend tests

`npm test` ใช้ Node test runner บาง suite เปิด Vite SSR เพื่อ import store แล้ว mock Axios adapter ไม่ใช่ browser end-to-end tests ทุกหน้าจอ

### `tests/batch-submission.test.js`

[tests/batch-submission.test.js](../../tests/batch-submission.test.js)

ทีมพร้อม/ไม่ครบ/ส่งแล้วและ snapshot ต้องรวมทีมที่ซ่อนใน filter

| ลำดับ | Testcase ที่ประกาศ |
| --- | --- |
| 1 | batch readiness includes hidden assigned teams and all hidden criteria |
| 2 | submitted teams are excluded even when their local scores have been edited |
| 3 | zero numeric and fail scores are complete and valid |
| 4 | invalid values and missing scores are excluded with actionable criteria |
| 5 | a competition with no criteria never produces ready submissions |
| 6 | review captures scores and feedback without retaining mutable form references |

### `tests/group-assignment-stores.test.js`

[tests/group-assignment-stores.test.js](../../tests/group-assignment-stores.test.js)

โหลด API จริงผ่าน mock adapter, UUID/identity, store writes, batch receipts, partial/error behavior และป้องกัน cache กลับหลัง Logout

| ลำดับ | Testcase ที่ประกาศ |
| --- | --- |
| 1 | UUIDs distinguish projects, teams, memberships and judge ownership after server hydration |
| 2 | evaluation writes use API score arrays and reload saved server results |
| 3 | failed writes reject and leave the server cache unchanged |
| 4 | competition membership role comes from the server and logout clears private data |
| 5 | an admin who judges appears in both workspaces and retains admin access |
| 6 | new rubric criteria use server UUIDs and persist multiline descriptions via the API |
| 7 | reordering teams persists UUID order and reloads it from the server |
| 8 | deadline locks editing at the exact deadline and permits editing when unset |
| 9 | batch submission uses one request and accepts only confirmed per-team receipts into the cache |
| 10 | a lost batch response leaves cached scores unchanged for a safe retry |
| 11 | bulk grouping makes one request and hydrates memberships from the confirmed response |
| 12 | failed bulk grouping preserves cached memberships and teams |
| 13 | a late bulk response cannot restore private cache after logout |
| 14 | workspace background refresh keeps cached projects visible until requests finish |

### `tests/project-lock.test.js`

[tests/project-lock.test.js](../../tests/project-lock.test.js)

สถานะ/flag ล็อกโครงสร้างฝั่ง Frontend

| ลำดับ | Testcase ที่ประกาศ |
| --- | --- |
| 1 | only a draft that has never opened permits setup writes, including legacy status responses |

### `tests/project-readiness.test.js`

[tests/project-readiness.test.js](../../tests/project-readiness.test.js)

เงื่อนไขครบขั้นก่อนเปิดรับคะแนนและ deadline

| ลำดับ | Testcase ที่ประกาศ |
| --- | --- |
| 1 | draft setup stays incomplete when empty; teams and judges can be added before criteria |
| 2 | every team needs a current judge; duplicate and stale assignments do not inflate coverage |
| 3 | decimal weights use persisted hundredths and still require at least one criterion |
| 4 | one judge may cover all teams; neither a group nor a deadline is required |
| 5 | activation deadline permits no deadline and future times, blocks the exact deadline, past and invalid values |

### `tests/rubric.test.js`

[tests/rubric.test.js](../../tests/rubric.test.js)

parse/serialize/hydrate rubric และค่าเริ่มต้น

| ลำดับ | Testcase ที่ประกาศ |
| --- | --- |
| 1 | editing an existing plain description does not erase it |
| 2 | custom star ranges and percentage labels survive repeated editing |
| 3 | both evaluation views can display inline star rubric descriptions consistently |
| 4 | low numeric maximum scores do not produce negative or reversed ranges |

### `tests/team-import.test.js`

[tests/team-import.test.js](../../tests/team-import.test.js)

ตรวจ .xlsx header/เซลล์/สูตร/ลิงก์ และรูปไฟล์เสีย/เข้ารหัส

| ลำดับ | Testcase ที่ประกาศ |
| --- | --- |
| 1 | reads real XLSX bytes, Thai rich text and hyperlink targets instead of display labels |
| 2 | maps reordered English headers with an ordinal column and ignores empty formatting rows |
| 3 | handles a blank first worksheet and preserves the first team when there is no header |
| 4 | uses optional named columns without importing unrelated column values |
| 5 | validates field limits and URLs before any server write |
| 6 | reads cached formulas including zero and literal HYPERLINK URLs; rejects Excel cell errors |
| 7 | distinguishes legacy, encrypted, empty, renamed and corrupt files |

### `tests/team-order-identity.test.js`

[tests/team-order-identity.test.js](../../tests/team-order-identity.test.js)

resolve ชื่อกรรมการและ natural sorting/การย้ายลำดับ UUID

| ลำดับ | Testcase ที่ประกาศ |
| --- | --- |
| 1 | judge details use names and email from the API, even when the directory no longer contains them |
| 2 | legacy evaluations can resolve identities by UUID and never display the raw UUID as a name |
| 3 | team names use natural numeric sorting and saved order overrides names |
| 4 | group filtering, search and sorting retain the saved order within a group |
| 5 | moving one team sends a complete permutation of UUIDs and protects boundaries |

### `tests/visiblePolling.test.js`

[tests/visiblePolling.test.js](../../tests/visiblePolling.test.js)

ตรวจไม่เรียกซ้อน ซ่อน/กลับแท็บ backoff และออกหน้าระหว่าง request

| ลำดับ | Testcase ที่ประกาศ |
| --- | --- |
| 1 | polling shares an in-flight request and schedules the next request after completion |
| 2 | polling pauses while hidden, refreshes on return and removes listeners on unmount |
| 3 | failures back off to two minutes and successful refresh restores the normal interval |
| 4 | leaving during a request prevents rescheduling and marks its result inactive |

## Backend tests

`backend/src/test/resources/application-test.properties` ใช้ H2 ใน MySQL mode, ปิดงาน dispatch/reminder ระหว่างทดสอบ และใช้คีย์ทดสอบ ไม่ใช่รหัสจริงของ Production

### `ApiIntegrationTests.java`

[backend/src/test/java/org/cesystem/multirole/ApiIntegrationTests.java](../../backend/src/test/java/org/cesystem/multirole/ApiIntegrationTests.java)

authentication/สิทธิ์/workflow หลักและกรรมการร่วมทีมที่ draft ต้องเป็นส่วนตัว

| ลำดับ | Test method |
| --- | --- |
| 1 | sharedTeamKeepsDraftsPrivateAndAveragesOnlySubmittedJudges |
| 2 | invitationNotifiesOnlyTheInvitedUserWithoutQueuingEmail |
| 3 | separateJudgeSessionsCannotCrossAssignmentsOrReadAnotherJudgesHistory |
| 4 | fullCompetitionWorkflowAndAccessControls |

### `BatchEvaluationTests.java`

[backend/src/test/java/org/cesystem/multirole/BatchEvaluationTests.java](../../backend/src/test/java/org/cesystem/multirole/BatchEvaluationTests.java)

ส่งหลายทีมแยก transaction ความครบ partial failure และไม่ทับใบที่ส่งแล้ว

| ลำดับ | Test method |
| --- | --- |
| 1 | partialFailureCommitsSuccessAndPreservesFailedDraft |
| 2 | retryNeverOverwritesSubmittedScoresCommentsOrTimestamps |
| 3 | incompleteAndInvalidEntriesDoNotBlockValidZeroScores |
| 4 | malformedRequestsAndUnauthorizedAccountsCannotSubmit |
| 5 | deadlineAndClosedCompetitionRejectEveryWrite |
| 6 | simultaneousBatchesSubmitEachTeamOnce |
| 7 | historyCapturesDraftSubmissionAndEditsWithPrivateDraftsAndNoDuplicateRetry |
| 8 | failedWritesAndConcurrentRetriesDoNotCreateAuditEntries |
| 9 | rollbackRevertsBothScoreAndHistory |
| 10 | legacyScoresGainBeforeSnapshotOnNextEditAndHistoryIsPaginated |
| 11 | concurrentEditsKeepAContinuousBeforeAndAfterChain |

### `BulkGroupTests.java`

[backend/src/test/java/org/cesystem/multirole/BulkGroupTests.java](../../backend/src/test/java/org/cesystem/multirole/BulkGroupTests.java)

ย้ายกลุ่มหลายทีม transaction ตรวจทั้งชุด และข้อจำกัดโครงการ

| ลำดับ | Test method |
| --- | --- |
| 1 | movesAllSelectedTeamsRetriesSafelyAndRemovesMemberships |
| 2 | rejectsInvalidTeamsAndGroupsWithoutMovingValidTeams |
| 3 | onlyCompetitionAdminsCanMoveTeams |
| 4 | concurrentMovesLeaveEveryTeamInOneConsistentGroup |
| 5 | deletingDestinationDuringMoveNeverLeavesPartialMemberships |

### `CriteriaPolicyTests.java`

[backend/src/test/java/org/cesystem/multirole/CriteriaPolicyTests.java](../../backend/src/test/java/org/cesystem/multirole/CriteriaPolicyTests.java)

ล็อกเกณฑ์และแข่งขันกับการเปิดรับคะแนน

| ลำดับ | Test method |
| --- | --- |
| 1 | draftCriteriaRemainEditableBeforeFirstActivation |
| 2 | openingLocksEveryCriteriaWriteEvenWithoutScoresAndAcrossPausesAndClosure |
| 3 | pastDeadlineRejectsActivationWithoutLockingTheDraft |
| 4 | clearingAnExpiredDeadlineAllowsActivationWithoutATimeLimit |
| 5 | legacyOpenAndPausedScoredProjectsStayLockedAfterMigration |
| 6 | activationAndAnOpenEditFormSerializeWithoutAnEditAfterTheLock |

### `EmailWorkflowTests.java`

[backend/src/test/java/org/cesystem/multirole/EmailWorkflowTests.java](../../backend/src/test/java/org/cesystem/multirole/EmailWorkflowTests.java)

verify/reset/outbox/retry/reminder โดยใช้ H2 และ HTTP mock แทนส่งจริง

| ลำดับ | Test method |
| --- | --- |
| 1 | newRegistrationRequiresConfirmationAndTokenIsSingleUse |
| 2 | oldUnverifiedAccountsStillLogin |
| 3 | resendHasCooldownRevokesOldLinksAndDoesNotRevealUnknownEmails |
| 4 | expiredVerificationFailsAndIsNotSent |
| 5 | passwordResetIsSingleUseHasCooldownAndRevokesExistingSessions |
| 6 | expiredResetCannotChangePasswordAndUnknownEmailHasGenericResponse |
| 7 | providerReceivesHeaderSafeHtmlAndReceiptClearsPayload |
| 8 | transientFailureRetriesButAuthenticationFailureStops |
| 9 | manualReminderPersistsInAppEvenWhenEmailFailsAndEnforcesCooldownAndAccess |
| 10 | automaticReminderIsOnceAndIncludesDraftsButSkipsCompletedClosedAndNoAssignment |
| 11 | reminderRequiresDeadlineAndOutstandingWorkAndRechecksBeforeSending |
| 12 | manualAndAutomaticShareCooldownAndSuspendedUnverifiedJudgesAreSkipped |
| 13 | concurrentManualRequestsKeepTheOneHourCooldown |
| 14 | concurrentAutomaticAndDeliveryCallsDoNotCreateDuplicateReminders |

### `MultiRoleApplicationTests.java`

[backend/src/test/java/org/cesystem/multirole/MultiRoleApplicationTests.java](../../backend/src/test/java/org/cesystem/multirole/MultiRoleApplicationTests.java)

Spring ApplicationContext เริ่มได้ใน test profile

| ลำดับ | Test method |
| --- | --- |
| 1 | contextLoads |

### `ProjectMonitoringTests.java`

[backend/src/test/java/org/cesystem/multirole/ProjectMonitoringTests.java](../../backend/src/test/java/org/cesystem/multirole/ProjectMonitoringTests.java)

quota/signals/บล็อกสร้างและหน้าที่ System Admin

| ลำดับ | Test method |
| --- | --- |
| 1 | quotasAuditMonitoringAndCreationBlock |

### `ProjectReadinessTests.java`

[backend/src/test/java/org/cesystem/multirole/ProjectReadinessTests.java](../../backend/src/test/java/org/cesystem/multirole/ProjectReadinessTests.java)

ตรวจ readiness ก่อนเปลี่ยน ACTIVE

| ลำดับ | Test method |
| --- | --- |
| 1 | activationRequiresAllPrerequisitesEvenForDirectApiCalls |

### `ProjectStructureTests.java`

[backend/src/test/java/org/cesystem/multirole/ProjectStructureTests.java](../../backend/src/test/java/org/cesystem/multirole/ProjectStructureTests.java)

ป้องกันการแก้โครงสร้างหลังเปิดรับคะแนนรวม stale request

| ลำดับ | Test method |
| --- | --- |
| 1 | everySetupWriteStaysLockedAcrossPauseCloseAndSystemAdmin |
| 2 | draftStructureCanStillBeEditedAndDeleted |
| 3 | lockedMetadataCannotChangeButDeadlineChangesAreAuditedAtomically |
| 4 | activationAndTeamEditsSerializeOnOneCompetitionRow |

## หลักฐาน Backend ที่มีอยู่ในเครื่อง

อ่าน summary จาก Surefire XML เดิม ณ เวลาจัดทำเอกสาร ไม่ได้รัน Backend tests ใหม่ในงานเขียนรายงานนี้ และไม่ฝัง system properties/log ที่อาจมีข้อมูลส่วนตัว

| Suite | Tests | Failures | Errors | Skipped |
| --- | --- | --- | --- | --- |
| org.cesystem.multirole.ApiIntegrationTests | 4 | 0 | 0 | 0 |
| org.cesystem.multirole.BatchEvaluationTests | 11 | 0 | 0 | 0 |
| org.cesystem.multirole.BulkGroupTests | 5 | 0 | 0 | 0 |
| org.cesystem.multirole.CriteriaPolicyTests | 6 | 0 | 0 | 0 |
| org.cesystem.multirole.EmailWorkflowTests | 14 | 0 | 0 | 0 |
| org.cesystem.multirole.MultiRoleApplicationTests | 1 | 0 | 0 | 0 |
| org.cesystem.multirole.ProjectMonitoringTests | 1 | 0 | 0 | 0 |
| org.cesystem.multirole.ProjectReadinessTests | 1 | 0 | 0 | 0 |
| org.cesystem.multirole.ProjectStructureTests | 4 | 0 | 0 | 0 |

## ขอบเขต coverage

รายการ source และ SHA-256 ดู [SOURCE_MANIFEST.json](SOURCE_MANIFEST.json); API machine-readable ดู [API_REFERENCE.json](API_REFERENCE.json) ไม่รวม dependencies/generated assets หรือ private local config เอกสารนี้บอกหน้าที่จาก source ไม่ใช่ statement coverage report และยังไม่มีหลักฐานรับรอง load/performance/ทุก browser บน Production
