package org.cesystem.multirole.service;

import org.cesystem.multirole.dto.AuthResponse;
import org.cesystem.multirole.dto.LoginRequest;
import org.cesystem.multirole.dto.RegisterRequest;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.UserRepository;
import org.cesystem.multirole.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    public String registerUser(RegisterRequest request) {
        // 1. เช็กว่าอีเมลซ้ำไหม
        if (userRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        // 2. สร้าง Entity User ใหม่
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword())); // แฮชรหัสผ่าน!
        user.setFullName(request.getFullName());
        user.setStatus("ACTIVE");
        user.setIsSystemAdmin(false); // ค่าเริ่มต้นเป็น User ธรรมดา
        user.setCreatedAt(LocalDateTime.now());

        // 3. บันทึกลง Database
        userRepository.save(user);

        return "User registered successfully";
    }
    @Autowired
    private JwtUtil jwtUtil;

    public AuthResponse loginUser(LoginRequest request) {
        // 1. ค้นหา User จาก Database
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("ไม่พบอีเมลนี้ในระบบ"));

        // 2. ตรวจสอบรหัสผ่านด้วย BCrypt
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new RuntimeException("รหัสผ่านไม่ถูกต้อง");
        }

        // 3. กำหนด Role เบื้องต้นจากฟิลด์ isSystemAdmin
        String role = user.getIsSystemAdmin() != null && user.getIsSystemAdmin() ? "ADMIN" : "USER";

        // 4. สร้าง JWT Token
        String token = jwtUtil.generateToken(user.getEmail());

        // 5. คืนค่าพร้อมข้อมูลผู้ใช้
        return new AuthResponse(token, user.getFullName(), role);
    }

}