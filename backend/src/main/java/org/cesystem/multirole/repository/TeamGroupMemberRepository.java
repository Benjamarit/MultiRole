package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.TeamGroupMember;
import org.cesystem.multirole.model.TeamGroupMemberId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TeamGroupMemberRepository extends JpaRepository<TeamGroupMember, TeamGroupMemberId> {

    List<TeamGroupMember> findByCompetition_CompetitionId(UUID competitionId);

    List<TeamGroupMember> findByTeamGroup_GroupId(UUID groupId);

    Optional<TeamGroupMember> findByTeam_TeamId(UUID teamId);
}