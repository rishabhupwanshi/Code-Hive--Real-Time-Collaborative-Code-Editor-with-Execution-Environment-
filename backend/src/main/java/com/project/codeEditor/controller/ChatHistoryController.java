package com.project.codeEditor.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.project.codeEditor.dto.ChatMessageResponse;
import com.project.codeEditor.service.ChatService;

/**
 * Lets the frontend fetch a session's chat history over plain REST (e.g. on
 * initial page load, before or instead of relying on the socket to deliver
 * it). The live socket handler also pushes this same history to a client
 * right after it joins a room.
 */
@RestController
@RequestMapping("/api/sessions/{token}/chat")
public class ChatHistoryController {

    @Autowired
    private ChatService chatService;

    @GetMapping
    public ResponseEntity<List<ChatMessageResponse>> getHistory(@PathVariable String token) {
        return ResponseEntity.ok(chatService.getHistory(token));
    }
}
