package com.cineverse.controller;

import com.cineverse.dto.CatalogDtos.MovieDto;
import com.cineverse.service.CatalogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
public class MovieController {

    private final CatalogService catalogService;

    @GetMapping
    public ResponseEntity<List<MovieDto>> getMovies(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String language
    ) {
        return ResponseEntity.ok(catalogService.getMovies(q, language));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MovieDto> getMovie(@PathVariable Long id) {
        return ResponseEntity.ok(catalogService.getMovieById(id));
    }
}
