package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.NotificationResponse;
import org.cesystem.multirole.model.Notification;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.NotificationRepository;
import org.cesystem.multirole.service.AccessService;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** แจ้งเตือนของผู้ใช้ปัจจุบัน (ผู้ใช้เห็นและแก้ได้เฉพาะของตัวเอง) */
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final AccessService access;

    public record ReminderRequest(UUID competitionId, String email, String title, String message, String type) {}

    @PostMapping
    public NotificationResponse remind(@RequestBody ReminderRequest request, Principal principal) {
        User current = access.currentUser(principal);
        if (request.competitionId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "กรุณาระบุการแข่งขัน");
        }
        return NotificationResponse.from(reminders.manual(request.competitionId(), request.email(), current));
    }
    private final org.cesystem.multirole.service.EvaluationReminderService reminders;

    @GetMapping
    @Transactional(readOnly = true)
    public List<NotificationResponse> list(@RequestParam(defaultValue = "false") boolean unreadOnly,
                                           Principal principal) {
        User user = access.currentUser(principal);
        List<Notification> notifications = unreadOnly
                ? notificationRepository.findUnreadByUser(user.getUserId())
                : notificationRepository.findByUser_UserIdOrderByCreatedAtDesc(user.getUserId());
        return notifications.stream().map(NotificationResponse::from).toList();
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(Principal principal) {
        User user = access.currentUser(principal);
        return Map.of("count", notificationRepository.countUnreadByUser(user.getUserId()));
    }

    @PatchMapping("/{notificationId}/read")
    @Transactional
    public NotificationResponse markRead(@PathVariable UUID notificationId, Principal principal) {
        User user = access.currentUser(principal);
        Notification notification = notificationRepository.findById(notificationId)
                .filter(n -> n.getUser().getUserId().equals(user.getUserId()))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบการแจ้งเตือนนี้"));
        notification.setIsRead(true);
        return NotificationResponse.from(notificationRepository.save(notification));
    }

    @PatchMapping("/read-all")
    public Map<String, Integer> markAllRead(Principal principal) {
        User user = access.currentUser(principal);
        return Map.of("updated", notificationRepository.markAllRead(user.getUserId()));
    }
}
