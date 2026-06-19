package dto;

import java.util.List;

public class GlobalSearchResult {
    private List<SearchResultItem> facilities;
    private List<SearchResultItem> tickets;
    private List<SearchResultItem> bookings;
    private List<SearchResultItem> notifications;
    private List<SearchResultItem> users;
    private List<SearchResultItem> announcements;
    private List<SearchResultItem> lectures;

    public GlobalSearchResult() {
        this.facilities = new java.util.ArrayList<>();
        this.tickets = new java.util.ArrayList<>();
        this.bookings = new java.util.ArrayList<>();
        this.notifications = new java.util.ArrayList<>();
        this.users = new java.util.ArrayList<>();
        this.announcements = new java.util.ArrayList<>();
        this.lectures = new java.util.ArrayList<>();
    }

    public GlobalSearchResult(List<SearchResultItem> facilities, 
                              List<SearchResultItem> tickets, 
                              List<SearchResultItem> bookings, 
                              List<SearchResultItem> notifications,
                              List<SearchResultItem> users) {
        this.facilities = facilities;
        this.tickets = tickets;
        this.bookings = bookings;
        this.notifications = notifications;
        this.users = users;
        this.announcements = new java.util.ArrayList<>();
        this.lectures = new java.util.ArrayList<>();
    }

    public GlobalSearchResult(List<SearchResultItem> facilities, 
                              List<SearchResultItem> tickets, 
                              List<SearchResultItem> bookings, 
                              List<SearchResultItem> notifications,
                              List<SearchResultItem> users,
                              List<SearchResultItem> announcements) {
        this.facilities = facilities;
        this.tickets = tickets;
        this.bookings = bookings;
        this.notifications = notifications;
        this.users = users;
        this.announcements = announcements;
        this.lectures = new java.util.ArrayList<>();
    }

    public GlobalSearchResult(List<SearchResultItem> facilities, 
                              List<SearchResultItem> tickets, 
                              List<SearchResultItem> bookings, 
                              List<SearchResultItem> notifications,
                              List<SearchResultItem> users,
                              List<SearchResultItem> announcements,
                              List<SearchResultItem> lectures) {
        this.facilities = facilities;
        this.tickets = tickets;
        this.bookings = bookings;
        this.notifications = notifications;
        this.users = users;
        this.announcements = announcements;
        this.lectures = lectures;
    }

    public List<SearchResultItem> getFacilities() { return facilities; }
    public void setFacilities(List<SearchResultItem> facilities) { this.facilities = facilities; }

    public List<SearchResultItem> getTickets() { return tickets; }
    public void setTickets(List<SearchResultItem> tickets) { this.tickets = tickets; }

    public List<SearchResultItem> getBookings() { return bookings; }
    public void setBookings(List<SearchResultItem> bookings) { this.bookings = bookings; }

    public List<SearchResultItem> getNotifications() { return notifications; }
    public void setNotifications(List<SearchResultItem> notifications) { this.notifications = notifications; }

    public List<SearchResultItem> getUsers() { return users; }
    public void setUsers(List<SearchResultItem> users) { this.users = users; }

    public List<SearchResultItem> getAnnouncements() { return announcements; }
    public void setAnnouncements(List<SearchResultItem> announcements) { this.announcements = announcements; }

    public List<SearchResultItem> getLectures() { return lectures; }
    public void setLectures(List<SearchResultItem> lectures) { this.lectures = lectures; }

    public static class SearchResultItem {
        private String id;
        private String title;
        private String subtext;
        private String category;
        private String status;
        private String path;
        private String ownerId;

        public SearchResultItem() {}

        public SearchResultItem(String id, String title, String subtext, String category, String status, String path, String ownerId) {
            this.id = id;
            this.title = title;
            this.subtext = subtext;
            this.category = category;
            this.status = status;
            this.path = path;
            this.ownerId = ownerId;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }

        public String getSubtext() { return subtext; }
        public void setSubtext(String subtext) { this.subtext = subtext; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getPath() { return path; }
        public void setPath(String path) { this.path = path; }

        public String getOwnerId() { return ownerId; }
        public void setOwnerId(String ownerId) { this.ownerId = ownerId; }
    }
}
