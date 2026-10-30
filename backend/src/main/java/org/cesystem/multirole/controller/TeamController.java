package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.TeamRequest;
import org.cesystem.multirole.dto.ApiDtos.TeamResponse;
import org.cesystem.multirole.dto.ApiDtos.TeamOrderRequest;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.Team;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.TeamRepository;
import org.cesystem.multirole.service.AccessService;
import org.cesystem.multirole.service.Validation;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.HashSet;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.UUID;

@RestController
@RequestMapping("/api/competitions/{competitionId}/teams")
@RequiredArgsConstructor
public class TeamController {

    private final TeamRepository teamRepository;
    private final AccessService access;
    private final org.cesystem.multirole.service.ProjectStructurePolicy structurePolicy;

    /** รายชื่อทีมทั้งหมดในการแข่งขันนี้ (สมาชิกทุกคนดูได้) */
    @GetMapping
    @Transactional(readOnly = true)
    public List<TeamResponse> list(@PathVariable UUID competitionId, Principal principal) {
        User user = access.currentUser(principal);
        access.requireMember(competitionId, user);
        return teamRepository.findByCompetition_CompetitionId(competitionId).stream()
                .map(TeamResponse::from)
                .toList();
    }

    @PostMapping
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public TeamResponse create(@PathVariable UUID competitionId,
                               @RequestBody TeamRequest request,
                               Principal principal) {
        User user = access.currentUser(principal);
        Competition competition = structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        Team team = new Team();
        team.setCompetition(competition);
        List<Team> existing = teamRepository.findByCompetition_CompetitionId(competitionId);
        int lastOrder = existing.stream().map(Team::getDisplayOrder).filter(java.util.Objects::nonNull)
                .mapToInt(Integer::intValue).max().orElse(0);
        team.setDisplayOrder(Math.max(lastOrder, existing.size()) + 1);
        apply(team, request);
        return TeamResponse.from(teamRepository.save(team));
    }

    @PutMapping("/{teamId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public TeamResponse update(@PathVariable UUID competitionId,
                               @PathVariable UUID teamId,
                               @RequestBody TeamRequest request,
                               Principal principal) {
        User user = access.currentUser(principal);
        structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        Team team = find(competitionId, teamId);
        apply(team, request);
        return TeamResponse.from(teamRepository.save(team));
    }

    @PutMapping("/order")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public List<TeamResponse> reorder(@PathVariable UUID competitionId,
                                     @RequestBody TeamOrderRequest request, Principal principal) {
        structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, access.currentUser(principal)));
        List<Team> teams = teamRepository.findByCompetition_CompetitionId(competitionId);
        List<UUID> ids = request.teamIds();
        Map<UUID, Team> byId = teams.stream().collect(Collectors.toMap(Team::getTeamId, Function.identity()));
        if (ids == null || ids.size() != teams.size() || new HashSet<>(ids).size() != ids.size()
                || !byId.keySet().equals(new HashSet<>(ids))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "กรุณาส่งลำดับทีมทุกทีมในโครงการนี้โดยไม่ซ้ำกัน กรุณารีเฟรชหากมีการเพิ่มหรือลบทีม");
        }
        for (int i = 0; i < ids.size(); i++) byId.get(ids.get(i)).setDisplayOrder(i + 1);
        teamRepository.saveAll(teams);
        return ids.stream().map(byId::get).map(TeamResponse::from).toList();
    }

    /** ลบทีม: การมอบหมายกรรมการ, กลุ่ม และใบประเมินของทีมนี้ถูกลบตาม CASCADE */
    @DeleteMapping("/{teamId}")
    @Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public void delete(@PathVariable UUID competitionId,
                       @PathVariable UUID teamId,
                       Principal principal) {
        User user = access.currentUser(principal);
        structurePolicy.requireEditable(access.requireCompetitionAdmin(competitionId, user));

        Team team = find(competitionId, teamId);
        try {
            teamRepository.delete(team);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "ลบทีมนี้ไม่ได้เพราะมีข้อมูลอื่นอ้างอิงอยู่");
        }
    }

    private Team find(UUID competitionId, UUID teamId) {
        return teamRepository.findById(teamId)
                .filter(t -> t.getCompetition().getCompetitionId().equals(competitionId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบทีมนี้"));
    }

    private void apply(Team team, TeamRequest request) {
        team.setTeamName(Validation.requireText(request.teamName(), "กรุณาระบุชื่อทีม", 150));
        team.setProjectDescription(Validation.optionalText(request.projectDescription(), "คำอธิบายโปรเจกต์", 255));
        team.setProjectUrl(Validation.optionalText(request.projectUrl(), "ลิงก์โปรเจกต์", 255));
    }
}
