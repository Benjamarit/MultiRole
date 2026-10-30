package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.CompetitionUser;
import org.cesystem.multirole.model.CompetitionUserId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompetitionUserRepository extends JpaRepository<CompetitionUser, CompetitionUserId> {

    List<CompetitionUser> findByCompetition_CompetitionId(UUID competitionId);

    List<CompetitionUser> findByUser_UserId(UUID userId);

    Optional<CompetitionUser> findByCompetition_CompetitionIdAndUser_UserId(UUID competitionId, UUID userId);

    long countByCompetition_CompetitionIdAndRole(UUID competitionId, String role);
    long countByCompetition_CompetitionIdAndRoleIn(UUID competitionId, List<String> roles);
}
