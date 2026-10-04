package org.cesystem.multirole.model;


import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Table(name = "judge_coi")
@Data
public class JudgeCoi {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID coiId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="competition_id" , nullable = false)
    private Competition competition;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "judge_id", nullable = false)
    private User judge;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;
}
