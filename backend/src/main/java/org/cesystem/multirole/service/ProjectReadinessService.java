package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.Criteria;
import org.cesystem.multirole.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectReadinessService {
    private final CriteriaRepository criteria;
    private final CompetitionRepository competitions;
    private final TeamRepository teams;
    private final CompetitionUserRepository members;
    private final JudgeAssignmentRepository assignments;

    public void requireReady(UUID competitionId) {
        var missing = new ArrayList<String>();
        var competition = competitions.findById(competitionId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบโครงการนี้"));
        if (competition.getEvaluationDeadline() != null && !competition.getEvaluationDeadline().isAfter(java.time.LocalDateTime.now()))
            missing.add("กำหนดเวลาปิดรับคะแนนผ่านไปแล้ว กรุณาเปลี่ยนเป็นเวลาในอนาคตก่อนเปิดรับคะแนน");
        var rubric = criteria.findByCompetition_CompetitionId(competitionId);
        BigDecimal total = rubric.stream().map(Criteria::getWeightPercentage).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (rubric.isEmpty() || total.compareTo(new BigDecimal("100")) != 0)
            missing.add("กำหนดเกณฑ์ประเมินให้น้ำหนักรวมครบ 100% (ตอนนี้ " + total + "%)");
        var projectTeams = teams.findByCompetition_CompetitionId(competitionId);
        if (projectTeams.isEmpty()) missing.add("เพิ่มทีมเข้าแข่งขันอย่างน้อย 1 ทีม");
        Set<UUID> judgeIds = members.findByCompetition_CompetitionId(competitionId).stream()
            .filter(m -> AccessService.hasJudgeRole(m.getRole())).map(m -> m.getUser().getUserId()).collect(Collectors.toSet());
        if (judgeIds.isEmpty()) missing.add("เพิ่มกรรมการอย่างน้อย 1 คน");
        Set<UUID> assigned = assignments.findByCompetition_CompetitionId(competitionId).stream()
            .filter(a -> judgeIds.contains(a.getJudge().getUserId()))
            .map(a -> a.getTeam().getTeamId()).collect(Collectors.toSet());
        long remaining = projectTeams.stream().filter(t -> !assigned.contains(t.getTeamId())).count();
        if (remaining > 0) missing.add("มอบหมายกรรมการให้ครบทุกทีม (ยังขาด " + remaining + " ทีม)");
        if (!missing.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
            "ยังเปิดรับคะแนนไม่ได้: " + String.join("; ", missing));
    }
}
