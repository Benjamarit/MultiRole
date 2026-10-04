package org.cesystem.multirole.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Data
public class EvaluationRequest {
    private UUID competitionId;
    private UUID teamId;
    private String comment;
    private String status; // ส่งเป็น "DRAFT" หรือ "SUBMITTED"
    private List<ScoreRequest> scores;

    @Data
    public static class ScoreRequest {
        private UUID criteriaId;
        private BigDecimal scoreValue;
        private String comment;
    }
}