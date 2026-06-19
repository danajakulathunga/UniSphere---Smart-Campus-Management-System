package repository;

import model.Attendance;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface AttendanceRepository extends MongoRepository<Attendance, String> {
    List<Attendance> findByBookingId(String bookingId);
    boolean existsByStudentIdAndLectureSessionId(String studentId, String lectureSessionId);
    boolean existsByStudentEmailAndLectureSessionId(String studentEmail, String lectureSessionId);
}
