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
    properties = "spring.datasource.url=jdbc:h2:mem:bulk_groups;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class BulkGroupTests {
    @LocalServerPort int port;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = JsonMapper.builder().build();
    record Fixture(String owner, String judge, String stranger, String id, List<String> teams, String a, String b) {
        String base() { return "/competitions/" + id; }
    }
    HttpResponse<String> request(String method, String path, String token, Object body) throws Exception {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path))
            .timeout(java.time.Duration.ofSeconds(20)).header("Content-Type", "application/json");
        if (token != null) builder.header("Authorization", "Bearer " + token);
        return client.send(builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
            : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
    }
    JsonNode call(String method, String path, String token, Object body, int expected) throws Exception {
        var response = request(method, path, token, body);
        assertEquals(expected, response.statusCode(), method + " " + path + ": " + response.body());
        return response.body().startsWith("{") || response.body().startsWith("[") ? json.readTree(response.body()) : null;
    }
    String register(String email) throws Exception {
        call("POST", "/auth/register", null, Map.of("fullName", "Group Tester", "email", email, "password", "Password123!"), 200);
        return call("POST", "/auth/login", null, Map.of("email", email, "password", "Password123!"), 200).get("token").asText();
    }
    Fixture fixture() throws Exception {
        String suffix = UUID.randomUUID().toString();
        String owner = register("owner-" + suffix + "@test.local");
        String judge = register("judge-" + suffix + "@test.local");
        String stranger = register("stranger-" + suffix + "@test.local");
        String id = call("POST", "/competitions", owner, Map.of("title", "Bulk groups " + suffix), 200).get("competitionId").asText();
        String base = "/competitions/" + id;
        call("POST", base + "/members", owner, Map.of("email", "judge-" + suffix + "@test.local", "role", "JUDGE"), 200);
        var teams = new ArrayList<String>();
        for (int i = 0; i < 3; i++) teams.add(call("POST", base + "/teams", owner, Map.of("teamName", "Team " + i), 200).get("teamId").asText());
        String a = call("POST", base + "/groups", owner, Map.of("groupName", "A"), 200).get("groupId").asText();
        String b = call("POST", base + "/groups", owner, Map.of("groupName", "B"), 200).get("groupId").asText();
        call("PUT", base + "/teams/" + teams.get(0) + "/group", owner, Map.of("groupId", a), 200);
        return new Fixture(owner, judge, stranger, id, teams, a, b);
    }
    Map<String, Object> body(List<String> teams, String group) {
        var body = new HashMap<String, Object>(); body.put("teamIds", teams); body.put("groupId", group); return body;
    }
    JsonNode groups(Fixture f) throws Exception { return call("GET", f.base() + "/groups", f.owner, null, 200); }
    Set<String> inGroup(JsonNode groups, String id) {
        var result = new HashSet<String>();
        for (var group : groups) if (id.equals(group.get("groupId").asText())) group.get("teamIds").forEach(team -> result.add(team.asText()));
        return result;
    }
    @Test void movesAllSelectedTeamsRetriesSafelyAndRemovesMemberships() throws Exception {
        var f = fixture();
        var originalTeams = call("GET", f.base() + "/teams", f.owner, null, 200);
        var result = call("PUT", f.base() + "/teams/group", f.owner, body(f.teams, f.b), 200);
        assertEquals(3, result.get("movedCount").asInt());
        assertEquals(Set.copyOf(f.teams), inGroup(result.get("groups"), f.b));
        assertEquals(0, inGroup(groups(f), f.a).size());
        var retry = call("PUT", f.base() + "/teams/group", f.owner, body(f.teams, f.b), 200);
        assertEquals(0, retry.get("movedCount").asInt());
        assertEquals(3, retry.get("unchangedCount").asInt());
        var removed = call("PUT", f.base() + "/teams/group", f.owner, body(f.teams.subList(0, 2), null), 200);
        assertEquals(2, removed.get("movedCount").asInt());
        assertEquals(Set.of(f.teams.get(2)), inGroup(groups(f), f.b));
        assertEquals(originalTeams, call("GET", f.base() + "/teams", f.owner, null, 200));
    }
    @Test void rejectsInvalidTeamsAndGroupsWithoutMovingValidTeams() throws Exception {
        var f = fixture();
        var original = groups(f);
        call("PUT", f.base() + "/teams/group", f.owner, body(List.of(f.teams.get(0), UUID.randomUUID().toString()), f.b), 404);
        call("PUT", f.base() + "/teams/group", f.owner, body(f.teams, UUID.randomUUID().toString()), 404);
        call("PUT", f.base() + "/teams/group", f.owner, body(List.of(), f.b), 400);
        call("PUT", f.base() + "/teams/group", f.owner, body(List.of(f.teams.get(0), f.teams.get(0)), f.b), 400);
        call("PUT", f.base() + "/teams/group", f.owner, body(Arrays.asList(f.teams.get(0), null), f.b), 400);
        assertEquals(original, groups(f));
        String foreign = call("POST", "/competitions", f.owner, Map.of("title", "Foreign " + f.id), 200).get("competitionId").asText();
        String foreignTeam = call("POST", "/competitions/" + foreign + "/teams", f.owner, Map.of("teamName", "Foreign"), 200).get("teamId").asText();
        String foreignGroup = call("POST", "/competitions/" + foreign + "/groups", f.owner, Map.of("groupName", "Foreign"), 200).get("groupId").asText();
        call("PUT", f.base() + "/teams/group", f.owner, body(List.of(f.teams.get(0), foreignTeam), f.b), 404);
        call("PUT", f.base() + "/teams/group", f.owner, body(f.teams, foreignGroup), 404);
        assertEquals(original, groups(f));
    }
    @Test void onlyCompetitionAdminsCanMoveTeams() throws Exception {
        var f = fixture();
        var original = groups(f);
        call("PUT", f.base() + "/teams/group", null, body(f.teams, f.b), 401);
        call("PUT", f.base() + "/teams/group", f.judge, body(f.teams, f.b), 403);
        call("PUT", f.base() + "/teams/group", f.stranger, body(f.teams, f.b), 403);
        assertEquals(original, groups(f));
    }
    @Test void concurrentMovesLeaveEveryTeamInOneConsistentGroup() throws Exception {
        var f = fixture();
        var pool = Executors.newFixedThreadPool(2);
        try {
            var first = pool.submit(() -> call("PUT", f.base() + "/teams/group", f.owner, body(f.teams, f.a), 200));
            var second = pool.submit(() -> call("PUT", f.base() + "/teams/group", f.owner, body(f.teams, f.b), 200));
            first.get(20, TimeUnit.SECONDS); second.get(20, TimeUnit.SECONDS);
            var result = groups(f);
            var a = inGroup(result, f.a); var b = inGroup(result, f.b);
            assertTrue(a.equals(Set.copyOf(f.teams)) && b.isEmpty() || b.equals(Set.copyOf(f.teams)) && a.isEmpty());
        } finally { pool.shutdownNow(); }
    }
    @Test void deletingDestinationDuringMoveNeverLeavesPartialMemberships() throws Exception {
        var f = fixture();
        var pool = Executors.newFixedThreadPool(2);
        try {
            var move = pool.submit(() -> request("PUT", f.base() + "/teams/group", f.owner, body(f.teams, f.b)));
            var delete = pool.submit(() -> call("DELETE", f.base() + "/groups/" + f.b, f.owner, null, 200));
            var response = move.get(20, TimeUnit.SECONDS); delete.get(20, TimeUnit.SECONDS);
            assertTrue(response.statusCode() == 200 || response.statusCode() == 404, response.body());
            var result = groups(f);
            assertEquals(0, inGroup(result, f.b).size());
            assertEquals(response.statusCode() == 200 ? Set.of() : Set.of(f.teams.get(0)), inGroup(result, f.a));
        } finally { pool.shutdownNow(); }
    }
}
