package com.project.codeEditor.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.project.codeEditor.entity.CodeSnapshot;

public interface CodeSnapshotRepository extends JpaRepository<CodeSnapshot, Long> {

    List<CodeSnapshot> findBySessionTokenOrderByCreatedAtDesc(String sessionToken);

    Optional<CodeSnapshot> findFirstBySessionTokenOrderByCreatedAtDesc(String sessionToken);
}
