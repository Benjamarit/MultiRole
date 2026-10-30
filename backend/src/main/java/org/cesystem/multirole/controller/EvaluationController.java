package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.EvaluationResponse;
import org.cesystem.multirole.dto.EvaluationRequest;
import org.cesystem.multirole.model.Evaluation;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.EvaluationRepository;
import org.cesystem.multirole.service.AccessService;
import org.cesystem.multirole.service.EvaluationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/evaluations")
@RequiredArgsConstructor
public class EvaluationController {

    private static final String STATUS_SUBMITTED = "SUBMITTED";

    private final EvaluationService evaluationService;
    private final EvaluationRepository evaluationRepository;
    private final AccessService access;
    private final org.cesystem.multirole.repository.EvaluationHistoryRepository historyRepository;
    private final org.cesystem.multirole.service.EvaluationHistoryService historyService;
    private final org.cesystem.multirole.service.BatchEvaluationService batchEvaluationService;

    @GetMapping("/{evaluationId}/history")
    @Transactional(readOnly = true)
    public org.springframework.data.domain.Page<org.cesystem.multirole.service.EvaluationHistoryService.Response> history(
            @PathVariable UUID evaluationId, @RequestParam(defaultValue = "0") int page, Principal principal) {
        User user = access.currentUser(principal);
        Evaluation evaluation = evaluationRepository.findById(evaluationId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบใบประเมิน"));
        UUID competitionId = evaluation.getCompetition().getCompetitionId();
        access.requireMember(competitionId, user);
        boolean own = evaluation.getJudge().getUserId().equals(user.getUserId());
        if (!own && (!access.isCompetitionAdmin(competitionId, user) || !STATUS_SUBMITTED.equals(evaluation.getStatus()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "คุณไม่มีสิทธิ์ดูประวัติใบประเมินนี้");
        }
        if (page < 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "หน้าประวัติไม่ถูกต้อง");
        var pageable = org.springframework.data.domain.PageRequest.of(page, 20,
            org.springframework.data.domain.Sort.by("occurredAt", "historyId").descending());
        return (own ? historyRepository.findByEvaluationId(evaluationId, pageable)
            : historyRepository.findByEvaluationIdAndEventTypeNot(evaluationId, "DRAFT_SAVED", pageable))
            .map(entry -> historyService.response(entry, own));
    }

    @GetMapping("/competition/{competitionId}/mine")
    @Transactional(readOnly = true)
    public List<EvaluationResponse> listMine(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        access.requireMember(competitionId, user);
        return evaluationRepository.findByCompetition_CompetitionIdAndJudge_UserId(competitionId, user.getUserId())
                .stream().map(EvaluationResponse::from).toList();
    }

    @PostMapping("/submit-batch")
    public org.cesystem.multirole.dto.BatchEvaluationDtos.Response submitBatch(
            @RequestBody org.cesystem.multirole.dto.BatchEvaluationDtos.Request request, Principal principal) {
        return batchEvaluationService.submit(request, principal);
    }

    @PostMapping("/save")
    public ResponseEntity<?> saveEvaluation(@RequestBody EvaluationRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("ไม่มีสิทธิ์เข้าถึง (Unauthorized)");
        }

        try {
            // principal.getName() = อีเมลของคนที่แนบ token ส่งให้ Service จัดการ
            evaluationService.upsertEvaluation(request, principal.getName());
            return ResponseEntity.ok("บันทึกข้อมูลการประเมินเรียบร้อยแล้ว");
        } catch (ResponseStatusException e) {
            throw e; // ให้ได้ status เดิม (403, 404 ฯลฯ) ไม่ถูกแปลงเป็น 400
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * ผลประเมินของการแข่งขัน: ผู้ดูแลเห็นเฉพาะใบที่ส่งแล้ว (SUBMITTED) ส่วนฉบับร่างเป็นของกรรมการ
     * กรรมการเห็นเฉพาะใบของตัวเอง ผู้ดูแลที่เป็นกรรมการด้วยเห็นฉบับร่างของตัวเองได้
     */
    @GetMapping("/competition/{competitionId}")
    @Transactional(readOnly = true)
    public List<EvaluationResponse> listByCompetition(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        access.requireMember(competitionId, user);

        List<Evaluation> evaluations = access.isCompetitionAdmin(competitionId, user)
                ? evaluationRepository.findByCompetition_CompetitionId(competitionId).stream()
                    .filter(e -> STATUS_SUBMITTED.equals(e.getStatus()) || e.getJudge().getUserId().equals(user.getUserId()))
                    .toList()
                : evaluationRepository.findByCompetition_CompetitionIdAndJudge_UserId(
                competitionId, user.getUserId());
        return evaluations.stream().map(EvaluationResponse::from).toList();
    }

    /** ใบประเมินของฉันสำหรับทีมนี้ (ใช้เปิดหน้าประเมินต่อจากฉบับร่าง) ถ้ายังไม่มีตอบ 204 */
    @GetMapping("/competition/{competitionId}/team/{teamId}/mine")
    @Transactional(readOnly = true)
    public ResponseEntity<EvaluationResponse> getMine(@PathVariable UUID competitionId,
                                                      @PathVariable UUID teamId,
                                                      Principal principal) {
        User user = access.currentUser(principal);
        access.requireMember(competitionId, user);

        return evaluationRepository.findByJudge_UserIdAndTeam_TeamId(user.getUserId(), teamId)
                .filter(e -> e.getCompetition().getCompetitionId().equals(competitionId))
                .map(e -> ResponseEntity.ok(EvaluationResponse.from(e)))
                .orElseGet(() -> ResponseEntity.noContent().build());
    }
}
