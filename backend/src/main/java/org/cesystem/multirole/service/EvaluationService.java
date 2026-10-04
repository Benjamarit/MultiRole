package org.cesystem.multirole.service;

import org.cesystem.multirole.dto.EvaluationRequest;
import org.cesystem.multirole.model.*;
import org.cesystem.multirole.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Optional;

@Service
public class EvaluationService {

    @Autowired private EvaluationRepository evaluationRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CompetitionRepository competitionRepository;
    @Autowired private TeamRepository teamRepository;
    @Autowired private CriteriaRepository criteriaRepository;

    @Transactional
    public void upsertEvaluation(EvaluationRequest request, String judgeEmail) {
        // 1. ดึงข้อมูลประกอบ
        User judge = userRepository.findByEmail(judgeEmail)
                .orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลกรรมการ"));

        Competition competition = competitionRepository.findById(request.getCompetitionId())
                .orElseThrow(() -> new RuntimeException("ไม่พบการแข่งขัน"));

        Team team = teamRepository.findById(request.getTeamId())
                .orElseThrow(() -> new RuntimeException("ไม่พบทีมผู้เข้าแข่งขัน"));

        // 2. เช็ก Deadline (ถ้ามีตั้งค่าไว้ และเวลาปัจจุบันเลยเส้นตายไปแล้ว)
        if (competition.getEvaluationDeadline() != null && LocalDateTime.now().isAfter(competition.getEvaluationDeadline())) {
            throw new RuntimeException("ไม่สามารถบันทึกได้ เนื่องจากหมดเวลาการประเมินแล้ว");
        }

        // 3. ค้นหาว่าเคยให้คะแนนแล้วหรือไม่ (UPSERT LOGIC)
        Optional<Evaluation> existingEvalOpt = evaluationRepository.findByCompetitionAndTeamAndJudge(competition, team, judge);

        // 4. เช็กว่าเคยกด SUBMIT ไปแล้วหรือไม่
        if (existingEvalOpt.isPresent() && "SUBMITTED".equals(existingEvalOpt.get().getStatus())) {
            throw new RuntimeException("ไม่สามารถแก้ไขได้ เนื่องจากคุณได้กดยืนยันผลการประเมินไปแล้ว");
        }

        // ถ้ามีอยู่แล้วให้ใช้ตัวเดิม (Update) ถ้ายังไม่มีให้สร้างใหม่ (Insert)
        Evaluation evaluation = existingEvalOpt.orElse(new Evaluation());

        // 5. อัปเดตข้อมูล Evaluation หลัก
        evaluation.setCompetition(competition);
        evaluation.setTeam(team);
        evaluation.setJudge(judge);
        evaluation.setComment(request.getComment());
        evaluation.setStatus(request.getStatus());
        evaluation.setUpdateAt(LocalDateTime.now());

        if ("SUBMITTED".equals(request.getStatus())) {
            evaluation.setSubmitAt(LocalDateTime.now());
        }

        // 6. จัดการคะแนนรายข้อ (ล้างของเก่า และใส่ของใหม่เข้าไปแทน)
        if (evaluation.getScores() == null) {
            evaluation.setScores(new ArrayList<>());
        } else {
            evaluation.getScores().clear(); // Orphan Removal จะช่วยลบข้อมูลใน DB ให้เมื่อเราเคลียร์ List
        }

        BigDecimal totalScore = BigDecimal.ZERO;

        for (EvaluationRequest.ScoreRequest scoreReq : request.getScores()) {
            Criteria criteria = criteriaRepository.findById(scoreReq.getCriteriaId())
                    .orElseThrow(() -> new RuntimeException("ไม่พบเกณฑ์การประเมินรหัส: " + scoreReq.getCriteriaId()));

            Score score = new Score();
            score.setEvaluation(evaluation);
            score.setCriteria(criteria);
            score.setScoreValue(scoreReq.getScoreValue());
            score.setComment(scoreReq.getComment());
            score.setCreatedAt(LocalDateTime.now());
            score.setUpdatedAt(LocalDateTime.now());

            evaluation.getScores().add(score);
            totalScore = totalScore.add(scoreReq.getScoreValue());
        }

        evaluation.setTotalScore(totalScore);

        // 7. บันทึกข้อมูลลงฐานข้อมูล (Hibernate จะจัดการ INSERT/UPDATE ให้อัตโนมัติจากค่า PK)
        evaluationRepository.save(evaluation);
    }
}