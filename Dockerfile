# syntax=docker/dockerfile:1
# Build the Vite client first.  The client is copied into Spring Boot's
# static resources, so this image serves the UI and API from port 8086.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /workspace/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# Vite exposes only VITE_* values to browser code. Supply this build argument
# from CI when the Google OAuth client ID differs from the checked-in default.
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}
RUN npm run build

# Build the Spring Boot executable JAR with Java 21 (as declared in pom.xml).
FROM maven:3.9-eclipse-temurin-21 AS backend-build
WORKDIR /workspace/backend

COPY backend/pom.xml ./
RUN mvn -B -ntp dependency:go-offline

COPY backend/ ./
COPY --from=frontend-build /workspace/frontend/dist ./src/main/resources/static/
RUN mvn -B -ntp package -DskipTests

# docker.io provides the Docker CLI required by CodeExecutionService. It does
# not start a Docker daemon in this image; mount a trusted host daemon socket
# only if code execution is intentionally enabled (see DOCKER-INSTRUCTIONS.md).
FROM eclipse-temurin:21-jre-jammy AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend-build /workspace/backend/target/*.jar app.jar

EXPOSE 8086 9092

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
