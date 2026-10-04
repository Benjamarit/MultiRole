package org.cesystem.multirole.controller;

import org.cesystem.multirole.dto.EvaluationRequest;
import org.cesystem.multirole.service.EvaluationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/evaluations")
@CrossOrigin(origins = "http://localhost:5173")
public class EvaluationController {

    @Autowired
    private EvaluationService evaluationService;

    @PostMapping("/save")
    public ResponseEntity<?> saveEvaluation(@RequestBody EvaluationRequest request, Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body("ไม่มีสิทธิ์เข้าถึง (Unauthorized)");
        }

        try {
            // principal.getName() จะส่งอีเมลของคนที่แนบ Token ไปให้ Service จัดการ
            evaluationService.upsertEvaluation(request, principal.getName());
            return ResponseEntity.ok("บันทึกข้อมูลการประเมินเรียบร้อยแล้ว");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}