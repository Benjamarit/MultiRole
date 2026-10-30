package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Criteria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CriteriaRepository extends JpaRepository<Criteria, UUID> {
    List<Criteria> findByCompetition_CompetitionId(UUID competitionId);
}