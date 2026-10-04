package org.cesystem.multirole.controller;

import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.repository.CompetitionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/competitions")
@CrossOrigin(origins = "http://localhost:5173")
public class CompetitionController {

    @Autowired
    private CompetitionRepository competitionRepository;

    @GetMapping
    public List<Competition> getAllCompetitions() {
        return competitionRepository.findAll();
    }
}