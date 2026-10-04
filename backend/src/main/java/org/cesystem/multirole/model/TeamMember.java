package org.cesystem.multirole.model;


import jakarta.persistence.*;
import lombok.Data;
import java.util.UUID;

@Entity
@Table(name = "team_members")
@Data
public class TeamMember {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID memberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    private String memberName;
}
