package org.cesystem.multirole;

import org.cesystem.multirole.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ApiIntegrationTests {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired org.cesystem.multirole.repository.EmailOutboxRepository emailOutbox;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = JsonMapper.builder().build();

    JsonNode call(String method, String path, String token, Object body, int expected) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path))
                .header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)));
        var response = client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(expected, response.statusCode(), method + " " + path + ": " + response.body());
        String text = response.body();
        return text.startsWith("{") || text.startsWith("[") ? json.readTree(text) : null;
    }

    String register(String email) throws Exception {
        call("POST", "/auth/register", null, Map.of("fullName", "Test User", "email", email, "password", "Password123!"), 200);
        return call("POST", "/auth/login", null, Map.of("email", email, "password", "Password123!"), 200).get("token").asText();
    }

    @Test
    void sharedTeamKeepsDraftsPrivateAndAveragesOnlySubmittedJudges() throws Exception {
        String suffix = java.util.UUID.randomUUID().toString();
        String owner = register("shared-owner-" + suffix + "@example.test");
        String emailA = "shared-a-" + suffix + "@example.test", emailB = "shared-b-" + suffix + "@example.test";
        String a = register(emailA), b = register(emailB);
        String id = call("POST", "/competitions", owner, Map.of("title", "Shared team " + suffix), 200).path("competitionId").asText();
        String path = "/competitions/" + id;
        String team = call("POST", path + "/teams", owner, Map.of("teamName", "Shared Team"), 200).path("teamId").asText();
        String quality = call("POST", path + "/criteria", owner, Map.of("title", "Quality", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 60), 200).path("criterionId").asText();
        String presentation = call("POST", path + "/criteria", owner, Map.of("title", "Presentation", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 40), 200).path("criterionId").asText();
        for (var judge : java.util.List.of(Map.entry(emailA,a), Map.entry(emailB,b))) {
            call("POST", path + "/members", owner, Map.of("email",judge.getKey(),"role","JUDGE"),200);
            String uid = call("GET","/auth/me",judge.getValue(),null,200).path("userId").asText();
            call("POST",path+"/assignments",owner,Map.of("judgeId",uid,"teamId",team),200);
        }
        call("PATCH",path+"/status",owner,Map.of("status","ACTIVE"),200);
        var scoreA = java.util.List.of(Map.of("criterionId",quality,"scoreValue",8),Map.of("criterionId",presentation,"scoreValue",6));
        var scoreB = java.util.List.of(Map.of("criterionId",quality,"scoreValue",4),Map.of("criterionId",presentation,"scoreValue",10));
        var bothFull = java.util.List.of(Map.of("criterionId",quality,"scoreValue",10),Map.of("criterionId",presentation,"scoreValue",10));
        String results = "/evaluations/competition/" + id;
        call("POST","/evaluations/save",a,Map.of("competitionId",id,"teamId",team,"status","DRAFT","scores",scoreA,"comment","Private A"),200);
        call("POST","/evaluations/save",b,Map.of("competitionId",id,"teamId",team,"status","DRAFT","scores",scoreB,"comment","Private B"),200);
        assertEquals(0,call("GET",results,owner,null,200).size(),"Neither draft reaches the owner's results");
        var mineA=call("GET",results+"/mine",a,null,200); var mineB=call("GET",results+"/mine",b,null,200);
        assertEquals(1,mineA.size()); assertEquals(1,mineB.size());
        assertEquals("Private A",mineA.get(0).path("comment").asText());
        assertEquals("Private B",mineB.get(0).path("comment").asText());
        assertNotEquals(mineA.get(0).path("evaluationId").asText(),mineB.get(0).path("evaluationId").asText());
        call("GET","/evaluations/"+mineB.get(0).path("evaluationId").asText()+"/history",a,null,403);
        call("GET","/evaluations/"+mineA.get(0).path("evaluationId").asText()+"/history",owner,null,403);
        call("POST","/evaluations/save",a,Map.of("competitionId",id,"teamId",team,"status","SUBMITTED","scores",scoreA),200);
        var published=call("GET",results,owner,null,200);
        assertEquals(1,published.size()); assertEquals(72,published.get(0).path("totalScore").asDouble());
        // Even a full-score draft must not change the published 72 or expose private feedback.
        call("POST","/evaluations/save",b,Map.of("competitionId",id,"teamId",team,"status","DRAFT","scores",bothFull,"comment","Still private"),200);
        published=call("GET",results,owner,null,200);
        assertEquals(1,published.size()); assertEquals(72,published.get(0).path("totalScore").asDouble());
        assertFalse(published.toString().contains("Still private"));
        call("POST","/evaluations/save",b,Map.of("competitionId",id,"teamId",team,"status","SUBMITTED","scores",scoreB),200);
        published=call("GET",results,owner,null,200);
        assertEquals(2,published.size());
        double average=java.util.stream.StreamSupport.stream(published.spliterator(),false).mapToDouble(e->e.path("totalScore").asDouble()).average().orElseThrow();
        assertEquals(68,average);
        assertEquals(1,call("GET",results,a,null,200).size(),"Judge A never reads Judge B's evaluation");
        // Edits update the same submitted evaluation; an old client sending DRAFT cannot unpublish it.
        call("POST","/evaluations/save",a,Map.of("competitionId",id,"teamId",team,"status","DRAFT","scores",bothFull),200);
        published=call("GET",results,owner,null,200);
        assertEquals(2,published.size());
        assertTrue(java.util.stream.StreamSupport.stream(published.spliterator(),false).allMatch(e->"SUBMITTED".equals(e.path("status").asText())));
        average=java.util.stream.StreamSupport.stream(published.spliterator(),false).mapToDouble(e->e.path("totalScore").asDouble()).average().orElseThrow();
        assertEquals(82,average);
        assertEquals(mineA.get(0).path("evaluationId").asText(),call("GET",results+"/mine",a,null,200).get(0).path("evaluationId").asText());
        call("DELETE",path,owner,null,200);
    }

    @Test
    void invitationNotifiesOnlyTheInvitedUserWithoutQueuingEmail() throws Exception {
        String suffix = java.util.UUID.randomUUID().toString();
        String owner = register("inviter-" + suffix + "@example.test");
        String email = "invited-" + suffix + "@example.test";
        String judge = register(email);
        String id = call("POST", "/competitions", owner, Map.of("title", "Invitation " + suffix), 200).path("competitionId").asText();
        String path = "/competitions/" + id;
        long before = emailOutbox.count();
        assertEquals(0, call("GET", "/competitions", judge, null, 200).size());
        call("POST", path + "/members", owner, Map.of("email", email.toUpperCase(java.util.Locale.ROOT), "role", "JUDGE"), 200);
        assertEquals(1, call("GET", "/competitions", judge, null, 200).size());
        var notice = call("GET", "/notifications", judge, null, 200).get(0);
        assertEquals("PROJECT_INVITATION", notice.path("type").asText());
        assertEquals(id, notice.path("competitionId").asText());
        assertTrue(notice.path("message").asText().contains("Invitation " + suffix));
        assertTrue(notice.path("message").asText().contains("โดย Test User"));
        assertFalse(notice.path("isRead").asBoolean());
        assertTrue(notice.path("emailStatus").isNull());
        assertEquals(0, call("GET", "/notifications", owner, null, 200).size());
        call("POST", path + "/members", owner, Map.of("email", email, "role", "JUDGE"), 409);
        assertEquals(1, call("GET", "/notifications", judge, null, 200).size(), "Duplicate invite does not duplicate notifications");
        call("POST", path + "/members", owner, Map.of("email", "inviter-" + suffix + "@example.test", "role", "JUDGE"), 200);
        assertEquals(0, call("GET", "/notifications", owner, null, 200).size(), "Self-assignment does not notify yourself");
        assertEquals(before, emailOutbox.count(), "Invitation must never queue email");
        String notificationId = notice.path("notificationId").asText();
        call("PATCH", "/notifications/" + notificationId + "/read", owner, null, 404);
        call("PATCH", "/notifications/" + notificationId + "/read", judge, null, 200);
        assertEquals(0, call("GET", "/notifications/unread-count", judge, null, 200).path("count").asInt());
        call("DELETE", path, owner, null, 200);
    }

    @Test
    void separateJudgeSessionsCannotCrossAssignmentsOrReadAnotherJudgesHistory() throws Exception {
        String suffix = java.util.UUID.randomUUID().toString();
        String owner = register("owner-" + suffix + "@example.test");
        String judgeAEmail = "judge-a-" + suffix + "@example.test";
        String judgeBEmail = "judge-b-" + suffix + "@example.test";
        String judgeA = register(judgeAEmail), judgeB = register(judgeBEmail);
        String outsider = register("outsider-" + suffix + "@example.test");
        String judgeAId = call("GET", "/auth/me", judgeA, null, 200).path("userId").asText();
        String judgeBId = call("GET", "/auth/me", judgeB, null, 200).path("userId").asText();
        String id = call("POST", "/competitions", owner, Map.of("title", "Role matrix " + suffix), 200).path("competitionId").asText();
        String base = "/competitions/" + id;
        for (String email : java.util.List.of(judgeAEmail, judgeBEmail)) {
            call("POST", base + "/members", owner, Map.of("email", email, "role", "JUDGE"), 200);
        }
        String teamA = call("POST", base + "/teams", owner, Map.of("teamName", "Team A"), 200).path("teamId").asText();
        String teamB = call("POST", base + "/teams", owner, Map.of("teamName", "Team B"), 200).path("teamId").asText();
        var rubric = Map.of("title", "Quality", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 100);
        String criterion = call("POST", base + "/criteria", owner, rubric, 200).path("criterionId").asText();
        String assignmentA = call("POST", base + "/assignments", owner, Map.of("judgeId", judgeAId, "teamId", teamA), 200).path("assignmentId").asText();
        call("POST", base + "/assignments", owner, Map.of("judgeId", judgeBId, "teamId", teamB), 200);
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 200);
        assertEquals(teamA, call("GET", base + "/assignments", judgeA, null, 200).get(0).path("teamId").asText());
        assertEquals(1, call("GET", base + "/assignments", judgeB, null, 200).size());
        for (String token : java.util.List.of(judgeA, outsider)) {
            call("GET", base + "/members", token, null, 403);
            call("POST", base + "/teams", token, Map.of("teamName", "Forbidden"), 403);
            call("POST", base + "/criteria", token, rubric, 403);
            call("PUT", base, token, Map.of("title", "Forbidden"), 403);
            call("PATCH", base + "/status", token, Map.of("status", "CLOSED"), 403);
            call("GET", "/admin/users", token, null, 403);
        }
        var scores = java.util.List.of(Map.of("criterionId", criterion, "scoreValue", 7));
        var ownDraft = Map.of("competitionId", id, "teamId", teamA, "status", "DRAFT", "scores", scores);
        call("POST", "/evaluations/save", judgeB, ownDraft, 403);
        call("POST", "/evaluations/save", owner, ownDraft, 403);
        call("POST", "/evaluations/save", judgeA, ownDraft, 200);
        String evaluationId = call("GET", "/evaluations/competition/" + id + "/mine", judgeA, null, 200).get(0).path("evaluationId").asText();
        String history = "/evaluations/" + evaluationId + "/history";
        call("GET", history, judgeB, null, 403);
        call("GET", history, owner, null, 403);
        call("GET", history, outsider, null, 403);
        assertEquals(0, call("GET", "/evaluations/competition/" + id, judgeB, null, 200).size());
        // A forged judge ID never selects another user's evaluation: the principal owns the write.
        call("POST", "/evaluations/save", judgeB, Map.of("competitionId", id, "teamId", teamB, "judgeId", judgeAId,
            "status", "SUBMITTED", "scores", scores), 200);
        assertEquals(judgeBId, call("GET", "/evaluations/competition/" + id + "/mine", judgeB, null, 200).get(0).path("judgeId").asText());
        call("POST", "/evaluations/save", judgeA, Map.of("competitionId", id, "teamId", teamA, "status", "SUBMITTED", "scores", scores), 200);
        call("GET", history, owner, null, 200);
        call("GET", history, judgeB, null, 403);
        // An active project's assignments cannot be removed under an open scoring form.
        call("DELETE", base + "/assignments/" + assignmentA, owner, null, 409);
        call("POST", "/evaluations/save", judgeA, ownDraft, 200);
        assertEquals(70, call("GET", "/evaluations/competition/" + id + "/mine", judgeA, null, 200).get(0).path("totalScore").asDouble());
        call("DELETE", base, owner, null, 200);
    }

    @Test
    void fullCompetitionWorkflowAndAccessControls() throws Exception {
        for (String origin : java.util.List.of("http://localhost:5173", "http://127.0.0.1:5173")) {
            var preflight = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/login"))
                    .header("Origin", origin).header("Access-Control-Request-Method", "POST")
                    .header("Access-Control-Request-Headers", "content-type")
                    .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build();
            var cors = client.send(preflight, HttpResponse.BodyHandlers.ofString());
            assertEquals(200, cors.statusCode());
            assertEquals(origin, cors.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
        }
        call("GET", "/competitions", null, null, 401);
        long initialUserCount = users.count();
        String owner = register("owner@test.local");
        String judge = register("judge@test.local");
        String stranger = register("stranger@test.local");
        String judgeId = call("GET", "/auth/me", judge, null, 200).get("userId").asText();
        assertEquals(initialUserCount + 3, call("GET", "/users", owner, null, 200).size());
        call("GET", "/admin/users", owner, null, 403);
        var project = call("POST", "/competitions", owner, Map.of("title", "Integration Competition"), 200);
        String id = project.get("competitionId").asText();
        String base = "/competitions/" + id;
        assertEquals("ADMIN", project.get("currentRole").asText());
        assertEquals("owner@test.local", project.get("ownerEmail").asText());
        call("GET", base, stranger, null, 403);
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 400);
        call("POST", base + "/members", owner, Map.of("email", "judge@test.local", "role", "JUDGE"), 200);
        assertEquals("JUDGE", call("GET", base, judge, null, 200).get("currentRole").asText());
        call("GET", base + "/members", judge, null, 403);
        var team = call("POST", base + "/teams", owner, Map.of("teamName", "Team A", "projectDescription", "Demo", "projectUrl", ""), 200);
        String teamId = team.get("teamId").asText();
        assertEquals(1, team.get("displayOrder").asInt());
        var secondTeam = call("POST", base + "/teams", owner, Map.of("teamName", "Team 2"), 200);
        String secondTeamId = secondTeam.get("teamId").asText();
        call("PUT", base + "/teams/order", judge, Map.of("teamIds", java.util.List.of(secondTeamId, teamId)), 403);
        call("PUT", base + "/teams/order", owner, Map.of("teamIds", java.util.List.of(teamId, teamId)), 400);
        call("PUT", base + "/teams/order", owner, Map.of("teamIds", java.util.List.of(teamId)), 400);
        call("PUT", base + "/teams/order", owner, Map.of("teamIds", java.util.List.of(teamId, java.util.UUID.randomUUID().toString())), 400);
        var ordered = call("PUT", base + "/teams/order", owner, Map.of("teamIds", java.util.List.of(secondTeamId, teamId)), 200);
        assertEquals(secondTeamId, ordered.get(0).get("teamId").asText());
        assertEquals(1, ordered.get(0).get("displayOrder").asInt());
        var reloadedTeams = call("GET", base + "/teams", judge, null, 200);
        for (var row : reloadedTeams) assertEquals(row.get("teamId").asText().equals(secondTeamId) ? 1 : 2, row.get("displayOrder").asInt());
        var criterion = call("POST", base + "/criteria", owner, Map.of("title", "Quality", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 100), 200);
        String criterionId = criterion.get("criterionId").asText();
        var group = call("POST", base + "/groups", owner, Map.of("groupName", "Group A"), 200);
        String groupId = group.get("groupId").asText();
        call("PUT", base + "/teams/" + teamId + "/group", owner, Map.of("groupId", groupId), 200);
        assertEquals(teamId, call("GET", base + "/groups", judge, null, 200).get(0).get("teamIds").get(0).asText());
        call("POST", base + "/assignments", owner, Map.of("judgeId", judgeId, "teamId", teamId), 200);
        call("POST", base + "/assignments", owner, Map.of("judgeId", judgeId, "teamId", secondTeamId), 200);
        String ownerId = call("GET", "/auth/me", owner, null, 200).get("userId").asText();
        call("POST", base + "/members", owner, Map.of("email", "owner@test.local", "role", "JUDGE"), 200);
        call("POST", base + "/assignments", owner, Map.of("judgeId", ownerId, "teamId", teamId), 200);
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 200);
        var draft = Map.of("competitionId", id, "teamId", teamId, "status", "DRAFT", "scores",
                java.util.List.of(Map.of("criterionId", criterionId, "scoreValue", 8, "comment", "Good")));
        call("POST", "/evaluations/save", stranger, draft, 403);
        call("POST", "/evaluations/save", judge, draft, 200);
        assertEquals(0, call("GET", "/evaluations/competition/" + id, owner, null, 200).size());
        var mine = call("GET", "/evaluations/competition/" + id + "/team/" + teamId + "/mine", judge, null, 200);
        assertEquals(80, mine.get("totalScore").asDouble());
        assertEquals("Test User", mine.get("judgeName").asText());
        assertEquals("judge@test.local", mine.get("judgeEmail").asText());
        call("POST", "/evaluations/save", judge, Map.of("competitionId", id, "teamId", teamId, "status", "SUBMITTED", "scores", draft.get("scores")), 200);
        assertEquals(1, call("GET", "/evaluations/competition/" + id, owner, null, 200).size());
        // Editing a submitted evaluation updates the same record and keeps it published,
        // including requests from an older client that still sends DRAFT.
        var edit = Map.of("competitionId", id, "teamId", teamId, "status", "DRAFT", "comment", "Revised",
                "scores", java.util.List.of(Map.of("criterionId", criterionId, "scoreValue", 6, "comment", "Updated feedback")));
        call("POST", "/evaluations/save", judge, edit, 200);
        var revised = call("GET", "/evaluations/competition/" + id, owner, null, 200).get(0);
        assertEquals(mine.get("evaluationId").asText(), revised.get("evaluationId").asText());
        assertEquals("SUBMITTED", revised.get("status").asText());
        assertEquals(60, revised.get("totalScore").asDouble());
        assertEquals(1, call("GET", "/evaluations/competition/" + id + "/mine", judge, null, 200).size());
        assertEquals(0, call("GET", "/evaluations/competition/" + id + "/mine", owner, null, 200).size());
        call("GET", "/evaluations/competition/" + id + "/mine", stranger, null, 403);

        assertEquals("Updated feedback", revised.get("scores").get(0).get("comment").asText());
        call("POST", "/evaluations/save", judge, Map.of("competitionId", id, "teamId", teamId, "status", "SUBMITTED", "scores", java.util.List.of()), 400);
        assertEquals(60, call("GET", "/evaluations/competition/" + id, owner, null, 200).get(0).get("totalScore").asDouble());
        call("POST", "/notifications", judge, Map.of("competitionId", id, "email", "judge@test.local", "title", "Reminder"), 403);
        call("POST", "/notifications", owner, Map.of("competitionId", id, "email", "judge@test.local"), 409);
        call("PUT", base, owner, Map.of("title", "Integration Competition", "evaluationDeadline", java.time.LocalDateTime.now().plusHours(2).toString()), 200);
        call("POST", "/notifications", owner, Map.of("competitionId", id, "email", "judge@test.local", "title", "Reminder", "message", "Please evaluate"), 200);
        call("POST", "/notifications", owner, Map.of("competitionId", id, "email", "judge@test.local"), 429);
        var notifications = call("GET", "/notifications", judge, null, 200);
        assertEquals(2, notifications.size(), "Invitation and evaluation reminder are separate notifications");
        String notificationId = notifications.get(0).get("notificationId").asText();
        call("PATCH", "/notifications/" + notificationId + "/read", stranger, null, 404);
        call("PATCH", "/notifications/read-all", judge, null, 200);
        assertEquals(0, call("GET", "/notifications/unread-count", judge, null, 200).get("count").asInt());
        assertFalse(call("GET", "/auth/verify-reset-token?token=invalid", null, null, 200).get("valid").asBoolean());
        // A project admin can add themselves as a judge without losing admin rights.
        call("POST", base + "/members", judge, Map.of("email", "owner@test.local", "role", "JUDGE"), 403);
        call("POST", base + "/members", owner, Map.of("email", "owner@test.local", "role", "JUDGE"), 409);
        assertEquals("ADMIN_JUDGE", call("GET", base, owner, null, 200).get("currentRole").asText());
        assertEquals(2, call("GET", base + "/members", owner, null, 200).size());
        call("POST", "/evaluations/save", owner, draft, 200);
        var ownerEvaluations = call("GET", "/evaluations/competition/" + id, owner, null, 200);
        assertEquals(2, ownerEvaluations.size(), "Owner sees submitted evaluations plus their own draft");
        var ownerMine = call("GET", "/evaluations/competition/" + id + "/mine", owner, null, 200);
        assertEquals(1, ownerMine.size(), "Personal monitoring must exclude other judges even for ADMIN_JUDGE");
        assertEquals(ownerId, ownerMine.get(0).get("judgeId").asText());

        assertEquals(1, call("GET", "/evaluations/competition/" + id, judge, null, 200).size(),
                "Other judges must not see the owner's draft");
        call("POST", "/evaluations/save", owner, Map.of("competitionId", id, "teamId", teamId,
                "status", "SUBMITTED", "scores", draft.get("scores")), 200);
        call("DELETE", base + "/members/" + ownerId, owner, null, 409);
        assertEquals("ADMIN_JUDGE", call("GET", base, owner, null, 200).get("currentRole").asText());
        assertEquals(3, call("GET", base + "/assignments", owner, null, 200).size(), "Locked assignments are preserved");
        // Deadline and competition state are enforced by the server even with a stale UI.
        call("PUT", base, owner, Map.of("title", "Integration Competition", "evaluationDeadline", java.time.LocalDateTime.now().minusMinutes(1).toString()), 200);
        call("POST", "/evaluations/save", judge, edit, 409);
        assertEquals(60, call("GET", "/evaluations/competition/" + id + "/team/" + teamId + "/mine", judge, null, 200).get("totalScore").asDouble());
        call("PUT", base, owner, Map.of("title", "Integration Competition", "evaluationDeadline", java.time.LocalDateTime.now().plusDays(1).toString()), 200);
        call("POST", "/evaluations/save", judge, edit, 200);
        call("PATCH", base + "/status", owner, Map.of("status", "CLOSED"), 200);
        call("POST", "/evaluations/save", judge, edit, 409);
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 200);
        // Admin status changes must invalidate an already issued JWT.
        var ownerUser = users.findByEmail("owner@test.local").orElseThrow();
        ownerUser.setIsSystemAdmin(true);
        users.save(ownerUser);
        call("GET", "/admin/users", owner, null, 200);
        call("PATCH", "/admin/users/" + judgeId + "/status", owner, Map.of("status", "Suspended"), 200);
        call("GET", "/competitions", judge, null, 401);
        call("PATCH", "/admin/users/" + judgeId + "/status", owner, Map.of("status", "Active"), 200);
        call("DELETE", base + "/groups/" + groupId, owner, null, 409);
        call("DELETE", base, owner, null, 200);
        assertEquals(0, call("GET", "/competitions", owner, null, 200).size());
    }
}
