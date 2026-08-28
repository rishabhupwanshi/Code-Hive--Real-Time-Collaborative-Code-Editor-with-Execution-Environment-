package com.project.codeEditor.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.project.codeEditor.entity.ChatMessage;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Chat history for a room, oldest first, so the frontend can just append
    // it in order above whatever comes in live afterward.
    List<ChatMessage> findBySessionTokenOrderBySentAtAsc(String sessionToken);
}
