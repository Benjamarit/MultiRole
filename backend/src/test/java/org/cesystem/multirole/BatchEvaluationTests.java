package org.cesystem.multirole;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "spring.datasource.url=jdbc:h2:mem:batch_test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class BatchEvaluationTests {
    @org.springframework.beans.factory.annotation.Autowired org.cesystem.multirole.repository.EvaluationHistoryRepository historyRepository;
    @org.springframework.beans.factory.annotation.Autowired org.cesystem.multirole.service.EvaluationService evaluationService;
    @org.springframework.beans.factory.annotation.Autowired org.springframework.transaction.PlatformTransactionManager transactionManager;
    @LocalServerPort int port;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = JsonMapper.builder().build();
    record Fixture(String owner, String judge, String stranger, String id, String a, String b, String unassigned, String criterion, String pass, String other) {}
    HttpResponse<String> request(String method, String path, String token, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path)).timeout(java.time.Duration.ofSeconds(20))
            .header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return client.send(builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    JsonNode call(String method, String path, String token, Object body, int expected) throws Exception {
        var response = request(method, path, token, body);
        assertEquals(expected, response.statusCode(), method + " " + path + ": " + response.body());
        return response.body().startsWith("{") || response.body().startsWith("[") ? json.readTree(response.body()) : null;
    }
    String register(String email) throws Exception {
        call("POST", "/auth/register", null, Map.of("fullName", "Batch Tester", "email", email, "password", "Password123!"), 200);
        return call("POST", "/auth/login", null, Map.of("email", email, "password", "Password123!"), 200).get("token").asText();
    }
    Fixture fixture() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String owner = register("owner-" + suffix + "@test.local");
        String judge = register("judge-" + suffix + "@test.local");
        String stranger = register("stranger-" + suffix + "@test.local");
        String other = register("other-" + suffix + "@test.local");
        String judgeId = call("GET", "/auth/me", judge, null, 200).get("userId").asText();
        String id = call("POST", "/competitions", owner, Map.of("title", "Batch " + suffix), 200).get("competitionId").asText();
        String base = "/competitions/" + id;
        call("POST", base + "/members", owner, Map.of("email", "judge-" + suffix + "@test.local", "role", "JUDGE"), 200);
        call("POST", base + "/members", owner, Map.of("email", "other-" + suffix + "@test.local", "role", "JUDGE"), 200);
        var teamIds = new ArrayList<String>();
        for (String name : List.of("Team A", "Team B")) teamIds.add(call("POST", base + "/teams", owner, Map.of("teamName", name), 200).get("teamId").asText());
        for (String team : teamIds.subList(0, 2)) call("POST", base + "/assignments", owner, Map.of("judgeId", judgeId, "teamId", team), 200);
        String criterion = call("POST", base + "/criteria", owner, Map.of("title", "Quality", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 80), 200).get("criterionId").asText();
        String pass = call("POST", base + "/criteria", owner, Map.of("title", "Eligibility", "scoringType", "PASS_FAIL", "maxScore", 1, "weightPercentage", 20), 200).get("criterionId").asText();
        // The third team belongs to another judge; setup is immutable after activation.
        teamIds.add(call("POST", base + "/teams", owner, Map.of("teamName", "Unassigned"), 200).get("teamId").asText());
        String ownerId = call("GET", "/auth/me", owner, null, 200).get("userId").asText();
        call("POST", base + "/members", owner, Map.of("email", "owner-" + suffix + "@test.local", "role", "JUDGE"), 200);
        call("POST", base + "/assignments", owner, Map.of("judgeId", ownerId, "teamId", teamIds.get(2)), 200);
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 200);
        return new Fixture(owner, judge, stranger, id, teamIds.get(0), teamIds.get(1), teamIds.get(2), criterion, pass, other);
    }
    Map<String, Object> entry(Fixture f, String team, int value) {
        return Map.of("teamId", team, "comment", "Overall feedback", "scores", List.of(
            Map.of("criterionId", f.criterion, "scoreValue", value, "comment", "Criterion feedback"),
            Map.of("criterionId", f.pass, "scoreValue", 1)));
    }
    JsonNode batch(Fixture f, Object entries) throws Exception {
        return call("POST", "/evaluations/submit-batch", f.judge, Map.of("competitionId", f.id, "teams", entries), 200).get("results");
    }
    JsonNode mine(Fixture f, String team) throws Exception { return call("GET", "/evaluations/competition/" + f.id + "/team/" + team + "/mine", f.judge, null, 200); }

    @Test void partialFailureCommitsSuccessAndPreservesFailedDraft() throws Exception {
        var f = fixture();
        var draft = new HashMap<>(entry(f, f.b, 7)); draft.put("competitionId", f.id); draft.put("status", "DRAFT");
        call("POST", "/evaluations/save", f.judge, draft, 200);
        var result = batch(f, List.of(entry(f, f.a, 9), entry(f, f.b, 11), entry(f, f.unassigned, 5)));
        assertEquals("SUBMITTED", result.get(0).get("outcome").asText());
        assertEquals(92, result.get(0).get("evaluation").get("totalScore").asDouble());
        assertFalse(result.get(0).get("evaluation").get("updatedAt").isNull());
        assertEquals(400, result.get(1).get("httpStatus").asInt());
        assertEquals(403, result.get(2).get("httpStatus").asInt());
        assertEquals("SUBMITTED", mine(f, f.a).get("status").asText());
        assertEquals("DRAFT", mine(f, f.b).get("status").asText());
        assertEquals(76, mine(f, f.b).get("totalScore").asDouble());
        var retry = batch(f, List.of(entry(f, f.b, 6)));
        assertEquals("SUBMITTED", retry.get(0).get("outcome").asText());
        assertEquals(68, mine(f, f.b).get("totalScore").asDouble());
    }
    @Test void retryNeverOverwritesSubmittedScoresCommentsOrTimestamps() throws Exception {
        var f = fixture();
        batch(f, List.of(entry(f, f.a, 8)));
        var original = mine(f, f.a);
        var result = batch(f, List.of(entry(f, f.a, 2), entry(f, f.b, 5)));
        assertEquals("ALREADY_SUBMITTED", result.get(0).get("outcome").asText());
        var after = mine(f, f.a);
        assertEquals(original, after, "A retry must preserve the full published evaluation, including IDs, comments and timestamps");
        assertEquals("SUBMITTED", result.get(1).get("outcome").asText());
        // Normal explicit edits remain available through the single-evaluation endpoint.
        var edit = new HashMap<>(entry(f, f.a, 6)); edit.put("competitionId", f.id); edit.put("status", "SUBMITTED");
        call("POST", "/evaluations/save", f.judge, edit, 200);
        assertEquals(68, mine(f, f.a).get("totalScore").asDouble());
    }
    @Test void incompleteAndInvalidEntriesDoNotBlockValidZeroScores() throws Exception {
        var f = fixture();
        var zero = Map.of("teamId", f.a, "scores", List.of(Map.of("criterionId", f.criterion, "scoreValue", 0), Map.of("criterionId", f.pass, "scoreValue", 0)));
        var incomplete = Map.of("teamId", f.b, "scores", List.of(Map.of("criterionId", f.criterion, "scoreValue", 4)));
        var results = batch(f, List.of(zero, incomplete));
        assertEquals(0, mine(f, f.a).get("totalScore").asDouble());
        assertEquals("SUBMITTED", results.get(0).get("outcome").asText());
        assertEquals(400, results.get(1).get("httpStatus").asInt());
        var invalidCriterion = Map.of("teamId", f.b, "scores", List.of(Map.of("criterionId", UUID.randomUUID().toString(), "scoreValue", 2)));
        assertEquals(400, batch(f, List.of(invalidCriterion)).get(0).get("httpStatus").asInt());
        call("GET", "/evaluations/competition/" + f.id + "/team/" + f.b + "/mine", f.judge, null, 204);
    }
    @Test void malformedRequestsAndUnauthorizedAccountsCannotSubmit() throws Exception {
        var f = fixture();
        var body = Map.of("competitionId", f.id, "teams", List.of(entry(f, f.a, 8)));
        call("POST", "/evaluations/submit-batch", null, body, 401);
        call("POST", "/evaluations/submit-batch", f.stranger, body, 403);
        call("POST", "/evaluations/submit-batch", f.judge, Map.of("competitionId", f.id, "teams", List.of()), 400);
        call("POST", "/evaluations/submit-batch", f.judge, Map.of("competitionId", f.id, "teams", List.of(entry(f, f.a, 8), entry(f, f.a, 7))), 400);
        call("GET", "/evaluations/competition/" + f.id + "/team/" + f.a + "/mine", f.judge, null, 204);
        String foreign = call("POST", "/competitions", f.owner, Map.of("title", "Foreign " + UUID.randomUUID()), 200).get("competitionId").asText();
        String foreignTeam = call("POST", "/competitions/" + foreign + "/teams", f.owner, Map.of("teamName", "Foreign"), 200).get("teamId").asText();
        var result = batch(f, List.of(entry(f, foreignTeam, 8), entry(f, f.b, 7)));
        assertEquals(404, result.get(0).get("httpStatus").asInt());
        assertEquals("SUBMITTED", result.get(1).get("outcome").asText());
    }
    @Test void deadlineAndClosedCompetitionRejectEveryWrite() throws Exception {
        var f = fixture();
        call("PUT", "/competitions/" + f.id, f.owner, Map.of("title", call("GET", "/competitions/" + f.id, f.owner, null, 200).get("title").asText(), "evaluationDeadline", java.time.LocalDateTime.now().minusMinutes(1).toString()), 200);
        assertEquals(409, batch(f, List.of(entry(f, f.a, 8))).get(0).get("httpStatus").asInt());
        call("PUT", "/competitions/" + f.id, f.owner, Map.of("title", call("GET", "/competitions/" + f.id, f.owner, null, 200).get("title").asText(), "evaluationDeadline", java.time.LocalDateTime.now().plusDays(1).toString()), 200);
        call("PATCH", "/competitions/" + f.id + "/status", f.owner, Map.of("status", "CLOSED"), 200);
        assertEquals(409, batch(f, List.of(entry(f, f.a, 8))).get(0).get("httpStatus").asInt());
        call("GET", "/evaluations/competition/" + f.id + "/team/" + f.a + "/mine", f.judge, null, 204);
    }
    @Test void simultaneousBatchesSubmitEachTeamOnce() throws Exception {
        var f = fixture();
        var pool = Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> batch(f, List.of(entry(f, f.a, 9), entry(f, f.b, 5))));
            var b = pool.submit(() -> batch(f, List.of(entry(f, f.a, 2), entry(f, f.b, 7))));
            var first = a.get(20, TimeUnit.SECONDS); var second = b.get(20, TimeUnit.SECONDS);
            for (int i = 0; i < 2; i++) {
                assertEquals(Set.of("SUBMITTED", "ALREADY_SUBMITTED"), Set.of(first.get(i).get("outcome").asText(), second.get(i).get("outcome").asText()));
                var winner = "SUBMITTED".equals(first.get(i).get("outcome").asText()) ? first.get(i) : second.get(i);
                assertEquals(winner.get("evaluation"), mine(f, i == 0 ? f.a : f.b));
            }
            assertEquals(2, call("GET", "/evaluations/competition/" + f.id + "/mine", f.judge, null, 200).size());
        } finally { pool.shutdownNow(); }
    }

    JsonNode history(Fixture f, String team, String token) throws Exception {
        String evaluationId = mine(f, team).get("evaluationId").asText();
        return call("GET", "/evaluations/" + evaluationId + "/history", token, null, 200).get("content");
    }
    void save(Fixture f, String status, int score) throws Exception {
        var body = new HashMap<>(entry(f, f.a, score)); body.put("competitionId", f.id); body.put("status", status);
        call("POST", "/evaluations/save", f.judge, body, 200);
    }
    @Test void historyCapturesDraftSubmissionAndEditsWithPrivateDraftsAndNoDuplicateRetry() throws Exception {
        var f = fixture();
        save(f, "DRAFT", 4);
        assertEquals("DRAFT_SAVED", history(f, f.a, f.judge).get(0).get("eventType").asText());
        String path = "/evaluations/" + mine(f, f.a).get("evaluationId").asText() + "/history";
        call("GET", path, f.owner, null, 403);
        save(f, "DRAFT", 4);
        assertEquals(1, history(f, f.a, f.judge).size(), "unchanged save must not add history");
        batch(f, List.of(entry(f, f.a, 8)));
        var judgeHistory = history(f, f.a, f.judge);
        assertEquals(2, judgeHistory.size());
        assertEquals("SUBMITTED", judgeHistory.get(0).get("eventType").asText());
        assertEquals(52, judgeHistory.get(0).get("before").get("totalScore").asDouble());
        var adminHistory = history(f, f.a, f.owner);
        assertEquals(1, adminHistory.size());
        assertTrue(adminHistory.get(0).get("before").isNull(), "admin must not receive pre-submission draft snapshot");
        batch(f, List.of(entry(f, f.a, 2)));
        assertEquals(2, history(f, f.a, f.judge).size());
        save(f, "SUBMITTED", 6);
        var edit = history(f, f.a, f.owner).get(0);
        assertEquals("UPDATED", edit.get("eventType").asText());
        assertEquals(84, edit.get("before").get("totalScore").asDouble());
        assertEquals(68, edit.get("after").get("totalScore").asDouble());
        assertEquals("Overall feedback", edit.get("before").get("comment").asText());
        assertFalse(edit.get("actorName").asText().isBlank());
        assertEquals("Team A", edit.get("teamName").asText());
        save(f, "SUBMITTED", 6);
        assertEquals(3, history(f, f.a, f.judge).size());
        var changed = new HashMap<>(entry(f, f.a, 6)); changed.put("competitionId", f.id); changed.put("status", "SUBMITTED"); changed.put("comment", "Revised feedback");
        call("POST", "/evaluations/save", f.judge, changed, 200);
        assertEquals("Revised feedback", history(f, f.a, f.judge).get(0).get("after").get("comment").asText());
        call("GET", path, null, null, 401);
        call("GET", path, f.stranger, null, 403);
        call("GET", path, f.other, null, 403);
        call("GET", path + "?page=-1", f.judge, null, 400);
    }
    @Test void failedWritesAndConcurrentRetriesDoNotCreateAuditEntries() throws Exception {
        var f = fixture();
        batch(f, List.of(entry(f, f.a, 8), entry(f, f.b, 11)));
        assertEquals(1, history(f, f.a, f.judge).size());
        var invalid = new HashMap<>(entry(f, f.a, 11)); invalid.put("competitionId", f.id); invalid.put("status", "SUBMITTED");
        call("POST", "/evaluations/save", f.judge, invalid, 400);
        assertEquals(1, history(f, f.a, f.judge).size());
        var pool = Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> batch(f, List.of(entry(f, f.b, 8))));
            var b = pool.submit(() -> batch(f, List.of(entry(f, f.b, 2))));
            a.get(20, TimeUnit.SECONDS); b.get(20, TimeUnit.SECONDS);
            assertEquals(1, history(f, f.b, f.judge).size());
        } finally { pool.shutdownNow(); }
        call("PUT", "/competitions/" + f.id, f.owner, Map.of("title", call("GET", "/competitions/" + f.id, f.owner, null, 200).get("title").asText(), "evaluationDeadline", java.time.LocalDateTime.now().minusMinutes(1).toString()), 200);
        var edit = new HashMap<>(entry(f, f.a, 5)); edit.put("competitionId", f.id); edit.put("status", "SUBMITTED");
        call("POST", "/evaluations/save", f.judge, edit, 409);
        assertEquals(1, history(f, f.a, f.judge).size());
    }
    @Test void rollbackRevertsBothScoreAndHistory() throws Exception {
        var f = fixture();
        save(f, "SUBMITTED", 8);
        var before = mine(f, f.a);
        var body = new HashMap<>(entry(f, f.a, 5)); body.put("competitionId", f.id); body.put("status", "SUBMITTED");
        var dto = json.readValue(json.writeValueAsString(body), org.cesystem.multirole.dto.EvaluationRequest.class);
        String email = call("GET", "/auth/me", f.judge, null, 200).get("email").asText();
        long count = historyRepository.count();
        new org.springframework.transaction.support.TransactionTemplate(transactionManager).executeWithoutResult(tx -> {
            evaluationService.upsertEvaluation(dto, email);
            historyRepository.flush();
            assertEquals(count + 1, historyRepository.count());
            tx.setRollbackOnly();
        });
        assertEquals(count, historyRepository.count());
        assertEquals(before, mine(f, f.a));
    }
    @Test void legacyScoresGainBeforeSnapshotOnNextEditAndHistoryIsPaginated() throws Exception {
        var f = fixture();
        save(f, "SUBMITTED", 8);
        UUID id = UUID.fromString(mine(f, f.a).get("evaluationId").asText());
        historyRepository.deleteAll(historyRepository.findByEvaluationId(id, org.springframework.data.domain.Pageable.unpaged()).getContent());
        assertEquals(0, history(f, f.a, f.judge).size());
        for (int i = 0; i < 22; i++) save(f, "SUBMITTED", i % 2 == 0 ? 6 : 7);
        String path = "/evaluations/" + id + "/history";
        var first = call("GET", path, f.owner, null, 200);
        var second = call("GET", path + "?page=1", f.owner, null, 200);
        assertEquals(20, first.get("content").size());
        assertEquals(2, second.get("content").size());
        assertFalse(first.get("last").asBoolean());
        assertTrue(second.get("last").asBoolean());
        assertEquals(84, second.get("content").get(1).get("before").get("totalScore").asDouble());
    }
    @Test void concurrentEditsKeepAContinuousBeforeAndAfterChain() throws Exception {
        var f = fixture();
        save(f, "SUBMITTED", 8);
        var pool = Executors.newFixedThreadPool(2);
        try {
            var first = pool.submit(() -> { save(f, "SUBMITTED", 6); return true; });
            var second = pool.submit(() -> { save(f, "SUBMITTED", 7); return true; });
            first.get(20, TimeUnit.SECONDS); second.get(20, TimeUnit.SECONDS);
            var entries = history(f, f.a, f.judge);
            assertEquals(3, entries.size());
            assertEquals(entries.get(1).get("after"), entries.get(0).get("before"));
            assertEquals(entries.get(2).get("after"), entries.get(1).get("before"));
            assertEquals(mine(f, f.a).get("totalScore").asDouble(), entries.get(0).get("after").get("totalScore").asDouble());
        } finally { pool.shutdownNow(); }
    }
}
