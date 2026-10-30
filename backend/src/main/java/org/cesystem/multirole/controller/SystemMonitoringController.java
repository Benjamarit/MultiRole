package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.repository.*;
import org.cesystem.multirole.service.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.*;

@RestController @RequestMapping("/api/admin") @RequiredArgsConstructor
public class SystemMonitoringController {
    private final AccessService access;
    private final UserRepository users;
    private final CompetitionRepository projects;
    private final ProjectActivityRepository events;
    private final ProjectCreationPolicy policy;
    private final ProjectActivityService activity;
    public record MonitoredUser(UUID id, long projectCount, long createdLast10Minutes, long createdLast24Hours,
                                long deniedLast24Hours, boolean projectCreationBlocked, List<String> signals) {}
    public record ProjectSummary(UUID id, String title, String status, UUID ownerId, String ownerName, String ownerEmail, LocalDateTime createdAt) {}
    public record ActivitySummary(UUID id, UUID userId, String name, String email, String action, String detail, LocalDateTime occurredAt) {}
    public record Monitoring(long totalProjects, List<MonitoredUser> users, List<ProjectSummary> projects,
                             List<ActivitySummary> activities, int burstLimit, int dailyLimit, int totalLimit) {}
    public record CreationAccessRequest(boolean blocked) {}
    private void requireAdmin(Principal principal) {
        if (!access.isSystemAdmin(access.currentUser(principal))) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "เฉพาะผู้ดูแลระบบ");
    }
    @GetMapping("/monitoring") @Transactional(readOnly = true)
    public Monitoring monitoring(Principal principal) {
        requireAdmin(principal);
        var allUsers = users.findAll();
        var byId = new HashMap<UUID, org.cesystem.multirole.model.User>();
        allUsers.forEach(u -> byId.put(u.getUserId(), u));
        var rows = allUsers.stream().map(u -> {
            var quota = policy.quota(u);
            long denied = events.countByUserIdAndActionAndOccurredAtAfter(u.getUserId(), "CREATE_DENIED", LocalDateTime.now().minusHours(24));
            var signals = new ArrayList<String>();
            if (quota.createdLast10Minutes() >= quota.burstLimit()) signals.add("สร้างโครงการถี่ภายใน 10 นาที");
            if (quota.createdLast24Hours() >= quota.dailyLimit()) signals.add("สร้างโครงการถึงโควตา 24 ชั่วโมง");
            if (denied > 0) signals.add("มีคำขอสร้างโครงการถูกปฏิเสธ " + denied + " ครั้งใน 24 ชั่วโมง");
            if (quota.owned() >= quota.totalLimit()) signals.add("จำนวนโครงการถึงโควตารวม");
            return new MonitoredUser(u.getUserId(), quota.owned(), quota.createdLast10Minutes(), quota.createdLast24Hours(), denied, quota.blocked(), signals);
        }).toList();
        var projectRows = projects.findAll().stream().sorted(Comparator.comparing(org.cesystem.multirole.model.Competition::getCreatedAt).reversed())
            .map(p -> new ProjectSummary(p.getCompetitionId(), p.getTitle(), p.getStatus(), p.getCreatedBy().getUserId(), p.getCreatedBy().getFullName(), p.getCreatedBy().getEmail(), p.getCreatedAt())).toList();
        var recent = events.findTop100ByOrderByOccurredAtDesc().stream().map(e -> {
            var u = byId.get(e.getUserId());
            return new ActivitySummary(e.getId(), e.getUserId(), u == null ? "บัญชีที่ถูกลบ" : u.getFullName(), u == null ? "" : u.getEmail(), e.getAction(), e.getDetail(), e.getOccurredAt());
        }).toList();
        var limits = policy.quota(access.currentUser(principal));
        return new Monitoring(projectRows.size(), rows, projectRows, recent, limits.burstLimit(), limits.dailyLimit(), limits.totalLimit());
    }
    @PatchMapping("/users/{id}/project-creation") @Transactional
    public void creationAccess(@PathVariable UUID id, @RequestBody CreationAccessRequest request, Principal principal) {
        requireAdmin(principal);
        var target = users.lockById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบผู้ใช้"));
        if (access.isSystemAdmin(target)) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่สามารถระงับสิทธิ์บัญชีผู้ดูแลระบบ");
        target.setProjectCreationBlocked(request.blocked());
        users.save(target);
        activity.record(id, request.blocked() ? "CREATION_BLOCKED" : "CREATION_UNBLOCKED", "ผู้ดูแลระบบ " + principal.getName() + " เปลี่ยนสิทธิ์สร้างโครงการ");
    }
}
