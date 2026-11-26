package com.cineverse.controller;

import com.cineverse.dto.CatalogDtos.*;
import com.cineverse.entity.Snack;
import com.cineverse.service.CatalogService;
import com.cineverse.service.SeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TheatreShowController {

    private final CatalogService catalogService;
    private final SeatService seatService;

    @GetMapping("/theatres")
    public ResponseEntity<List<TheatreDto>> getTheatres(@RequestParam(required = false) String city) {
        return ResponseEntity.ok(catalogService.getTheatres(city));
    }

    @GetMapping("/shows")
    public ResponseEntity<List<ShowDto>> getShows(@RequestParam(required = false) Long movieId) {
        return ResponseEntity.ok(catalogService.getShows(movieId));
    }

    @GetMapping("/shows/{showId}/seats")
    public ResponseEntity<List<SeatStatusDto>> getShowSeats(@PathVariable Long showId) {
        return ResponseEntity.ok(seatService.getSeatLayoutForShow(showId));
    }

    @PostMapping("/shows/{showId}/seats/lock")
    public ResponseEntity<List<SeatStatusDto>> lockSeats(
            @PathVariable Long showId,
            @RequestBody SeatLockRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.ok(seatService.lockSeats(showId, request.seatIds(), authentication.getName()));
    }

    @GetMapping("/shows/{showId}/seats/recommend")
    public ResponseEntity<List<SeatStatusDto>> recommendBestSeats(
            @PathVariable Long showId,
            @RequestParam(defaultValue = "2") int count
    ) {
        return ResponseEntity.ok(seatService.recommendBestSeats(showId, count));
    }

    @GetMapping("/snacks")
    public ResponseEntity<List<Snack>> getSnacks() {
        return ResponseEntity.ok(catalogService.getSnacks());
    }
}
