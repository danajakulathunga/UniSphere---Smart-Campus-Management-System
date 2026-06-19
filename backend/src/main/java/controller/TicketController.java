package controller;

import dto.TicketAssignRequest;
import dto.TicketCommentRequest;
import dto.TicketCreateRequest;
import dto.TicketRateRequest;
import dto.TicketStatusUpdateRequest;
import model.Ticket;
import model.User;
import service.CurrentUserService;
import service.TicketService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tickets")
public class TicketController {

    private final TicketService ticketService;
    private final CurrentUserService currentUserService;

    public TicketController(TicketService ticketService, CurrentUserService currentUserService) {
        this.ticketService = ticketService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Ticket> createTicket(@Valid @RequestBody TicketCreateRequest request) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.createTicket(request, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'TECHNICIAN', 'ADMIN')")
    public ResponseEntity<Ticket> updateTicket(@PathVariable String id, @Valid @RequestBody TicketCreateRequest request) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(ticketService.updateTicket(id, request, user));
    }

    @GetMapping("/mine")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Page<Ticket>> getMyTickets(@RequestParam(defaultValue = "0") int page,
                                                     @RequestParam(defaultValue = "10") int size,
                                                     @RequestParam(required = false) String status,
                                                     @RequestParam(required = false) String priority,
                                                     @RequestParam(required = false) String assignedTechnicianId) {
        User user = currentUserService.getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(ticketService.getMyTickets(user.getId(), status, priority, assignedTechnicianId, pageable));
    }

    @GetMapping("/assigned")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<Page<Ticket>> getAssignedTickets(@RequestParam(defaultValue = "0") int page,
                                                           @RequestParam(defaultValue = "10") int size,
                                                           @RequestParam(required = false) String status,
                                                           @RequestParam(required = false) String priority,
                                                           @RequestParam(required = false) String assignedTechnicianId) {
        User user = currentUserService.getCurrentUser();
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(ticketService.getAssignedTickets(user.getId(), status, priority, assignedTechnicianId, pageable));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Ticket>> getAllTickets(@RequestParam(defaultValue = "0") int page,
                                                      @RequestParam(defaultValue = "20") int size,
                                                      @RequestParam(required = false) String status,
                                                      @RequestParam(required = false) String priority,
                                                      @RequestParam(required = false) String assignedTechnicianId) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(ticketService.getAllTickets(status, priority, assignedTechnicianId, pageable));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Ticket> assignTechnician(@PathVariable String id,
                                                   @Valid @RequestBody TicketAssignRequest request) {
        return ResponseEntity.ok(ticketService.assignTechnician(id, request.getTechnicianId()));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'ADMIN')")
    public ResponseEntity<Ticket> updateStatus(@PathVariable String id,
                                               @Valid @RequestBody TicketStatusUpdateRequest request) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(ticketService.updateStatus(id, request.getStatus(), request.getResolutionNotes(), user));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<Ticket> addComment(@PathVariable String id,
                                             @Valid @RequestBody TicketCommentRequest request) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(ticketService.addComment(id, request.getMessage(), user));
    }

    @PatchMapping("/{id}/rate")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Ticket> rateTechnician(@PathVariable String id,
                                                 @Valid @RequestBody TicketRateRequest request) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(ticketService.rateTechnician(id, request.getRating(), user));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Void> cancelTicket(@PathVariable String id) {
        User user = currentUserService.getCurrentUser();
        ticketService.cancelTicket(id, user);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'ADMIN')")
    public ResponseEntity<Void> deleteTicket(@PathVariable String id) {
        User user = currentUserService.getCurrentUser();
        ticketService.deleteTicket(id, user);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'TECHNICIAN', 'ADMIN')")
    public ResponseEntity<Ticket> getTicketById(@PathVariable String id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('USER', 'LECTURER', 'TECHNICIAN', 'ADMIN')")
    public ResponseEntity<java.util.Map<String, Object>> getTicketSummary() {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(ticketService.getTicketSummary(user));
    }
}


