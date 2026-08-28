package com.project.codeEditor.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.project.codeEditor.entity.User;

public interface UserRepository extends JpaRepository<User, Long>{

    Optional<User> findByEmail(String email);

    Optional<User> findByToken(String token);

}
