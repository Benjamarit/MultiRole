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

@Service @RequiredArgsConstructor
public class EmailVerificationService {
    private final UserRepository users;
    private final EmailVerificationTokenRepository tokens;
    private final EmailQueue queue;
    private final jakarta.persistence.EntityManager entityManager;
    @Value("${app.frontend-url:http://localhost:5173}") private String frontendUrl;
    public static boolean required(User user) { return Boolean.TRUE.equals(user.getEmailVerificationRequired()) && !Boolean.TRUE.equals(user.getEmailVerified()); }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void request(String email) {
        if (email == null) return;
        var found = users.findByEmail(email.trim().toLowerCase());
        if (found.isEmpty()) return;
        User user = users.lockById(found.get().getUserId()).orElseThrow();
        entityManager.refresh(user);
        if (!required(user) || !"ACTIVE".equals(user.getStatus())) return;
        LocalDateTime now = LocalDateTime.now();
        if (tokens.findFirstByUser_UserIdOrderByCreatedAtDesc(user.getUserId()).filter(token -> token.getCreatedAt().isAfter(now.minusSeconds(60))).isPresent()) return;
        tokens.findByUser_UserIdAndUsedAtIsNull(user.getUserId()).forEach(token -> token.setUsedAt(now));
        String raw = EmailTokens.generate();
        var token = new EmailVerificationToken();
        token.setUser(user); token.setTokenHash(EmailTokens.hash(raw)); token.setCreatedAt(now); token.setExpiresAt(now.plusHours(1));
        tokens.saveAndFlush(token);
        queue.enqueue(user, "VERIFY_EMAIL", "ยืนยันอีเมลบัญชี MultiRole", "กรุณายืนยันอีเมลเพื่อเริ่มใช้งานบัญชีของคุณ\nลิงก์นี้มีอายุ 1 ชั่วโมง และใช้ได้ครั้งเดียว\nหากคุณไม่ได้สมัครบัญชีนี้ ให้ละเว้นอีเมลนี้",
            frontendUrl.replaceAll("/+$", "") + "/verify-email?token=" + raw, "ยืนยันอีเมล", null, null, token.getId(), token.getExpiresAt());
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void verify(String raw) {
        if (raw == null || raw.isBlank()) throw invalid();
        var found = tokens.findByTokenHash(EmailTokens.hash(raw.trim())).orElseThrow(EmailVerificationService::invalid);
        User user = users.lockById(found.getUser().getUserId()).orElseThrow();
        entityManager.refresh(user); entityManager.refresh(found);
        LocalDateTime now = LocalDateTime.now();
        if (found.getUsedAt() != null || !now.isBefore(found.getExpiresAt()) || !"ACTIVE".equals(user.getStatus())) throw invalid();
        user.setEmailVerified(true);
        tokens.findByUser_UserIdAndUsedAtIsNull(user.getUserId()).forEach(token -> token.setUsedAt(now));
    }
    private static ResponseStatusException invalid() { return new ResponseStatusException(HttpStatus.BAD_REQUEST, "ลิงก์ยืนยันอีเมลไม่ถูกต้อง หมดอายุ หรือถูกใช้แล้ว กรุณาขอลิงก์ใหม่"); }
}
