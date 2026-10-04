package org.cesystem.multirole.model;


import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;


@Entity
@Table(name = "evaluation")
@Data
public class Evaluation {


    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID evaluationId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_id", nullable = false)
    private Competition competition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "judge" , nullable = false)
    private User judge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(precision = 5, scale = 2)
    private BigDecimal totalScore;

    @Column(columnDefinition = "TEXT")
    private String comment;

    private String status;

    private LocalDateTime updateAt;

    private LocalDateTime submitAt;

    @OneToMany(mappedBy = "evaluation",cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Score> scores;
}
