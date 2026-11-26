package com.cineverse.repository;

import com.cineverse.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {
    List<Seat> findByScreenIdOrderByRowIndexAscColNumberAsc(Long screenId);
}
