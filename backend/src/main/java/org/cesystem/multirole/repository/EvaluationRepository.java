package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.Evaluation;
import org.cesystem.multirole.model.Team;
import org.cesystem.multirole.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {
    List<Evaluation> findByCompetition_CompetitionId(UUID competitionId);
    boolean existsByCompetition_CompetitionId(UUID competitionId);
    Optional<Evaluation> findByCompetitionAndTeamAndJudge(Competition competition, Team team, User judge);
    List<Evaluation> findByCompetition_CompetitionIdAndStatus(UUID competitionId, String status);
    List<Evaluation> findByCompetition_CompetitionIdAndJudge_UserId(UUID competitionId, UUID judgeId);
    Optional<Evaluation> findByJudge_UserIdAndTeam_TeamId(UUID judgeId, UUID teamId);
}
