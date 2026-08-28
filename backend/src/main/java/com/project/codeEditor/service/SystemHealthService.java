package com.project.codeEditor.service;

import javax.sql.DataSource;
import java.sql.Connection;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.corundumstudio.socketio.SocketIOServer;

@Service
public class SystemHealthService {

    private final Instant startedAt = Instant.now();

    @Autowired(required = false)
    private DataSource dataSource;

    @Autowired(required = false)
    private SocketIOServer socketIOServer;

    public record Health(
            long uptimeSeconds,
            boolean databaseConnected,
            int socketClientsConnected,
            boolean socketServerRunning,
            long jvmUsedMemoryMB,
            long jvmMaxMemoryMB,
            int availableProcessors) {
    }

    public Health snapshot() {
        boolean dbOk = checkDatabase();
        int clients = 0;
        boolean socketRunning = false;
        if (socketIOServer != null) {
            try {
                clients = socketIOServer.getAllClients().size();
                socketRunning = true;
            } catch (Exception ignored) {
                socketRunning = false;
            }
        }

        Runtime rt = Runtime.getRuntime();
        long usedMB = (rt.totalMemory() - rt.freeMemory()) / (1024 * 1024);
        long maxMB = rt.maxMemory() / (1024 * 1024);

        return new Health(
                java.time.Duration.between(startedAt, Instant.now()).getSeconds(),
                dbOk,
                clients,
                socketRunning,
                usedMB,
                maxMB,
                rt.availableProcessors());
    }

    private boolean checkDatabase() {
        if (dataSource == null) return false;
        try (Connection c = dataSource.getConnection()) {
            return c.isValid(2);
        } catch (Exception ex) {
            return false;
        }
    }
}
