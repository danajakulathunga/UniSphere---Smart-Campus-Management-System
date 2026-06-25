package service;

import model.Notification;
import model.NotificationStatus;
import model.NotificationType;
import model.Role;
import model.User;
import model.NotificationSettings;
import repository.NotificationRepository;
import repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
    }


    public Notification createForUser(String userId,
                                      Role recipientRole,
                                      String title,
                                      String message,
                                      NotificationType type,
                                      String referenceType,
                                      String referenceId) {
        return createForUser(userId, recipientRole, title, message, type, referenceType, referenceId, null, null, null, null);
    }

    public Notification createForUser(String userId,
                                      Role recipientRole,
                                      String title,
                                      String message,
                                      NotificationType type,
                                      String referenceType,
                                      String referenceId,
                                      String lectureSessionId,
                                      String bookingId,
                                      String attendanceId,
                                      String userRole) {
        LocalDateTime createdAt = LocalDateTime.now();

        // 13. DATABASE VALIDATION
        if (userId == null || userId.trim().isEmpty() ||
            title == null || title.trim().isEmpty() ||
            message == null || message.trim().isEmpty() ||
            type == null || createdAt == null) {
            logger.error("Database validation failed for notification: userId={}, title={}, message={}, type={}, createdAt={}", 
                         userId, title, message, type, createdAt);
            return null;
        }

        // 12. DUPLICATE NOTIFICATION PREVENTION
        if (type == NotificationType.BOOKING_CREATED ||
            type == NotificationType.BOOKING_CANCELLED ||
            type == NotificationType.BOOKING_APPROVED ||
            type == NotificationType.BOOKING_REJECTED ||
            type == NotificationType.TICKET_CREATED ||
            type == NotificationType.TICKET_ASSIGNED) {
            if (notificationRepository.existsByUserIdAndTypeAndReferenceId(userId, type, referenceId)) {
                logger.warn("Duplicate notification blocked by ID check: userId={}, type={}, referenceId={}", 
                            userId, type, referenceId);
                return null;
            }
        }

        if (type == NotificationType.TICKET_STATUS_UPDATED) {
            String statusKeyword = null;
            for (model.TicketStatus ts : model.TicketStatus.values()) {
                if (message.contains(ts.name())) {
                    statusKeyword = ts.name();
                    break;
                }
            }
            if (statusKeyword != null) {
                List<Notification> existing = notificationRepository.findByUserIdAndTypeAndReferenceId(userId, type, referenceId);
                for (Notification n : existing) {
                    if (n.getMessage() != null && n.getMessage().contains(statusKeyword)) {
                        logger.warn("Duplicate status notification blocked (keyword check): userId={}, type={}, referenceId={}, keyword={}", 
                                    userId, type, referenceId, statusKeyword);
                        return null;
                    }
                }
            }
        }

        if (notificationRepository.existsByUserIdAndTypeAndReferenceTypeAndReferenceIdAndMessage(userId, type, referenceType, referenceId, message)) {
            logger.warn("Duplicate notification creation blocked (standard): userId={}, type={}, referenceId={}, message={}", 
                        userId, type, referenceId, message);
            return null;
        }

        if (lectureSessionId != null && notificationRepository.existsByUserIdAndTypeAndLectureSessionId(userId, type, lectureSessionId)) {
            logger.warn("Duplicate notification creation blocked (lectureSessionId): userId={}, type={}, lectureSessionId={}", 
                        userId, type, lectureSessionId);
            return null;
        }

        if (attendanceId != null && notificationRepository.existsByUserIdAndTypeAndAttendanceId(userId, type, attendanceId)) {
            logger.warn("Duplicate notification creation blocked (attendanceId): userId={}, type={}, attendanceId={}", 
                        userId, type, attendanceId);
            return null;
        }

        // Strict Preference Enforcement
        User user = userRepository.findById(userId).orElse(null);
        if (user != null) {
            NotificationSettings settings = user.getNotificationSettings();
            if (settings != null) {
                // Logic: 
                // 1. If All is ON -> Allowed
                // 2. If All is OFF -> Check specific type
                if (!settings.isAll()) {
                    boolean isBookingType = type.name().startsWith("BOOKING");
                    boolean isTicketType = type.name().startsWith("TICKET");
                    boolean isLectureType = type.name().startsWith("LECTURE");
                    boolean isSystemType = type == NotificationType.USER_REGISTERED ||
                                           type == NotificationType.ANNOUNCEMENT_PUBLISHED ||
                                           type == NotificationType.STUDENT_BATCH_MATCH ||
                                           type == NotificationType.ATTENDANCE_SUBMITTED;
                    
                    if (isBookingType && !settings.isBooking()) return null;
                    if (isTicketType && !settings.isTicket()) return null;
                    if (isLectureType && !settings.isLecture()) return null;
                    if (!isBookingType && !isTicketType && !isLectureType && !isSystemType) return null; // Default block if All is OFF and not a categorized type
                }
            }
        }

        Notification notification = new Notification();
        notification.setUserId(userId);
        notification.setRecipientRole(recipientRole);
        notification.setTitle(title);
        notification.setMessage(message);
        notification.setType(type);
        notification.setStatus(NotificationStatus.UNREAD);
        notification.setReferenceType(referenceType);
        notification.setReferenceId(referenceId);
        notification.setRead(false);
        notification.setCreatedAt(createdAt);
        
        notification.setLectureSessionId(lectureSessionId);
        notification.setBookingId(bookingId);
        notification.setAttendanceId(attendanceId);
        notification.setUserRole(userRole);

        Notification saved = notificationRepository.save(notification);
        logger.info("Notification created and saved: id={}, type={}, userId={}", saved.getId(), saved.getType(), saved.getUserId());
        return saved;
    }

    public void createForRole(Role role,
                              String title,
                              String message,
                              NotificationType type,
                              String referenceType,
                              String referenceId,
                              Set<String> excludedUserIds) {
        Set<String> exclude = excludedUserIds == null ? Set.of() : excludedUserIds;
        List<User> recipients = userRepository.findAllByRolesContaining(role);

        for (User recipient : recipients) {
            if (exclude.contains(recipient.getId())) {
                continue;
            }

            createForUser(
                    recipient.getId(),
                    role,
                    title,
                    message,
                    type,
                    referenceType,
                    referenceId);
        }
    }

    public void createForParticipants(List<User> participants,
                                      String title,
                                      String message,
                                      NotificationType type,
                                      String referenceType,
                                      String referenceId,
                                      Set<String> excludedUserIds) {
        createForParticipants(participants, title, message, type, referenceType, referenceId, excludedUserIds, null, null, null, null);
    }

    public void createForParticipants(List<User> participants,
                                      String title,
                                      String message,
                                      NotificationType type,
                                      String referenceType,
                                      String referenceId,
                                      Set<String> excludedUserIds,
                                      String lectureSessionId,
                                      String bookingId,
                                      String attendanceId,
                                      String userRole) {
        Set<String> exclude = excludedUserIds == null ? Set.of() : excludedUserIds;

        for (User participant : participants) {
            if (participant == null || participant.getId() == null || participant.getId().isBlank()) {
                continue;
            }
            if (exclude.contains(participant.getId())) {
                continue;
            }

            createForUser(
                    participant.getId(),
                    getPrimaryRole(participant),
                    title,
                    message,
                    type,
                    referenceType,
                    referenceId,
                    lectureSessionId,
                    bookingId,
                    attendanceId,
                    userRole);
            
            System.out.println("Notification created for: " + participant.getId() + " (Type: " + type + ")");
        }
    }

    public void createForBatch(String batchTag,
                               String title,
                               String message,
                               NotificationType type,
                               String referenceType,
                               String referenceId,
                               Set<String> excludedUserIds) {
        createForBatch(batchTag, title, message, type, referenceType, referenceId, excludedUserIds, null, null, null, null);
    }

    public void createForBatch(String batchTag,
                               String title,
                               String message,
                               NotificationType type,
                               String referenceType,
                               String referenceId,
                               Set<String> excludedUserIds,
                               String lectureSessionId,
                               String bookingId,
                               String attendanceId,
                               String userRole) {
        if (batchTag == null || !batchTag.startsWith("Y")) return;

        // Extract Year and Semester from Y#S#
        String yearNum = batchTag.substring(1, batchTag.indexOf('S'));
        String semNum = batchTag.substring(batchTag.indexOf('S') + 1);

        // Map back to full display names as stored in DB
        String yearFull = yearNum + (yearNum.equals("1") ? "st Year" : yearNum.equals("2") ? "nd Year" : yearNum.equals("3") ? "rd Year" : "th Year");
        String semFull = "Semester " + semNum;

        List<User> recipients = userRepository.findByYearAndSemester(yearFull, semFull);
        logger.info("Triggering notifications for batch {}: Found {} recipients", batchTag, recipients.size());
        
        createForParticipants(recipients, title, message, type, referenceType, referenceId, excludedUserIds, lectureSessionId, bookingId, attendanceId, userRole);
    }

    public Page<Notification> getUserNotifications(String userId, Pageable pageable) {
        return notificationRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndStatus(userId, NotificationStatus.UNREAD);
    }

    public Notification markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new IllegalArgumentException("Notification not found."));

        if (!notification.getUserId().equals(userId)) {
            throw new IllegalArgumentException("You cannot update this notification.");
        }

        notification.setStatus(NotificationStatus.READ);
        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    public void markAllAsRead(String userId) {
        Page<Notification> notifications = notificationRepository.findAllByUserIdOrderByCreatedAtDesc(
                userId,
                Pageable.unpaged());

        notifications.forEach(notification -> {
            notification.setStatus(NotificationStatus.READ);
            notification.setRead(true);
            notificationRepository.save(notification);
        });
    }

    public void clearAllNotifications(String userId) {
        notificationRepository.deleteAllByUserId(userId);
    }

    public void notifyLecturersForBatchMatch(User student) {
        if (student == null || student.getYear() == null || student.getSemester() == null) return;

        try {
            // Map student "1st Year", "Semester 1" -> "Y1S1"
            String yNum = student.getYear().split(" ")[0].substring(0, 1);
            String sNum = student.getSemester().split(" ")[1];
            String studentBatchTag = "Y" + yNum + "S" + sNum;

            List<User> lecturers = userRepository.findAllByRolesContaining(Role.LECTURER);
            
            for (User lecturer : lecturers) {
                String lecturerBatches = lecturer.getBatches();
                if (lecturerBatches != null && lecturerBatches.contains(studentBatchTag)) {
                    createForUser(
                        lecturer.getId(),
                        Role.LECTURER,
                        "New Student Joined Batch",
                        "Student " + student.getName() + " has joined your batch (" + studentBatchTag + ")",
                        NotificationType.STUDENT_BATCH_MATCH,
                        "USER",
                        student.getId()
                    );
                    logger.info("Batch match notification sent to lecturer: {} for student: {}", lecturer.getId(), student.getId());
                }
            }
        } catch (Exception e) {
            logger.error("Error sending batch match notification: {}", e.getMessage());
        }
    }

    private Role getPrimaryRole(User user) {
        if (user.getRoles() == null || user.getRoles().isEmpty()) {
            return Role.USER;
        }

        if (user.getRoles().contains(Role.ADMIN)) {
            return Role.ADMIN;
        }

        if (user.getRoles().contains(Role.TECHNICIAN)) {
            return Role.TECHNICIAN;
        }

        return Role.USER;
    }
}


