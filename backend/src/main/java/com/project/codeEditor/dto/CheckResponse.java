package com.project.codeEditor.dto;

import java.util.List;

public class CheckResponse {

    private List<DiagnosticDto> diagnostics;

    public CheckResponse() {
    }

    public CheckResponse(List<DiagnosticDto> diagnostics) {
        this.diagnostics = diagnostics;
    }

    public List<DiagnosticDto> getDiagnostics() {
        return diagnostics;
    }

    public void setDiagnostics(List<DiagnosticDto> diagnostics) {
        this.diagnostics = diagnostics;
    }
}
