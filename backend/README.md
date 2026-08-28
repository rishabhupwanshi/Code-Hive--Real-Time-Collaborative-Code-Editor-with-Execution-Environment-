# CodeEditor

CodeEditor is a Spring Boot backend application for managing collaborative coding sessions. It provides user authentication, Google sign-in support, and APIs for creating, joining, and listing coding sessions.

## Overview

This project is designed for teams or individuals who want to start a coding session, share a session token, and collaborate around a shared programming context. The backend handles:

- user registration and login
- Google OAuth-based authentication
- session creation and joining
- session lookup and listing
- persistence through PostgreSQL and JPA

## Tech Stack

- Java 21
- Spring Boot 4.1.0
- Spring Web MVC
- Spring Security
- Spring Data JPA
- PostgreSQL
- Maven Wrapper

## Project Structure




- src/main/java/com/project/codeEditor/controller - REST API controllers
- src/main/java/com/project/codeEditor/service - Core business logic
- src/main/java/com/project/codeEditor/repository - Database repositories
- src/main/java/com/project/codeEditor/entity - JPA entities
- src/main/resources - Application configuration and properties
- src/test/java - Unit tests for service-layer logic

## Prerequisites

Before running the project locally, make sure you have:

- JDK 25 installed
- Maven 3.9+ (or use the included Maven Wrapper)
- PostgreSQL running locally

## Configuration

Update the configuration in src/main/resources/application.properties with your local database and Google credentials:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/code_editor
spring.datasource.username=postgres
spring.datasource.password=your_password
server.port=8086
google.client.id=your_google_client_id
```

If needed, adjust the datasource URL, username, password, and port to match your local environment.

## Running the Application

From the project root, run:

```bash
./mvnw spring-boot:run
```

The application will start on:

```text
http://localhost:8086
```

## API Endpoints

### Authentication

- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google

### Sessions

- POST /api/sessions
- POST /api/sessions/join
- GET /api/sessions
- GET /api/sessions/{token}

## Testing

Run the unit tests with:

```bash
./mvnw test
```

You can also run a targeted test class if needed:

```bash
./mvnw -Dtest=CodingSessionServiceTest test
```

## Notes

- The project is currently configured for Java 21 and uses the Maven Wrapper for consistent builds.
- If you plan to use Google login, make sure the Google client ID is configured correctly in the application properties.

## License

This project is currently unlicensed.
