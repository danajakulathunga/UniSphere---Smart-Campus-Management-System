package repository;

import model.Booking;
import model.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface BookingRepository extends MongoRepository<Booking, String> {
    List<Booking> findAllByUserId(String userId);

    List<Booking> findByResourceIdAndBookingDateAndStatusIn(String resourceId,
                                                            LocalDate bookingDate,
                                                            Collection<BookingStatus> statuses);

    Page<Booking> findAllByUserId(String userId, Pageable pageable);
    Page<Booking> findAllByUserIdAndStatus(String userId, BookingStatus status, Pageable pageable);
    Page<Booking> findAllByUserIdAndBookingDate(String userId, LocalDate bookingDate, Pageable pageable);
    Page<Booking> findAllByUserIdAndStatusAndBookingDate(String userId, BookingStatus status, LocalDate bookingDate, Pageable pageable);

    Page<Booking> findAllByStatus(BookingStatus status, Pageable pageable);
    Page<Booking> findAllByBookingDate(LocalDate bookingDate, Pageable pageable);
    Page<Booking> findAllByStatusAndBookingDate(BookingStatus status, LocalDate bookingDate, Pageable pageable);
    List<Booking> findAllByBookingDateAndStatusIn(LocalDate bookingDate, Collection<BookingStatus> statuses);

    Page<Booking> findAll(Pageable pageable);

    long countByUserId(String userId);
    long countByStatus(BookingStatus status);
    long countByUserIdAndStatus(String userId, BookingStatus status);
    long countByBookingDate(LocalDate date);
}




