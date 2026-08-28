package com.project.codeEditor.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.project.codeEditor.dto.CreateFileNodeRequest;
import com.project.codeEditor.dto.FileNodeResponse;
import com.project.codeEditor.entity.FileNode;
import com.project.codeEditor.repository.FileNodeRepository;

/**
 * FEATURE 1 — Advanced File Explorer.
 *
 * All validation, tree assembly, and cascading operations (delete/duplicate)
 * for a session's project tree live here. Controller stays thin.
 */
@Service
public class FileNodeService {

    @Autowired
    private FileNodeRepository fileNodeRepository;

    private static final long MAX_NODES_PER_SESSION = 2000;

    // ── Tree read ──────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<FileNodeResponse> getTree(String sessionToken) {
        List<FileNode> all = fileNodeRepository.findBySessionTokenOrderBySortOrderAsc(sessionToken);
        Map<Long, List<FileNode>> byParent = new HashMap<>();
        for (FileNode node : all) {
            byParent.computeIfAbsent(node.getParentId(), k -> new ArrayList<>()).add(node);
        }
        return buildLevel(null, byParent);
    }

    private List<FileNodeResponse> buildLevel(Long parentId, Map<Long, List<FileNode>> byParent) {
        List<FileNode> siblings = byParent.getOrDefault(parentId, new ArrayList<>());
        siblings.sort(Comparator.comparing(FileNode::getSortOrder));
        List<FileNodeResponse> result = new ArrayList<>();
        for (FileNode node : siblings) {
            FileNodeResponse dto = toDto(node);
            dto.setChildren(buildLevel(node.getId(), byParent));
            result.add(dto);
        }
        return result;
    }

    private FileNodeResponse toDto(FileNode node) {
        FileNodeResponse dto = new FileNodeResponse();
        dto.setId(node.getId());
        dto.setParentId(node.getParentId());
        dto.setName(node.getName());
        dto.setType(node.getType());
        dto.setContent(node.getContent());
        dto.setSortOrder(node.getSortOrder());
        dto.setCreatedByEmail(node.getCreatedByEmail());
        dto.setCreatedAt(node.getCreatedAt().toString());
        dto.setUpdatedAt(node.getUpdatedAt().toString());
        return dto;
    }

    // ── Create ─────────────────────────────────────────────────────────────

    @Transactional
    public FileNodeResponse create(CreateFileNodeRequest request, String actorEmail) {
        if (request.getSessionToken() == null || request.getSessionToken().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "sessionToken is required.");
        }
        String name = normalizeName(request.getName());
        String type = normalizeType(request.getType());

        FileNode parent = resolveParent(request.getSessionToken(), request.getParentId());

        long siblingCount = request.getParentId() == null
                ? fileNodeRepository.countBySessionTokenAndParentIdIsNull(request.getSessionToken())
                : fileNodeRepository.countBySessionTokenAndParentId(request.getSessionToken(), request.getParentId());
        if (siblingCount >= MAX_NODES_PER_SESSION) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Folder is full.");
        }

        assertNameAvailable(request.getSessionToken(), request.getParentId(), name, null);

        FileNode node = new FileNode();
        node.setSessionToken(request.getSessionToken());
        node.setParentId(parent == null ? null : parent.getId());
        node.setName(name);
        node.setType(type);
        node.setContent(type.equals("FILE") ? Objects.requireNonNullElse(request.getContent(), "") : "");
        node.setSortOrder((int) siblingCount);
        node.setCreatedByEmail(actorEmail);
        node.setCreatedAt(Instant.now());
        node.setUpdatedAt(Instant.now());

        return toDto(fileNodeRepository.save(node));
    }

    // ── Rename ─────────────────────────────────────────────────────────────

    @Transactional
    public FileNodeResponse rename(Long id, String newName) {
        FileNode node = requireNode(id);
        String cleanName = normalizeName(newName);
        assertNameAvailable(node.getSessionToken(), node.getParentId(), cleanName, node.getId());
        node.setName(cleanName);
        node.setUpdatedAt(Instant.now());
        return toDto(fileNodeRepository.save(node));
    }

    // ── Update content ─────────────────────────────────────────────────────

    @Transactional
    public FileNodeResponse updateContent(Long id, String content) {
        FileNode node = requireNode(id);
        if (!"FILE".equals(node.getType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only files have content.");
        }
        node.setContent(content == null ? "" : content);
        node.setUpdatedAt(Instant.now());
        return toDto(fileNodeRepository.save(node));
    }

    // ── Delete (cascades to descendants) ───────────────────────────────────

    @Transactional
    public void delete(Long id) {
        FileNode node = requireNode(id);
        deleteRecursively(node);
    }

    private void deleteRecursively(FileNode node) {
        List<FileNode> children = fileNodeRepository
                .findBySessionTokenAndParentIdOrderBySortOrderAsc(node.getSessionToken(), node.getId());
        for (FileNode child : children) {
            deleteRecursively(child);
        }
        fileNodeRepository.delete(node);
    }

    // ── Duplicate (deep copy for folders) ──────────────────────────────────

    @Transactional
    public FileNodeResponse duplicate(Long id, String actorEmail) {
        FileNode original = requireNode(id);
        String copyName = nextCopyName(original.getSessionToken(), original.getParentId(), original.getName());
        long siblingCount = original.getParentId() == null
                ? fileNodeRepository.countBySessionTokenAndParentIdIsNull(original.getSessionToken())
                : fileNodeRepository.countBySessionTokenAndParentId(original.getSessionToken(), original.getParentId());
        FileNode copy = deepCopy(original, original.getParentId(), copyName, (int) siblingCount, actorEmail);
        return toDto(copy);
    }

    private FileNode deepCopy(FileNode source, Long newParentId, String name, int sortOrder, String actorEmail) {
        FileNode copy = new FileNode();
        copy.setSessionToken(source.getSessionToken());
        copy.setParentId(newParentId);
        copy.setName(name);
        copy.setType(source.getType());
        copy.setContent(source.getContent());
        copy.setSortOrder(sortOrder);
        copy.setCreatedByEmail(actorEmail);
        copy.setCreatedAt(Instant.now());
        copy.setUpdatedAt(Instant.now());
        FileNode saved = fileNodeRepository.save(copy);

        List<FileNode> children = fileNodeRepository
                .findBySessionTokenAndParentIdOrderBySortOrderAsc(source.getSessionToken(), source.getId());
        int i = 0;
        for (FileNode child : children) {
            deepCopy(child, saved.getId(), child.getName(), i++, actorEmail);
        }
        return saved;
    }

    // ── Move (drag & drop) ──────────────────────────────────────────────────

    @Transactional
    public FileNodeResponse move(Long id, Long newParentId, Integer newSortOrder) {
        FileNode node = requireNode(id);

        if (newParentId != null) {
            if (newParentId.equals(node.getId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot move a folder into itself.");
            }
            FileNode targetParent = requireNode(newParentId);
            if (!"FOLDER".equals(targetParent.getType())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Target is not a folder.");
            }
            if (!targetParent.getSessionToken().equals(node.getSessionToken())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot move across sessions.");
            }
            if (isDescendant(node, targetParent)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot move a folder into its own descendant.");
            }
        }

        assertNameAvailable(node.getSessionToken(), newParentId, node.getName(), node.getId());

        long siblingCount = newParentId == null
                ? fileNodeRepository.countBySessionTokenAndParentIdIsNull(node.getSessionToken())
                : fileNodeRepository.countBySessionTokenAndParentId(node.getSessionToken(), newParentId);

        node.setParentId(newParentId);
        node.setSortOrder(newSortOrder != null ? newSortOrder : (int) siblingCount);
        node.setUpdatedAt(Instant.now());
        return toDto(fileNodeRepository.save(node));
    }

    private boolean isDescendant(FileNode possibleAncestor, FileNode candidate) {
        FileNode cursor = candidate;
        while (cursor.getParentId() != null) {
            if (cursor.getParentId().equals(possibleAncestor.getId())) {
                return true;
            }
            cursor = requireNode(cursor.getParentId());
        }
        return false;
    }

    // ── Seed a default Spring Boot-style project (first load / demo) ───────

    @Transactional
    public List<FileNodeResponse> ensureSeeded(String sessionToken, String actorEmail) {
        if (!fileNodeRepository.findBySessionTokenOrderBySortOrderAsc(sessionToken).isEmpty()) {
            return getTree(sessionToken);
        }
        Long src = createFolder(sessionToken, null, "src", 0, actorEmail);
        createFolder(sessionToken, src, "controllers", 0, actorEmail);
        createFolder(sessionToken, src, "services", 1, actorEmail);
        createFolder(sessionToken, src, "models", 2, actorEmail);
        createFolder(sessionToken, src, "utils", 3, actorEmail);
        createFolder(sessionToken, src, "resources", 4, actorEmail);
        createFile(sessionToken, null, "pom.xml", 1, "", actorEmail);
        createFile(sessionToken, null, "README.md", 2, "# Project\n", actorEmail);
        createFile(sessionToken, null, "application.properties", 3, "", actorEmail);
        return getTree(sessionToken);
    }

    private Long createFolder(String token, Long parentId, String name, int order, String actorEmail) {
        FileNode node = new FileNode();
        node.setSessionToken(token);
        node.setParentId(parentId);
        node.setName(name);
        node.setType("FOLDER");
        node.setSortOrder(order);
        node.setCreatedByEmail(actorEmail);
        return fileNodeRepository.save(node).getId();
    }

    private void createFile(String token, Long parentId, String name, int order, String content, String actorEmail) {
        FileNode node = new FileNode();
        node.setSessionToken(token);
        node.setParentId(parentId);
        node.setName(name);
        node.setType("FILE");
        node.setContent(content);
        node.setSortOrder(order);
        node.setCreatedByEmail(actorEmail);
        fileNodeRepository.save(node);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private FileNode requireNode(Long id) {
        return fileNodeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "File or folder not found."));
    }

    private FileNode resolveParent(String sessionToken, Long parentId) {
        if (parentId == null) {
            return null;
        }
        FileNode parent = requireNode(parentId);
        if (!"FOLDER".equals(parent.getType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent must be a folder.");
        }
        if (!parent.getSessionToken().equals(sessionToken)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent belongs to a different session.");
        }
        return parent;
    }

    private String normalizeName(String rawName) {
        if (rawName == null || rawName.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is required.");
        }
        String name = rawName.trim();
        if (name.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name is too long.");
        }
        if (name.contains("/") || name.contains("\\")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name cannot contain slashes.");
        }
        return name;
    }

    private String normalizeType(String rawType) {
        if (rawType == null || (!rawType.equalsIgnoreCase("FILE") && !rawType.equalsIgnoreCase("FOLDER"))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "type must be FILE or FOLDER.");
        }
        return rawType.toUpperCase();
    }

    private void assertNameAvailable(String sessionToken, Long parentId, String name, Long excludeId) {
        List<FileNode> siblings = parentId == null
                ? fileNodeRepository.findBySessionTokenAndParentIdIsNullOrderBySortOrderAsc(sessionToken)
                : fileNodeRepository.findBySessionTokenAndParentIdOrderBySortOrderAsc(sessionToken, parentId);
        boolean clash = siblings.stream()
                .anyMatch(n -> !n.getId().equals(excludeId) && n.getName().equalsIgnoreCase(name));
        if (clash) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "\"" + name + "\" already exists in this folder.");
        }
    }

    private String nextCopyName(String sessionToken, Long parentId, String originalName) {
        String base = originalName;
        String ext = "";
        int dot = originalName.lastIndexOf('.');
        if (dot > 0) {
            base = originalName.substring(0, dot);
            ext = originalName.substring(dot);
        }
        String candidate = base + " copy" + ext;
        int n = 2;
        while (nameTaken(sessionToken, parentId, candidate)) {
            candidate = base + " copy " + n + ext;
            n++;
        }
        return candidate;
    }

    private boolean nameTaken(String sessionToken, Long parentId, String name) {
        List<FileNode> siblings = parentId == null
                ? fileNodeRepository.findBySessionTokenAndParentIdIsNullOrderBySortOrderAsc(sessionToken)
                : fileNodeRepository.findBySessionTokenAndParentIdOrderBySortOrderAsc(sessionToken, parentId);
        return siblings.stream().anyMatch(n -> n.getName().equalsIgnoreCase(name));
    }
}
