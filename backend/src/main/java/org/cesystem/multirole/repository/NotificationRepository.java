package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    List<Notification> findByUser_UserIdOrderByCreatedAtDesc(UUID userId);

    @Query("select n from Notification n where n.user.userId = :userId and n.isRead = false order by n.createdAt desc")
    List<Notification> findUnreadByUser(@Param("userId") UUID userId);

    @Query("select count(n) from Notification n where n.user.userId = :userId and n.isRead = false")
    long countUnreadByUser(@Param("userId") UUID userId);

    @Transactional
    @Modifying
    @Query("update Notification n set n.isRead = true where n.user.userId = :userId and n.isRead = false")
    int markAllRead(@Param("userId") UUID userId);
}