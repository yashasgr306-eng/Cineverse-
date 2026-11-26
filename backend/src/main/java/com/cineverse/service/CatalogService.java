package com.cineverse.service;

import com.cineverse.dto.CatalogDtos.*;
import com.cineverse.entity.Movie;
import com.cineverse.entity.Show;
import com.cineverse.entity.Snack;
import com.cineverse.entity.Theatre;
import com.cineverse.exception.ResourceNotFoundException;
import com.cineverse.repository.BookingSeatRepository;
import com.cineverse.repository.MovieRepository;
import com.cineverse.repository.SeatLockRepository;
import com.cineverse.repository.ShowRepository;
import com.cineverse.repository.SnackRepository;
import com.cineverse.repository.TheatreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CatalogService {

    private final MovieRepository movieRepository;
    private final TheatreRepository theatreRepository;
    private final ShowRepository showRepository;
    private final SnackRepository snackRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatLockRepository seatLockRepository;

    public List<MovieDto> getMovies(String q, String language) {
        String cleanQ = (q == null || q.isBlank()) ? null : q.trim();
        String cleanLang = (language == null || language.isBlank() || "All".equalsIgnoreCase(language)) ? null : language.trim();
        return movieRepository.searchMovies(cleanQ, cleanLang).stream().map(this::toMovieDto).toList();
    }

    public MovieDto getMovieById(Long id) {
        Movie movie = movieRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found: " + id));
        return toMovieDto(movie);
    }

    public List<TheatreDto> getTheatres(String city) {
        List<Theatre> list = (city == null || city.isBlank() || "All Cities".equalsIgnoreCase(city))
                ? theatreRepository.findAll()
                : theatreRepository.findByCityIgnoreCase(city.trim());
        return list.stream().map(this::toTheatreDto).toList();
    }

    public List<ShowDto> getShows(Long movieId) {
        return showRepository.findShowsWithDetails(movieId).stream().map(this::toShowDto).toList();
    }

    public List<Snack> getSnacks() {
        return snackRepository.findAll();
    }

    public MovieDto toMovieDto(Movie m) {
        return new MovieDto(
                m.getId(),
                m.getTitle(),
                m.getTagline(),
                m.getLanguage(),
                splitCsv(m.getLanguagesAvailable()),
                m.getGenre(),
                m.getDurationMinutes(),
                m.getRating(),
                m.getVotesCount(),
                m.getCertificate(),
                m.getReleaseDate(),
                m.getDirector(),
                splitCsv(m.getCastList()),
                m.getDescription(),
                m.getPosterUrl(),
                m.getBackdropUrl(),
                m.getTrailerUrl(),
                m.getFeatured(),
                m.getNowShowing(),
                splitCsv(m.getFormats()),
                m.getAccentColor()
        );
    }

    public TheatreDto toTheatreDto(Theatre t) {
        return new TheatreDto(
                t.getId(),
                t.getName(),
                t.getCity(),
                t.getAddress(),
                splitCsv(t.getAmenities())
        );
    }

    public ShowDto toShowDto(Show s) {
        Theatre t = s.getScreen().getTheatre();
        int total = s.getScreen().getTotalSeats() != null ? s.getScreen().getTotalSeats() : 88;
        int booked = bookingSeatRepository.findByShowId(s.getId()).size();
        int locked = seatLockRepository.findByShowIdAndExpiresAtAfter(s.getId(), java.time.LocalDateTime.now()).size();
        int available = Math.max(0, total - booked - locked);
        String screenLower = s.getScreen().getName().toLowerCase();
        String profileLabel = screenLower.contains("imax") ? "IMAX Grand Hall"
                : screenLower.contains("4dx") ? "4DX Motion Pod"
                : (screenLower.contains("luxe") || screenLower.contains("gold")) ? "Luxe Boutique Hall"
                : "Dolby Atmos Hall";
        return new ShowDto(
                s.getId(),
                s.getMovie().getId(),
                t.getId(),
                t.getName(),
                t.getAddress(),
                t.getCity(),
                s.getScreen().getId(),
                s.getScreen().getName(),
                s.getShowDate(),
                s.getShowTime(),
                s.getLanguage(),
                s.getFormat(),
                s.getPriceMultiplier(),
                total,
                available,
                profileLabel
        );
    }

    private List<String> splitCsv(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        return Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList();
    }
}
