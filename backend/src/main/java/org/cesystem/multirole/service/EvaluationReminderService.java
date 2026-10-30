package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.*;
import org.cesystem.multirole.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service @RequiredArgsConstructor
public class EvaluationReminderService {
    private final AccessService access;
    private final UserRepository users;
    private final CompetitionRepository competitions;
    private final CompetitionUserRepository members;
    private final JudgeAssignmentRepository assignments;
    private final EvaluationRepository evaluations;
    private final NotificationRepository notifications;
    private final EvaluationReminderRepository reminders;
    private final EmailQueue queue;
    private final jakarta.persistence.EntityManager entityManager;
    @Value("${app.frontend-url:http://localhost:5173}") private String frontendUrl;

    public long remaining(UUID competitionId, UUID judgeId) {
        Set<UUID> submitted = new HashSet<>();
        evaluations.findByCompetition_CompetitionIdAndJudge_UserId(competitionId, judgeId).stream()
            .filter(e -> "SUBMITTED".equals(e.getStatus())).forEach(e -> submitted.add(e.getTeam().getTeamId()));
        return assignments.findByCompetition_CompetitionIdAndJudge_UserId(competitionId, judgeId).stream()
            .map(a -> a.getTeam().getTeamId()).distinct().filter(id -> !submitted.contains(id)).count();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Notification manual(UUID competitionId, String email, User actor) {
        Competition competition = access.requireCompetitionAdmin(competitionId, actor);
        entityManager.lock(competition, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(competition);
        LocalDateTime now = LocalDateTime.now();
        if (!open(competition, now)) throw conflict("ส่งเตือนได้เมื่อโครงการเปิดรับคะแนน มี deadline และยังไม่หมดเวลา");
        User judge = users.findByEmail(email == null ? "" : email.trim().toLowerCase())
            .filter(user -> eligibleMember(competitionId, user)).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "ผู้รับต้องเป็นกรรมการที่พร้อมใช้งานในโครงการนี้"));
        long remaining = remaining(competitionId, judge.getUserId());
        if (remaining == 0) throw conflict("กรรมการประเมินทีมที่ได้รับมอบหมายครบแล้ว หรือยังไม่ได้รับมอบหมายทีม");
        if (reminders.existsByCompetitionIdAndUserIdAndCreatedAtAfter(competitionId, judge.getUserId(), now.minusHours(1)))
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "แจ้งเตือนกรรมการคนนี้แล้ว กรุณาเว้นอย่างน้อย 1 ชั่วโมง");
        return create(competition, judge, remaining, "MANUAL", now);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, isolation = Isolation.READ_COMMITTED)
    public void automatic(UUID competitionId) {
        var found = competitions.findById(competitionId);
        if (found.isEmpty()) return;
        Competition competition = found.get();
        entityManager.lock(competition, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        entityManager.refresh(competition);
        LocalDateTime now = LocalDateTime.now();
        if (!open(competition, now) || competition.getEvaluationDeadline().isAfter(now.plusHours(24))) return;
        for (var member : members.findByCompetition_CompetitionId(competitionId)) {
            User judge = member.getUser();
            if (!AccessService.hasJudgeRole(member.getRole()) || !eligibleAccount(judge)) continue;
            String key = automaticKey(competitionId, judge.getUserId());
            if (reminders.existsByDedupeKey(key) || reminders.existsByCompetitionIdAndUserIdAndCreatedAtAfter(competitionId, judge.getUserId(), now.minusHours(1))) continue;
            long remaining = remaining(competitionId, judge.getUserId());
            if (remaining > 0) create(competition, judge, remaining, "AUTO", now);
        }
    }

    public boolean eligibleMember(UUID competitionId, User judge) {
        return eligibleAccount(judge) && members.findByCompetition_CompetitionIdAndUser_UserId(competitionId, judge.getUserId())
            .map(member -> AccessService.hasJudgeRole(member.getRole())).orElse(false);
    }
    private boolean eligibleAccount(User user) { return "ACTIVE".equals(user.getStatus()) && !EmailVerificationService.required(user); }
    public boolean open(Competition competition, LocalDateTime now) {
        return "ACTIVE".equals(competition.getStatus()) && competition.getEvaluationDeadline() != null && now.isBefore(competition.getEvaluationDeadline());
    }
    private Notification create(Competition competition, User judge, long remaining, String kind, LocalDateTime now) {
        UUID competitionId = competition.getCompetitionId();
        String deadline = competition.getEvaluationDeadline().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
        String message = "โครงการ “" + competition.getTitle() + "”\nคุณยังประเมินทีมที่ได้รับมอบหมายไม่ครบ " + remaining
            + " ทีม\nกรุณาส่งคะแนนภายใน " + deadline + " (เวลาไทย)\nหากบันทึกร่างไว้ กรุณาตรวจสอบและส่งคะแนนให้ครบ";
        var notification = new Notification();
        notification.setUser(judge); notification.setCompetition(competition); notification.setType("REMINDER");
        notification.setTitle("แจ้งเตือนการประเมินคะแนน"); notification.setMessage(message); notification.setEmailStatus("QUEUED");
        notifications.saveAndFlush(notification);
        var reminder = new EvaluationReminder();
        reminder.setCompetitionId(competitionId); reminder.setUserId(judge.getUserId()); reminder.setKind(kind); reminder.setCreatedAt(now);
        reminder.setDedupeKey("AUTO".equals(kind) ? automaticKey(competitionId, judge.getUserId()) : "MANUAL:" + UUID.randomUUID());
        reminders.save(reminder);
        queue.enqueue(judge, "REMINDER", "แจ้งเตือนการประเมินคะแนน — MultiRole", message,
            frontendUrl.replaceAll("/+$", "") + "/judge/project/" + competitionId + "/teams", "ไปประเมินคะแนน",
            competitionId, notification.getNotificationId(), null, competition.getEvaluationDeadline());
        return notification;
    }
    private static String automaticKey(UUID competitionId, UUID userId) { return "AUTO:" + competitionId + ":" + userId; }
    private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }
}
