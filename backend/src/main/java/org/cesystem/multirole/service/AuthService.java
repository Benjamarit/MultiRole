package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.AuthResponse;
import org.cesystem.multirole.dto.LoginRequest;
import org.cesystem.multirole.dto.RegisterRequest;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.UserRepository;
import org.cesystem.multirole.security.JwtUtil;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

/**
 * ข้อความ error ใช้ RuntimeException ตามเดิม เพราะ AuthController จับ RuntimeException
 * แล้วส่ง e.getMessage() เป็น body (ไม่ใช้ ResponseStatusException ที่นี่ เพราะ getMessage() จะมี status ปนมาด้วย)
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_BYTES = 72; // ข้อจำกัดของ BCrypt

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailVerificationService verification;
    @org.springframework.beans.factory.annotation.Value("${app.mail.verification-enabled:true}")
    private boolean verificationEnabled;
    public static class EmailNotVerifiedException extends RuntimeException {
        public final String email;
        public EmailNotVerifiedException(String email) { super("กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ"); this.email = email; }
    }

    @org.springframework.transaction.annotation.Transactional(isolation = org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public String registerUser(RegisterRequest request) {
        // 1. ตรวจข้อมูลที่ส่งมา
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        if (email.isEmpty() || email.length() > 255 || !EMAIL.matcher(email).matches()) {
            throw new IllegalArgumentException("รูปแบบอีเมลไม่ถูกต้อง");
        }
        String password = request.getPassword();
        if (password == null || password.length() < MIN_PASSWORD_LENGTH) {
            throw new IllegalArgumentException("รหัสผ่านต้องมีอย่างน้อย " + MIN_PASSWORD_LENGTH + " ตัวอักษร");
        }
        if (password.getBytes(StandardCharsets.UTF_8).length > MAX_PASSWORD_BYTES) {
            throw new IllegalArgumentException("รหัสผ่านยาวเกินไป");
        }
        String fullName = request.getFullName() == null ? "" : request.getFullName().trim();
        if (fullName.isEmpty()) {
            throw new IllegalArgumentException("กรุณาระบุชื่อ-นามสกุล");
        }
        if (fullName.length() > 150) {
            throw new IllegalArgumentException("ชื่อ-นามสกุลยาวเกิน 150 ตัวอักษร");
        }

        // 2. อีเมลซ้ำหรือไม่
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("Email already exists");
        }

        // 3. สร้างผู้ใช้ (createdAt / updatedAt เติมให้อัตโนมัติ)
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(fullName);
        user.setStatus("ACTIVE");
        user.setIsSystemAdmin(false);
        user.setEmailVerified(!verificationEnabled);
        user.setEmailVerificationRequired(verificationEnabled);

        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException e) {
            // สมัครพร้อมกันด้วยอีเมลเดียวกัน ชน unique(email)
            throw new IllegalArgumentException("Email already exists");
        }

        if (verificationEnabled) verification.request(email);
        return "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี";
    }

    public AuthResponse loginUser(LoginRequest request) {
        String email = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        String password = request.getPassword() == null ? "" : request.getPassword();

        // อีเมลไม่พบกับรหัสผิดใช้ข้อความเดียวกัน ไม่บอกว่าอีเมลนี้มีในระบบหรือไม่
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("อีเมลหรือรหัสผ่านไม่ถูกต้อง"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new RuntimeException("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
        }

        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new RuntimeException("บัญชีนี้ถูกระงับการใช้งาน");
        }

        String role = Boolean.TRUE.equals(user.getIsSystemAdmin()) ? "ADMIN" : "USER";
        if (EmailVerificationService.required(user)) throw new EmailNotVerifiedException(user.getEmail());
        String token = jwtUtil.generateToken(user.getEmail(), user.getTokenVersion() == null ? 0 : user.getTokenVersion());

        return new AuthResponse(token, user.getFullName(), role);
    }
}