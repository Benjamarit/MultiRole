package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "criteria")
@Getter
@Setter
public class Criteria {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID criterionId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "competition_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Competition competition;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    // STAR, NUMERIC, PERCENTAGE, PASS_FAIL
    @Column(nullable = false, length = 20)
    private String scoringType;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal maxScore;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weightPercentage;
}