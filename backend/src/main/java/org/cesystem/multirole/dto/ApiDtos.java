package org.cesystem.multirole.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.cesystem.multirole.model.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * DTO ทั้งหมดของ controller ชุดนี้ (ไม่ส่ง entity ออกไปตรง ๆ เพื่อไม่ให้ passwordHash หลุด
 * และไม่ให้ client กำหนดฟิลด์ที่ไม่ควรกำหนดเอง)
 */
public final class ApiDtos {

    private ApiDtos() {}

    // ---------- Competition ----------
    public record CompetitionRequest(String title, String description, String category,
                                     LocalDateTime evaluationDeadline) {}

    public record StatusRequest(String status) {}

    public record CompetitionResponse(UUID competitionId, String title, String description, String category,
                                      String status, UUID createdBy, LocalDateTime createdAt,
                                      LocalDateTime evaluationDeadline, LocalDateTime closedAt,
                                      String ownerEmail, String ownerName, String currentRole, boolean criteriaLocked) {
        public static CompetitionResponse from(Competition c) {
            return from(c, "ADMIN");
        }
        public static CompetitionResponse from(Competition c, String role) {
            return new CompetitionResponse(c.getCompetitionId(), c.getTitle(), c.getDescription(),
                    c.getCategory(), c.getStatus(), c.getCreatedBy().getUserId(), c.getCreatedAt(),
                    c.getEvaluationDeadline(), c.getClosedAt(), c.getCreatedBy().getEmail(),
                    c.getCreatedBy().getFullName(), role, Boolean.TRUE.equals(c.getCriteriaLocked()) || !"DRAFT".equals(c.getStatus()));
        }
    }

    // ---------- Criteria ----------
    public record CriteriaRequest(String title, String description, String scoringType,
                                  BigDecimal maxScore, BigDecimal weightPercentage) {}
    public record CriteriaOrderRequest(List<UUID> criterionIds) {}

    public record CriteriaResponse(UUID criterionId, UUID competitionId, String title, String description,
                                   String scoringType, BigDecimal maxScore, BigDecimal weightPercentage, Integer displayOrder) {
        public static CriteriaResponse from(Criteria c) {
            return new CriteriaResponse(c.getCriterionId(), c.getCompetition().getCompetitionId(),
                    c.getTitle(), c.getDescription(), c.getScoringType(), c.getMaxScore(),
                    c.getWeightPercentage(), c.getDisplayOrder());
        }
    }

    // ---------- Team ----------
    public record TeamRequest(String teamName, String projectDescription, String projectUrl) {}
    public record TeamOrderRequest(List<UUID> teamIds) {}

    public record TeamResponse(UUID teamId, UUID competitionId, String teamName,
                               String projectDescription, String projectUrl, Integer displayOrder) {
        public static TeamResponse from(Team t) {
            return new TeamResponse(t.getTeamId(), t.getCompetition().getCompetitionId(), t.getTeamName(),
                    t.getProjectDescription(), t.getProjectUrl(), t.getDisplayOrder());
        }
    }

    // ---------- Competition_user ----------
    public record MemberRequest(String email, String role) {}

    public record MemberResponse(UUID userId, String email, String fullName, String role) {
        public static MemberResponse from(CompetitionUser cu) {
            User u = cu.getUser();
            return new MemberResponse(u.getUserId(), u.getEmail(), u.getFullName(), cu.getRole());
        }
    }

    // ---------- Team_Group ----------
    public record GroupRequest(String groupName) {}

    /** groupId = null หมายถึงเอาทีมออกจากกลุ่ม */
    public record MoveTeamRequest(UUID groupId) {}

    public record MoveTeamsRequest(List<UUID> teamIds, UUID groupId) {}
    public record MoveTeamsResponse(int movedCount, int unchangedCount, List<GroupResponse> groups) {}

    public record GroupResponse(UUID groupId, String groupName, List<UUID> teamIds) {}

    // ---------- Judge_Assignment ----------
    public record AssignmentRequest(UUID judgeId, UUID teamId) {}

    public record AssignmentResponse(UUID assignmentId, UUID judgeId, UUID teamId) {
        public static AssignmentResponse from(JudgeAssignment a) {
            return new AssignmentResponse(a.getAssignmentId(), a.getJudge().getUserId(),
                    a.getTeam().getTeamId());
        }
    }

    // ---------- Evaluation / Score ----------
    public record ScoreResponse(UUID criterionId, BigDecimal scoreValue, String comment) {
        public static ScoreResponse from(Score s) {
            return new ScoreResponse(s.getCriteria().getCriterionId(), s.getScoreValue(), s.getComment());
        }
    }

    public record EvaluationResponse(UUID evaluationId, UUID competitionId, UUID teamId, UUID judgeId,
                                     BigDecimal totalScore, String comment, String status,
                                     LocalDateTime updatedAt, LocalDateTime submittedAt,
                                     List<ScoreResponse> scores, String judgeName, String judgeEmail) {
        public static EvaluationResponse from(Evaluation e) {
            return new EvaluationResponse(e.getEvaluationId(), e.getCompetition().getCompetitionId(),
                    e.getTeam().getTeamId(), e.getJudge().getUserId(), e.getTotalScore(), e.getComment(),
                    e.getStatus(), e.getUpdatedAt(), e.getSubmittedAt(),
                    e.getScores().stream().map(ScoreResponse::from).toList(),
                    e.getJudge().getFullName(), e.getJudge().getEmail());
        }
    }

    // ---------- Notification ----------
    public record NotificationResponse(UUID notificationId, UUID competitionId, String title, String message,
                                       String type, @JsonProperty("isRead") boolean isRead,
                                       LocalDateTime createdAt, String emailStatus) {
        public static NotificationResponse from(Notification n) {
            return new NotificationResponse(n.getNotificationId(),
                    n.getCompetition() == null ? null : n.getCompetition().getCompetitionId(),
                    n.getTitle(), n.getMessage(), n.getType(), Boolean.TRUE.equals(n.getIsRead()),
                    n.getCreatedAt(), n.getEmailStatus());
        }
    }

    // ---------- Password reset ----------
    public record ForgotPasswordRequest(String email) {}

    public record ResetPasswordRequest(String token, String newPassword) {}
}
