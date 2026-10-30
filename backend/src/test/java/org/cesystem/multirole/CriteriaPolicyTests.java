package org.cesystem.multirole;

import org.cesystem.multirole.config.CriteriaLockMigration;
import org.cesystem.multirole.model.Evaluation;
import org.cesystem.multirole.repository.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "spring.datasource.url=jdbc:h2:mem:criteria_policy_test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class CriteriaPolicyTests {
    @LocalServerPort int port;
    @Autowired CompetitionRepository projects;
    @Autowired EvaluationRepository evaluations;
    @Autowired UserRepository users;
    @Autowired TeamRepository teams;
    @Autowired CriteriaLockMigration migration;
    @Autowired PlatformTransactionManager transactionManager;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = JsonMapper.builder().build();
    record Fixture(String token, String id, String teamId, String userId, String criterionId, String title) {
        String path() { return "/competitions/" + id; }
    }
    HttpResponse<String> request(String method, String path, String token, Object body) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path)).header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        return client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    JsonNode call(String method, String path, String token, Object body, int expected) throws Exception {
        var response = request(method, path, token, body);
        assertEquals(expected, response.statusCode(), method + " " + path + ": " + response.body());
        return response.body().startsWith("{") || response.body().startsWith("[") ? json.readTree(response.body()) : null;
    }
    Map<String, Object> criterion(String title, int max) {
        return Map.of("title", title, "description", "Rubric details", "scoringType", "NUMERIC", "maxScore", max, "weightPercentage", 100);
    }
    Fixture fixture() throws Exception {
        String suffix = UUID.randomUUID().toString(), email = "criteria-" + suffix + "@example.test";
        call("POST", "/auth/register", null, Map.of("email", email, "fullName", "Criteria Tester", "password", "Password123!"), 200);
        String token = call("POST", "/auth/login", null, Map.of("email", email, "password", "Password123!"), 200).path("token").asText();
        String userId = call("GET", "/auth/me", token, null, 200).path("userId").asText();
        String id = call("POST", "/competitions", token, Map.of("title", suffix), 200).path("competitionId").asText(), path = "/competitions/" + id;
        String teamId = call("POST", path + "/teams", token, Map.of("teamName", "Team A"), 200).path("teamId").asText();
        String criterionId = call("POST", path + "/criteria", token, criterion("Quality", 10), 200).path("criterionId").asText();
        call("POST", path + "/members", token, Map.of("email", email, "role", "JUDGE"), 200);
        call("POST", path + "/assignments", token, Map.of("judgeId", userId, "teamId", teamId), 200);
        return new Fixture(token, id, teamId, userId, criterionId, suffix);
    }
    JsonNode status(Fixture f, String status, int expected) throws Exception {
        return call("PATCH", f.path() + "/status", f.token, Map.of("status", status), expected);
    }
    void locked(Fixture f) throws Exception {
        call("POST", f.path() + "/criteria", f.token, criterion("New", 10), 409);
        call("PUT", f.path() + "/criteria/" + f.criterionId, f.token, criterion("Changed", 20), 409);
        call("DELETE", f.path() + "/criteria/" + f.criterionId, f.token, null, 409);
        assertTrue(call("GET", f.path(), f.token, null, 200).path("criteriaLocked").asBoolean());
        assertEquals(1, call("GET", f.path() + "/criteria", f.token, null, 200).size());
    }

    @Test void draftCriteriaRemainEditableBeforeFirstActivation() throws Exception {
        var f = fixture();
        assertFalse(call("GET", f.path(), f.token, null, 200).path("criteriaLocked").asBoolean());
        call("PUT", f.path() + "/criteria/" + f.criterionId, f.token, criterion("Updated draft", 20), 200);
        call("DELETE", f.path() + "/criteria/" + f.criterionId, f.token, null, 200);
        call("POST", f.path() + "/criteria", f.token, criterion("Replacement", 10), 200);
    }

    @Test void openingLocksEveryCriteriaWriteEvenWithoutScoresAndAcrossPausesAndClosure() throws Exception {
        var f = fixture();
        assertTrue(status(f, "ACTIVE", 200).path("criteriaLocked").asBoolean());
        assertFalse(evaluations.existsByCompetition_CompetitionId(UUID.fromString(f.id)));
        locked(f);
        status(f, "DRAFT", 200); locked(f);
        call("PUT", f.path(), f.token, Map.of("title", f.title, "description", "Metadata update"), 409);
        call("PUT", f.path(), f.token, Map.of("title", f.title, "evaluationDeadline", LocalDateTime.now().plusHours(2).toString()), 200);
        locked(f);
        status(f, "ACTIVE", 200); status(f, "CLOSED", 200); locked(f);
        status(f, "DRAFT", 200); locked(f);
        var user = users.findById(UUID.fromString(f.userId)).orElseThrow(); user.setIsSystemAdmin(true); users.saveAndFlush(user);
        locked(f); // System Admin has no exception to this scoring rule.
    }

    @Test void pastDeadlineRejectsActivationWithoutLockingTheDraft() throws Exception {
        var f = fixture();
        call("PUT", f.path(), f.token, Map.of("title", f.title, "evaluationDeadline", LocalDateTime.now().minusMinutes(1).toString()), 200);
        var failure = request("PATCH", f.path() + "/status", f.token, Map.of("status", "ACTIVE"));
        assertEquals(400, failure.statusCode()); assertTrue(failure.body().contains("กำหนดเวลาปิดรับคะแนน"));
        assertFalse(call("GET", f.path(), f.token, null, 200).path("criteriaLocked").asBoolean());
        call("PUT", f.path() + "/criteria/" + f.criterionId, f.token, criterion("Quality", 10), 200);
        call("PUT", f.path(), f.token, Map.of("title", f.title, "evaluationDeadline", LocalDateTime.now().plusHours(1).toString()), 200);
        status(f, "ACTIVE", 200); status(f, "DRAFT", 200);
        call("PUT", f.path(), f.token, Map.of("title", f.title, "evaluationDeadline", LocalDateTime.now().toString()), 200);
        status(f, "ACTIVE", 400); locked(f);
    }

    @Test void clearingAnExpiredDeadlineAllowsActivationWithoutATimeLimit() throws Exception {
        var f = fixture();
        call("PUT", f.path(), f.token, Map.of("title", f.title, "evaluationDeadline", LocalDateTime.now().minusDays(1).toString()), 200);
        status(f, "ACTIVE", 400);
        call("PUT", f.path(), f.token, Map.of("title", f.title), 200);
        status(f, "ACTIVE", 200);
    }

    @Test void legacyOpenAndPausedScoredProjectsStayLockedAfterMigration() throws Exception {
        var open = fixture(); var paused = fixture(); var untouched = fixture();
        new TransactionTemplate(transactionManager).execute(ignored -> {
            var a = projects.findById(UUID.fromString(open.id)).orElseThrow(); a.setStatus("ACTIVE"); a.setCriteriaLocked(null);
            var b = projects.findById(UUID.fromString(paused.id)).orElseThrow(); b.setCriteriaLocked(null);
            var c = projects.findById(UUID.fromString(untouched.id)).orElseThrow(); c.setCriteriaLocked(null);
            var evaluation = new Evaluation(); evaluation.setCompetition(b);
            evaluation.setJudge(users.findById(UUID.fromString(paused.userId)).orElseThrow());
            evaluation.setTeam(teams.findById(UUID.fromString(paused.teamId)).orElseThrow()); evaluations.save(evaluation);
            return null;
        });
        migration.run(new DefaultApplicationArguments());
        status(open, "DRAFT", 200); locked(open); locked(paused);
        assertFalse(call("GET", untouched.path(), untouched.token, null, 200).path("criteriaLocked").asBoolean());
        call("PUT", untouched.path() + "/criteria/" + untouched.criterionId, untouched.token, criterion("Still editable", 10), 200);
    }

    @Test void activationAndAnOpenEditFormSerializeWithoutAnEditAfterTheLock() throws Exception {
        var f = fixture(); var pool = Executors.newFixedThreadPool(2); var start = new CountDownLatch(1);
        try {
            var activate = pool.submit(() -> { start.await(); return request("PATCH", f.path() + "/status", f.token, Map.of("status", "ACTIVE")); });
            var edit = pool.submit(() -> { start.await(); return request("PUT", f.path() + "/criteria/" + f.criterionId, f.token, criterion("Quality", 20)); });
            start.countDown();
            assertEquals(200, activate.get(20, TimeUnit.SECONDS).statusCode());
            var edited = edit.get(20, TimeUnit.SECONDS);
            assertTrue(List.of(200, 409).contains(edited.statusCode()), edited.body());
            var rubric = call("GET", f.path() + "/criteria", f.token, null, 200).get(0);
            assertEquals(edited.statusCode() == 200 ? 20 : 10, rubric.path("maxScore").asInt());
            locked(f);
        } finally { pool.shutdownNow(); }
    }
}
