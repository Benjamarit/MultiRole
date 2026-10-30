package org.cesystem.multirole.service;

import lombok.RequiredArgsConstructor;
import org.cesystem.multirole.model.Competition;
import org.cesystem.multirole.model.CompetitionUser;
import org.cesystem.multirole.model.User;
import org.cesystem.multirole.repository.CompetitionRepository;
import org.cesystem.multirole.repository.CompetitionUserRepository;
import org.cesystem.multirole.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.Principal;
import java.util.Optional;
import java.util.UUID;

/** ตรวจสิทธิ์ของผู้ใช้ปัจจุบันต่อการแข่งขัน (system admin / ADMIN / JUDGE) */
@Service
@RequiredArgsConstructor
public class AccessService {

    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_JUDGE = "JUDGE";
    public static final String ROLE_ADMIN_JUDGE = "ADMIN_JUDGE";

    public static boolean hasAdminRole(String role) {
        return ROLE_ADMIN.equals(role) || ROLE_ADMIN_JUDGE.equals(role);
    }

    public static boolean hasJudgeRole(String role) {
        return ROLE_JUDGE.equals(role) || ROLE_ADMIN_JUDGE.equals(role);
    }

    public String competitionRole(UUID competitionId, User user) {
        return membership(competitionId, user).map(CompetitionUser::getRole).orElse(ROLE_ADMIN);
    }

    private final UserRepository userRepository;
    private final CompetitionRepository competitionRepository;
    private final CompetitionUserRepository competitionUserRepository;

    public User currentUser(Principal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ไม่มีสิทธิ์เข้าถึง (Unauthorized)");
        }
        User user = userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ไม่พบข้อมูลผู้ใช้งาน"));
        if (!"ACTIVE".equalsIgnoreCase(user.getStatus())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "บัญชีนี้ถูกระงับการใช้งาน");
        }
        if (EmailVerificationService.required(user)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "กรุณายืนยันอีเมลก่อนใช้งาน");
        return user;
    }

    public boolean isSystemAdmin(User user) {
        return Boolean.TRUE.equals(user.getIsSystemAdmin());
    }

    public Competition getCompetition(UUID competitionId) {
        return competitionRepository.findById(competitionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ไม่พบการแข่งขันนี้"));
    }

    public Optional<CompetitionUser> membership(UUID competitionId, User user) {
        return competitionUserRepository
                .findByCompetition_CompetitionIdAndUser_UserId(competitionId, user.getUserId());
    }

    public boolean isCompetitionAdmin(UUID competitionId, User user) {
        return isSystemAdmin(user)
                || membership(competitionId, user).map(m -> hasAdminRole(m.getRole())).orElse(false);
    }

    /** ต้องเป็นสมาชิก (ADMIN หรือ JUDGE) หรือ system admin */
    public Competition requireMember(UUID competitionId, User user) {
        Competition competition = getCompetition(competitionId);
        if (!isSystemAdmin(user) && membership(competitionId, user).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "คุณไม่มีสิทธิ์เข้าถึงการแข่งขันนี้");
        }
        return competition;
    }

    /** ต้องเป็น ADMIN ของการแข่งขันนี้ หรือ system admin */
    public Competition requireCompetitionAdmin(UUID competitionId, User user) {
        Competition competition = getCompetition(competitionId);
        if (!isCompetitionAdmin(competitionId, user)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ต้องเป็นผู้ดูแลการแข่งขันนี้เท่านั้น");
        }
        return competition;
    }
}
