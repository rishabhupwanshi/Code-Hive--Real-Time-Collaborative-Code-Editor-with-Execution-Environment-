package com.project.codeEditor.service;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.Test;

import com.project.codeEditor.dto.CodingSessionResponse;
import com.project.codeEditor.dto.CreateSessionRequest;
import com.project.codeEditor.dto.JoinSessionRequest;
import com.project.codeEditor.entity.CodingSession;
import com.project.codeEditor.repository.CodingSessionRepository;

class CodingSessionServiceTest {

    @Test
    void createSessionShouldPersistAndMapTheNewSession() throws Exception {
        CodingSessionService codingSessionService = new CodingSessionService();
        injectField(codingSessionService, "sessionRepository", sessionRepositoryStub());

        CreateSessionRequest request = new CreateSessionRequest();
        request.setHostName("Host");
        request.setProgrammingLanguage("Java");
        request.setPublicRoom(false);

        CodingSessionResponse response = codingSessionService.createSession(request, "host@example.com");

        assertNotNull(response);
        assertEquals("Host", response.getHostName());
        assertEquals("Java", response.getProgrammingLanguage());
        assertNotNull(response.getSessionToken());
        assertEquals(Boolean.FALSE, response.getPublicRoom());
        assertEquals("ACTIVE", response.getStatus());
    }

    @Test
    void joinSessionShouldReturnSessionWhenTokenExists() throws Exception {
        CodingSessionService codingSessionService = new CodingSessionService();
        CodingSession session = new CodingSession();
        session.setId(5L);
        session.setSessionName("Guest");
        session.setProgrammingLanguage("Python");
        session.setSessionLink("TOK12345");
        session.setPublicRoom(true);
        session.setStatus("ACTIVE");

        StubCodingSessionRepository repository = new StubCodingSessionRepository();
        repository.sessions.add(session);
        injectField(codingSessionService, "sessionRepository", repository.proxy());

        JoinSessionRequest request = new JoinSessionRequest();
        request.setSessionToken("TOK12345");

        CodingSessionResponse response = codingSessionService.joinSession(request, "guest@example.com");

        assertEquals("TOK12345", response.getSessionToken());
        assertEquals("Guest", response.getHostName());
        assertTrue(response.getPublicRoom());
    }

    @Test
    void getSessionByTokenShouldThrowWhenSessionDoesNotExist() throws Exception {
        CodingSessionService codingSessionService = new CodingSessionService();
        StubCodingSessionRepository repository = new StubCodingSessionRepository();
        injectField(codingSessionService, "sessionRepository", repository.proxy());

        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class,
                () -> codingSessionService.getSessionByToken("missing"));

        assertEquals("Session not found for token: missing", exception.getMessage());
    }

    @Test
    void getVisibleSessionsShouldReturnOnlySessionsForThatUser() throws Exception {
        CodingSessionService codingSessionService = new CodingSessionService();
        StubCodingSessionRepository repository = new StubCodingSessionRepository();
        repository.sessions.add(session("ONE1234", "One", "Java", true, "alice@example.com"));
        repository.sessions.add(session("TWO5678", "Two", "Kotlin", false, "bob@example.com"));
        injectField(codingSessionService, "sessionRepository", repository.proxy());

        List<CodingSessionResponse> responses = codingSessionService.getVisibleSessions("alice@example.com");

        assertEquals(1, responses.size());
        assertEquals("ONE1234", responses.get(0).getSessionToken());
    }

    @Test
    void getVisibleSessionsShouldReturnEmptyListForAnonymousCaller() throws Exception {
        CodingSessionService codingSessionService = new CodingSessionService();
        StubCodingSessionRepository repository = new StubCodingSessionRepository();
        repository.sessions.add(session("ONE1234", "One", "Java", true, "alice@example.com"));
        injectField(codingSessionService, "sessionRepository", repository.proxy());

        List<CodingSessionResponse> responses = codingSessionService.getVisibleSessions(null);

        assertTrue(responses.isEmpty());
    }

    private CodingSessionRepository sessionRepositoryStub() {
        return new StubCodingSessionRepository().proxy();
    }

    private void injectField(Object target, String fieldName, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(fieldName);
        field.setAccessible(true);
        field.set(target, value);
    }

    private static CodingSession session(String token, String name, String language, boolean publicRoom,
            String createdByEmail) {
        CodingSession session = new CodingSession();
        session.setSessionLink(token);
        session.setSessionName(name);
        session.setProgrammingLanguage(language);
        session.setPublicRoom(publicRoom);
        session.setStatus("ACTIVE");
        session.setCreatedByEmail(createdByEmail);
        session.setParticipantEmails("," + createdByEmail + ",");
        return session;
    }

    private static class StubCodingSessionRepository {
        private final List<CodingSession> sessions = new ArrayList<>();

        private CodingSessionRepository proxy() {
            return (CodingSessionRepository) Proxy.newProxyInstance(
                    CodingSessionRepository.class.getClassLoader(),
                    new Class<?>[]{CodingSessionRepository.class},
                    (proxy, method, args) -> {
                        String methodName = method.getName();
                        if ("findBySessionLink".equals(methodName)) {
                            String token = (String) args[0];
                            return sessions.stream()
                                    .filter(session -> token.equals(session.getSessionLink()))
                                    .findFirst();
                        }
                        if ("existsBySessionLink".equals(methodName)) {
                            String token = (String) args[0];
                            return sessions.stream().anyMatch(session -> token.equals(session.getSessionLink()));
                        }
                        if ("findAll".equals(methodName)) {
                            return sessions;
                        }
                        if ("findVisibleToUser".equals(methodName)) {
                            String email = (String) args[0];
                            return sessions.stream()
                                    .filter(session -> email.equals(session.getCreatedByEmail())
                                            || (session.getParticipantEmails() != null
                                                    && session.getParticipantEmails().contains("," + email + ",")))
                                    .toList();
                        }
                        if ("save".equals(methodName)) {
                            CodingSession session = (CodingSession) args[0];
                            if (session.getSessionLink() == null) {
                                session.setSessionLink("AUTO" + sessions.size());
                            }
                            if (!sessions.contains(session)) {
                                sessions.add(session);
                            }
                            return session;
                        }
                        if ("toString".equals(methodName)) {
                            return "StubCodingSessionRepository";
                        }
                        return null;
                    });
        }
    }
}
