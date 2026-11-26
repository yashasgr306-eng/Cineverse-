package com.cineverse.repository;

import com.cineverse.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface MovieRepository extends JpaRepository<Movie, Long> {
    @Query("""
        SELECT m FROM Movie m
        WHERE (:q IS NULL OR LOWER(m.title) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(m.genre) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(m.director) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(m.castList) LIKE LOWER(CONCAT('%', :q, '%')))
          AND (:language IS NULL OR LOWER(m.language) = LOWER(:language)
               OR LOWER(m.languagesAvailable) LIKE LOWER(CONCAT('%', :language, '%')))
        ORDER BY m.featured DESC, m.rating DESC
    """)
    List<Movie> searchMovies(@Param("q") String q, @Param("language") String language);
}
