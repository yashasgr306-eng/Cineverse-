package com.cineverse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "movies")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Movie {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 250)
    private String tagline;

    @Column(nullable = false, length = 50)
    private String language;

    @Column(name = "languages_available", length = 200)
    private String languagesAvailable;

    @Column(nullable = false, length = 120)
    private String genre;

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(nullable = false)
    private Double rating;

    @Column(name = "votes_count", length = 30)
    private String votesCount;

    @Column(length = 16)
    private String certificate;

    @Column(name = "release_date", length = 20)
    private String releaseDate;

    @Column(nullable = false, length = 120)
    private String director;

    @Column(name = "cast_list", length = 500)
    private String castList;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "poster_url", length = 500)
    private String posterUrl;

    @Column(name = "backdrop_url", length = 500)
    private String backdropUrl;

    @Column(name = "trailer_url", length = 500)
    private String trailerUrl;

    @Column(nullable = false)
    private Boolean featured = true;

    @Column(name = "now_showing", nullable = false)
    private Boolean nowShowing = true;

    @Column(length = 120)
    private String formats;

    @Column(name = "accent_color", length = 20)
    private String accentColor;
}
