package org.cesystem.multirole.dto;

import java.util.List;
import java.util.UUID;
import org.cesystem.multirole.dto.ApiDtos.EvaluationResponse;

public final class BatchEvaluationDtos {
    private BatchEvaluationDtos() {}
    public record Request(UUID competitionId, List<TeamEntry> teams) {}
    public record TeamEntry(UUID teamId, String comment, List<EvaluationRequest.ScoreRequest> scores) {}
    public record Result(UUID teamId, String outcome, int httpStatus, String message, EvaluationResponse evaluation) {}
    public record Response(List<Result> results) {}
}
