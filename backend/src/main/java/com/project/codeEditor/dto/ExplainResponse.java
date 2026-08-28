package com.project.codeEditor.dto;

public class ExplainResponse {

    private String explanation;
    private boolean available;

    public ExplainResponse() {
    }

    public ExplainResponse(String explanation, boolean available) {
        this.explanation = explanation;
        this.available = available;
    }

    public String getExplanation() {
        return explanation;
    }

    public void setExplanation(String explanation) {
        this.explanation = explanation;
    }

    public boolean isAvailable() {
        return available;
    }

    public void setAvailable(boolean available) {
        this.available = available;
    }
}
