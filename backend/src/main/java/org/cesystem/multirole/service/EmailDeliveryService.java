package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.cesystem.multirole.model.*;
import org.cesystem.multirole.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Service @RequiredArgsConstructor @Slf4j
public class EmailDeliveryService {
    private final EmailOutboxRepository outbox;
    private final EmailQueue queue;
    private final BrevoMailGateway gateway;
    private final UserRepository users;
    private final CompetitionRepository competitions;
    private final NotificationRepository notifications;
    private final EmailVerificationTokenRepository verificationTokens;
    private final PasswordResetTokenRepository resetTokens;
    private final EvaluationReminderService reminders;
    private final jakarta.persistence.EntityManager entityManager;

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public void deliver(UUID id) {
        var found = outbox.findById(id);
        if (found.isEmpty()) return;
        EmailOutbox mail = found.get();
        entityManager.lock(mail, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(mail);
        LocalDateTime now = LocalDateTime.now();
        if (!java.util.List.of("PENDING", "RETRY").contains(mail.getStatus()) || mail.getNextAttemptAt().isAfter(now)) return;
        if (!stillRelevant(mail, now)) { finish(mail, "CANCELLED"); return; }
        mail.setAttempts(mail.getAttempts() + 1);
        try {
            mail.setProviderMessageId(gateway.send(mail.getRecipient(), queue.payload(mail)));
            mail.setAcceptedAt(LocalDateTime.now()); mail.setLastError(null);
            finish(mail, "ACCEPTED");
        } catch (BrevoMailGateway.DeliveryException error) {
            mail.setLastError(error.getMessage());
            boolean retry = error.retryable() && mail.getAttempts() < 6;
            mail.setStatus(retry ? "RETRY" : "FAILED");
            mail.setNextAttemptAt(now.plusMinutes(Math.min(60, 1L << Math.min(mail.getAttempts() - 1, 6))));
            if (!retry) mail.setEncryptedPayload(null);
            updateNotification(mail, retry ? "RETRYING" : "FAILED");
            log.warn("Email delivery {} for outbox {} (attempt {})", error.getMessage(), mail.getId(), mail.getAttempts());
        } catch (RuntimeException error) {
            mail.setLastError("PAYLOAD_UNAVAILABLE"); mail.setStatus("FAILED"); mail.setEncryptedPayload(null); updateNotification(mail, "FAILED");
            log.warn("Email payload unavailable for outbox {}", mail.getId());
        }
    }

    private boolean stillRelevant(EmailOutbox mail, LocalDateTime now) {
        if (mail.getExpiresAt() != null && !now.isBefore(mail.getExpiresAt())) return false;
        var found = users.findById(mail.getUserId());
        if (found.isEmpty() || !"ACTIVE".equals(found.get().getStatus()) || !mail.getRecipient().equals(found.get().getEmail())) return false;
        if ("VERIFY_EMAIL".equals(mail.getPurpose())) return EmailVerificationService.required(found.get()) && verificationTokens.findById(mail.getTokenId()).filter(token -> token.getUsedAt() == null).isPresent();
        if ("RESET_PASSWORD".equals(mail.getPurpose())) return resetTokens.findById(mail.getTokenId()).filter(token -> token.getUsedAt() == null).isPresent();
        if ("REMINDER".equals(mail.getPurpose())) return notifications.existsById(mail.getNotificationId())
            && competitions.findById(mail.getCompetitionId()).filter(competition -> reminders.open(competition, now)).isPresent()
            && reminders.eligibleMember(mail.getCompetitionId(), found.get()) && reminders.remaining(mail.getCompetitionId(), mail.getUserId()) > 0;
        return false;
    }
    private void finish(EmailOutbox mail, String status) { mail.setStatus(status); mail.setEncryptedPayload(null); updateNotification(mail, status); }
    private void updateNotification(EmailOutbox mail, String status) {
        if (mail.getNotificationId() != null) notifications.findById(mail.getNotificationId()).ifPresent(notification -> notification.setEmailStatus(status));
    }
}
