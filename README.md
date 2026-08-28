A full-stack real-time collaborative code editor that allows multiple users to work together in shared coding sessions, communicate in real time, execute code, manage files, and use AI-assisted coding features.

## 🚀 Features

- 👥 Real-time collaborative coding
- 🔄 Live code synchronization between users
- 💻 Online code editor with syntax highlighting
- 🗂️ File and folder management
- 🔐 User authentication and protected routes
- 🔑 OTP-based authentication
- 🌐 Google authentication
- 💬 Real-time collaboration and chat
- 👤 User presence and participant management
- 🧑‍💼 Admin dashboard and management features
- ▶️ Code execution through a Docker-based sandbox
- 🤖 AI-assisted code explanation
- 📸 Code snapshots and saved code
- 📊 Execution statistics
- 🛡️ Abuse detection and system health monitoring

## 🛠️ Tech Stack

### Frontend

- React
- Vite
- JavaScript
- Redux
- React Router
- Socket.IO
- Monaco Editor
- CSS

### Backend

- Java
- Spring Boot
- Spring Security
- Spring Data JPA
- REST APIs
- WebSocket / Socket.IO
- PostgreSQL

### DevOps & Tools

- Docker
- Docker Compose
- Maven
- Git
- GitHub

### AI

- Groq API
- AI-assisted code explanation

## 🏗️ Project Architecture

```text
                    ┌─────────────────────┐
                    │      Frontend       │
                    │     React + Vite    │
                    └──────────┬──────────┘
                               │
                    REST APIs / WebSocket
                               │
                               ▼
                    ┌─────────────────────┐
                    │       Backend       │
                    │     Spring Boot     │
                    └──────┬───────┬──────┘
                           │       │
                 ┌─────────┘       └─────────┐
                 ▼                           ▼
        ┌─────────────────┐         ┌─────────────────┐
        │   PostgreSQL    │         │    Socket.IO    │
        │    Database     │         │  Real-time Sync │
        └─────────────────┘         └─────────────────┘
                           │
                           ▼
                 ┌─────────────────┐
                 │ Docker Sandbox  │
                 │ Code Execution  │
                 └─────────────────┘
📁 Project Structure
real-time-collaborative-code-editor/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   └── resources/
│   │   └── test/
│   ├── pom.xml
│   └── README.md
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── Dockerfile
├── compose.yaml
├── .env.example
├── .gitignore
└── README.md
⚙️ Environment Variables

The application uses environment variables for sensitive configuration.

Use .env.example as a reference for your local configuration.

The project uses variables such as:

DB_PASSWORD=
ADMIN_EMAIL=
ADMIN_PASSWORD=
GOOGLE_CLIENT_ID=
GROQ_API_KEY=

Never commit real passwords, API keys, database credentials, or other sensitive information to GitHub.

💻 Frontend Setup
1. Navigate to the frontend
cd frontend
2. Install dependencies
npm install
3. Start the development server
npm run dev

The frontend will start using the Vite development server.

☕ Backend Setup
1. Navigate to the backend
cd backend
2. Run the Spring Boot application

On Windows:

mvnw.cmd spring-boot:run

On Linux/macOS:

./mvnw spring-boot:run

The backend requires PostgreSQL to be configured and running.

🗄️ Database

The backend uses:

PostgreSQL
Spring Data JPA
Hibernate

Configure your database connection using the appropriate environment variables before starting the backend.

🐳 Docker

The project includes Docker configuration for containerized development and code execution.

To build and start the services:

docker compose up --build

To stop the services:

docker compose down
▶️ Code Execution

The application provides a Docker-based code execution environment.

Code submitted through the editor can be executed inside an isolated Docker environment with a configured execution timeout.

This helps prevent the application server from directly executing user-submitted code.

🤖 AI-Assisted Coding

The editor includes an AI-assisted code explanation feature powered by the Groq API.

To enable this feature, configure:

GROQ_API_KEY

If the API key is not configured, the rest of the editor can continue functioning while the AI explanation feature remains unavailable.

🔐 Authentication

The application includes multiple authentication capabilities:

User registration
Login
OTP verification
Google authentication
Protected application routes
Role-based access
Admin functionality
👥 Real-Time Collaboration

Users can collaborate inside shared coding sessions.

The real-time collaboration system supports functionality such as:

Live code synchronization
User presence
Participant management
Shared coding sessions
Real-time communication
Collaboration through Socket.IO
🧑‍💼 Admin Features

The application includes an administrative interface with functionality for managing and monitoring the platform.

Admin-related functionality includes:

User management
Session monitoring
System health information
Execution statistics
Audit-related functionality
Abuse detection
🧪 Testing

The backend contains automated tests for important application functionality.

On Windows:

mvnw.cmd test

On Linux/macOS:

./mvnw test
🔄 Development Workflow
Frontend
   │
   ▼
React Application
   │
   ├──────── REST API ────────► Spring Boot
   │
   └──── WebSocket / Socket.IO ► Real-Time Collaboration
                                    │
                                    ▼
                               PostgreSQL
                                    │
                                    ▼
                              Docker Sandbox
📌 Future Improvements
Advanced conflict resolution for simultaneous edits
More programming language support
Improved code execution isolation
Enhanced AI coding assistance
Production deployment
Improved monitoring and observability
More advanced collaboration features
Improved scalability for large numbers of concurrent users
👨‍💻 Author
Jayant Hundet

Software Developer focused on Java, Spring Boot, React, full-stack development, and real-time applications.

⭐ Project

If you find this project interesting, consider giving the repository a star.

Built with React, Spring Boot, PostgreSQL, Docker, and real-time communication technologies.