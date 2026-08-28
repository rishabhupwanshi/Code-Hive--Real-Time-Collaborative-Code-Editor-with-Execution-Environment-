package com.project.codeEditor.dto;

/**
 * Request body for POST /api/execute/explain — "Explain with AI" button in
 * the editor's output/problems panel.
 */
public class ExplainRequest {

    private String code;
    private String language;
    private String errorText;

    public ExplainRequest() {
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getLanguage() {
        return language;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public String getErrorText() {
        return errorText;
    }

    public void setErrorText(String errorText) {
        this.errorText = errorText;
    }
}
