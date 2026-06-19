package repository;

import model.Ticket;
import model.TicketStatus;
import model.TicketPriority;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;

public interface TicketRepository extends MongoRepository<Ticket, String> {
        List<Ticket> findAllByUserId(String userId);

        List<Ticket> findAllByAssignedTechnicianId(String technicianId);

        Page<Ticket> findAllByUserIdAndStatus(String userId, TicketStatus status, Pageable pageable);

        Page<Ticket> findAllByUserIdAndPriority(String userId, TicketPriority priority, Pageable pageable);

        Page<Ticket> findAllByUserIdAndStatusAndPriority(String userId, TicketStatus status, TicketPriority priority,
                        Pageable pageable);

        Page<Ticket> findAllByUserIdAndAssignedTechnicianId(String userId, String technicianId, Pageable pageable);

        Page<Ticket> findAllByUserIdAndStatusAndAssignedTechnicianId(String userId, TicketStatus status,
                        String technicianId, Pageable pageable);

        Page<Ticket> findAllByUserIdAndPriorityAndAssignedTechnicianId(String userId, TicketPriority priority,
                        String technicianId, Pageable pageable);

        Page<Ticket> findAllByUserIdAndStatusAndPriorityAndAssignedTechnicianId(String userId, TicketStatus status,
                        TicketPriority priority, String technicianId, Pageable pageable);

        Page<Ticket> findAllByAssignedTechnicianIdAndStatus(String technicianId, TicketStatus status,
                        Pageable pageable);

        Page<Ticket> findAllByAssignedTechnicianIdAndPriority(String technicianId, TicketPriority priority,
                        Pageable pageable);

        Page<Ticket> findAllByAssignedTechnicianIdAndStatusAndPriority(String technicianId, TicketStatus status,
                        TicketPriority priority, Pageable pageable);

        Page<Ticket> findAllByStatus(TicketStatus status, Pageable pageable);

        Page<Ticket> findAllByPriority(TicketPriority priority, Pageable pageable);

        Page<Ticket> findAllByStatusAndPriority(TicketStatus status, TicketPriority priority, Pageable pageable);

        Page<Ticket> findAllByStatusAndAssignedTechnicianId(TicketStatus status, String technicianId,
                        Pageable pageable);

        Page<Ticket> findAllByPriorityAndAssignedTechnicianId(TicketPriority priority, String technicianId,
                        Pageable pageable);

        Page<Ticket> findAllByStatusAndPriorityAndAssignedTechnicianId(TicketStatus status, TicketPriority priority,
                        String technicianId, Pageable pageable);

        @Query(value = "{ 'userId': ?0 }")
        Page<Ticket> findAllByUserId(String userId, Pageable pageable);

        @Query(value = "{ 'assignedTechnicianId': ?0 }")
        Page<Ticket> findAllByAssignedTechnicianId(String technicianId, Pageable pageable);

        @Query(value = "{}")
        Page<Ticket> findAll(Pageable pageable);

        long countByUserId(String userId);

        long countByAssignedTechnicianId(String technicianId);

        long countByStatus(TicketStatus status);

        long countByPriority(TicketPriority priority);

        long countByUserIdAndStatus(String userId, TicketStatus status);

        long countByUserIdAndPriority(String userId, TicketPriority priority);

        long countByAssignedTechnicianIdAndStatus(String technicianId, TicketStatus status);

        long countByAssignedTechnicianIdAndPriority(String technicianId, TicketPriority priority);

        long countByAssignedTechnicianIdIsNull();

        long countByUserIdAndAssignedTechnicianIdIsNull(String userId);
}
