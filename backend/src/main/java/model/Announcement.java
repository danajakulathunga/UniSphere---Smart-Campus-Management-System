package model;

import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "announcements")
public class Announcement {

    @Id
    private String id;

    private String title;
    private String message;
    private String type; // URGENT, INFO, HOLIDAY
    private String targetAudience; // ALL or specific batch (e.g., Y1S1)
    private String postedBy;
    private String postedByRole;
    private String batchSemester;
    private List<Recipient> recipients = new ArrayList<>();
    private LocalDateTime updatedAt;

    @CreatedDate
    private LocalDateTime createdAt;

    public Announcement() {
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getTargetAudience() {
        return targetAudience;
    }

    public void setTargetAudience(String targetAudience) {
        this.targetAudience = targetAudience;
    }

    public String getPostedBy() {
        return postedBy;
    }

    public void setPostedBy(String postedBy) {
        this.postedBy = postedBy;
    }

    public String getPostedByRole() {
        return postedByRole;
    }

    public void setPostedByRole(String postedByRole) {
        this.postedByRole = postedByRole;
    }

    public String getBatchSemester() {
        return batchSemester;
    }

    public void setBatchSemester(String batchSemester) {
        this.batchSemester = batchSemester;
    }

    public List<Recipient> getRecipients() {
        return recipients;
    }

    public void setRecipients(List<Recipient> recipients) {
        this.recipients = recipients;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public static class Recipient {
        private String userId;
        private boolean isRead;

        public Recipient() {
        }

        public Recipient(String userId, boolean isRead) {
            this.userId = userId;
            this.isRead = isRead;
        }

        public String getUserId() {
            return userId;
        }

        public void setUserId(String userId) {
            this.userId = userId;
        }

        public boolean isRead() {
            return isRead;
        }

        public void setRead(boolean read) {
            isRead = read;
        }
    }
}
