package com.project.codeEditor.service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Real, server-verified phone OTP flow for registration.
 *
 * The frontend previously "verified" OTPs entirely client-side against a
 * hardcoded "123456" — anyone could pass that step without ever receiving a
 * code. This service moves generation + verification to the backend so the
 * check is actually meaningful.
 *
 * There's no SMS gateway wired up yet (that needs a paid provider like
 * Twilio and real credentials), so codes are logged to the server console
 * instead of texted — the same "dev mode" behavior the frontend already had,
 * just enforced server-side instead of being trivially bypassable. Swap
 * {@link #dispatch} for a real SMS API call once you have provider
 * credentials; nothing else needs to change.
 */
@Service
public class OtpService {

    private static final Logger log = LoggerFactory.getLogger(OtpService.class);
    private static final long EXPIRY_MILLIS = 5 * 60 * 1000; // 5 minutes
    private static final int MAX_ATTEMPTS = 5;

    private record Entry(String code, Instant expiresAt, int attempts) {
    }

    private final Map<String, Entry> otps = new ConcurrentHashMap<>();
    private final SecureRandom random = new SecureRandom();

    public void sendOtp(String phone) {
        String normalized = normalize(phone);
        String code = String.format("%06d", random.nextInt(1_000_000));
        otps.put(normalized, new Entry(code, Instant.now().plusMillis(EXPIRY_MILLIS), 0));
        dispatch(normalized, code);
    }

    /**
     * @return true if the code was correct and not expired. Consumes the
     *         code on success so it can't be replayed.
     */
    public boolean verifyOtp(String phone, String code) {
        String normalized = normalize(phone);
        Entry entry = otps.get(normalized);
        if (entry == null) {
            return false;
        }
        if (Instant.now().isAfter(entry.expiresAt())) {
            otps.remove(normalized);
            return false;
        }
        if (entry.attempts() >= MAX_ATTEMPTS) {
            otps.remove(normalized);
            return false;
        }
        if (entry.code().equals(code == null ? null : code.trim())) {
            otps.remove(normalized);
            return true;
        }
        otps.put(normalized, new Entry(entry.code(), entry.expiresAt(), entry.attempts() + 1));
        return false;
    }

    private void dispatch(String phone, String code) {
        // TODO: replace with a real SMS provider call (Twilio, MSG91, etc.)
        // once credentials are available. Logging keeps local/dev testing
        // working exactly like the old hardcoded frontend flow did.
        log.info("[DEV] OTP for {}: {}", phone, code);
    }

    private String normalize(String phone) {
        return phone == null ? "" : phone.replaceAll("\\D", "");
    }
}
