package com.project.codeEditor.entity;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;

/**
 * FEATURE 1 — Advanced File Explorer.
 *
 * A single node (file or folder) inside a coding session's project tree.
 * The whole tree for a session is just every FileNode row whose
 * sessionToken matches, connected via parentId (null parentId = root item).
 */
@Entity
@Table(name = "file_nodes", indexes = {
        @Index(name = "idx_file_nodes_session", columnList = "session_token"),
        @Index(name = "idx_file_nodes_parent", columnList = "parent_id")
})
public class FileNode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "session_token", nullable = false)
    private String sessionToken;

    // Null for a root-level item.
    @Column(name = "parent_id")
    private Long parentId;

    @Column(nullable = false)
    private String name;

    // "FILE" or "FOLDER"
    @Column(nullable = false)
    private String type;

    // File content (unused for folders). Kept as TEXT so large source files
    // don't get truncated.
    @Column(columnDefinition = "TEXT")
    private String content = "";

    // Manual ordering within a parent, so drag & drop re-ordering sticks.
    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_by_email")
    private String createdByEmail;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public FileNode() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionToken() { return sessionToken; }
    public void setSessionToken(String sessionToken) { this.sessionToken = sessionToken; }

    public Long getParentId() { return parentId; }
    public void setParentId(Long parentId) { this.parentId = parentId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }

    public String getCreatedByEmail() { return createdByEmail; }
    public void setCreatedByEmail(String createdByEmail) { this.createdByEmail = createdByEmail; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
