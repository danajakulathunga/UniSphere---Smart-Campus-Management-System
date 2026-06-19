package service;

import model.Announcement;
import model.User;
import model.NotificationType;
import repository.AnnouncementRepository;
import repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public AnnouncementService(AnnouncementRepository announcementRepository,
                               UserRepository userRepository,
                               NotificationService notificationService) {
        this.announcementRepository = announcementRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    public List<Announcement> getAnnouncementsForUser(User user) {
        if (user == null) {
            return new ArrayList<>();
        }

        List<Announcement> all = announcementRepository.findAllByOrderByCreatedAtDesc();
        List<Announcement> filtered = new ArrayList<>();

        for (Announcement a : all) {
            // Creator can always see
            if (a.getPostedBy() != null && a.getPostedBy().equals(user.getName())) {
                filtered.add(a);
                continue;
            }

            // Admins can see all announcements (as they are system managers)
            boolean isAdmin = user.getRoles().stream().anyMatch(role -> role.name().equals("ADMIN"));
            if (isAdmin) {
                filtered.add(a);
                continue;
            }

            // Check if user is in recipients list
            if (a.getRecipients() != null && !a.getRecipients().isEmpty()) {
                boolean isRecipient = a.getRecipients().stream()
                        .anyMatch(r -> r.getUserId().equals(user.getId()));
                if (isRecipient) {
                    filtered.add(a);
                }
            } else {
                // Fallback for legacy announcements (empty/null recipients)
                List<String> userRoles = user.getRoles().stream()
                        .map(r -> r.name().toUpperCase())
                        .toList();
                boolean isUserAdmin = userRoles.contains("ADMIN");
                boolean isUserLecturer = userRoles.contains("LECTURER");
                boolean isUserTechnician = userRoles.contains("TECHNICIAN");
                boolean isUserStudent = userRoles.contains("USER");

                String userBatch = "";
                if (user.getYear() != null && user.getSemester() != null) {
                    String yCode = "";
                    String sCode = "";

                    String yLower = user.getYear().toLowerCase();
                    if (yLower.contains("1") || yLower.contains("one")) yCode = "Y1";
                    else if (yLower.contains("2") || yLower.contains("two")) yCode = "Y2";
                    else if (yLower.contains("3") || yLower.contains("three")) yCode = "Y3";
                    else if (yLower.contains("4") || yLower.contains("four")) yCode = "Y4";

                    String sLower = user.getSemester().toLowerCase();
                    if (sLower.contains("1") || sLower.contains("one")) sCode = "S1";
                    else if (sLower.contains("2") || sLower.contains("two")) sCode = "S2";

                    if (!yCode.isEmpty() && !sCode.isEmpty()) {
                        userBatch = yCode + sCode;
                    }
                }

                String target = a.getTargetAudience();
                if (target == null) target = "ALL";
                target = target.toUpperCase();

                if (target.equals("ALL")) {
                    filtered.add(a);
                } else if (target.equals("ADMINS")) {
                    if (isUserAdmin) filtered.add(a);
                } else if (target.equals("LECTURERS")) {
                    if (isUserLecturer) filtered.add(a);
                } else if (target.equals("TECHNICIANS")) {
                    if (isUserTechnician) filtered.add(a);
                } else if (target.equals("STUDENTS")) {
                    if (isUserStudent) {
                        String batch = a.getBatchSemester();
                        if (batch == null || batch.isEmpty() || batch.equalsIgnoreCase("ALL") || batch.equalsIgnoreCase(userBatch)) {
                            filtered.add(a);
                        }
                    }
                } else {
                    if (isUserStudent && target.equals(userBatch)) {
                        filtered.add(a);
                    }
                }
            }
        }

        return filtered;
    }

    public Announcement createAnnouncement(Announcement announcement, User user) {
        // Authenticate permission (Admin or Lecturer)
        boolean hasPermission = user.getRoles().stream()
                .anyMatch(role -> role.name().equals("ADMIN") || role.name().equals("LECTURER"));
        if (!hasPermission) {
            throw new IllegalArgumentException("Only Admin and Lecturers can post announcements.");
        }

        if (announcement.getTitle() == null || announcement.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty.");
        }
        if (announcement.getMessage() == null || announcement.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("Message cannot be empty.");
        }

        announcement.setPostedBy(user.getName());
        announcement.setPostedByRole(user.getRoles().iterator().next().name());
        announcement.setCreatedAt(LocalDateTime.now());
        announcement.setUpdatedAt(LocalDateTime.now());
        if (announcement.getType() == null) {
            announcement.setType("INFO");
        }
        if (announcement.getTargetAudience() == null) {
            announcement.setTargetAudience("ALL");
        } else {
            announcement.setTargetAudience(announcement.getTargetAudience().toUpperCase());
        }

        // Resolve recipients for initial state
        List<Announcement.Recipient> resolvedRecipients = resolveRecipients(
                announcement.getTargetAudience(),
                announcement.getBatchSemester(),
                user
        );
        announcement.setRecipients(resolvedRecipients);

        Announcement saved = announcementRepository.save(announcement);

        if (saved.getRecipients() != null) {
            for (Announcement.Recipient recipient : saved.getRecipients()) {
                notificationService.createForUser(
                        recipient.getUserId(),
                        null,
                        "New Announcement",
                        saved.getTitle(),
                        NotificationType.ANNOUNCEMENT_PUBLISHED,
                        "ANNOUNCEMENT",
                        saved.getId()
                );
            }
        }

        return saved;
    }

    public Announcement updateAnnouncement(String id, Announcement announcementData, User user) {
        boolean hasPermission = user.getRoles().stream()
                .anyMatch(role -> role.name().equals("ADMIN") || role.name().equals("LECTURER"));
        if (!hasPermission) {
            throw new IllegalArgumentException("Only Admin and Lecturers can update announcements.");
        }

        Announcement existing = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found."));

        if (announcementData.getTitle() == null || announcementData.getTitle().trim().isEmpty()) {
            throw new IllegalArgumentException("Title cannot be empty.");
        }
        if (announcementData.getMessage() == null || announcementData.getMessage().trim().isEmpty()) {
            throw new IllegalArgumentException("Message cannot be empty.");
        }

        existing.setTitle(announcementData.getTitle());
        existing.setMessage(announcementData.getMessage());
        existing.setType(announcementData.getType() == null ? "INFO" : announcementData.getType());
        existing.setTargetAudience(announcementData.getTargetAudience() == null ? "ALL" : announcementData.getTargetAudience().toUpperCase());
        existing.setBatchSemester(announcementData.getBatchSemester());
        existing.setUpdatedAt(LocalDateTime.now());

        // Resolve recipients and preserve read states
        List<Announcement.Recipient> newRecipients = resolveRecipients(
                existing.getTargetAudience(),
                existing.getBatchSemester(),
                user
        );

        if (existing.getRecipients() != null) {
            for (Announcement.Recipient newR : newRecipients) {
                for (Announcement.Recipient oldR : existing.getRecipients()) {
                    if (oldR.getUserId().equals(newR.getUserId())) {
                        newR.setRead(oldR.isRead());
                        break;
                    }
                }
            }
        }
        existing.setRecipients(newRecipients);

        return announcementRepository.save(existing);
    }

    public Announcement markAsRead(String id, User user) {
        Announcement announcement = announcementRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Announcement not found."));

        if (announcement.getRecipients() == null) {
            announcement.setRecipients(new ArrayList<>());
        }

        boolean found = false;
        for (Announcement.Recipient r : announcement.getRecipients()) {
            if (r.getUserId().equals(user.getId())) {
                r.setRead(true);
                found = true;
                break;
            }
        }

        if (!found) {
            announcement.getRecipients().add(new Announcement.Recipient(user.getId(), true));
        }

        return announcementRepository.save(announcement);
    }

    public void deleteAnnouncement(String id, User user) {
        boolean hasPermission = user.getRoles().stream()
                .anyMatch(role -> role.name().equals("ADMIN") || role.name().equals("LECTURER"));
        if (!hasPermission) {
            throw new IllegalArgumentException("Only Admins and Lecturers can delete announcements.");
        }
        if (!announcementRepository.existsById(id)) {
            throw new IllegalArgumentException("Announcement not found.");
        }
        announcementRepository.deleteById(id);
    }

    private List<Announcement.Recipient> resolveRecipients(String targetAudience, String batchSemester, User creator) {
        List<Announcement.Recipient> recipientsList = new ArrayList<>();
        if (targetAudience == null) {
            targetAudience = "ALL";
        }
        targetAudience = targetAudience.toUpperCase();

        List<User> allUsers = userRepository.findAll();

        for (User u : allUsers) {
            // Creator doesn't need to be a recipient
            if (creator != null && u.getId().equals(creator.getId())) {
                continue;
            }

            List<String> roles = u.getRoles().stream().map(r -> r.name().toUpperCase()).toList();
            boolean isStudent = roles.contains("USER");
            boolean isLecturer = roles.contains("LECTURER");
            boolean isTechnician = roles.contains("TECHNICIAN");
            boolean isAdmin = roles.contains("ADMIN");

            boolean match = false;

            if (targetAudience.equals("ALL")) {
                match = true;
            } else if (targetAudience.equals("ADMINS")) {
                match = isAdmin;
            } else if (targetAudience.equals("LECTURERS")) {
                match = isLecturer;
            } else if (targetAudience.equals("TECHNICIANS")) {
                match = isTechnician;
            } else if (targetAudience.equals("STUDENTS")) {
                if (isStudent) {
                    if (batchSemester == null || batchSemester.isEmpty() || batchSemester.equalsIgnoreCase("ALL")) {
                        match = true;
                    } else {
                        String userBatch = "";
                        if (u.getYear() != null && u.getSemester() != null) {
                            String yCode = "";
                            String sCode = "";

                            String yLower = u.getYear().toLowerCase();
                            if (yLower.contains("1") || yLower.contains("one")) yCode = "Y1";
                            else if (yLower.contains("2") || yLower.contains("two")) yCode = "Y2";
                            else if (yLower.contains("3") || yLower.contains("three")) yCode = "Y3";
                            else if (yLower.contains("4") || yLower.contains("four")) yCode = "Y4";

                            String sLower = u.getSemester().toLowerCase();
                            if (sLower.contains("1") || sLower.contains("one")) sCode = "S1";
                            else if (sLower.contains("2") || sLower.contains("two")) sCode = "S2";

                            if (!yCode.isEmpty() && !sCode.isEmpty()) {
                                userBatch = yCode + sCode;
                            }
                        }
                        match = batchSemester.equalsIgnoreCase(userBatch);
                    }
                }
            } else {
                if (isStudent) {
                    String userBatch = "";
                    if (u.getYear() != null && u.getSemester() != null) {
                        String yCode = "";
                        String sCode = "";

                        String yLower = u.getYear().toLowerCase();
                        if (yLower.contains("1") || yLower.contains("one")) yCode = "Y1";
                        else if (yLower.contains("2") || yLower.contains("two")) yCode = "Y2";
                        else if (yLower.contains("3") || yLower.contains("three")) yCode = "Y3";
                        else if (yLower.contains("4") || yLower.contains("four")) yCode = "Y4";

                        String sLower = u.getSemester().toLowerCase();
                        if (sLower.contains("1") || sLower.contains("one")) sCode = "S1";
                        else if (sLower.contains("2") || sLower.contains("two")) sCode = "S2";

                        if (!yCode.isEmpty() && !sCode.isEmpty()) {
                            userBatch = yCode + sCode;
                        }
                    }
                    match = targetAudience.equalsIgnoreCase(userBatch);
                }
            }

            if (match) {
                recipientsList.add(new Announcement.Recipient(u.getId(), false));
            }
        }
        return recipientsList;
    }
}
