package com.project.codeEditor.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.project.codeEditor.entity.User;
import com.project.codeEditor.repository.UserRepository;

import java.util.UUID;

/**
 * Guarantees exactly one admin account exists on startup, so there's always
 * a way into the Admin Dashboard without anyone being able to self-register
 * as admin. Change the default password via env vars / application.properties
 * before deploying anywhere real — this seeded value is a dev-only default.
 *
 * If an account with this email already exists, it's promoted to ADMIN
 * (password left untouched) instead of being duplicated.
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    private final String adminEmail;
    private final String adminPassword;
    private final String adminName;

    public AdminSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${admin.seed.email:admin@codehive.local}") String adminEmail,
            @Value("${admin.seed.password:Admin@123}") String adminPassword,
            @Value("${admin.seed.name:CodeHive Admin}") String adminName) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
        this.adminName = adminName;
    }

    @Override
    public void run(String... args) {
        User admin = userRepository.findByEmail(adminEmail).orElse(null);

        if (admin == null) {
            admin = new User();
            admin.setEmail(adminEmail);
            admin.setName(adminName);
            admin.setPassword(passwordEncoder.encode(adminPassword));
            admin.setToken(UUID.randomUUID().toString());
            admin.setRole("ADMIN");
            userRepository.save(admin);
            System.out.println("[AdminSeeder] Created default admin account: " + adminEmail);
        } else if (!"ADMIN".equals(admin.getRole())) {
            admin.setRole("ADMIN");
            userRepository.save(admin);
            System.out.println("[AdminSeeder] Promoted existing account to ADMIN: " + adminEmail);
        }
    }
}
