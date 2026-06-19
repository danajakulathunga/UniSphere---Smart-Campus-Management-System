package dto;

import jakarta.validation.constraints.NotBlank;

public class BookingDecisionRequest {

    @NotBlank
    private String reason;

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }
}


