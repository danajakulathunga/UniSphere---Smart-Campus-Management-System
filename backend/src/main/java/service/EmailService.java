package service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @Async
    public void sendStaffAccountCreatedEmail(String recipientEmail, String name, String systemEmail,
            String tempPassword, String role) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(recipientEmail);
            helper.setSubject("Welcome to UniSphere – Your Account Details");

            // Capitalize first letter of role
            String formattedRole = role.substring(0, 1).toUpperCase() + role.substring(1).toLowerCase();

            String htmlContent = String.format(
                "<div style=\"font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;\">" +
                "  <p>Hello <strong>%s</strong>,</p>" +
                "  <p>Welcome to <strong>UniSphere – Smart Campus Management System</strong> as a <strong>%s</strong>!</p>" +
                "  <p>Your account has been successfully created, and you can now access the system using the details below:</p>" +
                "  <div style=\"background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #4f46e5;\">" +
                "    <p style=\"margin: 0; font-weight: bold; color: #4f46e5;\">Login Details:</p>" +
                "    <p style=\"margin: 5px 0 0 0;\"><strong>Email:</strong> %s</p>" +
                "    <p style=\"margin: 5px 0 0 0;\"><strong>Temporary Password:</strong> %s</p>" +
                "  </div>" +
                "  <p>For security reasons, please log in using the link below and update your password immediately:</p>" +
                "  <p><a href=\"http://localhost:5173/login\" style=\"display: inline-block; padding: 10px 20px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;\">Login to UniSphere</a></p>" +
                "  <p style=\"font-size: 0.9em; color: #666;\">If you encounter any issues or need assistance, feel free to contact our support team.</p>" +
                "  <p>We’re glad to have you onboard and hope you enjoy using UniSphere!</p>" +
                "  <hr style=\"border: 0; border-top: 1px solid #eee; margin: 20px 0;\">" +
                "  <p style=\"margin: 0;\">Best regards,</p>" +
                "  <p style=\"margin: 5px 0 0 0; font-weight: bold; color: #4f46e5;\">UniSphere Team</p>" +
                "</div>",
                name, formattedRole, systemEmail, tempPassword
            );

            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            // Log error or handle appropriately
            System.err.println("Failed to send HTML email: " + e.getMessage());
        }
    }
}
