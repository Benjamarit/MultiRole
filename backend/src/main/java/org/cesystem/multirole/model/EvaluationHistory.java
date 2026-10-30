package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

/** Immutable snapshots: scalar IDs intentionally survive deletion of source records. */
@Entity
@Table(name = "evaluation_history", indexes = @Index(name = "idx_history_evaluation", columnList = "evaluationId,occurredAt"))
@Getter @Setter
public class EvaluationHistory {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID historyId;
    @Column(nullable = false, updatable = false) private UUID evaluationId;
    @Column(nullable = false, updatable = false) private UUID competitionId;
    @Column(nullable = false, updatable = false) private UUID teamId;
    @Column(nullable = false, updatable = false) private UUID actorId;
    @Column(nullable = false, updatable = false) private String actorName;
    @Column(nullable = false, updatable = false) private String actorEmail;
    @Column(nullable = false, updatable = false) private String teamName;
    @Column(nullable = false, updatable = false, length = 30) private String eventType;
    @Column(nullable = false, updatable = false) private LocalDateTime occurredAt;
    @Column(columnDefinition = "LONGTEXT", updatable = false) private String beforeSnapshot;
    @Column(nullable = false, columnDefinition = "LONGTEXT", updatable = false) private String afterSnapshot;
}
