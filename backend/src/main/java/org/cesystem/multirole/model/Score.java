package org.cesystem.multirole.model;


import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "score")
@Data
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID scoreId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluation_id", nullable = false)
    private Evaluation evaluation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "criterion_id", nullable = false)
    private Criteria criteria;

    @Column(precision = 5, scale = 2, nullable = false)
    private BigDecimal scoreValue;

    @Column(columnDefinition = "TEXT")
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

}
