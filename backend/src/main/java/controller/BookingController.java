package controller;

import dto.BookingDecisionRequest;
import dto.BookingRequest;
import dto.BookingRateRequest;
import model.Booking;
import model.User;
import service.BookingService;
import service.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;

@RestController
@RequestMapping("/api/bookings")
public class BookingController {

    private final BookingService bookingService;
    private final CurrentUserService currentUserService;
    private static final Logger logger = LoggerFactory.getLogger(BookingController.class);

    public BookingController(BookingService bookingService, CurrentUserService currentUserService) {
        this.bookingService = bookingService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Booking> createBooking(@Valid @RequestBody BookingRequest request) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(bookingService.createBooking(request, user));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Page<Booking>> getMyBookings(@RequestParam(defaultValue = "0") int page,
                                                       @RequestParam(defaultValue = "10") int size,
                                                       @RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String date,
                                                       @RequestParam(required = false) String startDate,
                                                       @RequestParam(required = false) String endDate) {
        if (page < 0 || size <= 0) {
            logger.warn("Invalid pagination parameters: page={}, size={}", page, size);
            throw new IllegalArgumentException("Page must be >= 0 and size must be > 0.");
        }

        User user = currentUserService.getCurrentUser();
        if (user == null) {
            logger.error("Authenticated user not found in context");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        logger.info("Fetching bookings for user ID: {}, status: {}, date: {}, page: {}, size: {}", user.getId(), status, date, page, size);
        
        try {
            Pageable pageable = PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt"));
            Page<Booking> result = bookingService.getMyBookings(user.getId(), status, date, startDate, endDate, pageable);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.error("Error fetching bookings for user {}: {}", user.getId(), e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Booking>> getAllBookings(@RequestParam(defaultValue = "0") int page,
                                                        @RequestParam(defaultValue = "20") int size,
                                                        @RequestParam(required = false) String status,
                                                        @RequestParam(required = false) String date,
                                                        @RequestParam(required = false) String startDate,
                                                        @RequestParam(required = false) String endDate) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(bookingService.getAllBookings(status, date, startDate, endDate, pageable));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Booking> approveBooking(@PathVariable String id,
                                                  @Valid @RequestBody BookingDecisionRequest request) {
        User admin = currentUserService.getCurrentUser();
        return ResponseEntity.ok(bookingService.approveBooking(id, request.getReason(), admin));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Booking> rejectBooking(@PathVariable String id,
                                                 @Valid @RequestBody BookingDecisionRequest request) {
        User admin = currentUserService.getCurrentUser();
        return ResponseEntity.ok(bookingService.rejectBooking(id, request.getReason(), admin));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<Booking> cancelBooking(@PathVariable String id) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(bookingService.cancelBooking(id, user));
    }

    @PatchMapping("/{id}/rate")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<Booking> rateLecturer(@PathVariable String id,
                                                @Valid @RequestBody BookingRateRequest request) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(bookingService.rateLecturer(id, request.getRating(), user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Booking> updateBooking(@PathVariable String id, @Valid @RequestBody BookingRequest request) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(bookingService.updateBooking(id, request, user));
    }

    @GetMapping("/availability")
    public ResponseEntity<List<dto.TimeRange>> getAvailableSlots(@RequestParam String resourceId,
                                                                 @RequestParam String date) {
        java.time.LocalDate localDate = java.time.LocalDate.parse(date);
        return ResponseEntity.ok(bookingService.getAvailableSlots(resourceId, localDate));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getBookingSummary() {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(bookingService.getBookingSummary(user));
    }

    @GetMapping("/campus-status")
    public ResponseEntity<java.util.Map<String, Integer>> getCampusStatus() {
        return ResponseEntity.ok(bookingService.getCampusStatus());
    }

    @GetMapping("/sessions")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<List<Booking>> getSessions(@RequestParam(required = false) String year,
                                                     @RequestParam(required = false) String semester,
                                                     @RequestParam(required = false) String startDate,
                                                     @RequestParam(required = false) String endDate) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(bookingService.getSessionsByBatch(year, semester, startDate, endDate, user));
    }

    @PostMapping("/{id}/refresh-qr")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Booking> refreshQrCode(@PathVariable String id) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(bookingService.refreshQrCode(id, user));
    }
}


