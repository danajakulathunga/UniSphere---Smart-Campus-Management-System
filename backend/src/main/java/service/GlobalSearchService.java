package service;

import dto.GlobalSearchResult;
import model.Announcement;
import model.Booking;
import model.Notification;
import model.Resource;
import model.Ticket;
import model.User;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class GlobalSearchService {

    private final MongoTemplate mongoTemplate;
    private final CurrentUserService currentUserService;
    private final AnnouncementService announcementService;

    public GlobalSearchService(MongoTemplate mongoTemplate, CurrentUserService currentUserService, AnnouncementService announcementService) {
        this.mongoTemplate = mongoTemplate;
        this.currentUserService = currentUserService;
        this.announcementService = announcementService;
    }

    public GlobalSearchResult search(String queryText) {
        User currentUser = currentUserService.getCurrentUser();
        boolean isAdmin = currentUser.getRoles().contains(model.Role.ADMIN);
        boolean isLecturer = currentUser.getRoles().contains(model.Role.LECTURER);
        boolean isTechnician = currentUser.getRoles().contains(model.Role.TECHNICIAN);
        boolean isStudent = currentUser.getRoles().contains(model.Role.USER);

        if (queryText == null || queryText.isBlank()) {
            return new GlobalSearchResult(List.of(), List.of(), List.of(), List.of(), List.of(), List.of());
        }

        String safeRegex = Pattern.quote(queryText.trim());
        String options = "i"; // case-insensitive

        // 1. Search Resources (Facilities) - Always visible to all roles
        Query resourceQuery = new Query();
        resourceQuery.addCriteria(new Criteria().orOperator(
                Criteria.where("name").regex(safeRegex, options),
                Criteria.where("type").regex(safeRegex, options),
                Criteria.where("location").regex(safeRegex, options)
        ));
        resourceQuery.limit(5);
        List<GlobalSearchResult.SearchResultItem> facilities = mongoTemplate.find(resourceQuery, Resource.class)
                .stream()
                .map(r -> new GlobalSearchResult.SearchResultItem(
                        r.getId(),
                        r.getName(),
                        r.getLocation(),
                        r.getType(),
                        r.getStatus().toString(),
                        "/resources",
                        null
                ))
                .collect(Collectors.toList());

        // 2. Search Tickets - Role-based filtering
        Query ticketQuery = new Query();
        Criteria ticketCriteria = new Criteria().orOperator(
                Criteria.where("title").regex(safeRegex, options),
                Criteria.where("description").regex(safeRegex, options),
                Criteria.where("category").regex(safeRegex, options),
                Criteria.where("location").regex(safeRegex, options),
                Criteria.where("id").is(queryText.trim())
        );

        if (isAdmin) {
            ticketQuery.addCriteria(ticketCriteria);
        } else if (isTechnician) {
            ticketQuery.addCriteria(new Criteria().andOperator(
                ticketCriteria,
                Criteria.where("assignedTechnicianId").is(currentUser.getId())
            ));
        } else {
            // Student and Lecturer see their own
            ticketQuery.addCriteria(new Criteria().andOperator(
                ticketCriteria,
                Criteria.where("userId").is(currentUser.getId())
            ));
        }
        
        ticketQuery.limit(5);
        List<GlobalSearchResult.SearchResultItem> tickets = mongoTemplate.find(ticketQuery, Ticket.class)
                .stream()
                .map(t -> new GlobalSearchResult.SearchResultItem(
                        t.getId(),
                        t.getTitle(),
                        t.getDescription(),
                        t.getCategory(),
                        t.getStatus().toString(),
                        "/tickets",
                        isTechnician ? t.getAssignedTechnicianId() : t.getUserId()
                ))
                .collect(Collectors.toList());

        // 3. Search Bookings - Role-based filtering
        Query bookingQuery = new Query();
        Criteria bookingCriteria = new Criteria().orOperator(
                Criteria.where("resourceName").regex(safeRegex, options),
                Criteria.where("userName").regex(safeRegex, options),
                Criteria.where("purpose").regex(safeRegex, options)
        );

        if (isAdmin) {
            bookingQuery.addCriteria(bookingCriteria);
        } else if (isTechnician) {
            // Technicians usually don't have bookings, return empty or own if any
            bookingQuery.addCriteria(new Criteria().andOperator(bookingCriteria, Criteria.where("userId").is(currentUser.getId())));
        } else {
            // Student and Lecturer see their own
            bookingQuery.addCriteria(new Criteria().andOperator(bookingCriteria, Criteria.where("userId").is(currentUser.getId())));
        }

        bookingQuery.limit(5);
        List<GlobalSearchResult.SearchResultItem> bookings = mongoTemplate.find(bookingQuery, Booking.class)
                .stream()
                .map(b -> new GlobalSearchResult.SearchResultItem(
                        b.getId(),
                        b.getResourceName(),
                        b.getPurpose(),
                        "Booking",
                        b.getStatus().toString(),
                        "/bookings",
                        b.getUserId()
                ))
                .collect(Collectors.toList());

        // 4. Search Notifications - Strictly own notifications
        Query notificationQuery = new Query();
        notificationQuery.addCriteria(new Criteria().andOperator(
            new Criteria().orOperator(
                Criteria.where("title").regex(safeRegex, options),
                Criteria.where("message").regex(safeRegex, options)
            ),
            Criteria.where("userId").is(currentUser.getId())
        ));
        notificationQuery.limit(5);
        List<GlobalSearchResult.SearchResultItem> notifications = mongoTemplate.find(notificationQuery, Notification.class)
                .stream()
                .map(n -> new GlobalSearchResult.SearchResultItem(
                        n.getId(),
                        n.getTitle(),
                        n.getMessage(),
                        n.getType().toString(),
                        n.isRead() ? "READ" : "UNREAD",
                        "/notifications",
                        n.getUserId()
                ))
                .collect(Collectors.toList());

        // 5. Search Users - Role-based filtering
        List<GlobalSearchResult.SearchResultItem> users = List.of();
        if (isAdmin || isLecturer) {
            Query userQuery = new Query();
            Criteria userCriteria = new Criteria().orOperator(
                    Criteria.where("name").regex(safeRegex, options),
                    Criteria.where("email").regex(safeRegex, options)
            );

            if (isAdmin) {
                // Admin sees everyone except other admins maybe? Usually everyone.
                userQuery.addCriteria(userCriteria);
                userQuery.addCriteria(Criteria.where("roles").ne(model.Role.ADMIN));
            } else if (isLecturer) {
                // Lecturer sees students in their batch
                try {
                    String batchesStr = currentUser.getBatches();
                    if (batchesStr != null && !batchesStr.isEmpty()) {
                        List<String> assignedBatches = java.util.Arrays.stream(batchesStr.split(","))
                                .map(String::trim)
                                .filter(s -> !s.isEmpty())
                                .collect(Collectors.toList());
                        
                        // We need to filter in Java after fetching potential matches or use a complex regex
                        // Fetching matches and filtering in Java is easier for this complex mapping
                        userQuery.addCriteria(userCriteria);
                        userQuery.addCriteria(Criteria.where("roles").is(model.Role.USER));
                        
                        List<User> potentialStudents = mongoTemplate.find(userQuery, User.class);
                        users = potentialStudents.stream()
                            .filter(student -> {
                                String sYear = student.getYear();
                                String sSem = student.getSemester();
                                if (sYear == null || sSem == null) return false;
                                try {
                                    String sY = sYear.split(" ")[0].substring(0, 1);
                                    String sS = sSem.split(" ")[1];
                                    String studentBatchTag = "Y" + sY + "S" + sS;
                                    return assignedBatches.contains(studentBatchTag);
                                } catch (Exception e) { return false; }
                            })
                            .limit(5)
                            .map(u -> new GlobalSearchResult.SearchResultItem(
                                    u.getId(),
                                    u.getName(),
                                    u.getEmail(),
                                    "Student",
                                    u.isEnabled() ? "ACTIVE" : "INACTIVE",
                                    "/lecturer/students",
                                    currentUser.getId() // Map to lecturer to pass safeguard
                            ))
                            .collect(Collectors.toList());
                    }
                } catch (Exception e) {
                    // Fallback to empty if error in batch processing
                    users = List.of();
                }
            }

            if (isAdmin) {
                userQuery.limit(5);
                users = mongoTemplate.find(userQuery, User.class)
                        .stream()
                        .map(u -> new GlobalSearchResult.SearchResultItem(
                                u.getId(),
                                u.getName(),
                                u.getEmail(),
                                u.getRoles().contains(model.Role.USER) ? "Student" : "Staff",
                                u.isEnabled() ? "ACTIVE" : "INACTIVE",
                                u.getRoles().contains(model.Role.USER) ? "/users" : "/staff",
                                u.getId()
                        ))
                        .collect(Collectors.toList());
            }
        }

        // Search Announcements - Visible to this user
        List<Announcement> visibleAnnouncements = announcementService.getAnnouncementsForUser(currentUser);
        String lowerQuery = queryText.trim().toLowerCase();
        List<GlobalSearchResult.SearchResultItem> announcements = visibleAnnouncements.stream()
                .filter(a -> {
                    String title = a.getTitle() == null ? "" : a.getTitle().toLowerCase();
                    String message = a.getMessage() == null ? "" : a.getMessage().toLowerCase();
                    String postedBy = a.getPostedBy() == null ? "" : a.getPostedBy().toLowerCase();
                    String targetAudience = a.getTargetAudience() == null ? "" : a.getTargetAudience().toLowerCase();
                    String batchSemester = a.getBatchSemester() == null ? "" : a.getBatchSemester().toLowerCase();

                    return title.contains(lowerQuery) ||
                           message.contains(lowerQuery) ||
                           postedBy.contains(lowerQuery) ||
                           targetAudience.contains(lowerQuery) ||
                           batchSemester.contains(lowerQuery);
                })
                .limit(5)
                .map(a -> new GlobalSearchResult.SearchResultItem(
                        a.getId(),
                        a.getTitle(),
                        a.getMessage() == null ? "" : a.getMessage().replaceAll("<[^>]*>", "").trim(), // Strip HTML
                        "Announcement",
                        a.getType(),
                        "/announcements",
                        null
                ))
                .collect(Collectors.toList());

        // Search Lectures - Role-based filtering exactly like "My Lectures" page
        List<GlobalSearchResult.SearchResultItem> lectures = List.of();
        if (isStudent || isLecturer || isAdmin) {
            Query lectureQuery = new Query();
            lectureQuery.addCriteria(Criteria.where("status").in(model.BookingStatus.APPROVED, model.BookingStatus.PENDING, model.BookingStatus.CANCELLED));

            Criteria roleCriteria = null;
            if (isAdmin) {
                // Admin sees all lectures
                roleCriteria = Criteria.where("assignedBatch").ne(null);
            } else if (isLecturer) {
                // Lecturer sees their own created lectures/bookings
                roleCriteria = Criteria.where("userId").is(currentUser.getId());
            } else { // Student
                String year = currentUser.getYear();
                String semester = currentUser.getSemester();
                if (year != null && semester != null && !year.isBlank() && !semester.isBlank()) {
                    String yearNum = year.replaceAll("[^0-9]", "");
                    String semNum = semester.replaceAll("[^0-9]", "");
                    String batchTag = "Y" + yearNum + "S" + semNum;
                    roleCriteria = Criteria.where("assignedBatch").is(batchTag);
                }
            }

            if (roleCriteria != null) {
                lectureQuery.addCriteria(roleCriteria);
                
                List<model.Booking> allSessions = mongoTemplate.find(lectureQuery, model.Booking.class);
                
                lectures = allSessions.stream()
                        .filter(s -> {
                            String title = s.getPurpose() == null ? "" : s.getPurpose().toLowerCase();
                            String lecturerName = s.getUserName() == null ? "" : s.getUserName().toLowerCase();
                            String locName = s.getResourceName() == null ? "" : s.getResourceName().toLowerCase();
                            String locDetail = s.getCampusLocation() == null ? "" : s.getCampusLocation().toLowerCase();
                            String batch = s.getAssignedBatch() == null ? "" : s.getAssignedBatch().toLowerCase();
                            String description = s.getSessionDetails() == null ? "" : s.getSessionDetails().toLowerCase();

                            String dateStr = s.getBookingDate() == null ? "" : s.getBookingDate().toString().toLowerCase();
                            String startTimeStr = s.getStartTime() == null ? "" : s.getStartTime().toString().toLowerCase();
                            String endTimeStr = s.getEndTime() == null ? "" : s.getEndTime().toString().toLowerCase();

                            String dateEn = "";
                            String dateSi = "";
                            String dateTa = "";
                            if (s.getBookingDate() != null) {
                                try {
                                    dateEn = s.getBookingDate().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy", java.util.Locale.ENGLISH)).toLowerCase();
                                    dateSi = s.getBookingDate().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy", new java.util.Locale("si"))).toLowerCase();
                                    dateTa = s.getBookingDate().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy", new java.util.Locale("ta"))).toLowerCase();
                                } catch (Exception e) {}
                            }

                            String timeEn = "";
                            if (s.getStartTime() != null && s.getEndTime() != null) {
                                try {
                                    java.time.format.DateTimeFormatter timeFormatter = java.time.format.DateTimeFormatter.ofPattern("hh:mm a", java.util.Locale.ENGLISH);
                                    timeEn = (s.getStartTime().format(timeFormatter) + " - " + s.getEndTime().format(timeFormatter)).toLowerCase();
                                } catch (Exception e) {}
                            }

                            boolean matchesMaterial = false;
                            if (s.getLectureMaterials() != null) {
                                for (String path : s.getLectureMaterials()) {
                                    String fileName = path.substring(path.lastIndexOf('/') + 1).toLowerCase();
                                    if (fileName.contains(lowerQuery)) {
                                        matchesMaterial = true;
                                        break;
                                    }
                                }
                            }

                            return title.contains(lowerQuery) ||
                                   lecturerName.contains(lowerQuery) ||
                                   locName.contains(lowerQuery) ||
                                   locDetail.contains(lowerQuery) ||
                                   batch.contains(lowerQuery) ||
                                   description.contains(lowerQuery) ||
                                   dateStr.contains(lowerQuery) ||
                                   startTimeStr.contains(lowerQuery) ||
                                   endTimeStr.contains(lowerQuery) ||
                                   dateEn.contains(lowerQuery) ||
                                   dateSi.contains(lowerQuery) ||
                                   dateTa.contains(lowerQuery) ||
                                   timeEn.contains(lowerQuery) ||
                                   matchesMaterial;
                        })
                        .limit(5)
                        .map(s -> new GlobalSearchResult.SearchResultItem(
                                s.getId(),
                                s.getPurpose(),
                                s.getUserName() + " | " + s.getResourceName(),
                                "Lecture",
                                s.getStatus().toString(),
                                "/my-lectures",
                                s.getUserId()
                        ))
                        .collect(Collectors.toList());
            }
        }

        return new GlobalSearchResult(facilities, tickets, bookings, notifications, users, announcements, lectures);
    }
}
