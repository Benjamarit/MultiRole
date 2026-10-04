package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email); // เพิ่มบรรทัดนี้
}