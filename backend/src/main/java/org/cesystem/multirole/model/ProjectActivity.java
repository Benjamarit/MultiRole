package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "project_activity", indexes = @Index(name = "idx_activity_user_time", columnList = "userId,occurredAt"))
@Getter @Setter
public class ProjectActivity {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false) private UUID userId;
    @Column(nullable = false, length = 40) private String action;
    @Column(nullable = false, length = 255) private String detail;
    @Column(nullable = false) private LocalDateTime occurredAt = LocalDateTime.now();
}
