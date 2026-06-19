package controller;

import model.Announcement;
import model.User;
import service.AnnouncementService;
import service.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/announcements")
public class AnnouncementController {

    private final AnnouncementService announcementService;
    private final CurrentUserService currentUserService;

    public AnnouncementController(AnnouncementService announcementService, CurrentUserService currentUserService) {
        this.announcementService = announcementService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    public ResponseEntity<List<Announcement>> getAnnouncements() {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(announcementService.getAnnouncementsForUser(user));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
    public ResponseEntity<Announcement> createAnnouncement(@Valid @RequestBody Announcement announcement) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.status(HttpStatus.CREATED).body(announcementService.createAnnouncement(announcement, user));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
    public ResponseEntity<Announcement> updateAnnouncement(@PathVariable String id, @Valid @RequestBody Announcement announcement) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(announcementService.updateAnnouncement(id, announcement, user));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'LECTURER')")
    public ResponseEntity<Void> deleteAnnouncement(@PathVariable String id) {
        User user = currentUserService.getCurrentUser();
        announcementService.deleteAnnouncement(id, user);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Announcement> markAsRead(@PathVariable String id) {
        User user = currentUserService.getCurrentUser();
        return ResponseEntity.ok(announcementService.markAsRead(id, user));
    }
}
