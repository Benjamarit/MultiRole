package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.UserRepository;
import org.cesystem.multirole.service.AccessService;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class UserController {
    private final UserRepository users;
    private final AccessService access;

    public record UserSummary(UUID id, String email, String name, String role,
                              String status, LocalDateTime createdAt) {
        static UserSummary from(User u) {
            return new UserSummary(u.getUserId(), u.getEmail(), u.getFullName(),
                    Boolean.TRUE.equals(u.getIsSystemAdmin()) ? "SYSTEM_ADMIN" : "USER",
                    "ACTIVE".equalsIgnoreCase(u.getStatus()) ? "Active" : "Suspended", u.getCreatedAt());
        }
    }
    public record DirectoryUser(UUID id, String email, String name) {}
    public record StatusRequest(String status) {}

    @GetMapping("/users")
    public List<DirectoryUser> directory(Principal principal) {
        access.currentUser(principal);
        return users.findAll().stream().filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()))
                .map(u -> new DirectoryUser(u.getUserId(), u.getEmail(), u.getFullName())).toList();
    }

    @GetMapping("/admin/users")
    public List<UserSummary> list(Principal principal) {
        requireAdmin(principal);
        return users.findAll().stream().map(UserSummary::from).toList();
    }

    @PatchMapping("/admin/users/{id}/status")
    @Transactional
    public UserSummary status(@PathVariable UUID id, @RequestBody StatusRequest request, Principal principal) {
        User current = requireAdmin(principal);
        User target = find(id);
        protectAdmin(current, target);
        String status = request.status() == null ? "" : request.status().toUpperCase();
        if (!List.of("ACTIVE", "SUSPENDED").contains(status)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "สถานะต้องเป็น Active หรือ Suspended");
        }
        target.setStatus(status);
        return UserSummary.from(users.save(target));
    }

    @DeleteMapping("/admin/users/{id}")
    @Transactional
    public void delete(@PathVariable UUID id, Principal principal) {
        User current = requireAdmin(principal);
        User target = find(id);
        protectAdmin(current, target);
        users.delete(target);
        users.flush();
    }

    private User requireAdmin(Principal principal) {
        User user = access.currentUser(principal);
        if (!access.isSystemAdmin(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "เฉพาะผู้ดูแลระบบ");
        return user;
    }
    private User find(UUID id) {
        return users.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบผู้ใช้"));
    }
    private void protectAdmin(User current, User target) {
        if (current.getUserId().equals(target.getUserId()) || access.isSystemAdmin(target)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "ไม่สามารถระงับหรือลบบัญชีผู้ดูแลระบบ");
        }
    }
}
