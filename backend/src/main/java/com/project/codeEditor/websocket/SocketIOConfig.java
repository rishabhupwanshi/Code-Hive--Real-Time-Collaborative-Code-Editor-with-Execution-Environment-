package com.project.codeEditor.websocket;

import com.corundumstudio.socketio.SocketIOServer;
import com.corundumstudio.socketio.Configuration;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Component;

/**
 * Stands up a Socket.IO server (netty-socketio) on its own port, separate
 * from the Spring MVC REST API. socket.io-client on the frontend connects
 * here directly for live collaboration: chat, live typing, cursor sync,
 * and online-participant presence, all scoped per coding session (room).
 */
@Component
public class SocketIOConfig {

    @Value("${socketio.host:0.0.0.0}")
    private String host;

    @Value("${socketio.port:9092}")
    private int port;

    private SocketIOServer server;

    @Bean
    @Lazy(false)
    public SocketIOServer socketIOServer() {
        Configuration config = new Configuration();
        config.setHostname(host);
        config.setPort(port);
        // Allow the Vite dev server (and common local origins) to connect.
        config.setOrigin(null);
        config.setPingTimeout(60000);
        config.setPingInterval(25000);

        server = new SocketIOServer(config);
        server.start();
        return server;
    }

    @PreDestroy
    public void stopSocketIOServer() {
        if (server != null) {
            server.stop();
        }
    }
}
