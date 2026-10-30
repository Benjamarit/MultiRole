package org.cesystem.multirole.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;

@Component
public class BrevoMailGateway {
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final JsonMapper mapper = JsonMapper.builder().build();
    @Value("${app.brevo.api-key:}") private String apiKey;
    @Value("${app.brevo.sender-email:}") private String sender;
    @Value("${app.brevo.sender-name:MultiRole}") private String senderName;
    @Value("${app.brevo.api-url:https://api.brevo.com/v3/smtp/email}") private String apiUrl;
    public static class DeliveryException extends RuntimeException {
        private final boolean retryable;
        public DeliveryException(String code, boolean retryable) { super(code); this.retryable = retryable; }
        public boolean retryable() { return retryable; }
    }
    public String send(String recipient, EmailQueue.Payload payload) {
        if (apiKey.isBlank() || sender.isBlank()) throw new DeliveryException("BREVO_NOT_CONFIGURED", true);
        try {
            String body = mapper.writeValueAsString(Map.of("sender", Map.of("email", sender, "name", senderName),
                "to", List.of(Map.of("email", recipient)), "subject", payload.subject(), "htmlContent", payload.html()));
            var request = HttpRequest.newBuilder(URI.create(apiUrl)).timeout(Duration.ofSeconds(10))
                .header("api-key", apiKey).header("accept", "application/json").header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300)
                throw new DeliveryException("BREVO_HTTP_" + response.statusCode(), response.statusCode() == 429 || response.statusCode() >= 500);
            String id = mapper.readTree(response.body()).path("messageId").asText("");
            if (id.isBlank()) throw new DeliveryException("BREVO_INVALID_RECEIPT", true);
            return id;
        } catch (DeliveryException e) { throw e; }
        catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new DeliveryException("BREVO_INTERRUPTED", true); }
        catch (Exception e) { throw new DeliveryException("BREVO_CONNECTION_OR_RESPONSE_ERROR", true); }
    }
}
