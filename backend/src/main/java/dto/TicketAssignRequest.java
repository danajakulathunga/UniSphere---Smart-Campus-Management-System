package dto;

import jakarta.validation.constraints.NotBlank;

public class TicketAssignRequest {

    @NotBlank
    private String technicianId;

    public String getTechnicianId() {
        return technicianId;
    }

    public void setTechnicianId(String technicianId) {
        this.technicianId = technicianId;
    }
}


