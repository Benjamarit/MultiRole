package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.*;
import org.cesystem.multirole.repository.EmailOutboxRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import tools.jackson.databind.json.JsonMapper;
import java.time.LocalDateTime;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class EmailQueue {
    private final EmailOutboxRepository repository;
    private final MailPayloadCipher cipher;
    private final JsonMapper mapper = JsonMapper.builder().build();
    public record Payload(String subject, String html) {}
    @Transactional(propagation = Propagation.MANDATORY)
    public void enqueue(User user, String purpose, String subject, String message, String link, String button,
                        UUID competitionId, UUID notificationId, UUID tokenId, LocalDateTime expiresAt) {
        var mail = new EmailOutbox();
        mail.setUserId(user.getUserId()); mail.setRecipient(user.getEmail()); mail.setPurpose(purpose);
        mail.setCompetitionId(competitionId); mail.setNotificationId(notificationId); mail.setTokenId(tokenId);
        mail.setCreatedAt(LocalDateTime.now()); mail.setNextAttemptAt(LocalDateTime.now()); mail.setExpiresAt(expiresAt);
        String html = "<!doctype html><html lang=\"th\"><body style=\"margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a\">"
            + "<main style=\"max-width:560px;margin:32px auto;padding:32px;background:#fff;border:1px solid #e2e8f0;border-radius:16px\">"
            + "<p style=\"color:#2563eb;font-weight:bold\">MultiRole · Evaluation Platform</p><h1 style=\"font-size:22px\">" + escape(subject)
            + "</h1><p>เรียน " + escape(user.getFullName()) + "</p><p style=\"line-height:1.8;white-space:pre-line\">" + escape(message)
            + "</p><p style=\"margin:28px 0\"><a style=\"display:inline-block;background:#2563eb;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none\" href=\"" + escape(link) + "\">" + escape(button)
            + "</a></p><p style=\"font-size:12px;color:#64748b;word-break:break-all\">หากกดปุ่มไม่ได้ เปิดลิงก์นี้:<br>" + escape(link)
            + "</p><p style=\"font-size:12px;color:#64748b\">อีเมลอัตโนมัติจาก MultiRole</p></main></body></html>";
        mail.setEncryptedPayload(cipher.encrypt(mapper.writeValueAsString(new Payload(subject, html))));
        repository.save(mail);
    }
    public Payload payload(EmailOutbox mail) { return mapper.readValue(cipher.decrypt(mail.getEncryptedPayload()), Payload.class); }
    private static String escape(String value) {
        return value == null ? "" : value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
