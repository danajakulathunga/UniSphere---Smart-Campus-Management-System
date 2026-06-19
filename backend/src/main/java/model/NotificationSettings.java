package model;

public class NotificationSettings {
    private boolean all = true;
    private boolean booking = true;
    private boolean ticket = true;
    private boolean lecture = true;

    public NotificationSettings() {
    }

    public NotificationSettings(boolean all, boolean booking, boolean ticket, boolean lecture) {
        this.all = all;
        this.booking = booking;
        this.ticket = ticket;
        this.lecture = lecture;
    }

    public boolean isAll() {
        return all;
    }

    public void setAll(boolean all) {
        this.all = all;
    }

    public boolean isBooking() {
        return booking;
    }

    public void setBooking(boolean booking) {
        this.booking = booking;
    }

    public boolean isTicket() {
        return ticket;
    }

    public void setTicket(boolean ticket) {
        this.ticket = ticket;
    }

    public boolean isLecture() {
        return lecture;
    }

    public void setLecture(boolean lecture) {
        this.lecture = lecture;
    }
}
