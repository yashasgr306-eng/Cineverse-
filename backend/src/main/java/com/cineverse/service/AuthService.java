package com.cineverse.service;

import com.cineverse.dto.AuthDtos.*;
import com.cineverse.entity.Role;
import com.cineverse.entity.User;
import com.cineverse.repository.UserRepository;
import com.cineverse.security.JwtService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final ObjectMapper objectMapper;

    @Value("${cineverse.firebase.api-key:}")
    private String firebaseApiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new IllegalArgumentException("Email is already registered.");
        }

        User user = User.builder()
                .name(req.name().trim())
                .email(req.email().trim().toLowerCase())
                .phone(req.phone().trim())
                .passwordHash(passwordEncoder.encode(req.password()))
                .role(Role.USER)
                .authProvider("LOCAL")
                .preferredCity("Chennai")
                .preferredLanguage("Tamil")
                .emailNotifications(true)
                .build();

        User saved = userRepository.save(user);
        String token = jwtService.generateToken(saved);
        return new AuthResponse(token, toDto(saved));
    }

    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.email().trim().toLowerCase(), req.password())
        );

        User user = userRepository.findByEmailIgnoreCase(req.email().trim().toLowerCase())
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, toDto(user));
    }

    @Transactional
    public AuthResponse loginWithGoogle(GoogleLoginRequest req) {
        GoogleProfile profile = verifyGoogleCredentials(req);

        User user = userRepository.findByEmailIgnoreCase(profile.email())
                .map(existing -> {
                    existing.setAuthProvider("GOOGLE");
                    if (profile.avatarUrl() != null && !profile.avatarUrl().isBlank()) {
                        existing.setAvatarUrl(profile.avatarUrl());
                    }
                    if ((existing.getName() == null || existing.getName().isBlank()) && profile.name() != null) {
                        existing.setName(profile.name());
                    }
                    return userRepository.save(existing);
                })
                .orElseGet(() -> userRepository.save(User.builder()
                        .name(profile.name() != null && !profile.name().isBlank() ? profile.name() : "CINEVERSE Guest")
                        .email(profile.email())
                        .phone("")
                        .passwordHash(passwordEncoder.encode(UUID.randomUUID().toString()))
                        .role(Role.USER)
                        .authProvider("GOOGLE")
                        .avatarUrl(profile.avatarUrl())
                        .preferredCity("Chennai")
                        .preferredLanguage("Tamil")
                        .emailNotifications(true)
                        .build()));

        String token = jwtService.generateToken(user);
        return new AuthResponse(token, toDto(user));
    }

    private GoogleProfile verifyGoogleCredentials(GoogleLoginRequest req) {
        // Primary verification via Google OAuth2 UserInfo API when access token is provided
        if (req.accessToken() != null && !req.accessToken().isBlank()) {
            try {
                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                        .header("Authorization", "Bearer " + req.accessToken().trim())
                        .timeout(Duration.ofSeconds(5))
                        .GET()
                        .build();
                HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonNode node = objectMapper.readTree(response.body());
                    String email = node.path("email").asText("").trim().toLowerCase();
                    boolean verified = node.path("email_verified").asBoolean(true);
                    if (!email.isBlank() && verified) {
                        String name = node.path("name").asText("");
                        String picture = node.path("picture").asText(null);
                        return new GoogleProfile(email, name, picture);
                    }
                }
            } catch (Exception ignored) {
                // Fall through to Firebase Identity Toolkit verification if configured
            }
        }

        // Secondary verification via Firebase Identity Toolkit accounts:lookup using idToken
        if (req.idToken() != null && !req.idToken().isBlank() && firebaseApiKey != null && !firebaseApiKey.isBlank()) {
            try {
                String body = objectMapper.writeValueAsString(java.util.Map.of("idToken", req.idToken().trim()));
                HttpRequest httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + firebaseApiKey.trim()))
                        .header("Content-Type", "application/json")
                        .timeout(Duration.ofSeconds(5))
                        .POST(HttpRequest.BodyPublishers.ofString(body))
                        .build();
                HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() == 200) {
                    JsonNode users = objectMapper.readTree(response.body()).path("users");
                    if (users.isArray() && !users.isEmpty()) {
                        JsonNode first = users.get(0);
                        String email = first.path("email").asText("").trim().toLowerCase();
                        boolean verified = first.path("emailVerified").asBoolean(false);
                        if (!email.isBlank() && verified) {
                            String name = first.path("displayName").asText("");
                            String picture = first.path("photoUrl").asText(null);
                            return new GoogleProfile(email, name, picture);
                        }
                    }
                }
            } catch (Exception e) {
                throw new IllegalArgumentException("Unable to verify Google Sign-In credentials.");
            }
        }

        throw new IllegalArgumentException("Invalid or expired Google Sign-In token.");
    }

    private record GoogleProfile(String email, String name, String avatarUrl) {}

    public UserDto toDto(User user) {
        return new UserDto(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getRole(),
                user.getAuthProvider() != null ? user.getAuthProvider() : "LOCAL",
                user.getAvatarUrl(),
                user.getPreferredCity() != null ? user.getPreferredCity() : "Chennai",
                user.getPreferredLanguage() != null ? user.getPreferredLanguage() : "Tamil",
                user.isEmailNotifications(),
                user.getCreatedAt() != null ? user.getCreatedAt().toString() : ""
        );
    }
}
