package com.cineverse.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

public class ProfileDtos {
    public record UpdateProfileRequest(
            @NotBlank @Size(min = 2, max = 100) String name,
            @Size(max = 30) String phone,
            String preferredCity,
            String preferredLanguage,
            Boolean emailNotifications
    ) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 6, max = 100) String newPassword
    ) {}

    public record ProfileOverviewResponse(
            AuthDtos.UserDto user,
            List<BookingDtos.BookingResponse> upcomingBookings,
            List<BookingDtos.BookingResponse> pastBookings,
            int totalBookings,
            double totalSpent
    ) {}
}
