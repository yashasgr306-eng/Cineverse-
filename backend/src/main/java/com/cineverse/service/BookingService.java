package com.cineverse.service;

import com.cineverse.dto.BookingDtos.*;
import com.cineverse.entity.*;
import com.cineverse.exception.ResourceNotFoundException;
import com.cineverse.exception.SeatUnavailableException;
import com.cineverse.repository.*;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final SeatLockRepository seatLockRepository;
    private final ShowRepository showRepository;
    private final SeatRepository seatRepository;
    private final SnackRepository snackRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    @Value("${cineverse.razorpay.key-id:}")
    private String razorpayKeyId;

    @Transactional
    public BookingResponse createBooking(CreateBookingRequest req, String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Show show = showRepository.findById(req.showId())
                .orElseThrow(() -> new ResourceNotFoundException("Show not found"));

        LocalDateTime now = LocalDateTime.now();
        seatLockRepository.deleteExpiredLocks(now);
        Map<Long, SeatLock> activeLocks = seatLockRepository.findByShowIdAndExpiresAtAfter(show.getId(), now)
                .stream()
                .collect(Collectors.toMap(sl -> sl.getSeat().getId(), sl -> sl));

        // Recheck seat availability atomically inside transaction
        List<Seat> requestedSeats = new ArrayList<>();
        int ticketSubtotal = 0;
        for (Long seatId : req.seatIds()) {
            Seat seat = seatRepository.findById(seatId)
                    .orElseThrow(() -> new ResourceNotFoundException("Seat not found: " + seatId));

            if (bookingSeatRepository.existsByShowIdAndSeatId(show.getId(), seatId)) {
                throw new SeatUnavailableException("Seat " + seat.getSeatCode() + " is already booked.");
            }
            SeatLock lock = activeLocks.get(seatId);
            if (lock != null && !lock.getUser().getId().equals(user.getId())) {
                throw new SeatUnavailableException("Seat " + seat.getSeatCode() + " is locked by another user.");
            }

            requestedSeats.add(seat);
            ticketSubtotal += (int) Math.round(seat.getCategory().getBasePrice() * show.getPriceMultiplier());
        }

        int snacksSubtotal = 0;
        List<BookingSnack> bookingSnacks = new ArrayList<>();
        if (req.snacks() != null) {
            for (SnackOrderItem item : req.snacks()) {
                if (item.quantity() <= 0) continue;
                Snack snack = snackRepository.findById(item.snackId())
                        .orElseThrow(() -> new ResourceNotFoundException("Snack not found: " + item.snackId()));
                snacksSubtotal += snack.getPrice() * item.quantity();
                bookingSnacks.add(BookingSnack.builder()
                        .snack(snack)
                        .quantity(item.quantity())
                        .unitPrice(snack.getPrice())
                        .build());
            }
        }

        int convenienceFee = 30 + requestedSeats.size() * 15;
        int gstAmount = (int) Math.round(convenienceFee * 0.18) + (int) Math.round(snacksSubtotal * 0.05);
        int grandTotal = ticketSubtotal + snacksSubtotal + convenienceFee + gstAmount;

        String ref = "CV-2026-" + (10000 + new Random().nextInt(89999));
        String seatCodesStr = requestedSeats.stream().map(Seat::getSeatCode).collect(Collectors.joining(","));
        String qrPayload = String.format(
                "{\"ref\":\"%s\",\"movie\":\"%s\",\"theatre\":\"%s\",\"date\":\"%s\",\"time\":\"%s\",\"seats\":\"%s\",\"total\":%d}",
                ref,
                show.getMovie().getTitle(),
                show.getScreen().getTheatre().getName(),
                show.getShowDate(),
                show.getShowTime(),
                seatCodesStr,
                grandTotal
        );
        String qrBase64 = generateQrBase64(qrPayload);

        Booking booking = Booking.builder()
                .bookingReference(ref)
                .user(user)
                .show(show)
                .ticketSubtotal(ticketSubtotal)
                .snacksSubtotal(snacksSubtotal)
                .convenienceFee(convenienceFee)
                .gstAmount(gstAmount)
                .grandTotal(grandTotal)
                .status(BookingStatus.CONFIRMED)
                .qrPayload(qrPayload)
                .qrCodeBase64(qrBase64)
                .build();

        Booking saved = bookingRepository.save(booking);

        for (Seat seat : requestedSeats) {
            int seatPrice = (int) Math.round(seat.getCategory().getBasePrice() * show.getPriceMultiplier());
            BookingSeat bs = BookingSeat.builder()
                    .booking(saved)
                    .show(show)
                    .seat(seat)
                    .pricePaid(seatPrice)
                    .build();
            saved.getSeats().add(bs);
        }

        for (BookingSnack bs : bookingSnacks) {
            bs.setBooking(saved);
            saved.getSnacks().add(bs);
        }
        bookingRepository.save(saved);

        // Clear user's temporary locks on this show
        seatLockRepository.deleteByShowIdAndUserId(show.getId(), user.getId());

        // Payment Layer: Razorpay test mode if credentials configured, else explicit Demo Payment
        String mode = (req.paymentMode() != null && req.paymentMode().equals("RAZORPAY_TEST") && !razorpayKeyId.isBlank())
                ? "RAZORPAY_TEST"
                : "DEMO";
        PaymentStatus pStatus = "RAZORPAY_TEST".equals(mode) ? PaymentStatus.SUCCESS : PaymentStatus.DEMO_SUCCESS;
        String paymentRef = ("RAZORPAY_TEST".equals(mode) ? "RZP_TEST_" : "DEMO_PAY_") + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Payment payment = Payment.builder()
                .booking(saved)
                .paymentGatewayRef(paymentRef)
                .paymentMode(mode)
                .amount(grandTotal)
                .status(pStatus)
                .build();
        paymentRepository.save(payment);

        return toResponse(saved, payment);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> getMyBookings(String userEmail) {
        User user = userRepository.findByEmailIgnoreCase(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return bookingRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(b -> toResponse(b, null))
                .toList();
    }

    public BookingResponse toResponse(Booking b, Payment paymentOverride) {
        Show show = b.getShow();
        Movie movie = show.getMovie();
        Theatre theatre = show.getScreen().getTheatre();
        String pMode = paymentOverride != null ? paymentOverride.getPaymentMode() : "DEMO";
        String pId = paymentOverride != null ? paymentOverride.getPaymentGatewayRef() : "VERIFIED";

        return new BookingResponse(
                b.getId(),
                b.getBookingReference(),
                b.getUser().getId(),
                b.getUser().getName(),
                b.getUser().getEmail(),
                show.getId(),
                movie.getId(),
                movie.getTitle(),
                movie.getPosterUrl(),
                theatre.getName(),
                show.getScreen().getName(),
                theatre.getCity(),
                show.getShowDate(),
                show.getShowTime(),
                show.getLanguage(),
                show.getFormat(),
                b.getSeats().stream().map(bs -> bs.getSeat().getSeatCode()).toList(),
                b.getSeats().stream().map(bs -> bs.getSeat().getCategory()).toList(),
                b.getSnacks().stream().map(sn -> new BookingSnackSummary(
                        sn.getSnack().getName(), sn.getQuantity(), sn.getUnitPrice())).toList(),
                new BreakdownDto(
                        b.getTicketSubtotal(),
                        b.getSnacksSubtotal(),
                        b.getConvenienceFee(),
                        b.getGstAmount(),
                        b.getGrandTotal()
                ),
                pMode,
                pId,
                b.getStatus(),
                b.getQrPayload(),
                b.getQrCodeBase64(),
                b.getCreatedAt().toString()
        );
    }

    private String generateQrBase64(String content) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(content, BarcodeFormat.QR_CODE, 220, 220);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", out);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (Exception e) {
            return "";
        }
    }
}
