package com.project.codeEditor.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.project.codeEditor.dto.CreateFileNodeRequest;
import com.project.codeEditor.dto.FileNodeResponse;
import com.project.codeEditor.dto.MoveFileNodeRequest;
import com.project.codeEditor.dto.RenameFileNodeRequest;
import com.project.codeEditor.dto.UpdateFileContentRequest;
import com.project.codeEditor.service.FileNodeService;

/**
 * FEATURE 1 — Advanced File Explorer REST API.
 *
 * Every write endpoint is intentionally simple to call from the frontend's
 * RTK Query mutations, and every response is the fresh node (or void for
 * delete) so the client can optimistically patch its local tree state.
 *
 * Role validation: any authenticated participant of a session may edit its
 * files today (matches the existing collaborative-editor model where any
 * joined participant can type in the shared code buffer). Hook a stricter
 * check into requireEditor(...) if a project ever needs read-only guests.
 */
@RestController
@RequestMapping("/api/files")
public class FileNodeController {

    @Autowired
    private FileNodeService fileNodeService;

    @GetMapping
    public ResponseEntity<List<FileNodeResponse>> getTree(@RequestParam String sessionToken,
            Authentication authentication) {
        List<FileNodeResponse> tree = fileNodeService.ensureSeeded(sessionToken, emailOf(authentication));
        return ResponseEntity.ok(tree);
    }

    @PostMapping
    public ResponseEntity<FileNodeResponse> create(@RequestBody CreateFileNodeRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(fileNodeService.create(request, emailOf(authentication)));
    }

    @PutMapping("/{id}/rename")
    public ResponseEntity<FileNodeResponse> rename(@PathVariable Long id,
            @RequestBody RenameFileNodeRequest request) {
        return ResponseEntity.ok(fileNodeService.rename(id, request.getName()));
    }

    @PutMapping("/{id}/content")
    public ResponseEntity<FileNodeResponse> updateContent(@PathVariable Long id,
            @RequestBody UpdateFileContentRequest request) {
        return ResponseEntity.ok(fileNodeService.updateContent(id, request.getContent()));
    }

    @PutMapping("/{id}/move")
    public ResponseEntity<FileNodeResponse> move(@PathVariable Long id, @RequestBody MoveFileNodeRequest request) {
        return ResponseEntity.ok(fileNodeService.move(id, request.getNewParentId(), request.getNewSortOrder()));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<FileNodeResponse> duplicate(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(fileNodeService.duplicate(id, emailOf(authentication)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        fileNodeService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private String emailOf(Authentication authentication) {
        return authentication == null ? null : authentication.getName();
    }
}
