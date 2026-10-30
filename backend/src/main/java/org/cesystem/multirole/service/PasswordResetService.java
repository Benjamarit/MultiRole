package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.PasswordResetToken;
import org.cesystem.multirole.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Service @RequiredArgsConstructor
public class PasswordResetService {
    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final EmailQueue queue;
    private final jakarta.persistence.EntityManager entityManager;
    @Value("${app.frontend-url:http://localhost:5173}") private String frontendUrl;

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void requestReset(String email) {
        if (email == null) return;
        var found = users.findByEmail(email.trim().toLowerCase());
        if (found.isEmpty()) return;
        var user = users.lockById(found.get().getUserId()).orElseThrow();
        entityManager.refresh(user);
        if (!"ACTIVE".equals(user.getStatus())) return;
        var now = LocalDateTime.now();
        if (tokens.findFirstByUser_UserIdOrderByCreatedAtDesc(user.getUserId()).filter(t -> t.getCreatedAt().isAfter(now.minusSeconds(60))).isPresent()) return;
        tokens.findByUser_UserIdAndUsedAtIsNull(user.getUserId()).forEach(t -> t.setUsedAt(now));
        String raw = EmailTokens.generate();
        var token = new PasswordResetToken();
        token.setUser(user); token.setTokenHash(EmailTokens.hash(raw)); token.setExpiresAt(now.plusMinutes(30));
        tokens.saveAndFlush(token);
        queue.enqueue(user, "RESET_PASSWORD", "รีเซ็ตรหัสผ่าน MultiRole", "กดปุ่มเพื่อตั้งรหัสผ่านใหม่ ลิงก์นี้มีอายุ 30 นาที และใช้ได้ครั้งเดียว\nหากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน ให้ละเว้นอีเมลนี้",
            frontendUrl.replaceAll("/+$", "") + "/reset-password?token=" + raw, "ตั้งรหัสผ่านใหม่", null, null, token.getResetTokenId(), token.getExpiresAt());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void resetPassword(String raw, String password) {
        if (raw == null || raw.isBlank()) throw invalidLink();
        if (password == null || password.length() < 8) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
        if (password.getBytes(StandardCharsets.UTF_8).length > 72) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "รหัสผ่านยาวเกินไป");
        var token = tokens.findByTokenHash(EmailTokens.hash(raw.trim())).orElseThrow(PasswordResetService::invalidLink);
        var user = users.lockById(token.getUser().getUserId()).orElseThrow();
        entityManager.refresh(user); entityManager.refresh(token);
        var now = LocalDateTime.now();
        if (token.getUsedAt() != null || !now.isBefore(token.getExpiresAt()) || !"ACTIVE".equals(user.getStatus())) throw invalidLink();
        user.setPasswordHash(encoder.encode(password));
        user.setTokenVersion((user.getTokenVersion() == null ? 0 : user.getTokenVersion()) + 1);
        tokens.findByUser_UserIdAndUsedAtIsNull(user.getUserId()).forEach(t -> t.setUsedAt(now));
    }

    @Transactional(readOnly = true)
    public boolean verifyToken(String raw) {
        if (raw == null || raw.isBlank()) return false;
        return tokens.findByTokenHash(EmailTokens.hash(raw.trim())).filter(t -> t.getUsedAt() == null
            && t.getExpiresAt().isAfter(LocalDateTime.now()) && "ACTIVE".equals(t.getUser().getStatus())).isPresent();
    }
    private static ResponseStatusException invalidLink() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "ลิงก์ไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว"); }
}
