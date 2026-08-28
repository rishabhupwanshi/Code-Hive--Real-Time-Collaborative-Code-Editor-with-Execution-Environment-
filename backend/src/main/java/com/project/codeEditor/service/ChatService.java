package com.project.codeEditor.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.project.codeEditor.dto.ChatMessageResponse;
import com.project.codeEditor.entity.ChatMessage;
import com.project.codeEditor.repository.ChatMessageRepository;

@Service
public class ChatService {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    public ChatMessageResponse saveMessage(String sessionToken, String senderName, String message) {
        ChatMessage entity = new ChatMessage();
        entity.setSessionToken(sessionToken);
        entity.setSenderName(senderName);
        entity.setMessage(message);
        ChatMessage saved = chatMessageRepository.save(entity);
        return toResponse(saved);
    }

    public List<ChatMessageResponse> getHistory(String sessionToken) {
        return chatMessageRepository.findBySessionTokenOrderBySentAtAsc(sessionToken)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private ChatMessageResponse toResponse(ChatMessage entity) {
        ChatMessageResponse response = new ChatMessageResponse();
        response.setSenderName(entity.getSenderName());
        response.setMessage(entity.getMessage());
        response.setSentAt(entity.getSentAt());
        return response;
    }
}
