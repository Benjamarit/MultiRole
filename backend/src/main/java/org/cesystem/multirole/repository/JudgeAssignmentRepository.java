package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.JudgeAssignment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface JudgeAssignmentRepository extends JpaRepository<JudgeAssignment, UUID> {

    List<JudgeAssignment> findByCompetition_CompetitionId(UUID competitionId);

    List<JudgeAssignment> findByCompetition_CompetitionIdAndJudge_UserId(UUID competitionId, UUID judgeId);

    boolean existsByJudge_UserIdAndTeam_TeamId(UUID judgeId, UUID teamId);

    // derived delete ต้องเรียกภายใน transaction (controller ที่เรียกมี @Transactional อยู่แล้ว)
    void deleteByCompetition_CompetitionIdAndJudge_UserId(UUID competitionId, UUID judgeId);
}