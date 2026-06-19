package controller;

import model.User;
import model.Role;
import repository.UserRepository;
import dto.StaffCreateRequest;
import dto.MessageResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private service.AuthService authService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getUsers(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) String roles,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        
        List<Role> filterRoles;
        if (roles == null || roles.trim().isEmpty() || roles.equals("ALL")) {
            filterRoles = Arrays.asList(Role.USER, Role.TECHNICIAN, Role.LECTURER);
        } else {
            filterRoles = Arrays.stream(roles.split(","))
                    .map(String::trim)
                    .map(Role::valueOf)
                    .collect(Collectors.toList());
        }

        Page<User> userPage;
        String s = search.trim();
        if (s.isEmpty()) {
            userPage = userRepository.findByRolesIn(filterRoles, pageable);
        } else {
            userPage = userRepository.findByNameAndEmailAndRoles(s, s, filterRoles, pageable);
        }

        // Calculate counts efficiently for UI consistency
        Map<String, Long> counts = new HashMap<>();
        counts.put("ALL", userRepository.count());
        counts.put("USER", userRepository.countByRolesContaining(Role.USER));
        counts.put("TECHNICIAN", userRepository.countByRolesContaining(Role.TECHNICIAN));
        counts.put("LECTURER", userRepository.countByRolesContaining(Role.LECTURER));

        Map<String, Object> response = new HashMap<>();
        response.put("content", userPage.getContent());
        response.put("totalPages", userPage.getTotalPages());
        response.put("totalElements", userPage.getTotalElements());
        response.put("counts", counts);

        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<?> toggleUserStatus(@PathVariable String id, @RequestBody Map<String, Boolean> status) {
        return userRepository.findById(id).map(user -> {
            user.setEnabled(status.get("enabled"));
            userRepository.save(user);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable String id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/staff")
    public ResponseEntity<?> createStaff(@jakarta.validation.Valid @RequestBody StaffCreateRequest request) {
        try {
            authService.createStaffAccount(request);
            return ResponseEntity.ok(new MessageResponse("Staff account created successfully and notification sent."));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new MessageResponse("Failed to create staff account."));
        }
    }

    @GetMapping("/staff")
    public ResponseEntity<Map<String, Object>> getStaff(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        List<Role> staffRoles = Arrays.asList(Role.TECHNICIAN, Role.LECTURER);

        Page<User> userPage;
        String s = search.trim();
        if (s.isEmpty()) {
            userPage = userRepository.findByRolesIn(staffRoles, pageable);
        } else {
            userPage = userRepository.findByNameAndEmailAndRoles(s, s, staffRoles, pageable);
        }

        Map<String, Object> response = new HashMap<>();
        response.put("content", userPage.getContent());
        response.put("totalPages", userPage.getTotalPages());
        response.put("totalElements", userPage.getTotalElements());

        return ResponseEntity.ok(response);
    }
}
