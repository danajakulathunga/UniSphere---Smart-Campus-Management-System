package controller;

import model.Role;
import model.User;
import repository.UserRepository;
import security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/lecturer")
    @PreAuthorize("hasRole('LECTURER')")
    public ResponseEntity<List<User>> getLecturerStudents(
            @RequestParam(defaultValue = "") String search,
            @RequestParam(required = false) String batchFilter) {
        
        UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        User lecturer = userRepository.findById(userDetails.getId()).orElse(null);

        if (lecturer == null) return ResponseEntity.notFound().build();

        String batchesStr = lecturer.getBatches();
        if (batchesStr == null || batchesStr.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        List<String> assignedBatches = Arrays.stream(batchesStr.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());

        // Filter by batchFilter if provided
        final List<String> finalTargetBatches;
        if (batchFilter != null && !batchFilter.isEmpty()) {
            if (assignedBatches.contains(batchFilter)) {
                finalTargetBatches = Collections.singletonList(batchFilter);
            } else {
                return ResponseEntity.ok(Collections.emptyList());
            }
        } else {
            finalTargetBatches = assignedBatches;
        }

        List<User> allStudents = userRepository.findAllByRolesContaining(Role.USER);
        
        List<User> filteredStudents = allStudents.stream()
                .filter(student -> {
                    String sYear = student.getYear();
                    String sSem = student.getSemester();
                    if (sYear == null || sSem == null) return false;
                    
                    try {
                        // Mapping "1st Year" -> "1", "Semester 1" -> "1"
                        String sY = sYear.split(" ")[0].substring(0, 1);
                        String sS = sSem.split(" ")[1];
                        String studentBatchTag = "Y" + sY + "S" + sS;
                        
                        return finalTargetBatches.contains(studentBatchTag);
                    } catch (Exception e) {
                        return false;
                    }
                })
                .filter(student -> {
                    if (search == null || search.trim().isEmpty()) return true;
                    String s = search.toLowerCase();
                    return (student.getName() != null && student.getName().toLowerCase().contains(s)) ||
                           (student.getEmail() != null && student.getEmail().toLowerCase().contains(s));
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(filteredStudents);
    }
}
