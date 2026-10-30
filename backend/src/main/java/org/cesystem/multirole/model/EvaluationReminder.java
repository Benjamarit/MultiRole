package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name = "evaluation_reminder", indexes = @Index(name = "idx_reminder_recipient", columnList = "competitionId,userId,createdAt"))
@Getter @Setter
public class EvaluationReminder {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(nullable = false) private UUID competitionId;
    @Column(nullable = false) private UUID userId;
    @Column(nullable = false, unique = true) private String dedupeKey;
    @Column(nullable = false) private String kind;
    @Column(nullable = false) private LocalDateTime createdAt;
}
