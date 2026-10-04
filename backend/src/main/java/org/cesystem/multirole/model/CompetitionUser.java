package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "competition_user")
@Data
@IdClass(CompetitionUserId.class)
public class CompetitionUser {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "competition_id" , nullable = false)
    private Competition competition;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "userid" , nullable = false)
    private User user;

    private String role;
}
