package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.TeamGroup;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TeamGroupRepository extends JpaRepository<TeamGroup, UUID> {

    List<TeamGroup> findByCompetition_CompetitionId(UUID competitionId);

    boolean existsByCompetition_CompetitionIdAndGroupNameIgnoreCase(UUID competitionId, String groupName);
}