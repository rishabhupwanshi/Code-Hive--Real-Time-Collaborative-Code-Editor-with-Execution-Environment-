package com.project.codeEditor.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.codeEditor.dto.ExplainRequest;
import com.project.codeEditor.dto.ExplainResponse;

/**
 * "Explain error with AI" — sends the failing code + compiler/runtime error
 * to Groq's free chat-completions API (OpenAI-compatible) and returns a
 * short, plain-English explanation + fix suggestion.
 *
 * Groq is used because it has a genuinely free tier (no credit card) and is
 * very fast. Get a key at https://console.groq.com/keys and set it as the
 * GROQ_API_KEY environment variable (or groq.api.key in
 * application.properties) before starting the backend. If no key is
 * configured, the endpoint responds with available=false instead of
 * failing the request, so the rest of the editor keeps working.
 */
@Service
public class AiExplainService {

    private static final String GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
    private static final String MODEL = "llama-3.1-8b-instant";

    @Value("${groq.api.key:${GROQ_API_KEY:}}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper mapper = new ObjectMapper();

    public ExplainResponse explain(ExplainRequest request) {
        if (apiKey == null || apiKey.isBlank()) {
            return new ExplainResponse(
                    "AI explanations aren't configured yet. Ask the server owner to set a free "
                            + "Groq API key (https://console.groq.com/keys) as the GROQ_API_KEY "
                            + "environment variable and restart the backend.",
                    false);
        }
        if (request == null || request.getErrorText() == null || request.getErrorText().isBlank()) {
            return new ExplainResponse("Nothing to explain — no error was provided.", true);
        }

        try {
            String system = "You are a concise coding tutor embedded in an online code editor called CodeHive. "
                    + "Given a snippet of code and the compiler/runtime error it produced, explain in plain "
                    + "English (1) what the error means and (2) the most likely fix, as a short numbered list. "
                    + "Keep it under 120 words. Do not repeat the full code or error back verbatim.";

            String language = request.getLanguage() == null ? "code" : request.getLanguage();
            String code = truncate(request.getCode(), 4000);
            String error = truncate(request.getErrorText(), 2000);

            String userMessage = "Language: " + language
                    + "\n\nCode:\n```\n" + code + "\n```\n\nError/output:\n```\n" + error + "\n```";

            Map<String, Object> payload = Map.of(
                    "model", MODEL,
                    "temperature", 0.2,
                    "max_tokens", 400,
                    "messages", List.of(
                            Map.of("role", "system", "content", system),
                            Map.of("role", "user", "content", userMessage)));

            String body = mapper.writeValueAsString(payload);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(GROQ_URL))
                    .timeout(Duration.ofSeconds(20))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

            if (httpResponse.statusCode() >= 200 && httpResponse.statusCode() < 300) {
                JsonNode root = mapper.readTree(httpResponse.body());
                JsonNode content = root.path("choices").path(0).path("message").path("content");
                String explanation = content.isMissingNode() ? "" : content.asText().trim();
                if (explanation.isBlank()) {
                    return new ExplainResponse("The AI didn't return an explanation. Please try again.", true);
                }
                return new ExplainResponse(explanation, true);
            }

            return new ExplainResponse(
                    "AI explanation request failed (HTTP " + httpResponse.statusCode()
                            + "). Check that GROQ_API_KEY is valid.",
                    false);
        } catch (Exception e) {
            return new ExplainResponse(
                    "Couldn't reach the AI explanation service right now: " + e.getMessage(), false);
        }
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) + "\n... (truncated)" : s;
    }
}
