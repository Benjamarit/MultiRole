package org.cesystem.multirole.repository;

import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.Evaluation;
import org.cesystem.multirole.model.Team;
import org.cesystem.multirole.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface EvaluationRepository extends JpaRepository<Evaluation, UUID> {
    // คำสั่ง SQL ที่ Spring Boot จะสร้างให้อัตโนมัติเพื่อค้นหา Evaluation แบบเจาะจงคู่ กรรมการ+ทีม
    Optional<Evaluation> findByCompetitionAndTeamAndJudge(Competition competition, Team team, User judge);
}