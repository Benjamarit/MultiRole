package org.cesystem.multirole.dto;

import lombok.Data;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
public class EvaluationRequest {
    private UUID competitionId;
    private UUID teamId;
    private String comment;
    private String status; // "DRAFT" หรือ "SUBMITTED"
    private List<ScoreRequest> scores = new ArrayList<>();

    @Data
    public static class ScoreRequest {
        private UUID criterionId; // เดิมชื่อ criteriaId
        private BigDecimal scoreValue;
        private String comment;
    }
}