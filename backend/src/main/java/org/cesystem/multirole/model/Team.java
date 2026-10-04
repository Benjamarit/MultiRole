package org.cesystem.multirole.model;


import jakarta.persistence.*;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "team")
@Data
public class Team {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID teamId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_id")
    private Competition competition;

    private String teamName;
    private String projectName;
    private String projectDescription;
    private String projectUrl;

    @OneToMany(mappedBy = "team",cascade = CascadeType.ALL,orphanRemoval = true)
    private List<TeamMember> members;
}
