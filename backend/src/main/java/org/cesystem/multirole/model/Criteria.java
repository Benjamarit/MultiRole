package org.cesystem.multirole.model;


import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name="criteria")
@Data
public class Criteria {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID criteriaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_id", nullable = false)
    private Competition competition;

    private String title;
    private String scoringType;

    @Column(precision = 5, scale = 2)
    private BigDecimal maxScore;

    @Column(precision = 5, scale = 2)
    private BigDecimal weightPercentage;
}
