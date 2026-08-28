package com.project.codeEditor.dto;

public class CreateFileNodeRequest {

    private String sessionToken;
    private Long parentId; // null = root
    private String name;
    private String type; // FILE | FOLDER
    private String content; // optional initial content (FILE only)

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
}
