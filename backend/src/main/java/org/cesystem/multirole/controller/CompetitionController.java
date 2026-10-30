package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.CompetitionRequest;
import org.cesystem.multirole.dto.ApiDtos.CompetitionResponse;
import org.cesystem.multirole.dto.ApiDtos.StatusRequest;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.CompetitionUser;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.CompetitionRepository;
import org.cesystem.multirole.repository.CompetitionUserRepository;
import org.cesystem.multirole.service.AccessService;
import org.cesystem.multirole.service.Validation;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/competitions")
@RequiredArgsConstructor
public class CompetitionController {

    private static final Set<String> STATUSES = Set.of("DRAFT", "ACTIVE", "CLOSED");

    private final CompetitionRepository competitionRepository;
    private final CompetitionUserRepository competitionUserRepository;
    private final org.cesystem.multirole.service.ProjectReadinessService readiness;
    private final AccessService access;
    private final org.cesystem.multirole.service.CriteriaPolicy criteriaPolicy;
    private final org.cesystem.multirole.service.ProjectCreationPolicy creationPolicy;
    private final org.cesystem.multirole.service.ProjectActivityService activity;
    private final org.cesystem.multirole.repository.EvaluationRepository evaluationRepository;
    private final org.cesystem.multirole.repository.DeadlineHistoryRepository deadlineHistory;

    /** การแข่งขันที่ผู้ใช้ปัจจุบันเป็นสมาชิก (system admin เห็นทั้งหมด) */
    @GetMapping
    @Transactional(readOnly = true)
    public List<CompetitionResponse> list(Principal principal) {
        User user = access.currentUser(principal);
        List<Competition> competitions = access.isSystemAdmin(user)
                ? competitionRepository.findAll()
                : competitionUserRepository.findByUser_UserId(user.getUserId()).stream()
                .map(CompetitionUser::getCompetition)
                .toList();
        return competitions.stream().map(c -> CompetitionResponse.from(c,
                access.competitionRole(c.getCompetitionId(), user))).toList();
    }

    @GetMapping("/{competitionId}")
    @Transactional(readOnly = true)
    public CompetitionResponse get(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        return CompetitionResponse.from(access.requireMember(competitionId, user),
                access.competitionRole(competitionId, user));
    }

    /** ผู้สร้างจะเป็น ADMIN ของการแข่งขันนี้อัตโนมัติ */
    @GetMapping("/creation-quota")
    @Transactional(readOnly = true)
    public org.cesystem.multirole.service.ProjectCreationPolicy.Quota quota(Principal principal) {
        return creationPolicy.quota(access.currentUser(principal));
    }

    @PostMapping
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public CompetitionResponse create(@RequestBody CompetitionRequest request, Principal principal) {
        User user = access.currentUser(principal);
        String title = Validation.requireText(request.title(), "กรุณาระบุชื่อการแข่งขัน", 200);
        creationPolicy.requireAllowed(user);
        if (competitionRepository.existsByTitleIgnoreCase(title)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ชื่อการแข่งขันนี้ถูกใช้แล้ว");
        }

        Competition competition = new Competition();
        competition.setTitle(title);
        competition.setDescription(Validation.optionalText(request.description(), "คำอธิบาย", 65_000));
        competition.setCategory(Validation.optionalText(request.category(), "หมวดหมู่", 20));
        competition.setEvaluationDeadline(request.evaluationDeadline());
        competition.setStatus("DRAFT");
        competition.setCreatedBy(user);
        competition = competitionRepository.save(competition);

        CompetitionUser admin = new CompetitionUser();
        admin.setCompetition(competition);
        admin.setUser(user);
        admin.setRole(AccessService.ROLE_ADMIN);
        competitionUserRepository.save(admin);
        activity.record(user.getUserId(), "PROJECT_CREATED", "สร้างโครงการ: " + title);

        return CompetitionResponse.from(competition);
    }

    @PutMapping("/{competitionId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public CompetitionResponse update(@PathVariable UUID competitionId,
                                      @RequestBody CompetitionRequest request,
                                      Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = access.requireCompetitionAdmin(competitionId, user);
        criteriaPolicy.lock(competition);

        String title = Validation.requireText(request.title(), "กรุณาระบุชื่อการแข่งขัน", 200);
        String description = Validation.optionalText(request.description(), "คำอธิบาย", 65_000);
        String category = Validation.optionalText(request.category(), "หมวดหมู่", 20);
        if (criteriaPolicy.isLocked(competition) && (!title.equals(competition.getTitle())
                || !java.util.Objects.equals(description, competition.getDescription())
                || !java.util.Objects.equals(category, competition.getCategory()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "ข้อมูลโครงการถูกล็อกหลังเปิดรับคะแนนแล้ว เปลี่ยนได้เฉพาะกำหนดเวลาปิดรับคะแนน");
        }
        if (competitionRepository.existsByTitleIgnoreCaseAndCompetitionIdNot(title, competitionId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ชื่อการแข่งขันนี้ถูกใช้แล้ว");
        }

        competition.setTitle(title);
        competition.setDescription(description);
        competition.setCategory(category);
        if (!java.util.Objects.equals(competition.getEvaluationDeadline(), request.evaluationDeadline())) {
            var event = new org.cesystem.multirole.model.DeadlineHistory();
            event.setCompetition(competition);
            event.setActorId(user.getUserId());
            event.setActorName(user.getFullName());
            event.setActorEmail(user.getEmail());
            event.setPreviousDeadline(competition.getEvaluationDeadline());
            event.setNewDeadline(request.evaluationDeadline());
            deadlineHistory.save(event);
        }
        competition.setEvaluationDeadline(request.evaluationDeadline());
        return CompetitionResponse.from(competitionRepository.save(competition));
    }

    public record DeadlineChange(UUID id, String actorName, String actorEmail,
                                 LocalDateTime previousDeadline, LocalDateTime newDeadline, LocalDateTime changedAt) {}

    @GetMapping("/{competitionId}/deadline-history")
    @Transactional(readOnly = true)
    public List<DeadlineChange> deadlineChanges(@PathVariable UUID competitionId, Principal principal) {
        access.requireCompetitionAdmin(competitionId, access.currentUser(principal));
        return deadlineHistory.findTop20ByCompetition_CompetitionIdOrderByChangedAtDescIdDesc(competitionId).stream()
            .map(e -> new DeadlineChange(e.getId(), e.getActorName(), e.getActorEmail(),
                e.getPreviousDeadline(), e.getNewDeadline(), e.getChangedAt())).toList();
    }

    /** เปลี่ยนสถานะ DRAFT / ACTIVE / CLOSED (เปิด ACTIVE ได้เมื่อเกณฑ์ ทีม กรรมการ และการมอบหมายพร้อม) */
    @PatchMapping("/{competitionId}/status")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public CompetitionResponse updateStatus(@PathVariable UUID competitionId,
                                            @RequestBody StatusRequest request,
                                            Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = access.requireCompetitionAdmin(competitionId, user);
        criteriaPolicy.lock(competition);

        String status = request.status() == null ? "" : request.status().trim().toUpperCase();
        if (!STATUSES.contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "สถานะต้องเป็น DRAFT, ACTIVE หรือ CLOSED");
        }

        if ("ACTIVE".equals(status)) {
            readiness.requireReady(competitionId);
            competition.setCriteriaLocked(true);
        }
        if (!"DRAFT".equals(competition.getStatus())) competition.setCriteriaLocked(true);

        competition.setStatus(status);
        competition.setClosedAt("CLOSED".equals(status) ? LocalDateTime.now() : null);
        return CompetitionResponse.from(competitionRepository.save(competition));
    }

    /** ลบการแข่งขัน (ข้อมูลลูกถูกลบตาม ON DELETE CASCADE ใน DB) */
    @DeleteMapping("/{competitionId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void delete(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = access.requireCompetitionAdmin(competitionId, user);
        criteriaPolicy.lock(competition);
        // Scores restrict deletion of criteria. Remove evaluations and their scores first,
        // before the database cascades deletion of the competition's criteria.
        evaluationRepository.deleteAll(evaluationRepository.findByCompetition_CompetitionId(competitionId));
        evaluationRepository.flush();
        competitionRepository.delete(competition);
    }
}
