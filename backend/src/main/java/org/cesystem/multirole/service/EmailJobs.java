package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.cesystem.multirole.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.List;

@Component @RequiredArgsConstructor @Slf4j
public class EmailJobs {
    private final EmailOutboxRepository outbox;
    private final CompetitionRepository competitions;
    private final EmailDeliveryService delivery;
    private final EvaluationReminderService reminders;
    @Value("${app.mail.dispatch-enabled:true}") private boolean dispatchEnabled;
    @Value("${app.reminders.enabled:true}") private boolean remindersEnabled;
    @Scheduled(fixedDelayString = "${app.mail.dispatch-delay-ms:15000}", initialDelayString = "${app.mail.dispatch-delay-ms:15000}")
    public void dispatch() {
        if (!dispatchEnabled) return;
        for (var mail : outbox.findTop20ByStatusInAndNextAttemptAtLessThanEqualOrderByCreatedAtAsc(List.of("PENDING", "RETRY"), LocalDateTime.now())) {
            try { delivery.deliver(mail.getId()); }
            catch (RuntimeException error) { log.warn("Email dispatch transaction failed for outbox {}", mail.getId()); }
        }
    }
    @Scheduled(fixedDelayString = "${app.reminders.poll-ms:60000}", initialDelayString = "${app.reminders.poll-ms:60000}")
    public void remind() {
        if (!remindersEnabled) return;
        LocalDateTime now = LocalDateTime.now();
        for (var competition : competitions.findByStatusAndEvaluationDeadlineBetween("ACTIVE", now, now.plusHours(24))) {
            try { reminders.automatic(competition.getCompetitionId()); }
            catch (RuntimeException error) { log.warn("Automatic reminder transaction failed for competition {}", competition.getCompetitionId()); }
        }
    }
}
