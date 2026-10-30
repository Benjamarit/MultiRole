package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.MemberRequest;
import org.cesystem.multirole.dto.ApiDtos.MemberResponse;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.CompetitionUser;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.CompetitionUserRepository;
import org.cesystem.multirole.repository.JudgeAssignmentRepository;
import org.cesystem.multirole.repository.UserRepository;
import org.cesystem.multirole.service.AccessService;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** สมาชิกของการแข่งขัน (ตาราง Competition_user): ผู้ดูแล (ADMIN) และกรรมการ (JUDGE) */
@RestController
@RequestMapping("/api/competitions/{competitionId}/members")
@RequiredArgsConstructor
public class CompetitionUserController {

    private static final Set<String> ROLES = Set.of(AccessService.ROLE_ADMIN, AccessService.ROLE_JUDGE);

    private final CompetitionUserRepository competitionUserRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final UserRepository userRepository;
    private final AccessService access;
    private final org.cesystem.multirole.service.ProjectStructurePolicy structurePolicy;
    private final org.cesystem.multirole.repository.NotificationRepository notifications;

    @GetMapping
    @Transactional(readOnly = true)
    public List<MemberResponse> list(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        access.requireCompetitionAdmin(competitionId, user);
        return competitionUserRepository.findByCompetition_CompetitionId(competitionId).stream()
                .map(MemberResponse::from)
                .toList();
    }

    /** เพิ่มสมาชิกด้วยอีเมล: ผู้ใช้ต้องสมัครบัญชีไว้แล้ว */
    @PostMapping
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public MemberResponse add(@PathVariable UUID competitionId,
                              @RequestBody MemberRequest request,
                              Principal principal) {
        User current = access.currentUser(principal);
        Competition competition = structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, current));

        String role = request.role() == null ? "" : request.role().trim().toUpperCase();
        if (!ROLES.contains(role)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "บทบาทต้องเป็น ADMIN หรือ JUDGE");
        }
        if (request.email() == null || request.email().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุอีเมล");
        }

        User target = userRepository.findByEmail(request.email().trim().toLowerCase(java.util.Locale.ROOT))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "ไม่พบบัญชีผู้ใช้อีเมลนี้ ผู้ใช้ต้องสมัครสมาชิกก่อน"));

        var existing = access.membership(competitionId, target);
        if (existing.isPresent()) {
            // One membership row per user: retain ADMIN when adding judging duties.
            CompetitionUser member = existing.get();
            if (AccessService.ROLE_JUDGE.equals(role) && AccessService.ROLE_ADMIN.equals(member.getRole())) {
                member.setRole(AccessService.ROLE_ADMIN_JUDGE);
                notifyInvitation(competition, current, target, role);
                return MemberResponse.from(competitionUserRepository.save(member));
            }
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ผู้ใช้นี้อยู่ในการแข่งขันนี้แล้ว");
        }

        CompetitionUser member = new CompetitionUser();
        member.setCompetition(competition);
        member.setUser(target);
        member.setRole(role);
        notifyInvitation(competition, current, target, role);
        return MemberResponse.from(competitionUserRepository.save(member));
    }

    private void notifyInvitation(Competition competition, User inviter, User target, String role) {
        if (inviter.getUserId().equals(target.getUserId())) return;
        var notification = new org.cesystem.multirole.model.Notification();
        notification.setUser(target);
        notification.setCompetition(competition);
        notification.setType("PROJECT_INVITATION");
        notification.setTitle("คุณถูกเชิญเข้าร่วมโครงการ");
        notification.setMessage("คุณถูกเชิญเข้าโครงการ \"" + competition.getTitle() + "\" โดย "
            + inviter.getFullName() + " ในบทบาท" + (AccessService.ROLE_JUDGE.equals(role) ? "กรรมการ" : "ผู้ดูแลโครงการ"));
        notifications.save(notification); // In-app only: no email outbox entry.
    }

    /** ถอดสมาชิก: การมอบหมายทีมของกรรมการคนนั้นถูกลบด้วย แต่ใบประเมินที่ให้ไปแล้วยังอยู่ */
    @DeleteMapping("/{userId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void remove(@PathVariable UUID competitionId,
                       @PathVariable UUID userId,
                       Principal principal) {
        User current = access.currentUser(principal);
        structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, current));

        CompetitionUser member = competitionUserRepository
                .findByCompetition_CompetitionIdAndUser_UserId(competitionId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบสมาชิกนี้"));

        if (AccessService.ROLE_ADMIN_JUDGE.equals(member.getRole())) {
            // Removing a judge must never remove their project administration rights.
            judgeAssignmentRepository.deleteByCompetition_CompetitionIdAndJudge_UserId(competitionId, userId);
            member.setRole(AccessService.ROLE_ADMIN);
            competitionUserRepository.save(member);
            return;
        }

        if (AccessService.hasAdminRole(member.getRole())
                && competitionUserRepository.countByCompetition_CompetitionIdAndRoleIn(
                competitionId, List.of(AccessService.ROLE_ADMIN, AccessService.ROLE_ADMIN_JUDGE)) <= 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "ถอดผู้ดูแลคนสุดท้ายของการแข่งขันไม่ได้");
        }

        judgeAssignmentRepository.deleteByCompetition_CompetitionIdAndJudge_UserId(competitionId, userId);
        competitionUserRepository.delete(member);
    }
}
