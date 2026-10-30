package org.cesystem.multirole.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Component
public class JwtUtil {

    private static final int MIN_SECRET_BYTES = 32; // HS256 ต้องการอย่างน้อย 256 บิต

    private final Key key;
    private final long expirationMillis;

    /**
     * secret อ่านจาก application.properties (app.jwt.secret) แทนการสุ่มใหม่ทุกครั้งที่รัน
     * เดิมสุ่มใน static field ทำให้ทุกครั้งที่ restart ผู้ใช้ทุกคนถูกเตะออก และรันหลายเครื่องไม่ได้
     * ไม่ตั้งค่าหรือสั้นเกินไป = แอปไม่ยอม start (ตั้งใจ เพื่อไม่ให้หลุดไป production ด้วยค่าอ่อน)
     */
    public JwtUtil(@Value("${app.jwt.secret}") String secret,
                   @Value("${app.jwt.expiration-minutes:1440}") long expirationMinutes) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "app.jwt.secret ต้องยาวอย่างน้อย " + MIN_SECRET_BYTES + " ตัวอักษร");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMillis = expirationMinutes * 60_000L;
    }

    public String generateToken(String email) {
        return generateToken(email, 0);
    }
    public int extractVersion(String token) {
        Number version = extractAllClaims(token).get("ver", Number.class);
        return version == null ? 0 : version.intValue();
    }
    public String generateToken(String email, int version) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .setSubject(email)
                .claim("ver", version)
                .setIssuedAt(new Date(now))
                .setExpiration(new Date(now + expirationMillis))
                .signWith(key)
                .compact();
    }

    public String extractEmail(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        // parse จะโยน exception เองถ้าลายเซ็นผิด หรือ token หมดอายุแล้ว
        return Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody();
    }

    public boolean isTokenValid(String token, String email) {
        Claims claims = extractAllClaims(token);
        return email != null
                && email.equals(claims.getSubject())
                && claims.getExpiration().after(new Date());
    }
}