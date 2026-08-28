package com.project.codeEditor.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.project.codeEditor.entity.FileNode;

public interface FileNodeRepository extends JpaRepository<FileNode, Long> {

    List<FileNode> findBySessionTokenOrderBySortOrderAsc(String sessionToken);

    List<FileNode> findBySessionTokenAndParentIdOrderBySortOrderAsc(String sessionToken, Long parentId);

    List<FileNode> findBySessionTokenAndParentIdIsNullOrderBySortOrderAsc(String sessionToken);

    long countBySessionTokenAndParentId(String sessionToken, Long parentId);

    long countBySessionTokenAndParentIdIsNull(String sessionToken);
}
