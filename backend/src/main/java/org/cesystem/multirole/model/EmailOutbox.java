package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "email_outbox", indexes = @Index(name = "idx_mail_due", columnList = "status,nextAttemptAt"))
@Getter @Setter
public class EmailOutbox {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private UUID userId;
    private UUID competitionId;
    private UUID notificationId;
    private UUID tokenId;
    @Column(nullable = false) private String recipient;
    @Column(nullable = false, length = 30) private String purpose;
    @Column(columnDefinition = "LONGTEXT") private String encryptedPayload;
    @Column(nullable = false, length = 20) private String status = "PENDING";
    private int attempts;
    @Column(nullable = false) private LocalDateTime createdAt;
    @Column(nullable = false) private LocalDateTime nextAttemptAt;
    private LocalDateTime expiresAt;
    private LocalDateTime acceptedAt;
    private String providerMessageId;
    @Column(length = 80) private String lastError;
}
