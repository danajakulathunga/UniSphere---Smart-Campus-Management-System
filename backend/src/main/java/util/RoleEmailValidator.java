package util;

import model.Role;

import java.util.regex.Pattern;

public final class RoleEmailValidator {

    private static final Pattern ADMIN_PATTERN = Pattern.compile("(?i)^admin.*@unisphere\\.com$");
    private static final Pattern TECHNICIAN_PATTERN = Pattern.compile("(?i)^tech.*@unisphere\\.com$");
    private static final Pattern LECTURER_PATTERN = Pattern.compile("(?i)^lec.*@unisphere\\.com$");
    private static final Pattern USER_FORBIDDEN_PREFIX_PATTERN = Pattern.compile("(?i)^(admin|tech|lec).*");
    private static final Pattern USER_FORBIDDEN_DOMAIN_PATTERN = Pattern.compile("(?i)^.*@unisphere\\.com$");

    private RoleEmailValidator() {
    }

    public static void validateRoleEmail(Role role, String email) {
        if (role == null || email == null) {
            throw new IllegalArgumentException("Role and email are required.");
        }

        if (!isValidForRole(role, email)) {
            throw new IllegalArgumentException(getErrorMessage(role));
        }
    }

    public static boolean isValidForRole(Role role, String email) {
        if (role == null || email == null) {
            return false;
        }

        String normalizedEmail = email.trim();

        return switch (role) {
            case ADMIN -> ADMIN_PATTERN.matcher(normalizedEmail).matches();
            case TECHNICIAN -> TECHNICIAN_PATTERN.matcher(normalizedEmail).matches();
            case LECTURER -> LECTURER_PATTERN.matcher(normalizedEmail).matches();
            case USER -> !USER_FORBIDDEN_PREFIX_PATTERN.matcher(normalizedEmail).matches()
                    && !USER_FORBIDDEN_DOMAIN_PATTERN.matcher(normalizedEmail).matches();
        };
    }

    public static String getErrorMessage(Role role) {
        if (role == Role.ADMIN) {
            return "Please use your authorized admin email";
        }

        if (role == Role.TECHNICIAN) {
            return "Please use your authorized technician email";
        }

        if (role == Role.USER) {
            return "Please use a valid user email";
        }

        if (role == Role.LECTURER) {
            return "Please use your authorized lecturer email";
        }

        return "Invalid email for selected role.";
    }
}

