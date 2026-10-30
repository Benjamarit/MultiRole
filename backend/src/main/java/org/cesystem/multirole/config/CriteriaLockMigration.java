package org.cesystem.multirole.config;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.repository.CompetitionRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Preserve locks for legacy open/closed projects and paused projects with evaluations. */
@Component
@RequiredArgsConstructor
public class CriteriaLockMigration implements ApplicationRunner {
    private final CompetitionRepository competitions;

    @Override
    @Transactional
    public void run(ApplicationArguments arguments) {
        competitions.lockLegacyCriteria();
    }
}
