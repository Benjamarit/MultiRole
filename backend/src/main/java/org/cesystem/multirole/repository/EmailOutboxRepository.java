package org.cesystem.multirole.repository;
import org.cesystem.multirole.model.EmailOutbox;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.*;
public interface EmailOutboxRepository extends JpaRepository<EmailOutbox, UUID> {
    List<EmailOutbox> findTop20ByStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(List<String> statuses, LocalDateTime now);
    List<EmailOutbox> findByUserIdOrderByCreatedAtDesc(UUID userId);
    long countByStatus(String status);
}
