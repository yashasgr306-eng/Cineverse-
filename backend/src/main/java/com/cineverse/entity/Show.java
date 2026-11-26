package com.cineverse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "shows")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Show {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "movie_id", nullable = false)
    private Movie movie;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "screen_id", nullable = false)
    private Screen screen;

    @Column(name = "show_date", nullable = false, length = 20)
    private String showDate;

    @Column(name = "show_time", nullable = false, length = 20)
    private String showTime;

    @Column(nullable = false, length = 40)
    private String language;

    @Column(nullable = false, length = 20)
    private String format;

    @Column(name = "price_multiplier", nullable = false)
    private Double priceMultiplier = 1.0;
}
