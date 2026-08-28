package com.project.codeEditor.dto;

public class RoleUpdateRequest {

    private String role; // "USER" | "ADMIN"

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
