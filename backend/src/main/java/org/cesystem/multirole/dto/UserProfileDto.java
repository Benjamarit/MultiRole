package org.cesystem.multirole.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserProfileDto {
    private UUID userId;
    private String email;
    private String fullName;
    private String role;
}