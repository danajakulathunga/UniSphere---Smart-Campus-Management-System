package service;

import dto.BookingRequest;
import model.Booking;
import model.BookingStatus;
import model.NotificationType;
import model.Role;
import model.Resource;
import model.ResourceStatus;
import model.User;
import repository.BookingRepository;
import repository.ResourceRepository;
import repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import dto.TimeRange;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final NotificationService notificationService;
    private final MongoTemplate mongoTemplate;
    private final FileService fileService;
    private final UserRepository userRepository;
    private static final Logger logger = LoggerFactory.getLogger(BookingService.class);

    public BookingService(BookingRepository bookingRepository,
            ResourceRepository resourceRepository,
            NotificationService notificationService,
            MongoTemplate mongoTemplate,
            FileService fileService,
            UserRepository userRepository) {
        this.bookingRepository = bookingRepository;
        this.resourceRepository = resourceRepository;
        this.notificationService = notificationService;
        this.mongoTemplate = mongoTemplate;
        this.fileService = fileService;
        this.userRepository = userRepository;
    }

    public Booking createBooking(BookingRequest request, User user) {
        validateTimeRange(request);

        logger.info("Creating booking for resource: {} on date: {} from {} to {}",
                request.getResourceId(), request.getBookingDate(), request.getStartTime(), request.getEndTime());

        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> {
                    logger.error("Resource not found with ID: {}", request.getResourceId());
                    return new IllegalArgumentException("Resource not found.");
                });

        if (!Boolean.TRUE.equals(resource.getAvailability()) || resource.getStatus() == ResourceStatus.OUT_OF_SERVICE) {
            logger.warn("Resource {} is unavailable. Availability: {}, Status: {}",
                    resource.getName(), resource.getAvailability(), resource.getStatus());
            throw new IllegalArgumentException("This resource is currently unavailable.");
        }

        ensureNoConflict(resource.getId(), request.getBookingDate(), request.getStartTime(), request.getEndTime(),
                null);

        Booking booking = new Booking();
        booking.setResourceId(resource.getId());
        booking.setResourceName(resource.getName());
        booking.setCampusLocation(resource.getLocation());
        booking.setUserId(user.getId());
        booking.setUserName(user.getName());
        booking.setBookingDate(request.getBookingDate());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose().trim());
        booking.setAssignedBatch(request.getAssignedBatch());
        booking.setSessionDetails(request.getSessionDetails());
        booking.setCapacity(request.getCapacity());
        booking.setIsUpdated(false);
        booking.setQrCode(java.util.UUID.randomUUID().toString());

        if (request.getLectureMaterials() != null && !request.getLectureMaterials().isEmpty()) {
            List<String> savedPaths = new ArrayList<>();
            for (String base64 : request.getLectureMaterials()) {
                String path = fileService.saveBase64File(base64, "lecMaterials");
                if (path != null)
                    savedPaths.add(path);
            }
            booking.setLectureMaterials(savedPaths);
        }

        booking.setStatus(BookingStatus.PENDING);
        booking.setCreatedAt(LocalDateTime.now());

        Booking saved = bookingRepository.save(booking);

        notificationService.createForRole(
                Role.ADMIN,
                "New booking request",
                user.getName() + " created a booking request for " + booking.getResourceName() + ".",
                NotificationType.BOOKING_CREATED,
                "BOOKING",
                booking.getId(),
                java.util.Set.of(user.getId()));

        return saved;
    }

    public Booking updateBooking(String id, BookingRequest request, User user) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found."));

        if (!booking.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only update your own bookings.");
        }

        // Allow updating PENDING or APPROVED bookings
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalArgumentException("Only pending or approved bookings can be updated.");
        }

        validateTimeRange(request);

        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new IllegalArgumentException("Resource not found."));

        if (!Boolean.TRUE.equals(resource.getAvailability()) || resource.getStatus() == ResourceStatus.OUT_OF_SERVICE) {
            throw new IllegalArgumentException("This resource is currently unavailable.");
        }

        // Check if critical fields (time/location) have changed to ensure no conflicts
        boolean timeLocationChanged = !booking.getResourceId().equals(request.getResourceId()) ||
                !booking.getBookingDate().equals(request.getBookingDate()) ||
                !booking.getStartTime().equals(request.getStartTime()) ||
                !booking.getEndTime().equals(request.getEndTime());

        if (timeLocationChanged) {
            ensureNoConflict(resource.getId(), request.getBookingDate(), request.getStartTime(), request.getEndTime(),
                    id);
        }

        // Only reset to PENDING if it wasn't already APPROVED
        if (booking.getStatus() != BookingStatus.APPROVED) {
            booking.setStatus(BookingStatus.PENDING);
            // Update "Submitted" timestamp to current time for new submissions
            booking.setCreatedAt(LocalDateTime.now());
        }

        // Check if it's a share or update for students
        boolean isNewlyShared = booking.getAssignedBatch() == null && request.getAssignedBatch() != null;
        boolean isBatchUpdate = booking.getAssignedBatch() != null;

        booking.setResourceId(resource.getId());
        booking.setResourceName(resource.getName());
        booking.setCampusLocation(resource.getLocation());
        booking.setBookingDate(request.getBookingDate());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose().trim());
        booking.setAssignedBatch(request.getAssignedBatch());
        booking.setSessionDetails(request.getSessionDetails());
        booking.setCapacity(request.getCapacity());
        if (isBatchUpdate) {
            booking.setIsUpdated(true);
        }
        if (booking.getQrCode() == null) {
            booking.setQrCode(java.util.UUID.randomUUID().toString());
        }

        if (request.getLectureMaterials() != null) {
            List<String> savedPaths = new ArrayList<>();
            for (String material : request.getLectureMaterials()) {
                // If it's already an upload path, keep it
                if (material.startsWith("/uploads/")) {
                    savedPaths.add(material);
                } else {
                    String path = fileService.saveBase64File(material, "lecMaterials");
                    if (path != null)
                        savedPaths.add(path);
                }
            }
            booking.setLectureMaterials(savedPaths);
        }

        Booking saved = bookingRepository.save(booking);
        logger.info("Booking updated: {}", saved.getId());

        // Notify Students
        if (saved.getAssignedBatch() != null) {
            String title = "New Lecture Shared";
            String message = saved.getPurpose() + " is available for your batch";
            NotificationType nType = NotificationType.LECTURE_SHARED;

            // If it was already shared (assignedBatch was not null), it's an update
            if (isBatchUpdate) {
                title = "Lecture Updated";
                message = saved.getPurpose() + " has been updated";
                nType = NotificationType.LECTURE_UPDATED;
            }

            notificationService.createForBatch(
                    saved.getAssignedBatch(),
                    title,
                    message,
                    nType,
                    "LECTURE",
                    saved.getId(),
                    java.util.Set.of(user.getId()));

            logger.info("LECTURE notification triggered for batch: {}", saved.getAssignedBatch());
            System.out.println("Notification created for batch: " + saved.getAssignedBatch() + " (Booking: "
                    + saved.getId() + ")");
        }

        // Notify Admin about the update/re-submission as a new request for approval
        notificationService.createForRole(
                Role.ADMIN,
                "Booking Re-submission",
                user.getName() + " has updated their reservation for " + booking.getResourceName() +
                        ". This requires your re-approval.",
                NotificationType.BOOKING_CREATED,
                "BOOKING",
                booking.getId(),
                java.util.Set.of(user.getId()));

        return saved;
    }

    public Page<Booking> getMyBookings(String userId, String status, String date, String startDate, String endDate, Pageable pageable) {
        if (userId == null || userId.trim().isEmpty()) {
            logger.error("Attempted to fetch bookings for null or empty user ID");
            return Page.empty(pageable);
        }

        java.time.LocalDate localDate = null;
        if (date != null && !date.trim().isEmpty()) {
            try {
                localDate = java.time.LocalDate.parse(date);
            } catch (Exception e) {
                logger.warn("Invalid date format: {}", date);
            }
        }

        BookingStatus bookingStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                bookingStatus = BookingStatus.valueOf(status.toUpperCase());
            } catch (Exception e) {
                logger.warn("Invalid status: {}", status);
            }
        }

        logger.debug("Service fetching bookings for user: {}, status: {}, date: {}, startDate: {}, endDate: {}", userId, bookingStatus, localDate, startDate, endDate);

        try {
            Query query = new Query();
            query.addCriteria(Criteria.where("userId").is(userId));

            if (bookingStatus != null) {
                query.addCriteria(Criteria.where("status").is(bookingStatus));
            }

            if (localDate != null) {
                query.addCriteria(Criteria.where("bookingDate").is(localDate));
            } else {
                java.time.LocalDate start = null;
                java.time.LocalDate end = null;
                if (startDate != null && !startDate.trim().isEmpty()) {
                    try { start = java.time.LocalDate.parse(startDate); } catch(Exception e) {}
                }
                if (endDate != null && !endDate.trim().isEmpty()) {
                    try { end = java.time.LocalDate.parse(endDate); } catch(Exception e) {}
                }
                if (start != null && end != null) {
                    query.addCriteria(Criteria.where("bookingDate").gte(start).lte(end));
                } else if (start != null) {
                    query.addCriteria(Criteria.where("bookingDate").gte(start));
                } else if (end != null) {
                    query.addCriteria(Criteria.where("bookingDate").lte(end));
                }
            }

            long totalCount = mongoTemplate.count(query, Booking.class);
            query.with(pageable);
            List<Booking> list = mongoTemplate.find(query, Booking.class);
            return new org.springframework.data.domain.PageImpl<>(list, pageable, totalCount);
        } catch (Exception e) {
            logger.error("Database error while fetching bookings for user {}: {}", userId, e.getMessage(), e);
            throw new RuntimeException("Could not retrieve bookings from database", e);
        }
    }

    public Page<Booking> getAllBookings(String status, String date, String startDate, String endDate, Pageable pageable) {
        java.time.LocalDate localDate = null;
        if (date != null && !date.trim().isEmpty()) {
            try {
                localDate = java.time.LocalDate.parse(date);
            } catch (Exception e) {
                logger.warn("Invalid date format: {}", date);
            }
        }

        BookingStatus bookingStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                bookingStatus = BookingStatus.valueOf(status.toUpperCase());
            } catch (Exception e) {
                logger.warn("Invalid status: {}", status);
            }
        }

        logger.debug("Service fetching all bookings with status: {}, date: {}, startDate: {}, endDate: {}", bookingStatus, localDate, startDate, endDate);

        try {
            Query query = new Query();
            if (bookingStatus != null) {
                query.addCriteria(Criteria.where("status").is(bookingStatus));
            }

            if (localDate != null) {
                query.addCriteria(Criteria.where("bookingDate").is(localDate));
            } else {
                java.time.LocalDate start = null;
                java.time.LocalDate end = null;
                if (startDate != null && !startDate.trim().isEmpty()) {
                    try { start = java.time.LocalDate.parse(startDate); } catch(Exception e) {}
                }
                if (endDate != null && !endDate.trim().isEmpty()) {
                    try { end = java.time.LocalDate.parse(endDate); } catch(Exception e) {}
                }
                if (start != null && end != null) {
                    query.addCriteria(Criteria.where("bookingDate").gte(start).lte(end));
                } else if (start != null) {
                    query.addCriteria(Criteria.where("bookingDate").gte(start));
                } else if (end != null) {
                    query.addCriteria(Criteria.where("bookingDate").lte(end));
                }
            }

            long totalCount = mongoTemplate.count(query, Booking.class);
            query.with(pageable);
            List<Booking> list = mongoTemplate.find(query, Booking.class);
            return new org.springframework.data.domain.PageImpl<>(list, pageable, totalCount);
        } catch (Exception e) {
            logger.error("Database error while fetching all bookings: {}", e.getMessage(), e);
            throw new RuntimeException("Could not retrieve global bookings", e);
        }
    }

    public Booking approveBooking(String bookingId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found."));

        ensureNoConflict(booking.getResourceId(), booking.getBookingDate(), booking.getStartTime(),
                booking.getEndTime(), booking.getId());

        booking.setStatus(BookingStatus.APPROVED);
        booking.setDecisionReason(reason);
        Booking saved = bookingRepository.save(booking);

        notificationService.createForUser(
                booking.getUserId(),
                null, // Role is determined by the user's role in createForUser if needed
                "Booking approved",
                "Your booking for " + booking.getResourceName() + " has been approved.",
                NotificationType.BOOKING_APPROVED,
                "BOOKING",
                booking.getId());

        return saved;
    }

    public Booking rejectBooking(String bookingId, String reason) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found."));

        booking.setStatus(BookingStatus.REJECTED);
        booking.setDecisionReason(reason);
        Booking saved = bookingRepository.save(booking);

        notificationService.createForUser(
                booking.getUserId(),
                null,
                "Booking rejected",
                "Your booking for " + booking.getResourceName() + " was rejected. Reason: " + reason,
                NotificationType.BOOKING_REJECTED,
                "BOOKING",
                booking.getId());

        return saved;
    }

    public Booking cancelBooking(String bookingId, User actor) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found."));

        boolean owner = booking.getUserId().equals(actor.getId());
        boolean admin = actor.getRoles() != null
                && actor.getRoles().stream().anyMatch(role -> role.name().equals("ADMIN"));
        if (!owner && !admin) {
            throw new IllegalArgumentException("You are not allowed to cancel this booking.");
        }

        // Allow cancelling PENDING or APPROVED bookings
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalArgumentException("Only pending or approved bookings can be cancelled.");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        Booking saved = bookingRepository.save(booking);
        logger.info("Booking cancelled: {}", saved.getId());

        // Notify owner if booking was cancelled by someone else (e.g. Admin)
        if (!owner) {
            notificationService.createForUser(
                    booking.getUserId(),
                    null,
                    "Booking Cancelled",
                    "Your booking for " + booking.getResourceName() + " has been cancelled.",
                    NotificationType.BOOKING_CANCELLED,
                    "BOOKING",
                    booking.getId());
        }

        // Notify Students if it was shared
        if (booking.getAssignedBatch() != null) {
            notificationService.createForBatch(
                    booking.getAssignedBatch(),
                    "Lecture Canceled",
                    booking.getPurpose() + " has been canceled",
                    NotificationType.LECTURE_CANCELLED,
                    "LECTURE",
                    booking.getId(),
                    java.util.Set.of(actor.getId()));
        }

        notificationService.createForRole(
                Role.ADMIN,
                "Booking cancelled",
                "Booking cancelled by " + actor.getName() + " for " + booking.getResourceName() +
                        " on " + booking.getBookingDate() + " at " + booking.getStartTime() + ".",
                NotificationType.BOOKING_CANCELLED,
                "BOOKING",
                booking.getId(),
                java.util.Set.of(actor.getId()));

        return saved;
    }

    public List<TimeRange> getAvailableSlots(String resourceId, java.time.LocalDate date) {
        List<Booking> bookings = bookingRepository.findByResourceIdAndBookingDateAndStatusIn(
                resourceId,
                date,
                List.of(BookingStatus.PENDING, BookingStatus.APPROVED));

        List<Booking> sortedBookings = bookings.stream()
                .sorted(Comparator.comparing(Booking::getStartTime))
                .collect(Collectors.toList());

        List<TimeRange> availableSlots = new ArrayList<>();
        LocalTime dayStart = LocalTime.MIN;
        LocalTime dayEnd = LocalTime.MAX.withSecond(0).withNano(0); // 23:59

        LocalTime current = dayStart;

        for (Booking booking : sortedBookings) {
            if (booking.getStartTime().isAfter(current)) {
                availableSlots.add(new TimeRange(current, booking.getStartTime()));
            }
            if (booking.getEndTime().isAfter(current)) {
                current = booking.getEndTime();
            }
        }

        if (current.isBefore(dayEnd)) {
            availableSlots.add(new TimeRange(current, dayEnd));
        }

        return availableSlots;
    }

    private void validateTimeRange(BookingRequest request) {
        if (!request.getEndTime().isAfter(request.getStartTime())) {
            throw new IllegalArgumentException("End time must be after start time.");
        }
    }

    private void ensureNoConflict(String resourceId,
            java.time.LocalDate date,
            java.time.LocalTime start,
            java.time.LocalTime end,
            String currentBookingId) {
        List<Booking> existing = bookingRepository.findByResourceIdAndBookingDateAndStatusIn(
                resourceId,
                date,
                List.of(BookingStatus.PENDING, BookingStatus.APPROVED));

        boolean hasConflict = existing.stream().anyMatch(booking -> {
            if (currentBookingId != null && booking.getId().equals(currentBookingId)) {
                return false;
            }
            return start.isBefore(booking.getEndTime()) && end.isAfter(booking.getStartTime());
        });

        if (hasConflict) {
            throw new IllegalArgumentException(
                    "Selected time slot or location is not available. Please choose a different time or resource.");
        }
    }

    public java.util.Map<String, Object> getBookingSummary(User user) {
        boolean isAdmin = user.getRoles() != null && user.getRoles().stream().anyMatch(r -> r.name().equals("ADMIN"));
        boolean isLecturer = user.getRoles() != null
                && user.getRoles().stream().anyMatch(r -> r.name().equals("LECTURER"));

        java.util.Map<String, Long> statusCounts = new java.util.HashMap<>();
        long total;

        if (isAdmin) {
            for (BookingStatus s : BookingStatus.values()) {
                statusCounts.put(s.name(), bookingRepository.countByStatus(s));
            }
            total = bookingRepository.count();
        } else {
            // Both USER and LECTURER see their own stats
            for (BookingStatus s : BookingStatus.values()) {
                statusCounts.put(s.name(), bookingRepository.countByUserIdAndStatus(user.getId(), s));
            }
            total = bookingRepository.countByUserId(user.getId());
        }

        java.util.Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("statusCounts", statusCounts);
        summary.put("total", total);

        if (isAdmin) {
            java.util.List<java.util.Map<String, Object>> trends = new java.util.ArrayList<>();
            LocalDate today = LocalDate.now();
            for (int i = 6; i >= 0; i--) {
                LocalDate date = today.minusDays(i);
                long count = bookingRepository.countByBookingDate(date);
                java.util.Map<String, Object> dayTrend = new java.util.HashMap<>();
                dayTrend.put("name", date.getDayOfWeek().name().substring(0, 3));
                dayTrend.put("bookings", count);
                trends.add(dayTrend);
            }
            summary.put("trends", trends);

            // Lecturer Leaderboard
            Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("rating").ne(null)),
                Aggregation.group("userId")
                    .count().as("count")
                    .avg("rating").as("avgRating"),
                Aggregation.sort(org.springframework.data.domain.Sort.Direction.DESC, "count"),
                Aggregation.limit(5)
            );

            AggregationResults<java.util.Map> results = mongoTemplate.aggregate(agg, "bookings", java.util.Map.class);
            java.util.List<java.util.Map<String, Object>> leaderboard = new java.util.ArrayList<>();

            for (java.util.Map result : results.getMappedResults()) {
                String lecturerId = (String) result.get("_id");
                Long count = ((Number) result.get("count")).longValue();
                Double avgRating = result.get("avgRating") != null ? ((Number) result.get("avgRating")).doubleValue() : 0.0;
                
                User lecturer = userRepository.findById(lecturerId).orElse(null);
                if (lecturer != null) {
                    java.util.Map<String, Object> lecStats = new java.util.HashMap<>();
                    lecStats.put("id", lecturerId);
                    lecStats.put("name", lecturer.getName());
                    lecStats.put("profilePicture", lecturer.getProfilePicture());
                    lecStats.put("sessions", count);
                    lecStats.put("rating", Math.round(avgRating * 10.0) / 10.0);
                    leaderboard.add(lecStats);
                }
            }
            summary.put("leaderboard", leaderboard);
        }

        return summary;
    }

    public void updateUserNames(String userId, String newName) {
        Query query = new Query(Criteria.where("userId").is(userId));
        Update update = new Update().set("userName", newName);
        mongoTemplate.updateMulti(query, update, Booking.class);
    }

    public java.util.Map<String, Integer> getCampusStatus() {
        List<Resource> allResources = resourceRepository.findAll();
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        // Get all approved bookings for today
        List<Booking> todayApproved = bookingRepository.findAllByBookingDateAndStatusIn(
                today, List.of(BookingStatus.APPROVED));

        // Find resources that have an active booking right now
        java.util.Set<String> occupiedResourceIds = todayApproved.stream()
                .filter(b -> (now.equals(b.getStartTime()) || now.isAfter(b.getStartTime())) &&
                        (now.equals(b.getEndTime()) || now.isBefore(b.getEndTime())))
                .map(Booking::getResourceId)
                .collect(Collectors.toSet());

        int available = 0;
        int inUse = 0;
        int maintenance = 0;

        for (Resource r : allResources) {
            if (r.getStatus() == ResourceStatus.OUT_OF_SERVICE) {
                maintenance++;
            } else if (occupiedResourceIds.contains(r.getId())) {
                inUse++;
            } else {
                // Also check if availability flag is manually set to false (e.g. for special
                // events)
                if (Boolean.FALSE.equals(r.getAvailability())) {
                    inUse++;
                } else {
                    available++;
                }
            }
        }

        java.util.Map<String, Integer> stats = new java.util.HashMap<>();
        stats.put("available", available);
        stats.put("inUse", inUse);
        stats.put("maintenance", maintenance);
        return stats;
    }

    public List<Booking> getSessionsByBatch(String year, String semester, String startDate, String endDate, User currentUser) {
        Query query = new Query();

        // Date range criteria
        java.time.LocalDate start = null;
        java.time.LocalDate end = null;
        if (startDate != null && !startDate.trim().isEmpty()) {
            try { start = java.time.LocalDate.parse(startDate); } catch(Exception e) {}
        }
        if (endDate != null && !endDate.trim().isEmpty()) {
            try { end = java.time.LocalDate.parse(endDate); } catch(Exception e) {}
        }
        if (start != null && end != null) {
            query.addCriteria(Criteria.where("bookingDate").gte(start).lte(end));
        } else if (start != null) {
            query.addCriteria(Criteria.where("bookingDate").gte(start));
        } else if (end != null) {
            query.addCriteria(Criteria.where("bookingDate").lte(end));
        }

        // Status criteria
        query.addCriteria(Criteria.where("status").in(BookingStatus.APPROVED, BookingStatus.PENDING, BookingStatus.CANCELLED));

        // Batch / User criteria
        if (year == null || semester == null || "Not specified".equals(year) || year.isEmpty()) {
            Criteria batchOrUser = new Criteria().orOperator(
                Criteria.where("assignedBatch").ne(null),
                Criteria.where("userId").is(currentUser.getId())
            );
            query.addCriteria(batchOrUser);
        } else {
            String yearNum = year.replaceAll("[^0-9]", "");
            String semNum = semester.replaceAll("[^0-9]", "");
            String batchTag = "Y" + yearNum + "S" + semNum;
            query.addCriteria(Criteria.where("assignedBatch").is(batchTag));
        }

        // Sort by bookingDate and startTime descending
        query.with(org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "bookingDate", "startTime"));

        List<Booking> sessions = mongoTemplate.find(query, Booking.class);
        boolean anyUpdated = false;
        for (Booking booking : sessions) {
            if (booking.getQrCode() == null || booking.getQrCode().trim().isEmpty()) {
                booking.setQrCode(java.util.UUID.randomUUID().toString());
                bookingRepository.save(booking);
                anyUpdated = true;
            }
        }
        if (anyUpdated) {
            logger.info("Auto-generated QR code UUIDs for sessions with missing QR codes.");
        }
        return sessions;
    }

    public Booking rateLecturer(String id, Integer rating, User actor) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found."));

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new IllegalArgumentException("You can only rate approved lecture sessions.");
        }

        booking.setRating(rating);
        return bookingRepository.save(booking);
    }

    public Booking refreshQrCode(String id, User user) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Booking not found."));

        // Security check
        boolean isAdmin = user.getRoles() != null && user.getRoles().contains(Role.ADMIN);
        boolean isOwner = booking.getUserId().equals(user.getId());
        
        boolean isSharedStudent = false;
        if (user.getRoles() != null && user.getRoles().contains(Role.USER)) {
            // Check if batch matches
            if (booking.getAssignedBatch() != null && !booking.getAssignedBatch().isBlank()) {
                String yNum = user.getYear() != null ? user.getYear().replaceAll("[^0-9]", "") : "";
                String sNum = user.getSemester() != null ? user.getSemester().replaceAll("[^0-9]", "") : "";
                String studentBatchTag = "Y" + yNum + "S" + sNum;
                isSharedStudent = booking.getAssignedBatch().equals(studentBatchTag);
            }
        }

        if (!isAdmin && !isOwner && !isSharedStudent) {
            throw new IllegalArgumentException("You are not authorized to access this booking.");
        }

        booking.setQrCode(java.util.UUID.randomUUID().toString());
        return bookingRepository.save(booking);
    }
}
