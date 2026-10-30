package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.Competition;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class ProjectStructurePolicy {
    private final CriteriaPolicy criteriaPolicy;

    public Competition requireEditable(Competition competition) {
        // The same row lock as activation prevents stale forms and concurrent writes.
        criteriaPolicy.lock(competition);
        if (criteriaPolicy.isLocked(competition)) throw new ResponseStatusException(HttpStatus.CONFLICT,
            "ข้อมูลโครงการถูกล็อกตั้งแต่เปิดรับคะแนนครั้งแรก ไม่สามารถแก้ไขทีม กลุ่ม กรรมการ หรือการมอบหมายได้ แม้พักรับคะแนน");
        return competition;
    }
}
