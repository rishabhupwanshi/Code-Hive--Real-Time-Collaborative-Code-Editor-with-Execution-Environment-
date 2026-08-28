package com.project.codeEditor.dto;

public class AuthResponse {

    private String message;
    private String token;
    private String email;
    private String name;
    private String role;

    public AuthResponse() {
    }

    public AuthResponse(String message, String token, String email, String name) {
        this.message = message;
        this.token = token;
        this.email = email;
        this.name = name;
    }

    public AuthResponse(String message, String token, String email, String name, String role) {
        this.message = message;
        this.token = token;
        this.email = email;
        this.name = name;
        this.role = role;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
}
