package controller;

import dto.MessageResponse;
import model.Role;
import model.User;
import model.NotificationSettings;
import repository.UserRepository;
import security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import service.FileService;
import service.TicketService;
import service.BookingService;
import service.NotificationService;
import java.util.Objects;


@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FileService fileService;

    @Autowired
    private TicketService ticketService;

    @Autowired
    private BookingService bookingService;

    @Autowired
    private NotificationService notificationService;


    @GetMapping("/me")
    public ResponseEntity<dto.UserProfileResponse> getCurrentUser() {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<User> userOptional = userRepository.findById(userDetails.getId());
        
        if (userOptional.isPresent()) {
            return ResponseEntity.ok(mapToResponse(userOptional.get()));
        }
        return ResponseEntity.notFound().build();
    }

    private dto.UserProfileResponse mapToResponse(User user) {
        dto.UserProfileResponse resp = new dto.UserProfileResponse();
        resp.setId(user.getId());
        resp.setName(user.getName());
        resp.setHonorific(user.getHonorific());
        resp.setEmail(user.getEmail());
        resp.setProvider(user.getProvider());
        resp.setRoles(user.getRoles());
        resp.setProfilePicture(user.getProfilePicture());
        resp.setCreatedAt(user.getCreatedAt());
        resp.setNotificationSettings(user.getNotificationSettings());
        resp.setEnabled(user.isEnabled());
        resp.setYear(user.getYear());
        resp.setSemester(user.getSemester());
        resp.setFaculty(user.getFaculty());
        resp.setBio(user.getBio());
        
        // Role Specific
        resp.setDepartment(user.getDepartment());
        resp.setDesignation(user.getDesignation());
        resp.setModules(user.getModules());
        resp.setBatches(user.getBatches());
        resp.setOfficeLocation(user.getOfficeLocation());
        resp.setSpecialization(user.getSpecialization());
        resp.setSkills(user.getSkills());
        resp.setAssignedAreas(user.getAssignedAreas());
        resp.setEmployeeId(user.getEmployeeId());
        resp.setWorkingHours(user.getWorkingHours());

        // Technician Stats
        if (user.getRoles() != null && user.getRoles().contains(Role.TECHNICIAN)) {
            Map<String, Object> summary = ticketService.getTicketSummary(user);
            resp.setCompletedTicketsCount((Long) summary.get("resolvedCount"));
            resp.setAverageRating((Double) summary.get("averageRating"));
        }
        
        return resp;
    }

    @PutMapping("/me")
    public ResponseEntity<dto.UserProfileResponse> updateUserProfile(@RequestBody Map<String, Object> request) {
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        Optional<User> userOptional = userRepository.findById(userDetails.getId());

        if (userOptional.isPresent()) {
            User user = userOptional.get();
            if (request.containsKey("name")) {
                String newName = (String) request.get("name");
                if (newName != null && !newName.equals(user.getName())) {
                    user.setName(newName);
                    // Propagate name change to other documents
                    ticketService.updateUserNames(user.getId(), newName);
                    bookingService.updateUserNames(user.getId(), newName);
                }
            }
            if (request.containsKey("honorific")) {
                user.setHonorific((String) request.get("honorific"));
            }
            if (request.containsKey("profilePicture")) {
                String base64 = (String) request.get("profilePicture");
                if (base64 == null || base64.isEmpty()) {
                    user.setProfilePicture(null);
                } else {
                    String imageUrl = fileService.saveBase64Image(base64, "profiles");
                    if (imageUrl != null) {
                        user.setProfilePicture(imageUrl);
                    }
                }
            }
            if (request.containsKey("notificationSettings")) {
                Map<String, Object> settingsMap = (Map<String, Object>) request.get("notificationSettings");
                NotificationSettings settings = user.getNotificationSettings();
                if (settings == null) {
                    settings = new NotificationSettings();
                }
                if (settingsMap.containsKey("all")) {
                    settings.setAll((Boolean) settingsMap.get("all"));
                }
                if (settingsMap.containsKey("booking")) {
                    settings.setBooking((Boolean) settingsMap.get("booking"));
                }
                if (settingsMap.containsKey("ticket")) {
                    settings.setTicket((Boolean) settingsMap.get("ticket"));
                }
                user.setNotificationSettings(settings);
            }
            if (request.containsKey("faculty")) user.setFaculty((String) request.get("faculty"));
            if (request.containsKey("bio")) user.setBio((String) request.get("bio"));

            // Lecturer Fields
            if (request.containsKey("department")) user.setDepartment((String) request.get("department"));
            if (request.containsKey("designation")) user.setDesignation((String) request.get("designation"));
            if (request.containsKey("modules")) user.setModules((String) request.get("modules"));
            if (request.containsKey("batches")) user.setBatches((String) request.get("batches"));
            if (request.containsKey("officeLocation")) user.setOfficeLocation((String) request.get("officeLocation"));

            // Technician Fields
            if (request.containsKey("specialization")) user.setSpecialization((String) request.get("specialization"));
            if (request.containsKey("skills")) user.setSkills((String) request.get("skills"));
            if (request.containsKey("assignedAreas")) user.setAssignedAreas((String) request.get("assignedAreas"));
            if (request.containsKey("employeeId")) user.setEmployeeId((String) request.get("employeeId"));

            // Common
            if (request.containsKey("workingHours")) user.setWorkingHours((String) request.get("workingHours"));

            String oldYear = user.getYear();
            String oldSemester = user.getSemester();

            if (request.containsKey("year")) user.setYear((String) request.get("year"));
            if (request.containsKey("semester")) user.setSemester((String) request.get("semester"));

            boolean batchChanged = (request.containsKey("year") && !Objects.equals(oldYear, user.getYear())) ||
                                   (request.containsKey("semester") && !Objects.equals(oldSemester, user.getSemester()));

            if (batchChanged && user.getRoles() != null && user.getRoles().contains(Role.USER)) {
                notificationService.notifyLecturersForBatchMatch(user);
            }

            userRepository.save(user);
            return ResponseEntity.ok(mapToResponse(user));
        }

        return ResponseEntity.notFound().build();
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/technicians")
    public ResponseEntity<List<User>> getTechnicians() {
        return ResponseEntity.ok(userRepository.findAllByRolesContaining(Role.TECHNICIAN));
    }

    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MessageResponse> updateUserRole(@PathVariable String id, @RequestBody Map<String, String> request) {
        String roleStr = request.get("role");
        if (roleStr == null) {
            return ResponseEntity.badRequest().body(new MessageResponse("Role is required"));
        }

        try {
            Role role = Role.valueOf(roleStr.toUpperCase());
            Optional<User> userOptional = userRepository.findById(id);
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                // We keep it as a list of roles based on model, but we can replace entirely or add
                user.setRoles(List.of(role));
                userRepository.save(user);
                return ResponseEntity.ok(new MessageResponse("Role updated successfully!"));
            }
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid role"));
        }
    }
}


