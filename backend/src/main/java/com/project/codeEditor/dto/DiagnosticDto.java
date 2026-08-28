package com.project.codeEditor.dto;

public class DiagnosticDto {

    private int line;
    private int column;
    private String message;
    private String severity; // "error" | "warning"

    public DiagnosticDto() {
    }

    public DiagnosticDto(int line, int column, String message, String severity) {
        this.line = line;
        this.column = column;
        this.message = message;
        this.severity = severity;
    }

    public int getLine() {
        return line;
    }

    public void setLine(int line) {
        this.line = line;
    }

    public int getColumn() {
        return column;
    }

    public void setColumn(int column) {
        this.column = column;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getSeverity() {
        return severity;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }
}
