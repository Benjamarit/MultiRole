package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Competition;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface CompetitionRepository extends JpaRepository<Competition, UUID> {

}