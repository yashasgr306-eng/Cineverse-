package com.cineverse.service;

import com.cineverse.dto.AuthDtos.UserDto;
import com.cineverse.dto.BookingDtos.BookingResponse;
import com.cineverse.dto.ProfileDtos.*;
import com.cineverse.entity.User;
import com.cineverse.exception.ResourceNotFoundException;
import com.cineverse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private final UserRepository userRepository;
    private final BookingService bookingService;
    private final AuthService authService;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public ProfileOverviewResponse getProfile(String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User account not found."));

        List<BookingResponse> allBookings = bookingService.getMyBookings(userEmail);
        String today = LocalDate.now().toString();

        List<BookingResponse> upcoming = allBookings.stream()
                .filter(b -> b.showDate() != null && b.showDate().compareTo(today) >= 0)
                .toList();
        List<BookingResponse> past = allBookings.stream()
                .filter(b -> b.showDate() == null || b.showDate().compareTo(today) < 0)
                .toList();

        double totalSpent = allBookings.stream()
                .mapToDouble(b -> b.breakdown() != null ? b.breakdown().grandTotal() : 0.0)
                .sum();

        return new ProfileOverviewResponse(
                authService.toDto(user),
                upcoming,
                past,
                allBookings.size(),
                totalSpent
        );
    }

    @Transactional
    public UserDto updateProfile(String userEmail, UpdateProfileRequest req) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User account not found."));

        user.setName(req.name().trim());
        user.setPhone(req.phone() != null ? req.phone().trim() : "");
        if (req.preferredCity() != null && !req.preferredCity().isBlank()) {
            user.setPreferredCity(req.preferredCity().trim());
        }
        if (req.preferredLanguage() != null && !req.preferredLanguage().isBlank()) {
            user.setPreferredLanguage(req.preferredLanguage().trim());
        }
        if (req.emailNotifications() != null) {
            user.setEmailNotifications(req.emailNotifications());
        }

        User saved = userRepository.save(user);
        return authService.toDto(saved);
    }

    @Transactional
    public void changePassword(String userEmail, ChangePasswordRequest req) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User account not found."));

        if ("GOOGLE".equalsIgnoreCase(user.getAuthProvider())) {
            throw new IllegalArgumentException("This account uses Google Sign-In. Password settings are managed by Google.");
        }
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Current password is incorrect.");
        }
        if (req.currentPassword().equals(req.newPassword())) {
            throw new IllegalArgumentException("New password must be different from your current password.");
        }

        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
        userRepository.save(user);
    }
}
