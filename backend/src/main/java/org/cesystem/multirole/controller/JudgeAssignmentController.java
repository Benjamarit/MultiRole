package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.AssignmentRequest;
import org.cesystem.multirole.dto.ApiDtos.AssignmentResponse;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.JudgeAssignment;
import org.cesystem.multirole.model.Team;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.JudgeAssignmentRepository;
import org.cesystem.multirole.repository.TeamRepository;
import org.cesystem.multirole.repository.UserRepository;
import org.cesystem.multirole.service.AccessService;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/** มอบหมายกรรมการให้ประเมินทีม (Judge_Assignment) */
@RestController
@RequestMapping("/api/competitions/{competitionId}/assignments")
@RequiredArgsConstructor
public class JudgeAssignmentController {

    private final JudgeAssignmentRepository assignmentRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final AccessService access;
    private final org.cesystem.multirole.service.ProjectStructurePolicy structurePolicy;

    /** ผู้ดูแลเห็นทั้งหมด กรรมการเห็นเฉพาะของตัวเอง */
    @GetMapping
    @Transactional(readOnly = true)
    public List<AssignmentResponse> list(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        access.requireMember(competitionId, user);

        List<JudgeAssignment> assignments = access.isCompetitionAdmin(competitionId, user)
                ? assignmentRepository.findByCompetition_CompetitionId(competitionId)
                : assignmentRepository.findByCompetition_CompetitionIdAndJudge_UserId(
                competitionId, user.getUserId());
        return assignments.stream().map(AssignmentResponse::from).toList();
    }

    @PostMapping
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public AssignmentResponse assign(@PathVariable UUID competitionId,
                                     @RequestBody AssignmentRequest request,
                                     Principal principal) {
        User current = access.currentUser(principal);
        Competition competition = structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, current));

        if (request.judgeId() == null || request.teamId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุกรรมการและทีม");
        }

        // กรรมการต้องเป็นสมาชิกบทบาท JUDGE ของการแข่งขันนี้
        User judge = userRepository.findById(request.judgeId())
                .filter(u -> access.membership(competitionId, u)
                        .map(m -> AccessService.hasJudgeRole(m.getRole()))
                        .orElse(false))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "ผู้ใช้นี้ไม่ได้เป็นกรรมการของการแข่งขันนี้"));

        // ทีมต้องอยู่ในการแข่งขันเดียวกัน
        Team team = teamRepository.findById(request.teamId())
                .filter(t -> t.getCompetition().getCompetitionId().equals(competitionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบทีมนี้ในการแข่งขัน"));

        if (assignmentRepository.existsByJudge_UserIdAndTeam_TeamId(judge.getUserId(), team.getTeamId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "มอบหมายกรรมการคนนี้ให้ทีมนี้ไปแล้ว");
        }

        JudgeAssignment assignment = new JudgeAssignment();
        assignment.setCompetition(competition);
        assignment.setJudge(judge);
        assignment.setTeam(team);
        return AssignmentResponse.from(assignmentRepository.save(assignment));
    }

    /** ยกเลิกการมอบหมาย: ใบประเมินที่กรรมการให้ไปแล้วไม่ถูกลบ */
    @DeleteMapping("/{assignmentId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void unassign(@PathVariable UUID competitionId,
                         @PathVariable UUID assignmentId,
                         Principal principal) {
        User user = access.currentUser(principal);
        structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        JudgeAssignment assignment = assignmentRepository.findById(assignmentId)
                .filter(a -> a.getCompetition().getCompetitionId().equals(competitionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบการมอบหมายนี้"));
        assignmentRepository.delete(assignment);
    }
}
