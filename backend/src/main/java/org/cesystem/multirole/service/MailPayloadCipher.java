package org.cesystem.multirole.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.Base64;

/** Token links waiting for delivery are encrypted; raw tokens are never logged. */
@Component
public class MailPayloadCipher {
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();
    public MailPayloadCipher(@Value("${app.mail.encryption-key:${app.jwt.secret}}") String secret) throws GeneralSecurityException {
        key = new SecretKeySpec(MessageDigest.getInstance("SHA-256").digest(("multirole-mail-v1:" + secret).getBytes(StandardCharsets.UTF_8)), "AES");
    }
    public String encrypt(String value) {
        try {
            byte[] nonce = new byte[12]; random.nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(ByteBuffer.allocate(nonce.length + encrypted.length).put(nonce).put(encrypted).array());
        } catch (GeneralSecurityException e) { throw new IllegalStateException("Cannot encrypt email payload", e); }
    }
    public String decrypt(String value) {
        try {
            ByteBuffer bytes = ByteBuffer.wrap(Base64.getDecoder().decode(value));
            byte[] nonce = new byte[12]; bytes.get(nonce);
            byte[] encrypted = new byte[bytes.remaining()]; bytes.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (RuntimeException | GeneralSecurityException e) { throw new IllegalStateException("Cannot decrypt email payload", e); }
    }
}
