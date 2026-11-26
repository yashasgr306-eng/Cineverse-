package com.cineverse.controller;

import com.cineverse.dto.BookingDtos.AdminStatsDto;
import com.cineverse.dto.CatalogDtos.MovieDto;
import com.cineverse.dto.CatalogDtos.ShowDto;
import com.cineverse.dto.CatalogDtos.TheatreDto;
import com.cineverse.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        return ResponseEntity.ok(adminService.getDashboardStats());
    }

    @PostMapping("/movies")
    public ResponseEntity<MovieDto> createMovie(@RequestBody MovieDto dto) {
        return ResponseEntity.ok(adminService.saveMovie(dto, null));
    }

    @PutMapping("/movies/{id}")
    public ResponseEntity<MovieDto> updateMovie(@PathVariable Long id, @RequestBody MovieDto dto) {
        return ResponseEntity.ok(adminService.saveMovie(dto, id));
    }

    @DeleteMapping("/movies/{id}")
    public ResponseEntity<Void> deleteMovie(@PathVariable Long id) {
        adminService.deleteMovie(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/theatres")
    public ResponseEntity<TheatreDto> createTheatre(@RequestBody TheatreDto dto) {
        return ResponseEntity.ok(adminService.createTheatreWithDefaultScreen(dto));
    }

    @PostMapping("/shows")
    public ResponseEntity<ShowDto> createShow(@RequestBody ShowDto dto) {
        return ResponseEntity.ok(adminService.createShow(dto));
    }
}
