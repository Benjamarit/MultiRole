package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Competition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CompetitionRepository extends JpaRepository<Competition, UUID> {
    java.util.List<Competition> findByStatusAndEvaluationDeadlineBetween(String status, java.time.LocalDateTime start, java.time.LocalDateTime end);
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("update Competition c set c.criteriaLocked = true where (c.criteriaLocked is null or c.criteriaLocked = false) and (c.status in ('ACTIVE', 'CLOSED') or exists (select e.evaluationId from Evaluation e where e.competition = c))")
    int lockLegacyCriteria();
    long countByCreatedBy_UserId(UUID userId);
    long countByCreatedBy_UserIdAndCreatedAtAfter(UUID userId, java.time.LocalDateTime after);
    java.util.List<Competition> findByCreatedBy_UserId(UUID userId);
    boolean existsByTitleIgnoreCase(String title);
    boolean existsByTitleIgnoreCaseAndCompetitionIdNot(String title, UUID competitionId);
}
