package org.cesystem.multirole.repository;
import org.cesystem.multirole.model.ProjectActivity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface ProjectActivityRepository extends JpaRepository<ProjectActivity, UUID> {
    long countByUserIdAndActionAndOccurredAtAfter(UUID userId, String action, LocalDateTime after);
    List<ProjectActivity> findTop100ByOrderByOccurredAtDesc();
}
