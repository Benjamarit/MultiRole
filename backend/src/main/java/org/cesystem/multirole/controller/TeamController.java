package org.cesystem.multirole.controller;

import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.Team;
import org.cesystem.multirole.repository.CompetitionRepository;
import org.cesystem.multirole.repository.TeamRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/competitions/{competitionId}/teams")
@CrossOrigin(origins = "http://localhost:5173")
public class TeamController {

    @Autowired
    private TeamRepository teamRepository;

    @Autowired
    private CompetitionRepository competitionRepository;

    // ดึงรายชื่อทีมทั้งหมดในโครงการนี้
    @GetMapping
    public ResponseEntity<?> getTeamsByCompetition(@PathVariable UUID competitionId) {
        List<Team> teams = teamRepository.findAll().stream()
                .filter(t -> t.getCompetition().getCompetitionId().equals(competitionId))
                .toList();
        return ResponseEntity.ok(teams);
    }

    // ลงทะเบียนทีมใหม่
    @PostMapping
    public ResponseEntity<?> createTeam(@PathVariable UUID competitionId, @RequestBody Team teamRequest) {
        Competition competition = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new RuntimeException("ไม่พบการแข่งขันนี้"));

        teamRequest.setCompetition(competition);
        Team savedTeam = teamRepository.save(teamRequest);
        return ResponseEntity.ok(savedTeam);
    }
}