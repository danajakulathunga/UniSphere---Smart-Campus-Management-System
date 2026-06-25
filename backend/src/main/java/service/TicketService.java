package service;

import dto.TicketCreateRequest;
import model.NotificationType;
import model.Role;
import model.Ticket;
import model.TicketComment;
import model.TicketPriority;
import model.TicketStatus;
import model.User;
import repository.TicketRepository;
import repository.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;
import org.springframework.data.mongodb.core.query.Criteria;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.query.Query;

@Service
public class TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final MongoTemplate mongoTemplate;
    private final FileService fileService;

    public TicketService(TicketRepository ticketRepository,
                         UserRepository userRepository,
                         NotificationService notificationService,
                         MongoTemplate mongoTemplate,
                         FileService fileService) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
        this.mongoTemplate = mongoTemplate;
        this.fileService = fileService;
    }

    public Ticket createTicket(TicketCreateRequest request, User user) {
        List<String> images = request.getImages() == null ? List.of() : request.getImages();
        if (images.size() > 10) {
            throw new IllegalArgumentException("Maximum of 10 images are allowed.");
        }

        Ticket ticket = new Ticket();
        ticket.setTitle(request.getTitle().trim());
        ticket.setCategory(request.getCategory().trim());
        ticket.setDescription(request.getDescription().trim());
        ticket.setLocation(request.getLocation().trim());
        ticket.setAssetName(request.getAssetName() != null ? request.getAssetName().trim() : null);
        ticket.setPriority(request.getPriority());
        List<String> imagePaths = new ArrayList<>();
        for (String base64 : images) {
            String path = fileService.saveBase64Image(base64, "tickets");
            if (path != null) imagePaths.add(path);
        }
        ticket.setImages(imagePaths);
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setUserId(user.getId());
        ticket.setUserName(user.getName());
        ticket.setCreatedAt(LocalDateTime.now());
        ticket.setUpdatedAt(LocalDateTime.now());
        ticket.setImageCount(imagePaths.size());
        ticket.setCommentCount(0);

        Ticket saved = ticketRepository.save(ticket);

        notificationService.createForRole(
            Role.ADMIN,
            "New incident ticket",
            user.getName() + " created a ticket for " + ticket.getCategory() + " at " + ticket.getLocation() + ".",
            NotificationType.TICKET_CREATED,
            "TICKET",
            ticket.getId(),
            Set.of(user.getId()));

        return saved;
    }

    public Ticket updateTicket(String id, TicketCreateRequest request, User actor) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found."));

        boolean isAdmin = actor.getRoles() != null && actor.getRoles().contains(Role.ADMIN);
        boolean isOwner = ticket.getUserId().equals(actor.getId());
        boolean isAssignedTech = ticket.getAssignedTechnicianId() != null && ticket.getAssignedTechnicianId().equals(actor.getId());

        if (isAdmin) {
            // Admins can update anything
        } else if (isOwner) {
            if (ticket.getStatus() != TicketStatus.OPEN) {
                throw new IllegalArgumentException("You can only edit tickets while they are in OPEN state.");
            }
        } else if (isAssignedTech) {
            // Technicians can update tickets assigned to them
        } else {
            throw new IllegalArgumentException("You are not authorized to edit this ticket.");
        }

        List<String> images = request.getImages() == null ? List.of() : request.getImages();
        if (images.size() > 10) {
            throw new IllegalArgumentException("Maximum of 10 images are allowed.");
        }

        // For non-admins/techs (standard USERS), only some fields might be restricted if status is not OPEN
        // but we already checked status == OPEN for owners.

        ticket.setTitle(request.getTitle().trim());
        ticket.setCategory(request.getCategory().trim());
        ticket.setDescription(request.getDescription().trim());
        ticket.setLocation(request.getLocation().trim());
        ticket.setAssetName(request.getAssetName() != null ? request.getAssetName().trim() : null);
        ticket.setPriority(request.getPriority());
        List<String> imagePaths = new ArrayList<>();
        for (String base64 : images) {
            String path = fileService.saveBase64Image(base64, "tickets");
            if (path != null) imagePaths.add(path);
        }

        ticket.setImages(imagePaths);
        ticket.setImageCount(imagePaths.size());
        ticket.setUpdatedAt(LocalDateTime.now());

        Ticket saved = ticketRepository.save(ticket);

        notificationService.createForRole(
                Role.ADMIN,
                "Ticket updated",
                "Ticket #" + ticket.getId() + " was updated by " + actor.getName() + ".",
                NotificationType.TICKET_UPDATED,
                "TICKET",
                ticket.getId(),
                Set.of(actor.getId()));

        return saved;
    }

    public Page<Ticket> getMyTickets(String userId, String status, String priority, String assignedTechnicianId, Pageable pageable) {
        TicketStatus s = null;
        if (status != null && !status.isBlank()) {
            try { s = TicketStatus.valueOf(status.toUpperCase()); } catch (Exception ignored) {}
        }
        TicketPriority p = null;
        if (priority != null && !priority.isBlank()) {
            try { p = TicketPriority.valueOf(priority.toUpperCase()); } catch (Exception ignored) {}
        }

        String techId = assignedTechnicianId;
        boolean unassigned = "UNASSIGNED".equals(techId);
        if (unassigned) techId = null;

        if (s != null && p != null && (techId != null || unassigned)) {
            return ticketRepository.findAllByUserIdAndStatusAndPriorityAndAssignedTechnicianId(userId, s, p, techId, pageable);
        }
        if (s != null && p != null) return ticketRepository.findAllByUserIdAndStatusAndPriority(userId, s, p, pageable);
        if (s != null && (techId != null || unassigned)) {
            return ticketRepository.findAllByUserIdAndStatusAndAssignedTechnicianId(userId, s, techId, pageable);
        }
        if (p != null && (techId != null || unassigned)) {
            return ticketRepository.findAllByUserIdAndPriorityAndAssignedTechnicianId(userId, p, techId, pageable);
        }
        if (s != null) return ticketRepository.findAllByUserIdAndStatus(userId, s, pageable);
        if (p != null) return ticketRepository.findAllByUserIdAndPriority(userId, p, pageable);
        if (techId != null || unassigned) {
            return ticketRepository.findAllByUserIdAndAssignedTechnicianId(userId, techId, pageable);
        }
        return ticketRepository.findAllByUserId(userId, pageable);
    }

    public Page<Ticket> getAssignedTickets(String technicianId, String status, String priority, String assignedTechnicianId, Pageable pageable) {
        // technicianId is the ID of the technician requesting their assigned tickets.
        // assignedTechnicianId would be redundant here but we'll include it for API consistency, 
        // though usually a technician filters their OWN assigned tickets.
        // If assignedTechnicianId is provided and different from technicianId, it might return nothing or we can override.
        String filterTechId = (assignedTechnicianId != null && !assignedTechnicianId.isBlank()) ? assignedTechnicianId : technicianId;

        TicketStatus s = null;
        if (status != null && !status.isBlank()) {
            try { s = TicketStatus.valueOf(status.toUpperCase()); } catch (Exception ignored) {}
        }
        TicketPriority p = null;
        if (priority != null && !priority.isBlank()) {
            try { p = TicketPriority.valueOf(priority.toUpperCase()); } catch (Exception ignored) {}
        }

        if (s != null && p != null) return ticketRepository.findAllByAssignedTechnicianIdAndStatusAndPriority(filterTechId, s, p, pageable);
        if (s != null) return ticketRepository.findAllByAssignedTechnicianIdAndStatus(filterTechId, s, pageable);
        if (p != null) return ticketRepository.findAllByAssignedTechnicianIdAndPriority(filterTechId, p, pageable);
        return ticketRepository.findAllByAssignedTechnicianId(filterTechId, pageable);
    }

    public Page<Ticket> getAllTickets(String status, String priority, String assignedTechnicianId, Pageable pageable) {
        TicketStatus s = null;
        if (status != null && !status.isBlank()) {
            try { s = TicketStatus.valueOf(status.toUpperCase()); } catch (Exception ignored) {}
        }
        TicketPriority p = null;
        if (priority != null && !priority.isBlank()) {
            try { p = TicketPriority.valueOf(priority.toUpperCase()); } catch (Exception ignored) {}
        }

        String techId = assignedTechnicianId;
        boolean unassigned = "UNASSIGNED".equals(techId);
        if (unassigned) techId = null;

        if (s != null && p != null && (techId != null || unassigned)) {
            return ticketRepository.findAllByStatusAndPriorityAndAssignedTechnicianId(s, p, techId, pageable);
        }
        if (s != null && p != null) return ticketRepository.findAllByStatusAndPriority(s, p, pageable);
        if (s != null && (techId != null || unassigned)) {
            return ticketRepository.findAllByStatusAndAssignedTechnicianId(s, techId, pageable);
        }
        if (p != null && (techId != null || unassigned)) {
            return ticketRepository.findAllByPriorityAndAssignedTechnicianId(p, techId, pageable);
        }
        if (s != null) return ticketRepository.findAllByStatus(s, pageable);
        if (p != null) return ticketRepository.findAllByPriority(p, pageable);
        if (techId != null || unassigned) {
            return ticketRepository.findAllByAssignedTechnicianId(techId, pageable);
        }
        return ticketRepository.findAll(pageable);
    }

    public Ticket assignTechnician(String ticketId, String technicianId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found."));

        if (ticket.getStatus() == TicketStatus.RESOLVED || ticket.getStatus() == TicketStatus.CANCELLED) {
            throw new IllegalArgumentException("Cannot reassign a resolved or cancelled ticket.");
        }

        User technician = userRepository.findById(technicianId)
                .orElseThrow(() -> new IllegalArgumentException("Technician not found."));

        if (technician.getRoles() == null || !technician.getRoles().contains(Role.TECHNICIAN)) {
            throw new IllegalArgumentException("Selected user is not a technician.");
        }

        ticket.setAssignedTechnicianId(technician.getId());
        ticket.setAssignedTechnicianName(technician.getName());
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        ticket.setUpdatedAt(LocalDateTime.now());
        Ticket saved = ticketRepository.save(ticket);

        notificationService.createForUser(
            technician.getId(),
            Role.TECHNICIAN,
            "Ticket assigned",
            "Ticket #" + ticket.getId() + " is now in progress and assigned to " + technician.getName() + ".",
            NotificationType.TICKET_ASSIGNED,
            "TICKET",
            ticket.getId());

        notificationService.createForUser(
            ticket.getUserId(),
            null,
            "Ticket assigned",
            "Ticket #" + ticket.getId() + " is now in progress and assigned to " + technician.getName() + ".",
            NotificationType.TICKET_ASSIGNED,
            "TICKET",
            ticket.getId());

        return saved;
    }

    public Ticket updateStatus(String ticketId, TicketStatus status, String resolutionNotes, User actor) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found."));

        boolean isAssignedTechnician = ticket.getAssignedTechnicianId() != null && ticket.getAssignedTechnicianId().equals(actor.getId());
        boolean isAdmin = actor.getRoles() != null && actor.getRoles().contains(Role.ADMIN);

        if (isAdmin) {
            // ADMIN Actions: Can change to IN_PROGRESS, REJECTED
            if (status != TicketStatus.IN_PROGRESS && status != TicketStatus.REJECTED) {
                throw new IllegalArgumentException("Admin can only set status to IN_PROGRESS or REJECTED.");
            }
        } else if (isAssignedTechnician) {
            // TECHNICIAN Actions: Can update to RESOLVED, REJECTED
            if (status != TicketStatus.RESOLVED && status != TicketStatus.REJECTED) {
                throw new IllegalArgumentException("Technician can only set status to RESOLVED or REJECTED.");
            }
        } else {
            throw new IllegalArgumentException("You are not authorized to update this ticket status.");
        }

        ticket.setStatus(status);
        if (resolutionNotes != null && !resolutionNotes.isBlank()) {
            ticket.setResolutionNotes(resolutionNotes);
        }
        ticket.setUpdatedAt(LocalDateTime.now());
        Ticket saved = ticketRepository.save(ticket);

        String updateMsg = (status == TicketStatus.RESOLVED) 
            ? "Ticket #" + ticket.getId() + " has been resolved by " + actor.getName() + "."
            : "Ticket #" + ticket.getId() + " status updated to " + status.name() + " by " + actor.getName() + ".";

        notificationService.createForUser(
                ticket.getUserId(),
                null,
                "Ticket update",
                updateMsg,
                NotificationType.TICKET_STATUS_UPDATED,
                "TICKET",
                ticket.getId());

        notificationService.createForRole(
            Role.ADMIN,
            "Ticket status updated",
            updateMsg,
            NotificationType.TICKET_STATUS_UPDATED,
            "TICKET",
            ticket.getId(),
            Set.of(actor.getId()));

        return saved;
    }

    public void cancelTicket(String ticketId, User user) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found."));

        if (!ticket.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only cancel your own tickets.");
        }

        if (ticket.getStatus() != TicketStatus.OPEN) {
            throw new IllegalArgumentException("You can only cancel tickets that are currently in OPEN status.");
        }

        ticket.setStatus(TicketStatus.CANCELLED);
        ticket.setUpdatedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        notificationService.createForRole(
            Role.ADMIN,
            "Ticket cancelled",
            user.getName() + " cancelled ticket #" + ticket.getId() + ".",
            NotificationType.TICKET_STATUS_UPDATED,
            "TICKET",
            ticket.getId(),
            Set.of(user.getId()));
    }

    public void deleteTicket(String ticketId, User user) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found."));

        if (!ticket.getUserId().equals(user.getId())) {
            throw new IllegalArgumentException("You can only delete your own tickets.");
        }

        if (ticket.getStatus() == TicketStatus.IN_PROGRESS) {
            throw new IllegalArgumentException("Cannot delete a ticket that is currently IN_PROGRESS.");
        }

        ticketRepository.delete(ticket);
    }

    public Ticket addComment(String ticketId, String message, User actor) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found."));

        TicketComment comment = new TicketComment();
        comment.setCommentId(UUID.randomUUID().toString());
        comment.setAuthorId(actor.getId());
        comment.setAuthorName(actor.getName());
        comment.setAuthorProfilePicture(actor.getProfilePicture());
        comment.setMessage(message.trim());
        comment.setCreatedAt(LocalDateTime.now());

        ticket.getComments().add(comment);
        ticket.setCommentCount(ticket.getComments().size());
        ticket.setUpdatedAt(LocalDateTime.now());
        Ticket saved = ticketRepository.save(ticket);

        List<User> participants = new ArrayList<>();
        participants.add(userRepository.findById(ticket.getUserId()).orElse(null));

        if (ticket.getAssignedTechnicianId() != null && !ticket.getAssignedTechnicianId().isBlank()) {
            participants.add(userRepository.findById(ticket.getAssignedTechnicianId()).orElse(null));
        }

        participants.addAll(userRepository.findAllByRolesContaining(Role.ADMIN));

        List<User> validParticipants = participants.stream()
                .filter(java.util.Objects::nonNull)
                .collect(java.util.stream.Collectors.toList());

        notificationService.createForParticipants(
                validParticipants,
                "New ticket comment",
                "New comment added to Ticket #" + ticket.getId() + " by " + actor.getName() + ".",
                NotificationType.TICKET_COMMENT_ADDED,
                "TICKET",
                ticket.getId(),
                new HashSet<>(Set.of(actor.getId())));

        return saved;
    }

    public Ticket rateTechnician(String ticketId, Integer rating, User actor) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found."));

        if (!ticket.getUserId().equals(actor.getId())) {
            throw new IllegalArgumentException("You can only rate your own tickets.");
        }

        if (ticket.getStatus() != TicketStatus.RESOLVED) {
            throw new IllegalArgumentException("You can only rate tickets that are RESOLVED.");
        }
        
        if (ticket.getAssignedTechnicianId() == null) {
            throw new IllegalArgumentException("No technician was assigned to this ticket.");
        }

        ticket.setTechnicianRating(rating);
        ticket.setUpdatedAt(LocalDateTime.now());
        return ticketRepository.save(ticket);
    }

    public Ticket getTicketById(String id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Ticket not found."));
    }

    public void updateUserNames(String userId, String newName) {
        // Update User Name (Reporter)
        Query userQuery = new Query(Criteria.where("userId").is(userId));
        Update userUpdate = new Update().set("userName", newName);
        mongoTemplate.updateMulti(userQuery, userUpdate, Ticket.class);

        // Update Assigned Technician Name
        Query techQuery = new Query(Criteria.where("assignedTechnicianId").is(userId));
        Update techUpdate = new Update().set("assignedTechnicianName", newName);
        mongoTemplate.updateMulti(techQuery, techUpdate, Ticket.class);

        // Update Commenter Names
        // This is more complex since comments is a list of objects
        Query commentQuery = new Query(Criteria.where("comments.authorId").is(userId));
        Update commentUpdate = new Update().set("comments.$[elem].authorName", newName)
                .filterArray(Criteria.where("elem.authorId").is(userId));
        mongoTemplate.updateMulti(commentQuery, commentUpdate, Ticket.class);
    }

    public java.util.Map<String, Object> getTicketSummary(User user) {
        boolean isAdmin = user.getRoles() != null && user.getRoles().contains(Role.ADMIN);
        boolean isTechnician = user.getRoles() != null && user.getRoles().contains(Role.TECHNICIAN);

        Criteria criteria = new Criteria();
        if (isTechnician) {
            criteria = Criteria.where("assignedTechnicianId").is(user.getId());
        } else if (!isAdmin) {
            criteria = Criteria.where("userId").is(user.getId());
        }

        // Aggregate Status Counts
        Aggregation statusAgg = Aggregation.newAggregation(
            Aggregation.match(criteria),
            Aggregation.group("status").count().as("count")
        );
        AggregationResults<java.util.Map> statusResults = mongoTemplate.aggregate(statusAgg, "tickets", java.util.Map.class);
        
        java.util.Map<String, Long> statusCounts = new java.util.HashMap<>();
        for (TicketStatus s : TicketStatus.values()) statusCounts.put(s.name(), 0L);
        for (java.util.Map res : statusResults.getMappedResults()) {
            statusCounts.put(res.get("_id").toString(), ((Number) res.get("count")).longValue());
        }

        // Aggregate Priority Counts
        Aggregation priorityAgg = Aggregation.newAggregation(
            Aggregation.match(criteria),
            Aggregation.group("priority").count().as("count")
        );
        AggregationResults<java.util.Map> priorityResults = mongoTemplate.aggregate(priorityAgg, "tickets", java.util.Map.class);
        
        java.util.Map<String, Long> priorityCounts = new java.util.HashMap<>();
        for (TicketPriority p : TicketPriority.values()) priorityCounts.put(p.name(), 0L);
        for (java.util.Map res : priorityResults.getMappedResults()) {
            priorityCounts.put(res.get("_id").toString(), ((Number) res.get("count")).longValue());
        }

        // Aggregate Technician Counts
        java.util.Map<String, Long> technicianCounts = new java.util.HashMap<>();
        List<User> technicians = userRepository.findAllByRolesContaining(Role.TECHNICIAN);
        for (User tech : technicians) {
            Criteria techCriteria = new Criteria().andOperator(
                criteria,
                Criteria.where("assignedTechnicianId").is(tech.getId())
            );
            long count = mongoTemplate.count(new Query(techCriteria), Ticket.class);
            technicianCounts.put(tech.getId(), count);
        }

        long total = statusCounts.values().stream().mapToLong(Long::longValue).sum();
        long unassignedCount = 0;
        if (isAdmin || !isTechnician) {
            Criteria unassignedCriteria = new Criteria().andOperator(
                criteria,
                Criteria.where("assignedTechnicianId").is(null)
            );
            unassignedCount = mongoTemplate.count(new Query(unassignedCriteria), "tickets");
        }

        java.util.Map<String, Object> summary = new java.util.HashMap<>();
        summary.put("statusCounts", statusCounts);
        summary.put("priorityCounts", priorityCounts);
        summary.put("technicianCounts", technicianCounts);
        summary.put("unassignedCount", unassignedCount);
        summary.put("total", total);
        summary.put("resolvedCount", statusCounts.getOrDefault("RESOLVED", 0L));

        // Calculate average rating for the current user if technician
        if (isTechnician) {
            Aggregation avgAgg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("assignedTechnicianId").is(user.getId()).and("technicianRating").ne(null)),
                Aggregation.group("assignedTechnicianId").avg("technicianRating").as("avgRating")
            );
            AggregationResults<java.util.Map> avgResult = mongoTemplate.aggregate(avgAgg, "tickets", java.util.Map.class);
            double avg = 0.0;
            if (!avgResult.getMappedResults().isEmpty()) {
                avg = ((Number) avgResult.getMappedResults().get(0).get("avgRating")).doubleValue();
            }
            summary.put("averageRating", Math.round(avg * 10.0) / 10.0);
        }

        // Calculate technician leaderboard if admin
        if (isAdmin) {
            Aggregation agg = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("assignedTechnicianId").ne(null).and("status").is(TicketStatus.RESOLVED)),
                Aggregation.group("assignedTechnicianId")
                    .count().as("count")
                    .avg("technicianRating").as("avgRating"),
                Aggregation.sort(org.springframework.data.domain.Sort.Direction.DESC, "count"),
                Aggregation.limit(5)
            );

            AggregationResults<java.util.Map> results = mongoTemplate.aggregate(agg, "tickets", java.util.Map.class);
            java.util.List<java.util.Map<String, Object>> leaderboard = new java.util.ArrayList<>();

            for (java.util.Map result : results.getMappedResults()) {
                String techId = (String) result.get("_id");
                Long count = ((Number) result.get("count")).longValue();
                Double avgRating = result.get("avgRating") != null ? ((Number) result.get("avgRating")).doubleValue() : 0.0;
                
                User tech = userRepository.findById(techId).orElse(null);
                if (tech != null) {
                    java.util.Map<String, Object> techStats = new java.util.HashMap<>();
                    techStats.put("id", techId);
                    techStats.put("name", tech.getName());
                    techStats.put("tickets", count);
                    techStats.put("rating", Math.round(avgRating * 10.0) / 10.0);
                    leaderboard.add(techStats);
                }
            }
            summary.put("leaderboard", leaderboard);
        }

        return summary;
    }
}





