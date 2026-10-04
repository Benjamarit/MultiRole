package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "competition")
@Data
public class Competition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID competitionId;

    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    private String category;

    private String status;

    private LocalDateTime createdAt;

    private LocalDateTime closedAt;

    private LocalDateTime evaluationDeadline;
}