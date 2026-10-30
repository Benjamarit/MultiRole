package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.EvaluationHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface EvaluationHistoryRepository extends JpaRepository<EvaluationHistory, UUID> {
    Page<EvaluationHistory> findByEvaluationId(UUID evaluationId, Pageable pageable);
    Page<EvaluationHistory> findByEvaluationIdAndEventTypeNot(UUID evaluationId, String eventType, Pageable pageable);
}
