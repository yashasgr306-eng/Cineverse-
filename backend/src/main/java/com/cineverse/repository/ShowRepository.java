package com.cineverse.repository;

import com.cineverse.entity.Show;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ShowRepository extends JpaRepository<Show, Long> {
    @Query("""
        SELECT s FROM Show s
        JOIN FETCH s.movie m
        JOIN FETCH s.screen sc
        JOIN FETCH sc.theatre t
        WHERE (:movieId IS NULL OR m.id = :movieId)
        ORDER BY s.showDate ASC, s.showTime ASC
    """)
    List<Show> findShowsWithDetails(@Param("movieId") Long movieId);
}
