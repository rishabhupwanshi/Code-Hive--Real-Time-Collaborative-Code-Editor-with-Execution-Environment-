package com.project.codeEditor.dto;

import java.util.ArrayList;
import java.util.List;

public class FileNodeResponse {

    private Long id;
    private Long parentId;
    private String name;
    private String type; // FILE | FOLDER
    private String content;
    private Integer sortOrder;
    private String createdByEmail;
    private String createdAt;
    private String updatedAt;
    private List<FileNodeResponse> children = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }

    public List<FileNodeResponse> getChildren() { return children; }
    public void setChildren(List<FileNodeResponse> children) { this.children = children; }
}
