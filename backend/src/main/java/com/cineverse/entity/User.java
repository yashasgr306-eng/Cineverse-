package com.cineverse.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 30)
    private String phone;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Role role;

    @Builder.Default
    @Column(name = "auth_provider", nullable = false, length = 20)
    private String authProvider = "LOCAL";

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "preferred_city", length = 80)
    private String preferredCity;

    @Column(name = "preferred_language", length = 40)
    private String preferredLanguage;

    @Builder.Default
    @Column(name = "email_notifications", nullable = false)
    private boolean emailNotifications = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (role == null) role = Role.USER;
        if (authProvider == null || authProvider.isBlank()) authProvider = "LOCAL";
        if (phone == null) phone = "";
        if (preferredCity == null || preferredCity.isBlank()) preferredCity = "Chennai";
        if (preferredLanguage == null || preferredLanguage.isBlank()) preferredLanguage = "Tamil";
    }
}
