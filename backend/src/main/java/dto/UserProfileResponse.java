package dto;

import model.Provider;
import model.Role;
import model.NotificationSettings;

import java.util.Date;
import java.util.List;

public class UserProfileResponse {
    private String id;
    private String name;
    private String honorific;
    private String email;
    private Provider provider;
    private List<Role> roles;
    private String profilePicture;
    private Date createdAt;
    private NotificationSettings notificationSettings;

    private String year;
    private String semester;
    private String faculty;
    private String bio;

    // Lecturer Fields
    private String department;
    private String designation;
    private String modules;
    private String batches;
    private String officeLocation;

    // Technician Fields
    private String specialization;
    private String skills;
    private String assignedAreas;
    private String employeeId;

    // Common
    private String workingHours;

    // Technician Stats (Read-only)
    private Long completedTicketsCount;
    private Double averageRating;

    private boolean enabled;

    public UserProfileResponse(String id, String name, String email, Provider provider, List<Role> roles, String profilePicture, Date createdAt, NotificationSettings notificationSettings, boolean enabled, String year, String semester, String faculty, String bio) {
        this.id = id;
        this.name = name;
        this.email = email;
        this.provider = provider;
        this.roles = roles;
        this.profilePicture = profilePicture;
        this.createdAt = createdAt;
        this.notificationSettings = notificationSettings;
        this.enabled = enabled;
        this.year = year;
        this.semester = semester;
        this.faculty = faculty;
        this.bio = bio;
    }

    public UserProfileResponse() {}

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

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

    public Provider getProvider() {
        return provider;
    }

    public void setProvider(Provider provider) {
        this.provider = provider;
    }

    public List<Role> getRoles() {
        return roles;
    }

    public void setRoles(List<Role> roles) {
        this.roles = roles;
    }

    public String getProfilePicture() {
        return profilePicture;
    }

    public void setProfilePicture(String profilePicture) {
        this.profilePicture = profilePicture;
    }

    public Date getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Date createdAt) {
        this.createdAt = createdAt;
    }

    public NotificationSettings getNotificationSettings() {
        return notificationSettings;
    }

    public void setNotificationSettings(NotificationSettings notificationSettings) {
        this.notificationSettings = notificationSettings;
    }

    public String getYear() {
        return year;
    }

    public void setYear(String year) {
        this.year = year;
    }

    public String getSemester() {
        return semester;
    }

    public void setSemester(String semester) {
        this.semester = semester;
    }

    public String getFaculty() {
        return faculty;
    }

    public void setFaculty(String faculty) {
        this.faculty = faculty;
    }

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getDesignation() {
        return designation;
    }

    public void setDesignation(String designation) {
        this.designation = designation;
    }

    public String getModules() {
        return modules;
    }

    public void setModules(String modules) {
        this.modules = modules;
    }

    public String getBatches() {
        return batches;
    }

    public void setBatches(String batches) {
        this.batches = batches;
    }

    public String getOfficeLocation() {
        return officeLocation;
    }

    public void setOfficeLocation(String officeLocation) {
        this.officeLocation = officeLocation;
    }

    public String getSpecialization() {
        return specialization;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public String getSkills() {
        return skills;
    }

    public void setSkills(String skills) {
        this.skills = skills;
    }

    public String getAssignedAreas() {
        return assignedAreas;
    }

    public void setAssignedAreas(String assignedAreas) {
        this.assignedAreas = assignedAreas;
    }

    public String getEmployeeId() {
        return employeeId;
    }

    public void setEmployeeId(String employeeId) {
        this.employeeId = employeeId;
    }

    public String getWorkingHours() {
        return workingHours;
    }

    public void setWorkingHours(String workingHours) {
        this.workingHours = workingHours;
    }

    public Long getCompletedTicketsCount() {
        return completedTicketsCount;
    }

    public void setCompletedTicketsCount(Long completedTicketsCount) {
        this.completedTicketsCount = completedTicketsCount;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }

    public String getHonorific() {
        return honorific;
    }

    public void setHonorific(String honorific) {
        this.honorific = honorific;
    }
}


