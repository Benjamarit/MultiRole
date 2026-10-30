package org.cesystem.multirole.service;
import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.ProjectActivity;
import org.cesystem.multirole.repository.ProjectActivityRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.UUID;

@Service @RequiredArgsConstructor
public class ProjectActivityService {
    private final ProjectActivityRepository events;
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void denied(UUID userId, String reason) { record(userId, "CREATE_DENIED", reason); }
    public void record(UUID userId, String action, String detail) {
        var event = new ProjectActivity();
        event.setUserId(userId); event.setAction(action); event.setDetail(detail);
        events.save(event);
    }
}
