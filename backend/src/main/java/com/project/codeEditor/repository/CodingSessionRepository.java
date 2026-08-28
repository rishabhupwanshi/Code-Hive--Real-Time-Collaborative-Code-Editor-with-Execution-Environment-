package com.project.codeEditor.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.project.codeEditor.entity.CodingSession;

public interface CodingSessionRepository extends JpaRepository<CodingSession, Long> {
    Optional<CodingSession> findBySessionLink(String sessionLink);
    boolean existsBySessionLink(String sessionLink);

    // Only sessions this user created or has joined/edited in — never every
    // session in the system.
    @Query("SELECT s FROM CodingSession s WHERE s.createdByEmail = :email " +
           "OR s.participantEmails LIKE CONCAT('%,', :email, ',%')")
    List<CodingSession> findVisibleToUser(@Param("email") String email);

    // RBAC: "My Sessions" — the HOST's own sessions only.
    List<CodingSession> findByCreatedByEmailOrderByCreatedAtDesc(String createdByEmail);

    // RBAC: "Joined Sessions" — sessions a USER has joined that they did NOT
    // create (a HOST viewing their own sessions never counts as "joined").
    @Query("SELECT s FROM CodingSession s WHERE s.participantEmails LIKE CONCAT('%,', :email, ',%') " +
           "AND (s.createdByEmail IS NULL OR s.createdByEmail <> :email)")
    List<CodingSession> findJoinedByUser(@Param("email") String email);
}
