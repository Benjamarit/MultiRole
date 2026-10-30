package org.cesystem.multirole.security;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.UserRepository;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
@Slf4j
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String jwt = authHeader.substring(7).trim();
        try {
            String email = jwtUtil.extractEmail(jwt);

            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null
                    && jwtUtil.isTokenValid(jwt, email)) {

                // เช็ก DB ทุกครั้ง: ผู้ใช้ที่ถูกลบหรือถูกระงับ ต้องใช้ token เดิมที่ยังไม่หมดอายุไม่ได้
                Optional<User> user = userRepository.findByEmail(email)
                        .filter(u -> "ACTIVE".equalsIgnoreCase(u.getStatus()))
                        .filter(u -> !org.cesystem.multirole.service.EmailVerificationService.required(u))
                        .filter(u -> jwtUtil.extractVersion(jwt) == (u.getTokenVersion() == null ? 0 : u.getTokenVersion()));

                if (user.isPresent()) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            user.get().getEmail(), null, authoritiesOf(user.get()));
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (JwtException | IllegalArgumentException e) {
            // token ปลอม / หมดอายุ / รูปแบบผิด: ปล่อยผ่านแบบไม่ยืนยันตัวตน แล้ว SecurityConfig จะตอบ 401 เอง
            log.debug("JWT rejected: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }

    private static List<GrantedAuthority> authoritiesOf(User user) {
        List<GrantedAuthority> authorities = new ArrayList<>();
        authorities.add(new SimpleGrantedAuthority("ROLE_USER"));
        if (Boolean.TRUE.equals(user.getIsSystemAdmin())) {
            authorities.add(new SimpleGrantedAuthority("ROLE_SYSTEM_ADMIN"));
        }
        return authorities;
    }
}