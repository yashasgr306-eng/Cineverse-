package com.cineverse.service;

import com.cineverse.dto.BookingDtos.AdminStatsDto;
import com.cineverse.dto.BookingDtos.BookingResponse;
import com.cineverse.dto.CatalogDtos.MovieDto;
import com.cineverse.dto.CatalogDtos.ShowDto;
import com.cineverse.dto.CatalogDtos.TheatreDto;
import com.cineverse.entity.*;
import com.cineverse.exception.ResourceNotFoundException;
import com.cineverse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final MovieRepository movieRepository;
    private final TheatreRepository theatreRepository;
    private final ScreenRepository screenRepository;
    private final SeatRepository seatRepository;
    private final ShowRepository showRepository;
    private final BookingRepository bookingRepository;
    private final CatalogService catalogService;
    private final BookingService bookingService;

    @Transactional(readOnly = true)
    public AdminStatsDto getDashboardStats() {
        List<Booking> all = bookingRepository.findAllByOrderByCreatedAtDesc();
        long totalRevenue = all.stream().mapToLong(Booking::getGrandTotal).sum();
        long ticketsSold = all.stream().mapToLong(b -> b.getSeats().size()).sum();
        List<BookingResponse> recent = all.stream().limit(25).map(b -> bookingService.toResponse(b, null)).toList();

        return new AdminStatsDto(
                (long) all.size(),
                totalRevenue,
                movieRepository.count(),
                theatreRepository.count(),
                ticketsSold,
                recent
        );
    }

    @Transactional
    public MovieDto saveMovie(MovieDto dto, Long existingId) {
        Movie movie = existingId != null
                ? movieRepository.findById(existingId)
                        .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + existingId))
                : new Movie();

        movie.setTitle(dto.title());
        movie.setTagline(dto.tagline());
        movie.setLanguage(dto.language());
        movie.setLanguagesAvailable(String.join(", ", dto.languagesAvailable() != null ? dto.languagesAvailable() : List.of(dto.language())));
        movie.setGenre(dto.genre());
        movie.setDurationMinutes(dto.durationMinutes());
        movie.setRating(dto.rating());
        movie.setVotesCount(dto.votesCount() != null ? dto.votesCount() : "10K");
        movie.setCertificate(dto.certificate() != null ? dto.certificate() : "UA");
        movie.setReleaseDate(dto.releaseDate());
        movie.setDirector(dto.director());
        movie.setCastList(String.join(", ", dto.cast() != null ? dto.cast() : List.of()));
        movie.setDescription(dto.description());
        movie.setPosterUrl(dto.posterUrl());
        movie.setBackdropUrl(dto.backdropUrl());
        movie.setTrailerUrl(dto.trailerUrl());
        movie.setFeatured(dto.featured() != null ? dto.featured() : true);
        movie.setNowShowing(dto.nowShowing() != null ? dto.nowShowing() : true);
        movie.setFormats(String.join(", ", dto.formats() != null ? dto.formats() : List.of("2D", "IMAX")));
        movie.setAccentColor(dto.accentColor() != null ? dto.accentColor() : "#F5C518");

        return catalogService.toMovieDto(movieRepository.save(movie));
    }

    @Transactional
    public void deleteMovie(Long id) {
        movieRepository.deleteById(id);
    }

    @Transactional
    public TheatreDto createTheatreWithDefaultScreen(TheatreDto dto) {
        Theatre theatre = theatreRepository.save(Theatre.builder()
                .name(dto.name())
                .city(dto.city())
                .address(dto.address())
                .amenities(String.join(", ", dto.amenities() != null ? dto.amenities() : List.of("Dolby Atmos", "4K Laser")))
                .build());

        String defaultScreenName = dto.name().toLowerCase().contains("imax")
                ? "IMAX Laser Audi 1"
                : dto.name().toLowerCase().contains("4dx")
                    ? "4DX Motion Audi 2"
                    : dto.name().toLowerCase().contains("luxe")
                        ? "Luxe Lounge Audi 1"
                        : "Grand Atmos Audi 1";

        Screen screen = screenRepository.save(Screen.builder()
                .theatre(theatre)
                .name(defaultScreenName)
                .totalSeats(resolveTotalSeatsForScreen(defaultScreenName))
                .build());

        seedScreenSeats(screen);
        return catalogService.toTheatreDto(theatre);
    }

    @Transactional
    public ShowDto createShow(ShowDto dto) {
        Movie movie = movieRepository.findById(dto.movieId())
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found"));
        List<Screen> screens = screenRepository.findByTheatreId(dto.theatreId());
        if (screens.isEmpty()) {
            throw new ResourceNotFoundException("No screen configured for theatre: " + dto.theatreId());
        }
        Screen chosen = screens.stream()
                .filter(s -> dto.format() != null && s.getName().toUpperCase().contains(dto.format().toUpperCase()))
                .findFirst()
                .orElse(screens.get(0));
        Show show = showRepository.save(Show.builder()
                .movie(movie)
                .screen(chosen)
                .showDate(dto.showDate())
                .showTime(dto.showTime())
                .language(dto.language())
                .format(dto.format())
                .priceMultiplier(dto.priceMultiplier() != null ? dto.priceMultiplier() : 1.0)
                .build());
        return catalogService.toShowDto(show);
    }

    public int resolveTotalSeatsForScreen(String screenName) {
        String name = screenName != null ? screenName.toLowerCase() : "";
        if (name.contains("imax") || name.contains("giant")) return 114;
        if (name.contains("4dx")) return 62;
        if (name.contains("luxe") || name.contains("gold") || name.contains("director") || name.contains("heritage")) return 64;
        return 88;
    }

    public void seedScreenSeats(Screen screen) {
        String name = screen.getName() != null ? screen.getName().toLowerCase() : "";
        String[] labels;
        SeatCategory[] cats;
        int[] colsPerRow;

        if (name.contains("imax") || name.contains("giant")) {
            labels = new String[]{"A", "B", "C", "D", "E", "F", "G", "H", "J", "R"};
            cats = new SeatCategory[]{
                    SeatCategory.CLASSIC, SeatCategory.CLASSIC,
                    SeatCategory.PRIME, SeatCategory.PRIME, SeatCategory.PRIME, SeatCategory.PRIME,
                    SeatCategory.BALCONY, SeatCategory.BALCONY, SeatCategory.BALCONY,
                    SeatCategory.ROYAL_RECLINER
            };
            colsPerRow = new int[]{12, 12, 12, 12, 12, 12, 12, 12, 12, 6};
        } else if (name.contains("4dx")) {
            labels = new String[]{"A", "B", "C", "D", "E", "F", "G", "R"};
            cats = new SeatCategory[]{
                    SeatCategory.CLASSIC, SeatCategory.CLASSIC,
                    SeatCategory.PRIME, SeatCategory.PRIME, SeatCategory.PRIME,
                    SeatCategory.BALCONY, SeatCategory.BALCONY,
                    SeatCategory.ROYAL_RECLINER
            };
            colsPerRow = new int[]{8, 8, 8, 8, 8, 8, 8, 6};
        } else if (name.contains("luxe") || name.contains("gold") || name.contains("director") || name.contains("heritage")) {
            labels = new String[]{"A", "B", "C", "D", "E", "F", "R"};
            cats = new SeatCategory[]{
                    SeatCategory.CLASSIC,
                    SeatCategory.PRIME, SeatCategory.PRIME, SeatCategory.PRIME,
                    SeatCategory.BALCONY, SeatCategory.BALCONY,
                    SeatCategory.ROYAL_RECLINER
            };
            colsPerRow = new int[]{10, 10, 10, 10, 8, 8, 8};
        } else {
            labels = new String[]{"A", "B", "C", "D", "E", "F", "G", "H", "R"};
            cats = new SeatCategory[]{
                    SeatCategory.CLASSIC, SeatCategory.CLASSIC,
                    SeatCategory.PRIME, SeatCategory.PRIME, SeatCategory.PRIME, SeatCategory.PRIME,
                    SeatCategory.BALCONY, SeatCategory.BALCONY,
                    SeatCategory.ROYAL_RECLINER
            };
            colsPerRow = new int[]{10, 10, 10, 10, 10, 10, 10, 10, 8};
        }

        for (int r = 0; r < labels.length; r++) {
            int cols = colsPerRow[r];
            for (int c = 1; c <= cols; c++) {
                String pair = null;
                if (cats[r] == SeatCategory.ROYAL_RECLINER) {
                    int start = (c % 2 == 1) ? c : c - 1;
                    pair = "R-" + start + "-" + (start + 1);
                }
                seatRepository.save(Seat.builder()
                        .screen(screen)
                        .seatCode(labels[r] + c)
                        .rowLabel(labels[r])
                        .rowIndex(r)
                        .colNumber(c)
                        .category(cats[r])
                        .pairGroup(pair)
                        .build());
            }
        }
    }
}
