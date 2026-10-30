package org.cesystem.multirole.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.repository.EvaluationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class CriteriaPolicy {
    private final EntityManager entityManager;
    private final EvaluationRepository evaluations;

    // All criteria writes and activation serialize on the same competition row.
    public void lock(Competition competition) {
        entityManager.lock(competition, LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(competition);
    }

    public void requireEditable(Competition competition) {
        lock(competition);
        if (isLocked(competition)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "เกณฑ์ประเมินถูกล็อกหลังเปิดรับคะแนนแล้ว ไม่สามารถเพิ่ม แก้ไข หรือลบได้ แม้พักกลับเป็น Draft");
        }
    }

    public boolean isLocked(Competition competition) {
        return Boolean.TRUE.equals(competition.getCriteriaLocked()) || !"DRAFT".equals(competition.getStatus())
            || evaluations.existsByCompetition_CompetitionId(competition.getCompetitionId());
    }
}
