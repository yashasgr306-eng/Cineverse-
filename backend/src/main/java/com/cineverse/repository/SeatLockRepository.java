package com.cineverse.repository;

import com.cineverse.entity.SeatLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface SeatLockRepository extends JpaRepository<SeatLock, Long> {
    List<SeatLock> findByShowIdAndExpiresAtAfter(Long showId, LocalDateTime now);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.expiresAt <= :now")
    void deleteExpiredLocks(@Param("now") LocalDateTime now);

    @Modifying
    @Query("DELETE FROM SeatLock sl WHERE sl.show.id = :showId AND sl.user.id = :userId")
    void deleteByShowIdAndUserId(@Param("showId") Long showId, @Param("userId") Long userId);
}
