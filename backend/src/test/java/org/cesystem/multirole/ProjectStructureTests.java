package org.cesystem.multirole;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.cesystem.multirole.repository.UserRepository;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "spring.datasource.url=jdbc:h2:mem:structure_tests;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class ProjectStructureTests {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = JsonMapper.builder().build();
    record Fixture(String token, String id, String team, String group, String assignment, String userId, String email, String title) {
        String path() { return "/competitions/" + id; }
    }
    HttpResponse<String> request(String method, String path, String token, Object body) throws Exception {
        var b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path)).header("Content-Type", "application/json");
        if (token != null) b.header("Authorization", "Bearer " + token);
        return client.send(b.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    JsonNode call(String method, String path, String token, Object body, int expected) throws Exception {
        var r = request(method, path, token, body);
        assertEquals(expected, r.statusCode(), method + " " + path + ": " + r.body());
        return r.body().startsWith("{") || r.body().startsWith("[") ? json.readTree(r.body()) : null;
    }
    Fixture fixture() throws Exception {
        String title = UUID.randomUUID().toString(), email = title + "@example.test";
        call("POST", "/auth/register", null, Map.of("email", email, "fullName", "Setup Owner", "password", "Password123!"), 200);
        String token = call("POST", "/auth/login", null, Map.of("email", email, "password", "Password123!"), 200).path("token").asText();
        String uid = call("GET", "/auth/me", token, null, 200).path("userId").asText();
        String id = call("POST", "/competitions", token, Map.of("title", title), 200).path("competitionId").asText(), path = "/competitions/" + id;
        String team = call("POST", path + "/teams", token, Map.of("teamName", "Team A"), 200).path("teamId").asText();
        String group = call("POST", path + "/groups", token, Map.of("groupName", "Group A"), 200).path("groupId").asText();
        call("PUT", path + "/teams/" + team + "/group", token, Map.of("groupId", group), 200);
        call("POST", path + "/criteria", token, Map.of("title", "Quality", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 100), 200);
        call("POST", path + "/members", token, Map.of("email", email, "role", "JUDGE"), 200);
        String assignment = call("POST", path + "/assignments", token, Map.of("judgeId", uid, "teamId", team), 200).path("assignmentId").asText();
        return new Fixture(token,id,team,group,assignment,uid,email,title);
    }
    void status(Fixture f, String status) throws Exception { call("PATCH", f.path()+"/status", f.token, Map.of("status",status),200); }
    void locked(Fixture f) throws Exception {
        call("POST", f.path()+"/teams", f.token, Map.of("teamName","Extra"),409);
        call("PUT", f.path()+"/teams/"+f.team, f.token, Map.of("teamName","Changed"),409);
        call("DELETE", f.path()+"/teams/"+f.team, f.token,null,409);
        call("PUT", f.path()+"/teams/order", f.token, Map.of("teamIds",List.of(f.team)),409);
        call("POST", f.path()+"/groups", f.token, Map.of("groupName","Extra"),409);
        call("PUT", f.path()+"/groups/"+f.group, f.token, Map.of("groupName","Changed"),409);
        call("DELETE", f.path()+"/groups/"+f.group, f.token,null,409);
        call("PUT", f.path()+"/teams/"+f.team+"/group", f.token, Map.of(),409);
        call("PUT", f.path()+"/teams/group", f.token, Map.of("teamIds",List.of(f.team)),409);
        call("POST", f.path()+"/members", f.token, Map.of("email",f.email,"role","JUDGE"),409);
        call("DELETE", f.path()+"/members/"+f.userId, f.token,null,409);
        call("POST", f.path()+"/assignments", f.token, Map.of("judgeId",f.userId,"teamId",f.team),409);
        call("DELETE", f.path()+"/assignments/"+f.assignment, f.token,null,409);
        assertEquals("Team A",call("GET",f.path()+"/teams",f.token,null,200).get(0).path("teamName").asText());
        assertEquals(f.team,call("GET",f.path()+"/groups",f.token,null,200).get(0).path("teamIds").get(0).asText());
        assertEquals(1,call("GET",f.path()+"/assignments",f.token,null,200).size());
    }
    @Test void everySetupWriteStaysLockedAcrossPauseCloseAndSystemAdmin() throws Exception {
        var f=fixture(); status(f,"ACTIVE"); locked(f); status(f,"DRAFT"); locked(f); status(f,"CLOSED"); locked(f);
        var u=users.findById(UUID.fromString(f.userId)).orElseThrow();u.setIsSystemAdmin(true);users.saveAndFlush(u);
        locked(f);
    }
    @Test void draftStructureCanStillBeEditedAndDeleted() throws Exception {
        var f=fixture();
        call("PUT",f.path()+"/teams/"+f.team,f.token,Map.of("teamName","Updated"),200);
        call("PUT",f.path()+"/groups/"+f.group,f.token,Map.of("groupName","Updated"),200);
        call("DELETE",f.path()+"/assignments/"+f.assignment,f.token,null,200);
        call("DELETE",f.path()+"/members/"+f.userId,f.token,null,200);
        assertEquals("ADMIN",call("GET",f.path(),f.token,null,200).path("currentRole").asText());
        call("DELETE",f.path()+"/groups/"+f.group,f.token,null,200);
        call("DELETE",f.path()+"/teams/"+f.team,f.token,null,200);
    }
    @Test void lockedMetadataCannotChangeButDeadlineChangesAreAuditedAtomically() throws Exception {
        var f=fixture(); status(f,"ACTIVE");
        call("PUT",f.path(),f.token,Map.of("title","Changed"),409);
        call("PUT",f.path(),f.token,Map.of("title",f.title,"description","Changed"),409);
        call("PUT",f.path(),f.token,Map.of("title",f.title,"category","Changed"),409);
        String future=LocalDateTime.now().plusDays(1).withNano(0).toString();
        call("PUT",f.path(),f.token,Map.of("title",f.title,"evaluationDeadline",future),200);
        var history=call("GET",f.path()+"/deadline-history",f.token,null,200);
        assertEquals(1,history.size());assertTrue(history.get(0).path("previousDeadline").isNull());
        assertEquals(f.email,history.get(0).path("actorEmail").asText());
        call("PUT",f.path(),f.token,Map.of("title",f.title,"evaluationDeadline",future),200);
        assertEquals(1,call("GET",f.path()+"/deadline-history",f.token,null,200).size());
        call("PUT",f.path(),f.token,Map.of("title",f.title),200);
        history=call("GET",f.path()+"/deadline-history",f.token,null,200);
        assertEquals(2,history.size());assertTrue(history.get(0).path("newDeadline").isNull());
        assertTrue(call("GET",f.path(),f.token,null,200).path("criteriaLocked").asBoolean());
        call("GET",f.path()+"/deadline-history",null,null,401);
    }
    @Test void activationAndTeamEditsSerializeOnOneCompetitionRow() throws Exception {
        var f=fixture();var pool=Executors.newFixedThreadPool(2);var start=new CountDownLatch(1);
        try {
            var activation=pool.submit(()->{start.await();return request("PATCH",f.path()+"/status",f.token,Map.of("status","ACTIVE"));});
            var edit=pool.submit(()->{start.await();return request("PUT",f.path()+"/teams/"+f.team,f.token,Map.of("teamName","Concurrent"));});
            start.countDown();assertEquals(200,activation.get(20,TimeUnit.SECONDS).statusCode());
            var result=edit.get(20,TimeUnit.SECONDS);assertTrue(List.of(200,409).contains(result.statusCode()));
            call("PUT",f.path()+"/teams/"+f.team,f.token,Map.of("teamName","Stale form"),409);
        } finally {pool.shutdownNow();}
    }
}
