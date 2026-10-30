package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "deadline_history", indexes = @Index(name = "idx_deadline_comp_time", columnList = "competition_id,changedAt"))
@Getter @Setter
public class DeadlineHistory {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "competition_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Competition competition;
    @Column(nullable = false) private UUID actorId;
    @Column(nullable = false, length = 150) private String actorName;
    @Column(nullable = false, length = 255) private String actorEmail;
    private LocalDateTime previousDeadline;
    private LocalDateTime newDeadline;
    @Column(nullable = false) private LocalDateTime changedAt = LocalDateTime.now();
}
