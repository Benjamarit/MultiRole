package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.GroupRequest;
import org.cesystem.multirole.dto.ApiDtos.GroupResponse;
import org.cesystem.multirole.dto.ApiDtos.MoveTeamRequest;
import org.cesystem.multirole.dto.ApiDtos.MoveTeamsRequest;
import org.cesystem.multirole.dto.ApiDtos.MoveTeamsResponse;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.Team;
import org.cesystem.multirole.model.TeamGroup;
import org.cesystem.multirole.model.TeamGroupMember;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.TeamGroupMemberRepository;
import org.cesystem.multirole.repository.TeamGroupRepository;
import org.cesystem.multirole.repository.TeamRepository;
import org.cesystem.multirole.service.AccessService;
import org.cesystem.multirole.service.Validation;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.UUID;

/** กลุ่มทีม (Team_Group) และการจัดทีมเข้ากลุ่ม (Team_Group_Membership): ทีมอยู่ได้ 1 กลุ่ม */
@RestController
@RequestMapping("/api/competitions/{competitionId}")
@RequiredArgsConstructor
public class TeamGroupController {

    private final TeamGroupRepository groupRepository;
    private final TeamGroupMemberRepository membershipRepository;
    private final TeamRepository teamRepository;
    private final AccessService access;
    private final org.cesystem.multirole.service.ProjectStructurePolicy structurePolicy;

    @GetMapping("/groups")
    @Transactional(readOnly = true)
    public List<GroupResponse> list(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        access.requireMember(competitionId, user);

        return groupResponses(competitionId);
    }

    private List<GroupResponse> groupResponses(UUID competitionId) {
        List<TeamGroupMember> memberships = membershipRepository.findByCompetition_CompetitionId(competitionId);
        return groupRepository.findByCompetition_CompetitionId(competitionId).stream()
                .map(g -> new GroupResponse(g.getGroupId(), g.getGroupName(),
                        memberships.stream()
                                .filter(m -> m.getTeamGroup().getGroupId().equals(g.getGroupId()))
                                .map(m -> m.getTeam().getTeamId())
                                .toList()))
                .toList();
    }

    @PostMapping("/groups")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public GroupResponse create(@PathVariable UUID competitionId,
                                @RequestBody GroupRequest request,
                                Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        String name = Validation.requireText(request.groupName(), "กรุณาระบุชื่อกลุ่ม", 100);
        if (groupRepository.existsByCompetition_CompetitionIdAndGroupNameIgnoreCase(competitionId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ชื่อกลุ่มนี้ถูกใช้แล้ว");
        }

        TeamGroup group = new TeamGroup();
        group.setCompetition(competition);
        group.setGroupName(name);
        group = groupRepository.save(group);
        return new GroupResponse(group.getGroupId(), group.getGroupName(), List.of());
    }

    @PutMapping("/groups/{groupId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public GroupResponse rename(@PathVariable UUID competitionId,
                                @PathVariable UUID groupId,
                                @RequestBody GroupRequest request,
                                Principal principal) {
        User user = access.currentUser(principal);
        structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        TeamGroup group = findGroup(competitionId, groupId);
        String name = Validation.requireText(request.groupName(), "กรุณาระบุชื่อกลุ่ม", 100);
        if (!name.equalsIgnoreCase(group.getGroupName())
                && groupRepository.existsByCompetition_CompetitionIdAndGroupNameIgnoreCase(competitionId, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ชื่อกลุ่มนี้ถูกใช้แล้ว");
        }
        group.setGroupName(name);
        groupRepository.save(group);

        List<UUID> teamIds = membershipRepository.findByTeamGroup_GroupId(groupId).stream()
                .map(m -> m.getTeam().getTeamId())
                .toList();
        return new GroupResponse(group.getGroupId(), group.getGroupName(), teamIds);
    }

    /** ลบกลุ่ม: ทีมในกลุ่มไม่ถูกลบ แค่ไม่มีกลุ่ม */
    @DeleteMapping("/groups/{groupId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void delete(@PathVariable UUID competitionId,
                       @PathVariable UUID groupId,
                       Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        TeamGroup group = findGroup(competitionId, groupId);
        membershipRepository.deleteAll(membershipRepository.findByTeamGroup_GroupId(groupId));
        membershipRepository.flush();
        groupRepository.delete(group);
    }

    /** ย้ายทีมเข้ากลุ่ม (groupId = null คือเอาออกจากกลุ่ม) */
    @PutMapping("/teams/{teamId}/group")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void moveTeam(@PathVariable UUID competitionId,
                         @PathVariable UUID teamId,
                         @RequestBody MoveTeamRequest request,
                         Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        Team team = teamRepository.findById(teamId)
                .filter(t -> t.getCompetition().getCompetitionId().equals(competitionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบทีมนี้"));
        TeamGroup target = request.groupId() == null ? null : findGroup(competitionId, request.groupId());

        // PK ของ membership รวม group_id จึงต้องลบแถวเดิมแล้ว flush ก่อนค่อยเพิ่มแถวใหม่
        // (Hibernate จะ insert ก่อน delete ถ้าไม่ flush ซึ่งชน unique(team_id))
        membershipRepository.findByTeam_TeamId(teamId).ifPresent(membershipRepository::delete);
        membershipRepository.flush();

        if (target != null) {
            TeamGroupMember membership = new TeamGroupMember();
            membership.setTeamGroup(target);
            membership.setTeam(team);
            membership.setCompetition(competition);
            membershipRepository.save(membership);
        }
    }

    /** Validate every team before changing anything; moves and removals commit atomically. */
    @PutMapping("/teams/group")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public MoveTeamsResponse moveTeams(@PathVariable UUID competitionId,
                                       @RequestBody MoveTeamsRequest request,
                                       Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));
        if (request.teamIds() == null || request.teamIds().isEmpty()
                || request.teamIds().stream().anyMatch(java.util.Objects::isNull)
                || new java.util.HashSet<>(request.teamIds()).size() != request.teamIds().size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาเลือกทีมอย่างน้อยหนึ่งทีม โดยไม่ซ้ำกัน");
        }
        // Serialize bulk, single-team moves and group deletion within the competition.
        TeamGroup target = request.groupId() == null ? null : findGroup(competitionId, request.groupId());
        List<Team> teams = teamRepository.findAllById(request.teamIds());
        if (teams.size() != request.teamIds().size() || teams.stream()
                .anyMatch(team -> !team.getCompetition().getCompetitionId().equals(competitionId))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "มีทีมที่ไม่พบหรือไม่ได้อยู่ในโครงการนี้ กรุณารีเฟรชรายชื่อทีม");
        }
        var existing = membershipRepository.findByCompetition_CompetitionId(competitionId).stream()
                .collect(java.util.stream.Collectors.toMap(m -> m.getTeam().getTeamId(), m -> m));
        List<Team> changed = teams.stream().filter(team -> {
            TeamGroupMember membership = existing.get(team.getTeamId());
            return !java.util.Objects.equals(membership == null ? null : membership.getTeamGroup().getGroupId(), request.groupId());
        }).toList();
        membershipRepository.deleteAll(changed.stream().map(team -> existing.get(team.getTeamId()))
                .filter(java.util.Objects::nonNull).toList());
        membershipRepository.flush();
        if (target != null) {
            membershipRepository.saveAll(changed.stream().map(team -> {
                TeamGroupMember membership = new TeamGroupMember();
                membership.setTeamGroup(target);
                membership.setTeam(team);
                membership.setCompetition(competition);
                return membership;
            }).toList());
            membershipRepository.flush();
        }
        return new MoveTeamsResponse(changed.size(), teams.size() - changed.size(), groupResponses(competitionId));
    }

    private TeamGroup findGroup(UUID competitionId, UUID groupId) {
        return groupRepository.findById(groupId)
                .filter(g -> g.getCompetition().getCompetitionId().equals(competitionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบกลุ่มนี้"));
    }
}
