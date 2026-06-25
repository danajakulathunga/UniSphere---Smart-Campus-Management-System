package controller;

import model.Attendance;
import model.Booking;
import model.NotificationType;
import model.Role;
import model.User;
import repository.AttendanceRepository;
import repository.UserRepository;
import service.CurrentUserService;
import service.NotificationService;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private final AttendanceRepository attendanceRepository;
    private final UserRepository userRepository;
    private final MongoTemplate mongoTemplate;
    private final CurrentUserService currentUserService;
    private final NotificationService notificationService;

    public AttendanceController(AttendanceRepository attendanceRepository,
                                UserRepository userRepository,
                                MongoTemplate mongoTemplate,
                                CurrentUserService currentUserService,
                                NotificationService notificationService) {
        this.attendanceRepository = attendanceRepository;
        this.userRepository = userRepository;
        this.mongoTemplate = mongoTemplate;
        this.currentUserService = currentUserService;
        this.notificationService = notificationService;
    }

    // Request payload for submission
    public static class AttendanceRequest {
        private String qrCode;
        private String studentName;
        private String studentEmail;

        public String getQrCode() {
            return qrCode;
        }

        public void setQrCode(String qrCode) {
            this.qrCode = qrCode;
        }

        public String getStudentName() {
            return studentName;
        }

        public void setStudentName(String studentName) {
            this.studentName = studentName;
        }

        public String getStudentEmail() {
            return studentEmail;
        }

        public void setStudentEmail(String studentEmail) {
            this.studentEmail = studentEmail;
        }
    }

    private boolean isSharedWithUserBatch(Booking booking, User user) {
        if (booking.getAssignedBatch() == null) {
            return false;
        }
        if (user.getYear() == null || user.getSemester() == null) {
            return false;
        }
        String yNum = user.getYear().replaceAll("[^0-9]", "");
        String sNum = user.getSemester().replaceAll("[^0-9]", "");
        String studentBatchTag = "Y" + yNum + "S" + sNum;
        return booking.getAssignedBatch().equals(studentBatchTag);
    }

    @GetMapping("/qr-details/{qrCode}")
    public ResponseEntity<?> getQrDetails(@PathVariable String qrCode) {
        Query query = new Query(Criteria.where("qrCode").is(qrCode));
        Booking booking = mongoTemplate.findOne(query, Booking.class);
        if (booking == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "This attendance session is no longer available"));
        }

        // Check if cancelled
        if (booking.getStatus() == model.BookingStatus.CANCELLED) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", "This attendance session is no longer available"));
        }

        // Check if shared
        if (booking.getAssignedBatch() == null || booking.getAssignedBatch().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "This attendance session is no longer available"));
        }

        // Check if expired
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sessionEnd = LocalDateTime.of(booking.getBookingDate(), booking.getEndTime());
        if (now.isAfter(sessionEnd)) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", "This attendance session is no longer available"));
        }

        // If authenticated user is a student, verify batch matching
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            Object principal = auth.getPrincipal();
            if (principal instanceof security.UserDetailsImpl userDetails) {
                User user = userRepository.findById(userDetails.getId()).orElse(null);
                if (user != null) {
                    boolean isStudent = user.getRoles() != null && user.getRoles().contains(Role.USER);
                    if (isStudent && !isSharedWithUserBatch(booking, user)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "This lecture session is not shared with your academic batch."));
                    }
                }
            }
        }

        return ResponseEntity.ok(booking);
    }

    @PostMapping
    public ResponseEntity<?> submitAttendance(@RequestBody AttendanceRequest request) {
        if (request.getQrCode() == null || request.getQrCode().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "QR Code is required."));
        }

        Query query = new Query(Criteria.where("qrCode").is(request.getQrCode()));
        Booking booking = mongoTemplate.findOne(query, Booking.class);
        if (booking == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "This attendance session is no longer available"));
        }

        // Check cancelled
        if (booking.getStatus() == model.BookingStatus.CANCELLED) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", "This attendance session is no longer available"));
        }

        // Check shared
        if (booking.getAssignedBatch() == null || booking.getAssignedBatch().isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "This attendance session is no longer available"));
        }

        // Check expired
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sessionEnd = LocalDateTime.of(booking.getBookingDate(), booking.getEndTime());
        if (now.isAfter(sessionEnd)) {
            return ResponseEntity.status(HttpStatus.GONE).body(Map.of("message", "This attendance session is no longer available"));
        }

        // Get details from current user if authenticated
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        User student = null;
        if (auth != null && auth.isAuthenticated() && !(auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            Object principal = auth.getPrincipal();
            if (principal instanceof security.UserDetailsImpl userDetails) {
                student = userRepository.findById(userDetails.getId()).orElse(null);
            }
        }

        String studentId;
        String studentName;
        String studentEmail;

        if (student != null) {
            boolean isStudent = student.getRoles() != null && student.getRoles().contains(Role.USER);
            if (isStudent && !isSharedWithUserBatch(booking, student)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "This lecture session is not shared with your academic batch."));
            }
            studentId = student.getId();
            studentName = student.getName();
            studentEmail = student.getEmail();
        } else {
            if (request.getStudentName() == null || request.getStudentName().isBlank() ||
                request.getStudentEmail() == null || request.getStudentEmail().isBlank()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Full Name and Email Address are required."));
            }
            studentId = null;
            studentName = request.getStudentName();
            studentEmail = request.getStudentEmail();
        }

        // Check duplicate by email
        boolean alreadySubmitted = attendanceRepository.existsByStudentEmailAndLectureSessionId(studentEmail, booking.getId());
        if (alreadySubmitted) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Attendance has already been recorded."));
        }

        Attendance attendance = new Attendance();
        attendance.setStudentId(studentId);
        attendance.setStudentName(studentName);
        attendance.setStudentEmail(studentEmail);
        attendance.setLecturerId(booking.getUserId());
        attendance.setBookingId(booking.getId());
        attendance.setLectureSessionId(booking.getId());
        attendance.setSubmittedDate(LocalDate.now());
        attendance.setSubmittedTime(LocalTime.now());
        attendance.setCreatedAt(LocalDateTime.now());

        Attendance saved = attendanceRepository.save(attendance);

        // 7. DATA VALIDATION RULES & safe fallbacks
        String sName = studentName;
        if (sName == null || sName.trim().isEmpty()) sName = "Not Available";

        String lectureName = booking.getPurpose();
        if (lectureName == null || lectureName.trim().isEmpty()) lectureName = "Not Available";

        String date = booking.getBookingDate() != null ? booking.getBookingDate().toString() : "Not Available";
        String time = booking.getStartTime() != null ? booking.getStartTime().toString() : "Not Available";

        // Notification format (STRICT)
        String notificationMessage = sName + " has marked attendance for " + lectureName + " session scheduled on " + date + " at " + time + ".";

        // Send notification to lecturer with metadata
        notificationService.createForUser(
                booking.getUserId(),
                Role.LECTURER,
                "Attendance Submitted",
                notificationMessage,
                NotificationType.ATTENDANCE_SUBMITTED,
                "LECTURE",
                booking.getId(),
                booking.getId(),         // lectureSessionId
                booking.getId(),         // bookingId
                saved.getAttendanceId(), // attendanceId
                "LECTURER"               // userRole context (Lecturer side)
        );

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/check/{bookingId}")
    public ResponseEntity<?> checkAttendance(@PathVariable String bookingId) {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || (auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User is not authenticated."));
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof security.UserDetailsImpl userDetails) {
            String studentId = userDetails.getId();
            String studentEmail = userDetails.getEmail();
            
            boolean existsById = false;
            if (studentId != null) {
                existsById = attendanceRepository.existsByStudentIdAndLectureSessionId(studentId, bookingId);
            }
            boolean existsByEmail = false;
            if (studentEmail != null) {
                existsByEmail = attendanceRepository.existsByStudentEmailAndLectureSessionId(studentEmail, bookingId);
            }
            
            if (existsById || existsByEmail) {
                return ResponseEntity.ok(Map.of("attended", true));
            }
        }
        return ResponseEntity.ok(Map.of("attended", false));
    }

    @GetMapping("/my-attendance")
    public ResponseEntity<?> getMyAttendance() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || (auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User is not authenticated."));
        }

        Object principal = auth.getPrincipal();
        if (principal instanceof security.UserDetailsImpl userDetails) {
            String studentId = userDetails.getId();
            String studentEmail = userDetails.getEmail();
            
            Query query = new Query();
            Criteria criteria = new Criteria().orOperator(
                Criteria.where("studentId").is(studentId),
                Criteria.where("studentEmail").is(studentEmail)
            );
            query.addCriteria(criteria);
            List<Attendance> list = mongoTemplate.find(query, Attendance.class);
            return ResponseEntity.ok(list);
        }
        return ResponseEntity.ok(java.util.Collections.emptyList());
    }

    @GetMapping("/summary/{bookingId}")
    @PreAuthorize("hasAnyRole('LECTURER', 'ADMIN')")
    public ResponseEntity<?> getAttendanceSummary(@PathVariable String bookingId) {
        Booking booking = mongoTemplate.findById(bookingId, Booking.class);
        if (booking == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Lecture session not found."));
        }

        String assignedBatch = booking.getAssignedBatch();
        int totalSharedStudents = 0;

        if (assignedBatch != null && !assignedBatch.isBlank()) {
            List<User> students = userRepository.findAllByRolesContaining(Role.USER);
            List<User> batchStudents = students.stream().filter(u -> {
                if (u.getYear() == null || u.getSemester() == null) return false;
                String yNum = u.getYear().replaceAll("[^0-9]", "");
                String sNum = u.getSemester().replaceAll("[^0-9]", "");
                String tag = "Y" + yNum + "S" + sNum;
                return tag.equals(assignedBatch);
            }).collect(Collectors.toList());
            totalSharedStudents = batchStudents.size();
        }

        List<Attendance> attendanceList = attendanceRepository.findByBookingId(bookingId);
        int attendedStudents = attendanceList.size();
        double percentage = totalSharedStudents == 0 ? 0.0 : Math.round(((double) attendedStudents * 1000.0) / totalSharedStudents) / 10.0;

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalSharedStudents", totalSharedStudents);
        summary.put("attendedStudents", attendedStudents);
        summary.put("attendancePercentage", percentage);

        return ResponseEntity.ok(summary);
    }

    @GetMapping("/list/{bookingId}")
    @PreAuthorize("hasAnyRole('LECTURER', 'ADMIN')")
    public ResponseEntity<List<Attendance>> getAttendanceList(@PathVariable String bookingId) {
        return ResponseEntity.ok(attendanceRepository.findByBookingId(bookingId));
    }
}
