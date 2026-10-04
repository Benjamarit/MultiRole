package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface TeamRepository extends JpaRepository<Team, UUID> {
}