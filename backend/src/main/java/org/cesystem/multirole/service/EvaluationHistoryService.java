package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.*;
import org.cesystem.multirole.repository.EvaluationHistoryRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class EvaluationHistoryService {
    private final EvaluationHistoryRepository repository;
    private final JsonMapper mapper = JsonMapper.builder().build();

    public record CriterionSnapshot(UUID criterionId, String title, String scoringType,
            BigDecimal maxScore, BigDecimal weightPercentage, BigDecimal scoreValue, String comment) {}
    public record Snapshot(String status, BigDecimal totalScore, String comment, List<CriterionSnapshot> scores) {}
    public record Response(UUID historyId, String eventType, LocalDateTime occurredAt,
            UUID actorId, String actorName, String actorEmail, String teamName, Snapshot before, Snapshot after) {}

    public Snapshot snapshot(Evaluation evaluation) {
        return new Snapshot(evaluation.getStatus(), number(evaluation.getTotalScore()), evaluation.getComment(),
            evaluation.getScores().stream().sorted(Comparator.comparing(s -> s.getCriteria().getCriterionId()))
                .map(s -> new CriterionSnapshot(s.getCriteria().getCriterionId(), s.getCriteria().getTitle(),
                    s.getCriteria().getScoringType(), number(s.getCriteria().getMaxScore()),
                    number(s.getCriteria().getWeightPercentage()), number(s.getScoreValue()), s.getComment())).toList());
    }

    private BigDecimal number(BigDecimal value) { return value == null ? null : value.stripTrailingZeros(); }

    // MANDATORY ensures an audit failure rolls back the score write too.
    @Transactional(propagation = Propagation.MANDATORY)
    public void record(Evaluation evaluation, Snapshot before) {
        Snapshot after = snapshot(evaluation);
        if (Objects.equals(before, after)) return;
        var history = new EvaluationHistory();
        history.setEvaluationId(evaluation.getEvaluationId());
        history.setCompetitionId(evaluation.getCompetition().getCompetitionId());
        history.setTeamId(evaluation.getTeam().getTeamId());
        history.setTeamName(evaluation.getTeam().getTeamName());
        history.setActorId(evaluation.getJudge().getUserId());
        history.setActorName(evaluation.getJudge().getFullName());
        history.setActorEmail(evaluation.getJudge().getEmail());
        history.setEventType("SUBMITTED".equals(after.status())
            ? before != null && "SUBMITTED".equals(before.status()) ? "UPDATED" : "SUBMITTED" : "DRAFT_SAVED");
        history.setOccurredAt(LocalDateTime.now());
        history.setBeforeSnapshot(before == null ? null : mapper.writeValueAsString(before));
        history.setAfterSnapshot(mapper.writeValueAsString(after));
        repository.save(history);
    }

    public Response response(EvaluationHistory history, boolean own) {
        Snapshot before = history.getBeforeSnapshot() == null ? null : mapper.readValue(history.getBeforeSnapshot(), Snapshot.class);
        // Draft contents are private to the judge, including the snapshot on first submission.
        if (!own && before != null && "DRAFT".equals(before.status())) before = null;
        return new Response(history.getHistoryId(), history.getEventType(), history.getOccurredAt(),
            history.getActorId(), history.getActorName(), history.getActorEmail(), history.getTeamName(),
            before, mapper.readValue(history.getAfterSnapshot(), Snapshot.class));
    }
}
