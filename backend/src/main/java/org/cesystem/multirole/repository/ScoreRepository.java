package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Score;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ScoreRepository extends JpaRepository<Score, UUID> {

    List<Score> findByEvaluation_EvaluationId(UUID evaluationId);

    boolean existsByCriteria_CriterionId(UUID criterionId);
}