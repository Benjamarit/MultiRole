package org.cesystem.multirole;

import com.sun.net.httpserver.HttpServer;
import org.cesystem.multirole.model.*;
import org.cesystem.multirole.repository.*;
import org.cesystem.multirole.service.*;
import org.cesystem.multirole.security.JwtUtil;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.Supplier;
import java.util.regex.Pattern;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "app.mail.verification-enabled=true", "spring.datasource.url=jdbc:h2:mem:emailworkflows;MODE=MySQL;DB_CLOSE_DELAY=-1"})
@ActiveProfiles("test")
class EmailWorkflowTests {
    static final AtomicInteger providerStatus = new AtomicInteger(201), sends = new AtomicInteger();
    static final AtomicReference<String> body = new AtomicReference<>(), header = new AtomicReference<>();
    static HttpServer provider;
    static {
        try {
            provider = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            provider.createContext("/mail", exchange -> {
                sends.incrementAndGet(); header.set(exchange.getRequestHeaders().getFirst("api-key"));
                body.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
                byte[] response = (providerStatus.get() == 201 ? "{\"messageId\":\"mock-receipt\"}" : "{\"message\":\"provider failure\"}").getBytes(StandardCharsets.UTF_8);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(providerStatus.get(), response.length);
                exchange.getResponseBody().write(response); exchange.close();
            }); provider.start();
        } catch (Exception error) { throw new ExceptionInInitializerError(error); }
    }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("app.brevo.api-url", () -> "http://127.0.0.1:" + provider.getAddress().getPort() + "/mail");
        r.add("app.brevo.api-key", () -> "mock-provider-key");
        r.add("app.brevo.sender-email", () -> "sender@example.test");
    }
    @AfterAll static void closeProvider() { provider.stop(0); }
    @BeforeEach void resetProvider() { providerStatus.set(201); sends.set(0); }
    @LocalServerPort int port;
    @Autowired UserRepository users;
    @Autowired EmailOutboxRepository outbox;
    @Autowired EmailVerificationTokenRepository verificationTokens;
    @Autowired PasswordResetTokenRepository resetTokens;
    @Autowired EvaluationReminderRepository reminderRecords;
    @Autowired NotificationRepository notifications;
    @Autowired CompetitionRepository competitions;
    @Autowired CompetitionUserRepository members;
    @Autowired TeamRepository teams;
    @Autowired JudgeAssignmentRepository assignments;
    @Autowired EvaluationRepository evaluations;
    @Autowired EmailVerificationService verification;
    @Autowired PasswordResetService passwords;
    @Autowired EvaluationReminderService reminders;
    @Autowired EmailDeliveryService delivery;
    @Autowired EmailQueue queue;
    @Autowired JwtUtil jwt;
    @Autowired PasswordEncoder encoder;
    @Autowired PlatformTransactionManager manager;
    final JsonMapper json = JsonMapper.builder().build();
    final HttpClient client = HttpClient.newHttpClient();
    <T> T tx(Supplier<T> work) { return new TransactionTemplate(manager).execute(status -> work.get()); }
    HttpResponse<String> call(String path, Object data, String token) throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path)).header("Content-Type", "application/json");
        if (token != null) request.header("Authorization", "Bearer " + token);
        if (data == null) request.GET(); else request.POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(data)));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
    User legacy() {
        var u = new User(); u.setEmail(UUID.randomUUID() + "@example.test"); u.setFullName("Test <Judge>");
        u.setPasswordHash(encoder.encode("Password123!")); u.setEmailVerificationRequired(null); u.setEmailVerified(false);
        return users.saveAndFlush(u);
    }
    User pending() { var u = legacy(); u.setEmailVerificationRequired(true); return users.saveAndFlush(u); }
    EmailOutbox latest(User u) { return outbox.findByUserIdOrderByCreatedAtDesc(u.getUserId()).get(0); }
    String raw(EmailOutbox mail) {
        var match = Pattern.compile("[?]token=([A-Za-z0-9_-]+)").matcher(queue.payload(mail).html());
        assertTrue(match.find()); return match.group(1);
    }
    void ageVerification(User u) { tx(() -> { verificationTokens.findFirstByUser_UserIdOrderByCreatedAtDesc(u.getUserId()).orElseThrow().setCreatedAt(LocalDateTime.now().minusMinutes(2)); return null; }); }

    @Test void newRegistrationRequiresConfirmationAndTokenIsSingleUse() throws Exception {
        String email = UUID.randomUUID() + "@example.test";
        assertEquals(200, call("/auth/register", Map.of("email", email, "fullName", "New Member", "password", "Password123!"), null).statusCode());
        var u = users.findByEmail(email).orElseThrow();
        assertTrue(u.getEmailVerificationRequired()); assertFalse(u.getEmailVerified());
        var blocked = call("/auth/login", Map.of("email", email, "password", "Password123!"), null);
        assertEquals(403, blocked.statusCode()); assertEquals("EMAIL_NOT_VERIFIED", json.readTree(blocked.body()).path("code").asText());
        assertEquals(401, call("/auth/me", null, jwt.generateToken(email)).statusCode());
        var mail = latest(u); String token = raw(mail);
        assertFalse(mail.getEncryptedPayload().contains(token));
        assertTrue(verificationTokens.findByTokenHash(EmailTokens.hash(token)).isPresent());
        assertEquals(200, call("/auth/verify-email", Map.of("token", token), null).statusCode());
        assertEquals(400, call("/auth/verify-email", Map.of("token", token), null).statusCode());
        assertEquals(200, call("/auth/login", Map.of("email", email, "password", "Password123!"), null).statusCode());
        delivery.deliver(mail.getId()); assertEquals("CANCELLED", outbox.findById(mail.getId()).orElseThrow().getStatus()); assertEquals(0, sends.get());
    }
    @Test void oldUnverifiedAccountsStillLogin() throws Exception {
        var u = legacy();
        assertEquals(200, call("/auth/login", Map.of("email", u.getEmail(), "password", "Password123!"), null).statusCode());
        assertEquals(200, call("/auth/me", null, jwt.generateToken(u.getEmail())).statusCode());
        verification.request(u.getEmail()); assertTrue(outbox.findByUserIdOrderByCreatedAtDesc(u.getUserId()).isEmpty());
    }
    @Test void resendHasCooldownRevokesOldLinksAndDoesNotRevealUnknownEmails() throws Exception {
        var u = pending(); verification.request(u.getEmail()); var old = latest(u); String oldToken = raw(old);
        verification.request(u.getEmail()); assertEquals(1, outbox.findByUserIdOrderByCreatedAtDesc(u.getUserId()).size());
        ageVerification(u); verification.request(u.getEmail());
        assertEquals(2, outbox.findByUserIdOrderByCreatedAtDesc(u.getUserId()).size());
        assertThrows(ResponseStatusException.class, () -> verification.verify(oldToken));
        delivery.deliver(old.getId()); assertEquals("CANCELLED", outbox.findById(old.getId()).orElseThrow().getStatus());
        assertEquals(call("/auth/resend-verification", Map.of("email", u.getEmail()), null).body(), call("/auth/resend-verification", Map.of("email", "unknown@example.test"), null).body());
        verification.verify(raw(latest(u))); assertTrue(users.findById(u.getUserId()).orElseThrow().getEmailVerified());
    }
    @Test void expiredVerificationFailsAndIsNotSent() {
        var u = pending(); verification.request(u.getEmail()); var mail = latest(u); String token = raw(mail);
        tx(() -> { verificationTokens.findByTokenHash(EmailTokens.hash(token)).orElseThrow().setExpiresAt(LocalDateTime.now().minusSeconds(1)); outbox.findById(mail.getId()).orElseThrow().setExpiresAt(LocalDateTime.now().minusSeconds(1)); return null; });
        assertThrows(ResponseStatusException.class, () -> verification.verify(token)); delivery.deliver(mail.getId());
        assertEquals("CANCELLED", outbox.findById(mail.getId()).orElseThrow().getStatus()); assertEquals(0, sends.get());
    }
    @Test void passwordResetIsSingleUseHasCooldownAndRevokesExistingSessions() throws Exception {
        var u = legacy(); String oldJwt = jwt.generateToken(u.getEmail());
        passwords.requestReset(u.getEmail()); var mail = latest(u); String token = raw(mail);
        passwords.requestReset(u.getEmail()); assertEquals(1, outbox.findByUserIdOrderByCreatedAtDesc(u.getUserId()).size());
        assertTrue(passwords.verifyToken(token));
        assertEquals(200, call("/auth/reset-password", Map.of("token", token, "newPassword", "NewPassword456!"), null).statusCode());
        assertFalse(passwords.verifyToken(token));
        assertThrows(ResponseStatusException.class, () -> passwords.resetPassword(token, "NewPassword456!"));
        assertEquals(401, call("/auth/me", null, oldJwt).statusCode());
        var response = call("/auth/login", Map.of("email", u.getEmail(), "password", "NewPassword456!"), null);
        assertEquals(200, response.statusCode()); assertEquals(200, call("/auth/me", null, json.readTree(response.body()).path("token").asText()).statusCode());
        delivery.deliver(mail.getId()); assertEquals("CANCELLED", outbox.findById(mail.getId()).orElseThrow().getStatus());
    }
    @Test void expiredResetCannotChangePasswordAndUnknownEmailHasGenericResponse() throws Exception {
        var u = legacy(); passwords.requestReset(u.getEmail()); String token = raw(latest(u));
        tx(() -> { resetTokens.findByTokenHash(EmailTokens.hash(token)).orElseThrow().setExpiresAt(LocalDateTime.now().minusSeconds(1)); return null; });
        assertFalse(passwords.verifyToken(token)); assertThrows(ResponseStatusException.class, () -> passwords.resetPassword(token, "AnotherPassword!"));
        assertEquals(call("/auth/forgot-password", Map.of("email", u.getEmail()), null).body(), call("/auth/forgot-password", Map.of("email", "unknown@example.test"), null).body());
    }
    @Test void providerReceivesHeaderSafeHtmlAndReceiptClearsPayload() {
        var u = pending(); verification.request(u.getEmail()); var mail = latest(u);
        delivery.deliver(mail.getId()); var accepted = outbox.findById(mail.getId()).orElseThrow();
        assertEquals("ACCEPTED", accepted.getStatus()); assertEquals("mock-receipt", accepted.getProviderMessageId()); assertNull(accepted.getEncryptedPayload());
        assertEquals("mock-provider-key", header.get());
        var sent = json.readTree(body.get()); assertEquals(u.getEmail(), sent.path("to").get(0).path("email").asText());
        assertEquals("sender@example.test", sent.path("sender").path("email").asText());
        assertTrue(sent.path("htmlContent").asText().contains("Test &lt;Judge&gt;"));
        delivery.deliver(mail.getId()); assertEquals(1, sends.get());
    }
    @Test void transientFailureRetriesButAuthenticationFailureStops() {
        var u = pending(); verification.request(u.getEmail()); var mail = latest(u);
        providerStatus.set(503); delivery.deliver(mail.getId());
        var retry = outbox.findById(mail.getId()).orElseThrow(); assertEquals("RETRY", retry.getStatus()); assertEquals(1, retry.getAttempts()); assertNotNull(retry.getEncryptedPayload());
        delivery.deliver(mail.getId()); assertEquals(1, sends.get(), "Backoff prevents immediate retry");
        tx(() -> { outbox.findById(mail.getId()).orElseThrow().setNextAttemptAt(LocalDateTime.now().minusSeconds(1)); return null; });
        providerStatus.set(201); delivery.deliver(mail.getId()); assertEquals("ACCEPTED", outbox.findById(mail.getId()).orElseThrow().getStatus());
        var other = pending(); verification.request(other.getEmail()); var failed = latest(other); providerStatus.set(401); delivery.deliver(failed.getId());
        assertEquals("FAILED", outbox.findById(failed.getId()).orElseThrow().getStatus()); assertEquals("BREVO_HTTP_401", outbox.findById(failed.getId()).orElseThrow().getLastError());
    }

    record Fixture(User owner, User judge, Competition project, Team team) {}
    Fixture fixture(int hours) {
        var owner = legacy(); var judge = legacy();
        return tx(() -> {
            var project = new Competition(); project.setCreatedBy(owner); project.setTitle(UUID.randomUUID().toString()); project.setStatus("ACTIVE"); project.setEvaluationDeadline(LocalDateTime.now().plusHours(hours)); competitions.saveAndFlush(project);
            for (var u : List.of(owner, judge)) { var m = new CompetitionUser(); m.setCompetition(project); m.setUser(u); m.setRole(u == owner ? "ADMIN" : "JUDGE"); members.save(m); }
            var team = new Team(); team.setCompetition(project); team.setTeamName("Team A"); teams.saveAndFlush(team);
            var assignment = new JudgeAssignment(); assignment.setCompetition(project); assignment.setTeam(team); assignment.setJudge(judge); assignments.saveAndFlush(assignment);
            return new Fixture(owner, judge, project, team);
        });
    }
    Notification manual(Fixture f) { return reminders.manual(f.project.getCompetitionId(), f.judge.getEmail(), f.owner); }
    void submit(Fixture f, String status) { tx(() -> { var e = new Evaluation(); e.setCompetition(f.project); e.setJudge(f.judge); e.setTeam(f.team); e.setStatus(status); evaluations.saveAndFlush(e); return null; }); }
    @Test void manualReminderPersistsInAppEvenWhenEmailFailsAndEnforcesCooldownAndAccess() throws Exception {
        var f = fixture(2); var n = manual(f); var mail = latest(f.judge);
        providerStatus.set(503); delivery.deliver(mail.getId());
        assertEquals("RETRYING", notifications.findById(n.getNotificationId()).orElseThrow().getEmailStatus());
        assertEquals(1, notifications.findByUser_UserIdOrderByCreatedAtDesc(f.judge.getUserId()).size());
        assertEquals(429, assertThrows(ResponseStatusException.class, () -> manual(f)).getStatusCode().value());
        assertEquals(403, call("/notifications", Map.of("competitionId", f.project.getCompetitionId(), "email", f.judge.getEmail()), jwt.generateToken(f.judge.getEmail())).statusCode());
        assertEquals(200, call("/notifications", null, jwt.generateToken(f.judge.getEmail())).statusCode());
    }
    @Test void automaticReminderIsOnceAndIncludesDraftsButSkipsCompletedClosedAndNoAssignment() {
        var f = fixture(2); submit(f, "DRAFT");
        reminders.automatic(f.project.getCompetitionId()); reminders.automatic(f.project.getCompetitionId());
        assertEquals(1, outbox.findByUserIdOrderByCreatedAtDesc(f.judge.getUserId()).size());
        tx(() -> { reminderRecords.findAll().stream().filter(r -> r.getCompetitionId().equals(f.project.getCompetitionId())).forEach(r -> r.setCreatedAt(LocalDateTime.now().minusHours(2))); return null; });
        reminders.automatic(f.project.getCompetitionId()); assertEquals(1, outbox.findByUserIdOrderByCreatedAtDesc(f.judge.getUserId()).size());
        var complete = fixture(2); submit(complete, "SUBMITTED"); reminders.automatic(complete.project.getCompetitionId()); assertTrue(outbox.findByUserIdOrderByCreatedAtDesc(complete.judge.getUserId()).isEmpty());
        var future = fixture(25); reminders.automatic(future.project.getCompetitionId()); assertTrue(outbox.findByUserIdOrderByCreatedAtDesc(future.judge.getUserId()).isEmpty());
        var closed = fixture(2); tx(() -> { competitions.findById(closed.project.getCompetitionId()).orElseThrow().setStatus("CLOSED"); return null; }); reminders.automatic(closed.project.getCompetitionId()); assertTrue(outbox.findByUserIdOrderByCreatedAtDesc(closed.judge.getUserId()).isEmpty());
        var empty = fixture(2); assignments.deleteAll(assignments.findByCompetition_CompetitionIdAndJudge_UserId(empty.project.getCompetitionId(), empty.judge.getUserId())); reminders.automatic(empty.project.getCompetitionId()); assertTrue(outbox.findByUserIdOrderByCreatedAtDesc(empty.judge.getUserId()).isEmpty());
    }
    @Test void reminderRequiresDeadlineAndOutstandingWorkAndRechecksBeforeSending() {
        var f = fixture(2); var n = manual(f); submit(f, "SUBMITTED"); delivery.deliver(latest(f.judge).getId());
        assertEquals("CANCELLED", notifications.findById(n.getNotificationId()).orElseThrow().getEmailStatus()); assertEquals(0, sends.get());
        assertEquals(409, assertThrows(ResponseStatusException.class, () -> manual(f)).getStatusCode().value());
        var expired = fixture(-1); assertEquals(409, assertThrows(ResponseStatusException.class, () -> manual(expired)).getStatusCode().value());
        var noDeadline = fixture(2); tx(() -> { competitions.findById(noDeadline.project.getCompetitionId()).orElseThrow().setEvaluationDeadline(null); return null; }); assertEquals(409, assertThrows(ResponseStatusException.class, () -> manual(noDeadline)).getStatusCode().value());
    }
    @Test void manualAndAutomaticShareCooldownAndSuspendedUnverifiedJudgesAreSkipped() {
        var f = fixture(2); manual(f); reminders.automatic(f.project.getCompetitionId()); assertEquals(1, outbox.findByUserIdOrderByCreatedAtDesc(f.judge.getUserId()).size());
        var inactive = fixture(2); tx(() -> { users.findById(inactive.judge.getUserId()).orElseThrow().setStatus("SUSPENDED"); return null; }); reminders.automatic(inactive.project.getCompetitionId()); assertTrue(outbox.findByUserIdOrderByCreatedAtDesc(inactive.judge.getUserId()).isEmpty());
        var unverified = fixture(2); tx(() -> { users.findById(unverified.judge.getUserId()).orElseThrow().setEmailVerificationRequired(true); return null; }); reminders.automatic(unverified.project.getCompetitionId()); assertTrue(outbox.findByUserIdOrderByCreatedAtDesc(unverified.judge.getUserId()).isEmpty());
    }
    @Test void concurrentManualRequestsKeepTheOneHourCooldown() throws Exception {
        var f = fixture(2); var executor = Executors.newFixedThreadPool(2);
        try {
            var start = new CountDownLatch(1);
            var data = Map.of("competitionId", f.project.getCompetitionId(), "email", f.judge.getEmail());
            String token = jwt.generateToken(f.owner.getEmail());
            Callable<Integer> send = () -> { start.await(); return call("/notifications", data, token).statusCode(); };
            var first = executor.submit(send); var second = executor.submit(send); start.countDown();
            var codes = new ArrayList<>(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)));
            Collections.sort(codes); assertEquals(List.of(200, 429), codes);
            assertEquals(1, outbox.findByUserIdOrderByCreatedAtDesc(f.judge.getUserId()).size());
        } finally { executor.shutdownNow(); }
    }
    @Test void concurrentAutomaticAndDeliveryCallsDoNotCreateDuplicateReminders() throws Exception {
        var f = fixture(2); var executor = Executors.newFixedThreadPool(2);
        try {
            var start = new CountDownLatch(1);
            var tasks = new ArrayList<Future<?>>();
            for (int i = 0; i < 2; i++) tasks.add(executor.submit(() -> { try { start.await(); reminders.automatic(f.project.getCompetitionId()); } catch (InterruptedException e) { throw new RuntimeException(e); } }));
            start.countDown(); for (var task : tasks) task.get(15, TimeUnit.SECONDS);
            assertEquals(1, outbox.findByUserIdOrderByCreatedAtDesc(f.judge.getUserId()).size());
            var id = latest(f.judge).getId(); var a = executor.submit(() -> delivery.deliver(id)); var b = executor.submit(() -> delivery.deliver(id));
            a.get(15, TimeUnit.SECONDS); b.get(15, TimeUnit.SECONDS); assertEquals(1, sends.get());
        } finally { executor.shutdownNow(); }
    }
}
