package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "competition")
@Getter
@Setter
public class Competition {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID competitionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(nullable = false, unique = true, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 20)
    private String category;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime evaluationDeadline;

    private LocalDateTime closedAt;

    // Stays true after the first successful activation, including later Draft pauses.
    private Boolean criteriaLocked = false;
}