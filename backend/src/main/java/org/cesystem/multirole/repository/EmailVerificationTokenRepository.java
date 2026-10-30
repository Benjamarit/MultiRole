package org.cesystem.multirole.repository;
import org.cesystem.multirole.model.EmailVerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, UUID> {
    Optional<EmailVerificationToken> findByTokenHash(String hash);
    Optional<EmailVerificationToken> findFirstByUser_UserIdOrderByCreatedAtDesc(UUID userId);
    List<EmailVerificationToken> findByUser_UserIdAndUsedAtIsNull(UUID userId);
}
