package org.cesystem.multirole.service;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
public final class EmailTokens {
    private static final SecureRandom RANDOM = new SecureRandom();
    private EmailTokens() {}
    public static String generate() { byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes); return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes); }
    public static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
}
