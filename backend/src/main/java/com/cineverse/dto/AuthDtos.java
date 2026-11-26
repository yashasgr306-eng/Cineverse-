package com.cineverse.dto;

import com.cineverse.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class AuthDtos {
    public record LoginRequest(
            @NotBlank @Email String email,
            @NotBlank String password
    ) {}

    public record RegisterRequest(
            @NotBlank @Size(min = 2, max = 100) String name,
            @NotBlank @Email String email,
            @NotBlank String phone,
            @NotBlank @Size(min = 6, max = 100) String password
    ) {}

    public record GoogleLoginRequest(
            String idToken,
            String accessToken
    ) {}

    public record UserDto(
            Long id,
            String name,
            String email,
            String phone,
            Role role,
            String authProvider,
            String avatarUrl,
            String preferredCity,
            String preferredLanguage,
            boolean emailNotifications,
            String createdAt
    ) {}

    public record AuthResponse(
            String token,
            UserDto user
    ) {}
}
