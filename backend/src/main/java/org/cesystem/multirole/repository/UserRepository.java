package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from User u where u.userId = :id")
    Optional<User> lockById(@org.springframework.data.repository.query.Param("id") UUID id);
    Optional<User> findByEmail(String email); // เพิ่มบรรทัดนี้
}
