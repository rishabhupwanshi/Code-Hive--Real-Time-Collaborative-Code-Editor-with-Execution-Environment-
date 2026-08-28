package com.project.codeEditor.service;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.project.codeEditor.dto.AuthResponse;
import com.project.codeEditor.dto.GoogleLoginRequest;
import com.project.codeEditor.dto.LoginRequest;
import com.project.codeEditor.dto.RegisterRequest;
import com.project.codeEditor.entity.User;
import com.project.codeEditor.repository.UserRepository;
import com.project.codeEditor.security.GoogleTokenVerifier;

class AuthServiceTest {

    private AuthService authService;
    private final Map<String, User> usersByEmail = new HashMap<>();

    @BeforeEach
    void setUp() throws Exception {
        usersByEmail.clear();
        User existingUser = new User();
        existingUser.setEmail("user@example.com");
        existingUser.setPassword("encoded-password");
        existingUser.setName("User");
        existingUser.setToken("token-123");
        usersByEmail.put(existingUser.getEmail(), existingUser);

        authService = new AuthService();
        injectField(authService, "userRepository", userRepositoryStub());
        injectField(authService, "passwordEncoder", new TestPasswordEncoder());
        injectField(authService, "googleTokenVerifier", new StubGoogleTokenVerifier());
        injectField(authService, "adminAuditLog", new AdminAuditLog());
    }

    @Test
    void registerShouldCreateUserWhenEmailIsAvailable() {
        RegisterRequest request = new RegisterRequest();
        request.setName("Alice");
        request.setEmail("alice@example.com");
        request.setPassword("secret");

        AuthResponse response = authService.register(request);

        assertEquals("Registration Successful", response.getMessage());
        assertNotNull(response.getToken());
        assertEquals("alice@example.com", response.getEmail());
        assertEquals("Alice", response.getName());
        assertEquals(2, usersByEmail.size());
    }

    @Test
    void registerShouldReturnExistingUserMessageWhenEmailAlreadyExists() {
        RegisterRequest request = new RegisterRequest();
        request.setName("Alice");
        request.setEmail("user@example.com");
        request.setPassword("secret");

        AuthResponse response = authService.register(request);

        assertEquals("User already exists", response.getMessage());
        assertNull(response.getToken());
        assertEquals("user@example.com", response.getEmail());
        assertEquals("Alice", response.getName());
    }

    @Test
    void loginShouldReturnSuccessWhenCredentialsMatch() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("password");

        AuthResponse response = authService.login(request);

        assertEquals("Login Successful", response.getMessage());
        assertEquals("token-123", response.getToken());
        assertEquals("user@example.com", response.getEmail());
        assertEquals("User", response.getName());
    }

    @Test
    void loginShouldReturnInvalidPasswordWhenPasswordDoesNotMatch() {
        LoginRequest request = new LoginRequest();
        request.setEmail("user@example.com");
        request.setPassword("wrong");

        AuthResponse response = authService.login(request);

        assertEquals("Invalid Password", response.getMessage());
        assertNull(response.getToken());
        assertEquals("user@example.com", response.getEmail());
        assertNull(response.getName());
    }

    @Test
    void googleLoginShouldCreateUserWhenGoogleCredentialIsValidAndUserMissing() {
        GoogleLoginRequest request = new GoogleLoginRequest();
        request.setCredential("google-token");

        AuthResponse response = authService.googleLogin(request);

        assertEquals("Login Successful", response.getMessage());
        assertNotNull(response.getToken());
        assertEquals("new-user@example.com", response.getEmail());
        assertEquals("New User", response.getName());
    }

    private UserRepository userRepositoryStub() {
        return (UserRepository) Proxy.newProxyInstance(
                UserRepository.class.getClassLoader(),
                new Class<?>[]{UserRepository.class},
                (proxy, method, args) -> {
                    String methodName = method.getName();
                    if ("findByEmail".equals(methodName)) {
                        return Optional.ofNullable(usersByEmail.get((String) args[0]));
                    }
                    if ("save".equals(methodName)) {
                        User user = (User) args[0];
                        if (user.getEmail() != null) {
                            usersByEmail.put(user.getEmail(), user);
                        }
                        return user;
                    }
                    if ("findByToken".equals(methodName)) {
                        return Optional.empty();
                    }
                    if ("toString".equals(methodName)) {
                        return "StubUserRepository";
                    }
                    return defaultValue(method.getReturnType());
                });
    }

    private void injectField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    private Object defaultValue(Class<?> returnType) {
        if (returnType == boolean.class) {
            return false;
        }
        if (returnType == int.class) {
            return 0;
        }
        if (returnType == long.class) {
            return 0L;
        }
        if (returnType == double.class) {
            return 0.0d;
        }
        if (returnType == float.class) {
            return 0.0f;
        }
        if (returnType == short.class) {
            return (short) 0;
        }
        if (returnType == byte.class) {
            return (byte) 0;
        }
        if (returnType == char.class) {
            return '\0';
        }
        if (returnType == Optional.class) {
            return Optional.empty();
        }
        return null;
    }

    private static class TestPasswordEncoder implements PasswordEncoder {
        @Override
        public String encode(CharSequence rawPassword) {
            return "encoded-" + rawPassword;
        }

        @Override
        public boolean matches(CharSequence rawPassword, String encodedPassword) {
            return encodedPassword.equals("encoded-" + rawPassword);
        }
    }

    private static class StubGoogleTokenVerifier extends GoogleTokenVerifier {
        @Override
        public GoogleIdToken.Payload verify(String credential) {
            GoogleIdToken.Payload payload = new GoogleIdToken.Payload();
            payload.setEmail("new-user@example.com");
            payload.set("name", "New User");
            return payload;
        }
    }
}
