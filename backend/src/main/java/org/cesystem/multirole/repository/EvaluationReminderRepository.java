package org.cesystem.multirole.repository;
import org.cesystem.multirole.model.EvaluationReminder;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.UUID;
public interface EvaluationReminderRepository extends JpaRepository<EvaluationReminder, UUID> {
    boolean existsByDedupeKey(String key);
    boolean existsByCompetitionIdAndUserIdAndCreatedAtAfter(UUID competitionId, UUID userId, LocalDateTime after);
}
