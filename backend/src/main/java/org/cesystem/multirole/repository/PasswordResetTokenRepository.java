package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, UUID> {

    Optional<PasswordResetToken> findFirstByUser_UserIdOrderByCreatedAtDesc(UUID userId);

    Optional<PasswordResetToken> findByTokenHash(String tokenHash);

    List<PasswordResetToken> findByUser_UserIdAndUsedAtIsNull(UUID userId);
}