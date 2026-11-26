package com.cineverse.dto;

import com.cineverse.entity.BookingStatus;
import com.cineverse.entity.SeatCategory;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public class BookingDtos {
    public record SnackOrderItem(
            @NotNull Long snackId,
            @NotNull Integer quantity
    ) {}

    public record CreateBookingRequest(
            @NotNull Long showId,
            @NotEmpty List<Long> seatIds,
            List<SnackOrderItem> snacks,
            String paymentMode
    ) {}

    public record BookingSnackSummary(
            String name,
            Integer quantity,
            Integer unitPrice
    ) {}

    public record BreakdownDto(
            Integer ticketSubtotal,
            Integer snacksSubtotal,
            Integer convenienceFee,
            Integer gstAmount,
            Integer grandTotal
    ) {}

    public record BookingResponse(
            Long id,
            String bookingReference,
            Long userId,
            String userName,
            String userEmail,
            Long showId,
            Long movieId,
            String movieTitle,
            String moviePosterUrl,
            String theatreName,
            String screenName,
            String city,
            String showDate,
            String showTime,
            String language,
            String format,
            List<String> seatCodes,
            List<SeatCategory> seatCategories,
            List<BookingSnackSummary> snacks,
            BreakdownDto breakdown,
            String paymentMode,
            String paymentId,
            BookingStatus status,
            String qrPayload,
            String qrCodeBase64,
            String createdAt
    ) {}

    public record AdminStatsDto(
            Long totalBookings,
            Long totalRevenue,
            Long activeMovies,
            Long activeTheatres,
            Long ticketsSold,
            List<BookingResponse> recentBookings
    ) {}
}
