package com.project.codeEditor.dto;

public class RegisterRequest {

    private String name;
    private String email;
    private String password;
    // Requested role at signup: "HOST" or "USER". Anything else (including
    // "ADMIN") is ignored server-side — see AuthService.register().
    private String role;

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }
}
