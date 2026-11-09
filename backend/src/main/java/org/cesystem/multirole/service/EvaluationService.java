package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.EvaluationRequest;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.Criteria;
import org.cesystem.multirole.model.Evaluation;
import org.cesystem.multirole.model.Score;
import org.cesystem.multirole.model.Team;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.CompetitionRepository;
import org.cesystem.multirole.repository.CriteriaRepository;
import org.cesystem.multirole.repository.EvaluationRepository;
import org.cesystem.multirole.repository.JudgeAssignmentRepository;
import org.cesystem.multirole.repository.TeamRepository;
import org.cesystem.multirole.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * บันทึกใบประเมินของกรรมการ (กติกาเดียวกับ EvaluationStore.js / Scoring.js ฝั่ง frontend)
 * ใช้ ResponseStatusException เพื่อให้ EvaluationController ส่ง status ที่ถูกต้องกลับ (400/403/404/409)
 */
@Service
@RequiredArgsConstructor
public class EvaluationService {

    private static final BigDecimal HUNDRED = new BigDecimal("100");
    private static final String DRAFT = "DRAFT";
    private static final String SUBMITTED = "SUBMITTED";

    private final EvaluationRepository evaluationRepository;
    private final UserRepository userRepository;
    private final CompetitionRepository competitionRepository;
    private final TeamRepository teamRepository;
    private final CriteriaRepository criteriaRepository;
    private final JudgeAssignmentRepository judgeAssignmentRepository;
    private final EvaluationHistoryService history;

    private final jakarta.persistence.EntityManager entityManager;
    private record SaveOutcome(Evaluation evaluation, boolean alreadySubmitted) {}

    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void upsertEvaluation(EvaluationRequest request, String judgeEmail) {
        persistEvaluation(request, lockJudge(judgeEmail), false);
    }

    // Each team commits independently; a failed team cannot roll back successful submissions.
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW,
            isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public org.cesystem.multirole.dto.BatchEvaluationDtos.Result submitUnsubmitted(EvaluationRequest request, String judgeEmail) {
        request.setStatus(SUBMITTED);
        SaveOutcome saved = persistEvaluation(request, lockJudge(judgeEmail), true);
        return new org.cesystem.multirole.dto.BatchEvaluationDtos.Result(request.getTeamId(),
                saved.alreadySubmitted() ? "ALREADY_SUBMITTED" : "SUBMITTED", 200,
                saved.alreadySubmitted() ? "ทีมนี้ส่งคะแนนแล้ว จึงไม่บันทึกทับ" : "ส่งคะแนนสำเร็จ",
                org.cesystem.multirole.dto.ApiDtos.EvaluationResponse.from(saved.evaluation()));
    }

    private User lockJudge(String email) {
        User found = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ไม่พบข้อมูลกรรมการ"));
        User judge = userRepository.lockById(found.getUserId()).orElseThrow();
        entityManager.refresh(judge);
        if (!"ACTIVE".equalsIgnoreCase(judge.getStatus())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "บัญชีนี้ถูกระงับการใช้งาน");
        }
        return judge;
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW,
            isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public org.cesystem.multirole.dto.BatchEvaluationDtos.Result saveDraftUnsubmitted(EvaluationRequest request, String judgeEmail) {
        request.setStatus(DRAFT);
        SaveOutcome saved = persistEvaluation(request, lockJudge(judgeEmail), true);
        return new org.cesystem.multirole.dto.BatchEvaluationDtos.Result(request.getTeamId(),
                saved.alreadySubmitted() ? "ALREADY_SUBMITTED" : "DRAFT_SAVED", 200,
                saved.alreadySubmitted() ? "ทีมนี้ส่งคะแนนแล้ว จึงไม่บันทึกทับ" : "บันทึกร่างสำเร็จ",
                org.cesystem.multirole.dto.ApiDtos.EvaluationResponse.from(saved.evaluation()));
    }

    private SaveOutcome persistEvaluation(EvaluationRequest request, User judge, boolean onlyUnsubmitted) {
        if (request == null || request.getCompetitionId() == null || request.getTeamId() == null) {
            throw bad("กรุณาระบุการแข่งขันและทีม");
        }

        Competition competition = competitionRepository.findById(request.getCompetitionId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบการแข่งขัน"));
        entityManager.refresh(competition);

        Team team = teamRepository.findById(request.getTeamId())
                .filter(t -> t.getCompetition().getCompetitionId().equals(competition.getCompetitionId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบทีมนี้ในการแข่งขัน"));

        // 2. ต้องถูกมอบหมายให้ประเมินทีมนี้
        if (!judgeAssignmentRepository.existsByJudge_UserIdAndTeam_TeamId(judge.getUserId(), team.getTeamId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "คุณไม่ได้รับมอบหมายให้ประเมินทีมนี้");
        }

        // 3. สถานะที่ส่งมา
        String status = request.getStatus() == null ? "" : request.getStatus().trim().toUpperCase();
        if (!DRAFT.equals(status) && !SUBMITTED.equals(status)) {
            throw bad("สถานะผลประเมินไม่ถูกต้อง");
        }

        // 4. การแข่งขันต้องเปิดอยู่ และยังไม่เลยเส้นตาย
        if (!"ACTIVE".equals(competition.getStatus())) {
            throw conflict("การแข่งขันนี้ยังไม่เปิดให้ประเมิน หรือปิดไปแล้ว");
        }
        if (competition.getEvaluationDeadline() != null
                && !LocalDateTime.now().isBefore(competition.getEvaluationDeadline())) {
            throw conflict("ไม่สามารถบันทึกได้ เนื่องจากหมดเวลาการประเมินแล้ว");
        }

        Optional<Evaluation> existingOpt =
                evaluationRepository.findByCompetitionAndTeamAndJudge(competition, team, judge);
        if (onlyUnsubmitted && existingOpt.isPresent() && SUBMITTED.equals(existingOpt.get().getStatus())) {
            return new SaveOutcome(existingOpt.get(), true);
        }

        List<Criteria> criteriaList = criteriaRepository.findByCompetition_CompetitionId(competition.getCompetitionId());
        BigDecimal totalWeight = criteriaList.stream()
                .map(Criteria::getWeightPercentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (criteriaList.isEmpty() || totalWeight.compareTo(HUNDRED) != 0) {
            throw conflict("เกณฑ์การประเมินของการแข่งขันนี้ยังไม่ครบ 100%");
        }

        // 5. Submitted evaluations remain published when edited before the deadline.
        if (existingOpt.isPresent() && SUBMITTED.equals(existingOpt.get().getStatus())) {
            status = SUBMITTED;
        }

        // 6. ตรวจคะแนนรายเกณฑ์
        Map<UUID, Criteria> criteriaById = new HashMap<>();
        criteriaList.forEach(c -> criteriaById.put(c.getCriterionId(), c));

        Map<UUID, BigDecimal> values = new HashMap<>();
        Map<UUID, String> comments = new HashMap<>();
        Set<UUID> seen = new HashSet<>();
        if (request.getScores() != null) {
            for (EvaluationRequest.ScoreRequest s : request.getScores()) {
                if (s == null || s.getCriterionId() == null) {
                    throw bad("กรุณาระบุเกณฑ์ของคะแนนแต่ละรายการ");
                }
                Criteria criterion = criteriaById.get(s.getCriterionId());
                if (criterion == null) {
                    throw bad("พบคะแนนของเกณฑ์ที่ไม่ได้อยู่ในการแข่งขันนี้");
                }
                if (!seen.add(s.getCriterionId())) {
                    throw bad("พบเกณฑ์ซ้ำในคะแนนที่ส่งมา: " + criterion.getTitle());
                }
                if (s.getScoreValue() != null) {
                    BigDecimal value = s.getScoreValue().setScale(2, RoundingMode.HALF_UP);
                    validateRange(criterion, value);
                    values.put(criterion.getCriterionId(), value);
                }
                String comment = s.getComment() == null || s.getComment().isBlank() ? null : s.getComment().trim();
                if (comment != null) {
                    comments.put(criterion.getCriterionId(), comment);
                }
            }
        }

        if (SUBMITTED.equals(status)
                && criteriaList.stream().anyMatch(c -> !values.containsKey(c.getCriterionId()))) {
            throw bad("กรุณาให้คะแนนครบทุกเกณฑ์ก่อนส่งผลประเมิน");
        }

        // 7. อัปเดตใบประเมินหลัก (updatedAt เติมให้อัตโนมัติ)
        Evaluation evaluation = existingOpt.orElseGet(Evaluation::new);
        EvaluationHistoryService.Snapshot before = existingOpt.isPresent() ? history.snapshot(evaluation) : null;
        evaluation.setCompetition(competition);
        evaluation.setTeam(team);
        evaluation.setJudge(judge);
        evaluation.setComment(request.getComment());
        evaluation.setStatus(status);
        if (SUBMITTED.equals(status)) {
            evaluation.setSubmittedAt(LocalDateTime.now());
        } else {
            evaluation.setSubmittedAt(null);
        }

        // 8. คะแนนรายเกณฑ์: แก้แถวเดิมในที่เดิม แทนที่จะ clear แล้ว add ใหม่
        //    (Hibernate insert ก่อน delete จึงชน unique(evaluation_id, criterion_id) ถ้า clear แล้วใส่เกณฑ์เดิมซ้ำ)
        Set<UUID> keep = new HashSet<>(values.keySet());
        keep.addAll(comments.keySet());

        Map<UUID, Score> existingScores = new HashMap<>();
        evaluation.getScores().forEach(s -> existingScores.put(s.getCriteria().getCriterionId(), s));
        evaluation.getScores().removeIf(s -> !keep.contains(s.getCriteria().getCriterionId()));

        for (UUID criterionId : keep) {
            Score score = existingScores.get(criterionId);
            if (score == null) {
                score = new Score();
                score.setEvaluation(evaluation);
                score.setCriteria(criteriaById.get(criterionId));
                evaluation.getScores().add(score);
            }
            score.setScoreValue(values.get(criterionId));
            score.setComment(comments.get(criterionId));
        }

        evaluation.setTotalScore(weightedTotal(criteriaList, values, totalWeight));

        if (competition.getEvaluationDeadline() != null
                && !LocalDateTime.now().isBefore(competition.getEvaluationDeadline())) {
            throw conflict("ไม่สามารถบันทึกได้ เนื่องจากหมดเวลาการประเมินแล้ว");
        }
        evaluationRepository.saveAndFlush(evaluation);
        entityManager.refresh(evaluation); // Return database precision for timestamps and stored scores.
        history.record(evaluation, before);
        return new SaveOutcome(evaluation, false);
    }

    /** PASS_FAIL ต้องเป็น 0 หรือ 1 / PERCENTAGE 0-100 / ประเภทอื่น 0 ถึง maxScore */
    private void validateRange(Criteria criterion, BigDecimal value) {
        boolean valid;
        if ("PASS_FAIL".equals(criterion.getScoringType())) {
            valid = value.compareTo(BigDecimal.ZERO) == 0 || value.compareTo(BigDecimal.ONE) == 0;
        } else {
            BigDecimal max = "PERCENTAGE".equals(criterion.getScoringType()) ? HUNDRED : criterion.getMaxScore();
            valid = value.signum() >= 0 && value.compareTo(max) <= 0;
        }
        if (!valid) {
            throw bad("คะแนนของเกณฑ์ \"" + criterion.getTitle() + "\" อยู่นอกช่วงที่กำหนด");
        }
    }

    /** คะแนนรวม 0-100 = ผลรวมของ (คะแนน/เต็ม*100) * (น้ำหนัก/น้ำหนักรวม), เกณฑ์ที่ยังไม่ให้คะแนนนับเป็น 0, ปัด 1 ตำแหน่ง */
    private BigDecimal weightedTotal(List<Criteria> criteriaList, Map<UUID, BigDecimal> values, BigDecimal totalWeight) {
        BigDecimal divisor = totalWeight.signum() == 0 ? BigDecimal.ONE : totalWeight;
        BigDecimal total = BigDecimal.ZERO;
        for (Criteria c : criteriaList) {
            BigDecimal value = values.getOrDefault(c.getCriterionId(), BigDecimal.ZERO);
            BigDecimal normalized;
            if ("PASS_FAIL".equals(c.getScoringType())) {
                normalized = value.compareTo(BigDecimal.ONE) == 0 ? HUNDRED : BigDecimal.ZERO;
            } else {
                normalized = value.multiply(HUNDRED).divide(c.getMaxScore(), 10, RoundingMode.HALF_UP);
            }
            total = total.add(normalized.multiply(c.getWeightPercentage()).divide(divisor, 10, RoundingMode.HALF_UP));
        }
        return total.setScale(1, RoundingMode.HALF_UP);
    }

    private static ResponseStatusException bad(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }

    private static ResponseStatusException conflict(String message) {
        return new ResponseStatusException(HttpStatus.CONFLICT, message);
    }
}
