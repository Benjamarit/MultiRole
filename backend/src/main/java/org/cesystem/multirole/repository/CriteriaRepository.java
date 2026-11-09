package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Criteria;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CriteriaRepository extends JpaRepository<Criteria, UUID> {
    @org.springframework.data.jpa.repository.Query("select c from Criteria c where c.competition.competitionId = :competitionId order by coalesce(c.displayOrder, 0), c.criterionId")
    List<Criteria> findByCompetition_CompetitionId(UUID competitionId);
}
