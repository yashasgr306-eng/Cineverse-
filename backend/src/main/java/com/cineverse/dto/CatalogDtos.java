package com.cineverse.dto;

import com.cineverse.entity.SeatCategory;
import java.util.List;

public class CatalogDtos {
    public record MovieDto(
            Long id,
            String title,
            String tagline,
            String language,
            List<String> languagesAvailable,
            String genre,
            Integer durationMinutes,
            Double rating,
            String votesCount,
            String certificate,
            String releaseDate,
            String director,
            List<String> cast,
            String description,
            String posterUrl,
            String backdropUrl,
            String trailerUrl,
            Boolean featured,
            Boolean nowShowing,
            List<String> formats,
            String accentColor
    ) {}

    public record TheatreDto(
            Long id,
            String name,
            String city,
            String address,
            List<String> amenities
    ) {}

    public record ShowDto(
            Long id,
            Long movieId,
            Long theatreId,
            String theatreName,
            String theatreAddress,
            String city,
            Long screenId,
            String screenName,
            String showDate,
            String showTime,
            String language,
            String format,
            Double priceMultiplier,
            Integer totalSeats,
            Integer availableSeats,
            String auditoriumProfile
    ) {}

    public record SeatStatusDto(
            Long id,
            Long screenId,
            String seatCode,
            String rowLabel,
            Integer rowIndex,
            Integer colNumber,
            SeatCategory category,
            Integer price,
            String status,
            String pairGroup,
            Long lockedByUserId,
            Long lockExpiresAt
    ) {}

    public record SeatLockRequest(List<Long> seatIds) {}
}
