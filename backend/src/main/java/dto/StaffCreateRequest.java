package dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
public class StaffCreateRequest {
    @NotBlank(message = "Full name is required")
    private String name;
    private String honorific;

    @NotBlank(message = "System email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Notification email is required")
    @Email(message = "Invalid notification email format")
    private String notificationEmail;

    @NotBlank(message = "Role is required")
    private String role;

    @NotBlank(message = "Temporary password is required")
    private String temporaryPassword;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getNotificationEmail() {
        return notificationEmail;
    }

    public void setNotificationEmail(String notificationEmail) {
        this.notificationEmail = notificationEmail;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getTemporaryPassword() {
        return temporaryPassword;
    }

    public void setTemporaryPassword(String temporaryPassword) {
        this.temporaryPassword = temporaryPassword;
    }

    public String getHonorific() {
        return honorific;
    }

    public void setHonorific(String honorific) {
        this.honorific = honorific;
    }
}
