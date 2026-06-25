package repository;

import model.Notification;
import model.NotificationStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface NotificationRepository extends MongoRepository<Notification, String> {
    Page<Notification> findAllByUserIdOrderByCreatedAtDesc(String userId, Pageable pageable);

    long countByUserIdAndStatus(String userId, NotificationStatus status);

    void deleteAllByUserId(String userId);

    boolean existsByUserIdAndTypeAndReferenceTypeAndReferenceIdAndMessage(String userId, model.NotificationType type, String referenceType, String referenceId, String message);

    boolean existsByUserIdAndTypeAndLectureSessionId(String userId, model.NotificationType type, String lectureSessionId);

    boolean existsByUserIdAndTypeAndAttendanceId(String userId, model.NotificationType type, String attendanceId);
}


