package controller;

import dto.MessageResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/technician")
public class TechnicianController {

    @GetMapping("/workbench")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public Map<String, Object> getWorkbench() {
        Map<String, Object> workbench = new LinkedHashMap<>();
        workbench.put("message", new MessageResponse("Technician access granted."));
        workbench.put("status", "TECHNICIAN_WORKBENCH_READY");
        workbench.put("tools", java.util.List.of(
                "Assigned tickets",
                "Incident updates",
                "Resolution logs"));
        return workbench;
    }
}

