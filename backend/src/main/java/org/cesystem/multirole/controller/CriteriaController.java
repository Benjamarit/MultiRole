package org.cesystem.multirole.controller;

import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.Criteria;
import org.cesystem.multirole.repository.CompetitionRepository;
import org.cesystem.multirole.repository.CriteriaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/competitions/{competitionId}/criteria")
@CrossOrigin(origins = "http://localhost:5173")
public class CriteriaController {

    @Autowired
    private CriteriaRepository criteriaRepository;

    @Autowired
    private CompetitionRepository competitionRepository;

    // ดึงเกณฑ์การประเมินทั้งหมดของโครงการนี้
    @GetMapping
    public ResponseEntity<?> getCriteriaByCompetition(@PathVariable UUID competitionId) {
        // ในระบบจริง ควรเขียน Custom Query ใน Repository เพื่อหา Criteria ตาม Competition
        // แต่เบื้องต้นดึงมาทั้งหมดแล้ว Filter เอา (เพื่อความรวดเร็วในการทดสอบ)
        List<Criteria> criteriaList = criteriaRepository.findAll().stream()
                .filter(c -> c.getCompetition().getCompetitionId().equals(competitionId))
                .toList();
        return ResponseEntity.ok(criteriaList);
    }

    // เพิ่มเกณฑ์การประเมินใหม่
    @PostMapping
    public ResponseEntity<?> addCriteria(@PathVariable UUID competitionId, @RequestBody Criteria criteriaRequest) {
        Competition competition = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new RuntimeException("ไม่พบการแข่งขันนี้"));

        criteriaRequest.setCompetition(competition);
        Criteria savedCriteria = criteriaRepository.save(criteriaRequest);
        return ResponseEntity.ok(savedCriteria);
    }
}