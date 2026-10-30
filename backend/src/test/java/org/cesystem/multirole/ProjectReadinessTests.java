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
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "spring.datasource.url=jdbc:h2:mem:readiness_test;MODE=MySQL;DB_CLOSE_DELAY=-1")
@ActiveProfiles("test")
class ProjectReadinessTests {
    @LocalServerPort int port;
    final HttpClient client = HttpClient.newHttpClient();
    final JsonMapper json = JsonMapper.builder().build();
    JsonNode call(String method, String path, String token, Object body, int status) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path)).header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        var response = client.send(request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(status, response.statusCode(), method + " " + path + ": " + response.body());
        return response.body().startsWith("{") || response.body().startsWith("[") ? json.readTree(response.body()) : null;
    }
    String register(String email) throws Exception {
        call("POST", "/auth/register", null, Map.of("email", email, "fullName", "Setup Tester", "password", "Password123!"), 200);
        return call("POST", "/auth/login", null, Map.of("email", email, "password", "Password123!"), 200).path("token").asText();
    }
    @Test void activationRequiresAllPrerequisitesEvenForDirectApiCalls() throws Exception {
        String owner = register("setup-owner@example.test"), stranger = register("setup-stranger@example.test");
        String id = call("POST", "/competitions", owner, Map.of("title", "Setup checks"), 200).path("competitionId").asText();
        String base = "/competitions/" + id;
        assertEquals("DRAFT", call("GET", base, owner, null, 200).path("status").asText());
        call("PATCH", base + "/status", stranger, Map.of("status", "ACTIVE"), 403);
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 400);
        // Team and judge setup may happen before criteria.
        String a = call("POST", base + "/teams", owner, Map.of("teamName", "Team A"), 200).path("teamId").asText();
        call("POST", base + "/members", owner, Map.of("email", "setup-owner@example.test", "role", "JUDGE"), 200);
        String judge = call("GET", "/auth/me", owner, null, 200).path("userId").asText();
        call("POST", base + "/assignments", owner, Map.of("judgeId", judge, "teamId", a), 200);
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 400);
        String criterion = call("POST", base + "/criteria", owner, Map.of("title", "Quality", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 99.99), 200).path("criterionId").asText();
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 400);
        call("PUT", base + "/criteria/" + criterion, owner, Map.of("title", "Quality", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 100), 200);
        String b = call("POST", base + "/teams", owner, Map.of("teamName", "Team B"), 200).path("teamId").asText();
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 400);
        assertEquals("DRAFT", call("GET", base, owner, null, 200).path("status").asText());
        call("POST", base + "/assignments", owner, Map.of("judgeId", judge, "teamId", b), 200);
        assertEquals("ACTIVE", call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 200).path("status").asText());
        call("PATCH", base + "/status", owner, Map.of("status", "DRAFT"), 200);
        call("DELETE", base + "/members/" + judge, owner, null, 409);
        call("DELETE", base + "/teams/" + a, owner, null, 409);
        call("DELETE", base + "/teams/" + b, owner, null, 409);
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 200);
        String empty = call("POST", "/competitions", owner, Map.of("title", "No teams setup checks"), 200).path("competitionId").asText();
        base = "/competitions/" + empty;
        call("POST", base + "/criteria", owner, Map.of("title", "Quality", "scoringType", "NUMERIC", "maxScore", 10, "weightPercentage", 100), 200);
        call("POST", base + "/members", owner, Map.of("email", "setup-owner@example.test", "role", "JUDGE"), 200);
        // Criteria and a judge are present, so this rejection specifically requires at least one team.
        call("PATCH", base + "/status", owner, Map.of("status", "ACTIVE"), 400);
    }
}
