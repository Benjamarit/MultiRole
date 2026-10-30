package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "score",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_score_eval_criterion",
                columnNames = {"evaluation_id", "criterion_id"}))
@Getter
@Setter
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID scoreId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "evaluation_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Evaluation evaluation;

    // ไม่ใส่ @OnDelete: ลบเกณฑ์ที่มีคะแนนแล้วต้องถูกปฏิเสธ (RESTRICT)
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criterion_id", nullable = false)
    private Criteria criteria;

    @Column(precision = 5, scale = 2)
    private BigDecimal scoreValue;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}