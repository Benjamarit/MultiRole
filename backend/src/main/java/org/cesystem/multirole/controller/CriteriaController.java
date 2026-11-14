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
        List<Criteria> existing = criteriaRepository.findByCompetition_CompetitionId(competitionId);
        // Backfill legacy rows once. Their historical insertion order was never stored.
        int lastOrder = existing.stream().map(Criteria::getDisplayOrder).filter(java.util.Objects::nonNull)
                .mapToInt(Integer::intValue).max().orElse(0);
        for (Criteria previous : existing) {
            if (previous.getDisplayOrder() == null) previous.setDisplayOrder(++lastOrder);
        }
        criteria.setDisplayOrder(lastOrder + 1);
        apply(criteria, request, competitionId, null);
        return CriteriaResponse.from(criteriaRepository.save(criteria));
    }

    @PutMapping("/order")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public List<CriteriaResponse> reorder(@PathVariable UUID competitionId,
            @RequestBody org.cesystem.multirole.dto.ApiDtos.CriteriaOrderRequest request, Principal principal) {
        policy.requireEditable(access.requireCompetitionAdmin(competitionId, access.currentUser(principal)));
        List<Criteria> criteria = criteriaRepository.findByCompetition_CompetitionId(competitionId);
        List<UUID> ids = request.criterionIds();
        var byId = criteria.stream().collect(java.util.stream.Collectors.toMap(Criteria::getCriterionId, c -> c));
        if (ids == null || ids.size() != criteria.size() || new java.util.HashSet<>(ids).size() != ids.size()
                || !byId.keySet().equals(new java.util.HashSet<>(ids))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาส่งลำดับเกณฑ์ทุกข้อในโครงการโดยไม่ซ้ำกัน");
        }
        for (int i = 0; i < ids.size(); i++) byId.get(ids.get(i)).setDisplayOrder(i + 1);
        criteriaRepository.saveAll(criteria);
        return ids.stream().map(byId::get).map(CriteriaResponse::from).toList();
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

    /** Replace the staged list atomically, retaining IDs for criteria that were edited/reordered. */
    @PutMapping("/batch")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public List<CriteriaResponse> saveBatch(@PathVariable UUID competitionId,
            @RequestBody org.cesystem.multirole.dto.ApiDtos.CriteriaBatchRequest request, Principal principal) {
        Competition competition = access.requireCompetitionAdmin(competitionId, access.currentUser(principal));
        policy.requireEditable(competition);
        if (request == null || request.criteria() == null || request.expectedCriteria() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุรายการเกณฑ์และข้อมูลตั้งต้น");
        }
        List<Criteria> current = criteriaRepository.findByCompetition_CompetitionId(competitionId);
        var byId = current.stream().collect(java.util.stream.Collectors.toMap(Criteria::getCriterionId, c -> c));
        var expectedIds = new java.util.HashSet<UUID>();
        for (var expected : request.expectedCriteria()) {
            Criteria actual = expected == null ? null : byId.get(expected.criterionId());
            if (actual == null || !expectedIds.add(expected.criterionId()) || !matches(actual, expected)) {
                throw staleCriteria();
            }
        }
        if (!expectedIds.equals(byId.keySet())) throw staleCriteria();

        var seen = new java.util.HashSet<UUID>();
        var ordered = new java.util.ArrayList<Criteria>();
        BigDecimal totalWeight = BigDecimal.ZERO;
        for (var entry : request.criteria()) {
            if (entry == null) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "รายการเกณฑ์ไม่ถูกต้อง");
            Criteria criterion;
            if (entry.criterionId() == null) {
                criterion = new Criteria();
                criterion.setCompetition(competition);
            } else {
                criterion = byId.get(entry.criterionId());
                if (criterion == null || !seen.add(entry.criterionId())) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "เกณฑ์ซ้ำหรือไม่ได้อยู่ในโครงการนี้");
                }
            }
            applyValues(criterion, new CriteriaRequest(entry.title(), entry.description(), entry.scoringType(),
                    entry.maxScore(), entry.weightPercentage()));
            criterion.setDisplayOrder(ordered.size() + 1);
            totalWeight = totalWeight.add(criterion.getWeightPercentage());
            ordered.add(criterion);
        }
        if (totalWeight.compareTo(HUNDRED) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "น้ำหนักรวมของทุกเกณฑ์เกิน 100%");
        }
        criteriaRepository.deleteAll(current.stream().filter(c -> !seen.contains(c.getCriterionId())).toList());
        criteriaRepository.saveAllAndFlush(ordered);
        return ordered.stream().map(CriteriaResponse::from).toList();
    }

    private ResponseStatusException staleCriteria() {
        return new ResponseStatusException(HttpStatus.CONFLICT,
                "เกณฑ์บนเซิร์ฟเวอร์เปลี่ยนไปแล้ว กรุณาตรวจข้อมูลล่าสุดก่อนบันทึกอีกครั้ง");
    }

    private boolean matches(Criteria actual, org.cesystem.multirole.dto.ApiDtos.CriteriaBatchEntry expected) {
        return java.util.Objects.equals(actual.getTitle(), expected.title())
                && java.util.Objects.equals(actual.getDescription() == null ? "" : actual.getDescription(), expected.description() == null ? "" : expected.description())
                && java.util.Objects.equals(actual.getScoringType(), expected.scoringType())
                && expected.maxScore() != null && actual.getMaxScore().compareTo(expected.maxScore()) == 0
                && expected.weightPercentage() != null && actual.getWeightPercentage().compareTo(expected.weightPercentage()) == 0
                && java.util.Objects.equals(actual.getDisplayOrder(), expected.displayOrder());
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
        applyValues(criteria, request);
        BigDecimal others = criteriaRepository.findByCompetition_CompetitionId(competitionId).stream()
                .filter(c -> !c.getCriterionId().equals(excludeId))
                .map(Criteria::getWeightPercentage)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (others.add(criteria.getWeightPercentage()).compareTo(HUNDRED) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "น้ำหนักรวมของทุกเกณฑ์เกิน 100% (เกณฑ์อื่นรวมกัน " + others + "%)");
        }
    }

    private void applyValues(Criteria criteria, CriteriaRequest request) {
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

        criteria.setTitle(title);
        criteria.setDescription(description);
        criteria.setScoringType(type);
        criteria.setMaxScore(max);
        criteria.setWeightPercentage(weight);
    }
}
