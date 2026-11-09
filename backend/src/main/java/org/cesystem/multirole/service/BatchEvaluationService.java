package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.BatchEvaluationDtos;
import org.cesystem.multirole.dto.EvaluationRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@lombok.extern.slf4j.Slf4j
public class BatchEvaluationService {
    private final EvaluationService evaluations;
    private final AccessService access;

    // Deliberately no outer transaction: every entry has its own commit/rollback boundary.
    public BatchEvaluationDtos.Response submit(BatchEvaluationDtos.Request request, Principal principal) {
        return save(request, principal, false);
    }

    public BatchEvaluationDtos.Response saveDrafts(BatchEvaluationDtos.Request request, Principal principal) {
        return save(request, principal, true);
    }

    private BatchEvaluationDtos.Response save(BatchEvaluationDtos.Request request, Principal principal, boolean draft) {
        var user = access.currentUser(principal);
        if (request == null || request.competitionId() == null || request.teams() == null || request.teams().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุโครงการและทีมที่จะส่งคะแนน");
        }
        access.requireMember(request.competitionId(), user);
        var seen = new HashSet<UUID>();
        for (var entry : request.teams()) {
            if (entry == null || entry.teamId() == null || !seen.add(entry.teamId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุทีมที่ไม่ซ้ำกันในคำขอส่งคะแนน");
            }
        }
        var results = new ArrayList<BatchEvaluationDtos.Result>();
        for (var entry : request.teams()) {
            var evaluation = new EvaluationRequest();
            evaluation.setCompetitionId(request.competitionId());
            evaluation.setTeamId(entry.teamId());
            evaluation.setComment(entry.comment());
            evaluation.setScores(entry.scores());
            try {
                results.add(draft ? evaluations.saveDraftUnsubmitted(evaluation, user.getEmail())
                        : evaluations.submitUnsubmitted(evaluation, user.getEmail()));
            } catch (ResponseStatusException error) {
                results.add(new BatchEvaluationDtos.Result(entry.teamId(), "FAILED", error.getStatusCode().value(),
                        error.getReason(), null));
            } catch (RuntimeException error) {
                log.error("Batch submission failed for competition {}, team {}", request.competitionId(), entry.teamId(), error);
                results.add(new BatchEvaluationDtos.Result(entry.teamId(), "FAILED", 500,
                        "บันทึกทีมนี้ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", null));
            }
        }
        return new BatchEvaluationDtos.Response(results);
    }
}
