package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class ProjectCreationPolicy {
    private final UserRepository users;
    private final CompetitionRepository projects;
    private final ProjectActivityRepository events;
    private final ProjectActivityService activity;
    private final jakarta.persistence.EntityManager entityManager;
    @Value("${app.projects.burst-limit:3}") private int burstLimit;
    @Value("${app.projects.daily-limit:10}") private int dailyLimit;
    @Value("${app.projects.total-limit:30}") private int totalLimit;
    public record Quota(long owned, long createdLast10Minutes, long createdLast24Hours,
                        int burstLimit, int dailyLimit, int totalLimit, boolean blocked, boolean allowed, String reason) {}
    public Quota quota(User user) {
        var now = LocalDateTime.now();
        long owned = projects.countByCreatedBy_UserId(user.getUserId());
        long burst = events.countByUserIdAndActionAndOccurredAtAfter(user.getUserId(), "PROJECT_CREATED", now.minusMinutes(10));
        long daily = events.countByUserIdAndActionAndOccurredAtAfter(user.getUserId(), "PROJECT_CREATED", now.minusHours(24));
        burst = Math.max(burst, projects.countByCreatedBy_UserIdAndCreatedAtAfter(user.getUserId(), now.minusMinutes(10)));
        daily = Math.max(daily, projects.countByCreatedBy_UserIdAndCreatedAtAfter(user.getUserId(), now.minusHours(24)));
        boolean blocked = Boolean.TRUE.equals(user.getProjectCreationBlocked());
        String reason = blocked ? "ผู้ดูแลระบบระงับสิทธิ์สร้างโครงการ กรุณาติดต่อผู้ดูแลระบบ"
            : owned >= totalLimit ? "มีโครงการครบ " + totalLimit + " โครงการแล้ว กรุณาติดต่อผู้ดูแลระบบ"
            : daily >= dailyLimit ? "สร้างได้ไม่เกิน " + dailyLimit + " โครงการต่อ 24 ชั่วโมง กรุณารอให้พ้นช่วงเวลา"
            : burst >= burstLimit ? "สร้างได้ไม่เกิน " + burstLimit + " โครงการต่อ 10 นาที กรุณาลองใหม่ภายหลัง" : "";
        return new Quota(owned, burst, daily, burstLimit, dailyLimit, totalLimit, blocked, reason.isEmpty(), reason);
    }
    // Serialize creates per account so simultaneous requests cannot bypass the quota.
    public void requireAllowed(User user) {
        User locked = users.lockById(user.getUserId()).orElseThrow();
        entityManager.refresh(locked);
        Quota quota = quota(locked);
        if (!quota.allowed()) {
            activity.denied(user.getUserId(), quota.reason());
            throw new ResponseStatusException(quota.blocked() ? HttpStatus.FORBIDDEN : HttpStatus.TOO_MANY_REQUESTS, quota.reason());
        }
    }
}
