package com.project.codeEditor.dto;

import com.google.api.client.auth.openidconnect.IdToken;

public class GoogleLoginRequest {

    private String credential;

    public GoogleLoginRequest() {
    }

    public GoogleLoginRequest(String credential) {
        this.credential = credential;
    }

    public String getCredential() {
        return credential;
    }

    public void setCredential(String credential) {
        this.credential = credential;
    }

    public IdToken getIdToken() {
        throw new UnsupportedOperationException("Not supported yet.");
    }
}