package org.cesystem.multirole.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

// ตั้งชื่อฟิลด์ teamGroup (ไม่ใช่ group) เพราะ "group" เป็นคำสงวนใน JPQL/SQL
@Entity
@Table(
        name = "team_group_membership",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_membership_team",
                columnNames = {"team_id"}))   // ทีมอยู่ได้กลุ่มเดียว
@IdClass(TeamGroupMemberId.class)
@Getter
@Setter
public class TeamGroupMember {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private TeamGroup teamGroup;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "competition_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Competition competition;
}