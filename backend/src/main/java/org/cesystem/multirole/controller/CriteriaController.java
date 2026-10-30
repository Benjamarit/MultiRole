package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.CriteriaRequest;
import org.cesystem.multirole.dto.ApiDtos.CriteriaResponse;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.Criteria;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.CriteriaRepository;
import org.cesystem.multirole.service.AccessService;
import org.cesystem.multirole.service.Validation;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.Principal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/competitions/{competitionId}/criteria")
@RequiredArgsConstructor
public class CriteriaController {

    private static final Set<String> SCORING_TYPES = Set.of("STAR", "NUMERIC", "PERCENTAGE", "PASS_FAIL");
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    private final CriteriaRepository criteriaRepository;
    private final AccessService access;
    private final org.cesystem.multirole.service.CriteriaPolicy policy;

    /** เกณฑ์การประเมินทั้งหมดของการแข่งขันนี้ (สมาชิกทุกคนดูได้) */
    @GetMapping
    @Transactional(readOnly = true)
    public List<CriteriaResponse> list(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        access.requireMember(competitionId, user);
        return criteriaRepository.findByCompetition_CompetitionId(competitionId).stream()
                .map(CriteriaResponse::from)
                .toList();
    }

    @PostMapping
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public CriteriaResponse add(@PathVariable UUID competitionId,
                                @RequestBody CriteriaRequest request,
                                Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = access.requireCompetitionAdmin(competitionId, user);
        policy.requireEditable(competition);

        Criteria criteria = new Criteria();
        criteria.setCompetition(competition);
        apply(criteria, request, competitionId, null);
        return CriteriaResponse.from(criteriaRepository.save(criteria));
    }

    @PutMapping("/{criterionId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public CriteriaResponse update(@PathVariable UUID competitionId,
                                   @PathVariable UUID criterionId,
                                   @RequestBody CriteriaRequest request,
                                   Principal principal) {
        User user = access.currentUser(principal);
        policy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        Criteria criteria = find(competitionId, criterionId);
        apply(criteria, request, competitionId, criterionId);
        return CriteriaResponse.from(criteriaRepository.save(criteria));
    }

    /** ลบไม่ได้ถ้ามีคะแนนที่อ้างเกณฑ์นี้อยู่แล้ว (FK RESTRICT ที่ Score) */
    @DeleteMapping("/{criterionId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void delete(@PathVariable UUID competitionId,
                       @PathVariable UUID criterionId,
                       Principal principal) {
        User user = access.currentUser(principal);
        policy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        Criteria criteria = find(competitionId, criterionId);
        try {
            criteriaRepository.delete(criteria);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "ลบเกณฑ์นี้ไม่ได้ เพราะมีการให้คะแนนด้วยเกณฑ์นี้แล้ว");
        }
    }

    private Criteria find(UUID competitionId, UUID criterionId) {
        return criteriaRepository.findById(criterionId)
                .filter(c -> c.getCompetition().getCompetitionId().equals(competitionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบเกณฑ์การประเมินนี้"));
    }

    /** ตรวจข้อมูลแล้วใส่ลง entity; excludeId = เกณฑ์ที่กำลังแก้ (ไม่นับน้ำหนักเดิมของตัวเอง) */
    private void apply(Criteria criteria, CriteriaRequest request, UUID competitionId, UUID excludeId) {
        String title = Validation.requireText(request.title(), "กรุณาระบุชื่อเกณฑ์", 200);
        String description = Validation.optionalText(request.description(), "คำอธิบาย", 65_000);

        String type = request.scoringType() == null ? "" : request.scoringType().trim().toUpperCase();
        if (!SCORING_TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "ประเภทการให้คะแนนต้องเป็น STAR, NUMERIC, PERCENTAGE หรือ PASS_FAIL");
        }
        BigDecimal max = request.maxScore();
        if (max == null || max.signum() <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "คะแนนเต็มต้องมากกว่า 0");
        }
        BigDecimal weight = request.weightPercentage();
        if (weight == null || weight.signum() <= 0 || weight.compareTo(HUNDRED) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "น้ำหนักต้องอยู่ระหว่าง 0 ถึง 100");
        }

        BigDecimal others = criteriaRepository.findByCompetition_CompetitionId(competitionId).stream()
                .filter(c -> !c.getCriterionId().equals(excludeId))
                .map(Criteria::getWeightPercentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (others.add(weight).compareTo(HUNDRED) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "น้ำหนักรวมของทุกเกณฑ์เกิน 100% (เกณฑ์อื่นรวมกัน " + others + "%)");
        }

        criteria.setTitle(title);
        criteria.setDescription(description);
        criteria.setScoringType(type);
        criteria.setMaxScore(max);
        criteria.setWeightPercentage(weight);
    }
}