package org.cesystem.multirole;

import org.cesystem.multirole.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:monitoring_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
    "app.projects.burst-limit=2", "app.projects.daily-limit=3", "app.projects.total-limit=4"
})
@ActiveProfiles("test")
class ProjectMonitoringTests {
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired JdbcTemplate jdbc;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = JsonMapper.builder().build();
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
    String register(String email) throws Exception {
        call("POST", "/auth/register", null, Map.of("fullName", "Monitor Test", "email", email, "password", "Password123!"), 200);
        return call("POST", "/auth/login", null, Map.of("email", email, "password", "Password123!"), 200).get("token").asText();
    }
    @Test void quotasAuditMonitoringAndCreationBlock() throws Exception {
        String owner = register("quota@test.local");
        String admin = register("monitor-admin@test.local");
        var adminUser = users.findByEmail("monitor-admin@test.local").orElseThrow();
        adminUser.setIsSystemAdmin(true); users.save(adminUser);
        String uid = users.findByEmail("quota@test.local").orElseThrow().getUserId().toString();
        call("GET", "/admin/monitoring", owner, null, 403);
        call("PATCH", "/admin/users/" + uid + "/project-creation", owner, Map.of("blocked", true), 403);
        String first = call("POST", "/competitions", owner, Map.of("title", "Quota first"), 200).get("competitionId").asText();
        // Only one of two simultaneous requests may consume the remaining burst slot.
        var pool = java.util.concurrent.Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> request("POST", "/competitions", owner, Map.of("title", "Concurrent A")).statusCode());
            var b = pool.submit(() -> request("POST", "/competitions", owner, Map.of("title", "Concurrent B")).statusCode());
            var statuses = new ArrayList<>(List.of(a.get(), b.get())); statuses.sort(Integer::compareTo);
            assertEquals(List.of(200, 429), statuses);
        } finally { pool.shutdownNow(); }
        call("POST", "/competitions", owner, Map.of("title", "Over burst"), 429);
        assertFalse(call("GET", "/competitions/creation-quota", owner, null, 200).get("allowed").asBoolean());
        var monitor = call("GET", "/admin/monitoring", admin, null, 200);
        assertEquals(2, monitor.get("totalProjects").asInt());
        assertEquals(2, monitor.get("projects").size());
        var row = java.util.stream.StreamSupport.stream(monitor.get("users").spliterator(), false).filter(u -> uid.equals(u.get("id").asText())).findFirst().orElseThrow();
        assertEquals(2, row.get("projectCount").asInt());
        assertTrue(row.get("deniedLast24Hours").asInt() >= 2);
        assertFalse(row.get("signals").isEmpty());
        assertTrue(monitor.get("activities").size() >= 4);
        call("PATCH", "/admin/users/" + uid + "/project-creation", admin, Map.of("blocked", true), 200);
        call("POST", "/competitions", owner, Map.of("title", "Blocked creation"), 403);
        assertTrue(call("GET", "/competitions/creation-quota", owner, null, 200).get("blocked").asBoolean());
        assertEquals(2, call("GET", "/competitions", owner, null, 200).size());
        call("PATCH", "/admin/users/" + uid + "/project-creation", admin, Map.of("blocked", false), 200);
        call("PATCH", "/admin/users/" + adminUser.getUserId() + "/project-creation", admin, Map.of("blocked", true), 400);
        call("DELETE", "/competitions/" + first, owner, null, 200);
        call("POST", "/competitions", owner, Map.of("title", "Delete cannot bypass window"), 429);
        jdbc.update("update project_activity set occurred_at = ?", java.time.LocalDateTime.now().minusMinutes(12));
        jdbc.update("update competition set created_at = ?", java.time.LocalDateTime.now().minusMinutes(12));
        call("POST", "/competitions", owner, Map.of("title", "After burst window"), 200);
        call("POST", "/competitions", owner, Map.of("title", "Daily limited"), 429);
        jdbc.update("update project_activity set occurred_at = ?", java.time.LocalDateTime.now().minusDays(2));
        jdbc.update("update competition set created_at = ?", java.time.LocalDateTime.now().minusDays(2));
        call("POST", "/competitions", owner, Map.of("title", "Third current"), 200);
        call("POST", "/competitions", owner, Map.of("title", "Fourth current"), 200);
        assertEquals(4, call("GET", "/competitions/creation-quota", owner, null, 200).get("owned").asInt());
        var totalBlocked = request("POST", "/competitions", owner, Map.of("title", "Total limited"));
        assertEquals(429, totalBlocked.statusCode());
        assertTrue(totalBlocked.body().contains("4"));
    }
}
