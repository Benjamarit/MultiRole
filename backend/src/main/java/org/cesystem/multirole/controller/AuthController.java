package org.cesystem.multirole.controller;

import org.cesystem.multirole.dto.AuthResponse;
import org.cesystem.multirole.dto.LoginRequest;
import org.cesystem.multirole.dto.RegisterRequest;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.cesystem.multirole.dto.UserProfileDto;
import org.cesystem.multirole.repository.UserRepository;

import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            String message = authService.registerUser(request);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            // ถ้าอีเมลซ้ำ จะส่ง Error 400 Bad Request กลับไปให้ React
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        try {
            AuthResponse response = authService.loginUser(loginRequest);
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            // คืนสถานะ 401 Unauthorized เมื่อรหัสผ่านผิดหรือไม่มีอีเมล
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(e.getMessage());
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Principal principal) {
        // principal.getName() จะได้ข้อมูลอีเมลที่ถูกถอดรหัสออกมาจาก JWT Token
        if (principal == null) {
            return ResponseEntity.status(401).body("ไม่มีสิทธิ์เข้าถึง (Unauthorized)");
        }

        String email = principal.getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("ไม่พบข้อมูลผู้ใช้งาน"));

        String role = user.getIsSystemAdmin() != null && user.getIsSystemAdmin() ? "ADMIN" : "USER";

        UserProfileDto profile = new UserProfileDto(
                user.getUserId(),
                user.getEmail(),
                user.getFullName(),
                role
        );

        return ResponseEntity.ok(profile);
    }
}