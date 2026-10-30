package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.DeadlineHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface DeadlineHistoryRepository extends JpaRepository<DeadlineHistory, UUID> {
    List<DeadlineHistory> findTop20ByCompetition_CompetitionIdOrderByChangedAtDescIdDesc(UUID competitionId);
}
