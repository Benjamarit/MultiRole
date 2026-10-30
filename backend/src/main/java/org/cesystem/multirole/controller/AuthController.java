package org.cesystem.multirole.controller;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.dto.ApiDtos.ForgotPasswordRequest;
import org.cesystem.multirole.dto.ApiDtos.ResetPasswordRequest;
import org.cesystem.multirole.dto.AuthResponse;
import org.cesystem.multirole.dto.LoginRequest;
import org.cesystem.multirole.dto.RegisterRequest;
import org.cesystem.multirole.dto.UserProfileDto;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.UserRepository;
import org.cesystem.multirole.service.AuthService;
import org.cesystem.multirole.service.PasswordResetService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepository;
    private final PasswordResetService passwordResetService;
    private final org.cesystem.multirole.service.EmailVerificationService verification;
    private final org.cesystem.multirole.service.AccessService access;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            String message = authService.registerUser(request);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            // เช่น อีเมลซ้ำ -> 400 Bad Request
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            AuthResponse response = authService.loginUser(loginRequest);
            return ResponseEntity.ok(response);
        } catch (AuthService.EmailNotVerifiedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(java.util.Map.of("code", "EMAIL_NOT_VERIFIED", "email", e.email, "message", e.getMessage()));
        } catch (RuntimeException e) {
            // รหัสผ่านผิด / ไม่พบอีเมล -> 401 Unauthorized
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("ไม่มีสิทธิ์เข้าถึง (Unauthorized)");
        }

        // principal.getName() คืนอีเมลที่ถอดจาก JWT
        User user = access.currentUser(principal);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("ไม่พบข้อมูลผู้ใช้งาน");
        }

        String role = Boolean.TRUE.equals(user.getIsSystemAdmin()) ? "ADMIN" : "USER";

        return ResponseEntity.ok(new UserProfileDto(
                user.getUserId(),
                user.getEmail(),
                user.getFullName(),
                role));
    }

    /** ขอลิงก์รีเซ็ตรหัสผ่าน: ตอบ 200 เสมอ ไม่บอกว่าอีเมลนี้มีในระบบหรือไม่ */
    @PostMapping("/forgot-password")
    public ResponseEntity<String> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return ResponseEntity.ok("หากอีเมลนี้มีอยู่ในระบบ ระบบจะส่งลิงก์รีเซ็ตรหัสผ่านให้ กรุณาตรวจสอบกล่องจดหมายและสแปม");
    }

    /** ตั้งรหัสผ่านใหม่ด้วย token จากลิงก์ในอีเมล (token ใช้ได้ครั้งเดียว) */
    @PostMapping("/reset-password")
    public ResponseEntity<String> resetPassword(@RequestBody ResetPasswordRequest request) {
        passwordResetService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok("ตั้งรหัสผ่านใหม่เรียบร้อยแล้ว");
    }

    public record VerifyEmailRequest(String token) {}
    @PostMapping("/resend-verification")
    public String resendVerification(@RequestBody ForgotPasswordRequest request) {
        verification.request(request.email());
        return "หากบัญชีนี้ต้องยืนยันอีเมล ระบบจะส่งลิงก์ให้ กรุณาตรวจสอบกล่องจดหมายและสแปม";
    }
    @PostMapping("/verify-email")
    public String verifyEmail(@RequestBody VerifyEmailRequest request) {
        verification.verify(request.token());
        return "ยืนยันอีเมลสำเร็จ สามารถเข้าสู่ระบบได้แล้ว";
    }
    @GetMapping("/verify-reset-token")
    public java.util.Map<String, Boolean> verifyResetToken(@RequestParam String token) {
        return java.util.Map.of("valid", passwordResetService.verifyToken(token));
    }
}
