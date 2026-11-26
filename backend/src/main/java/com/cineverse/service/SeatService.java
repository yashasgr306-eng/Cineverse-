package com.cineverse.service;

import com.cineverse.dto.CatalogDtos.SeatStatusDto;
import com.cineverse.entity.*;
import com.cineverse.exception.ResourceNotFoundException;
import com.cineverse.exception.SeatUnavailableException;
import com.cineverse.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeatService {

    private final ShowRepository showRepository;
    private final SeatRepository seatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatLockRepository seatLockRepository;
    private final UserRepository userRepository;

    @Value("${cineverse.seat-lock.ttl-seconds:300}")
    private long lockTtlSeconds;

    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void purgeExpiredSeatLocks() {
        seatLockRepository.deleteExpiredLocks(LocalDateTime.now());
    }

    @Transactional(readOnly = true)
    public List<SeatStatusDto> getSeatLayoutForShow(Long showId) {
        Show show = showRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + showId));

        List<Seat> screenSeats = seatRepository.findByScreenIdOrderByRowIndexAscColNumberAsc(show.getScreen().getId());
        Set<Long> bookedSeatIds = bookingSeatRepository.findByShowId(showId).stream()
                .map(bs -> bs.getSeat().getId())
                .collect(Collectors.toSet());

        LocalDateTime now = LocalDateTime.now();
        Map<Long, SeatLock> activeLocks = seatLockRepository.findByShowIdAndExpiresAtAfter(showId, now)
                .stream()
                .collect(Collectors.toMap(sl -> sl.getSeat().getId(), sl -> sl));

        return screenSeats.stream().map(seat -> {
            String status = "AVAILABLE";
            Long lockedBy = null;
            Long expiresAtMs = null;

            if (bookedSeatIds.contains(seat.getId())) {
                status = "BOOKED";
            } else if (activeLocks.containsKey(seat.getId())) {
                SeatLock lock = activeLocks.get(seat.getId());
                status = "LOCKED";
                lockedBy = lock.getUser().getId();
                expiresAtMs = lock.getExpiresAt().toInstant(ZoneOffset.UTC).toEpochMilli();
            }

            int price = (int) Math.round(seat.getCategory().getBasePrice() * show.getPriceMultiplier());
            return new SeatStatusDto(
                    seat.getId(),
                    show.getScreen().getId(),
                    seat.getSeatCode(),
                    seat.getRowLabel(),
                    seat.getRowIndex(),
                    seat.getColNumber(),
                    seat.getCategory(),
                    price,
                    status,
                    seat.getPairGroup(),
                    lockedBy,
                    expiresAtMs
            );
        }).toList();
    }

    @Transactional
    public List<SeatStatusDto> lockSeats(Long showId, List<Long> seatIds, String userEmail) {
        Show show = showRepository.findById(showId)
                .orElseThrow(() -> new ResourceNotFoundException("Show not found: " + showId));
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        LocalDateTime now = LocalDateTime.now();
        seatLockRepository.deleteExpiredLocks(now);
        seatLockRepository.deleteByShowIdAndUserId(showId, user.getId());

        Map<Long, SeatLock> activeLocks = seatLockRepository.findByShowIdAndExpiresAtAfter(showId, now)
                .stream()
                .collect(Collectors.toMap(sl -> sl.getSeat().getId(), sl -> sl));

        LocalDateTime expiry = now.plusSeconds(lockTtlSeconds);
        for (Long seatId : seatIds) {
            Seat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Seat not found: " + seatId));

            if (bookingSeatRepository.existsByShowIdAndSeatId(showId, seatId)) {
                throw new SeatUnavailableException("Seat " + seat.getSeatCode() + " is already booked.");
            }
            SeatLock existingLock = activeLocks.get(seatId);
            if (existingLock != null && !existingLock.getUser().getId().equals(user.getId())) {
                throw new SeatUnavailableException("Seat " + seat.getSeatCode() + " is temporarily locked by another user.");
            }

            seatLockRepository.save(SeatLock.builder()
                    .show(show)
                    .seat(seat)
                    .user(user)
                    .expiresAt(expiry)
                    .build());
        }

        return getSeatLayoutForShow(showId);
    }

    /**
     * Best 2 Seats (or Best N Seats) Recommendation Algorithm:
     * - Never recommends BOOKED or actively LOCKED seats.
     * - Never splits paired Royal Recliner seats (pairGroup).
     * - Prefers center columns and upper-mid Prime/Balcony rows.
     */
    @Transactional(readOnly = true)
    public List<SeatStatusDto> recommendBestSeats(Long showId, int count) {
        List<SeatStatusDto> allSeats = getSeatLayoutForShow(showId);
        List<SeatStatusDto> available = allSeats.stream()
                .filter(s -> "AVAILABLE".equals(s.status()))
                .toList();
        if (available.size() < count || count <= 0) return List.of();

        int minCol = allSeats.stream().mapToInt(SeatStatusDto::colNumber).min().orElse(1);
        int maxCol = allSeats.stream().mapToInt(SeatStatusDto::colNumber).max().orElse(10);
        double centerCol = (minCol + maxCol) / 2.0;

        int maxRow = allSeats.stream().mapToInt(SeatStatusDto::rowIndex).max().orElse(8);
        int idealRow = (int) Math.round(maxRow * 0.58);

        Map<String, List<SeatStatusDto>> byRow = available.stream()
                .collect(Collectors.groupingBy(SeatStatusDto::rowLabel));

        List<SeatStatusDto> bestWindow = List.of();
        double bestScore = Double.MAX_VALUE;

        for (List<SeatStatusDto> rowSeats : byRow.values()) {
            rowSeats.sort(Comparator.comparingInt(SeatStatusDto::colNumber));
            if (rowSeats.size() < count) continue;

            for (int i = 0; i <= rowSeats.size() - count; i++) {
                List<SeatStatusDto> candidate = rowSeats.subList(i, i + count);

                boolean contiguous = true;
                for (int j = 1; j < candidate.size(); j++) {
                    if (candidate.get(j).colNumber() - candidate.get(j - 1).colNumber() != 1) {
                        contiguous = false;
                        break;
                    }
                }
                if (!contiguous) continue;

                // Never split paired Royal Recliners
                Set<Long> candIds = candidate.stream().map(SeatStatusDto::id).collect(Collectors.toSet());
                boolean splitsPair = false;
                for (SeatStatusDto s : candidate) {
                    if (s.pairGroup() != null) {
                        boolean missingPartner = allSeats.stream()
                                .filter(other -> s.rowLabel().equals(other.rowLabel())
                                        && s.pairGroup().equals(other.pairGroup()))
                                .anyMatch(partner -> !candIds.contains(partner.id()));
                        if (missingPartner) {
                            splitsPair = true;
                            break;
                        }
                    }
                }
                if (splitsPair) continue;

                double avgCol = candidate.stream().mapToInt(SeatStatusDto::colNumber).average().orElse(centerCol);
                double colDist = Math.abs(avgCol - centerCol);
                double rowDist = Math.abs(candidate.get(0).rowIndex() - idealRow);
                double catPenalty = switch (candidate.get(0).category()) {
                    case PRIME -> 0.0;
                    case BALCONY -> 0.4;
                    case ROYAL_RECLINER -> 0.9;
                    case CLASSIC -> 2.2;
                };

                double score = colDist * 1.4 + rowDist * 1.1 + catPenalty;
                if (score < bestScore) {
                    bestScore = score;
                    bestWindow = List.copyOf(candidate);
                }
            }
        }
        return bestWindow;
    }
}
