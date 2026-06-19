package service;

import dto.JwtResponse;
import dto.LoginRequest;
import dto.RegisterRequest;
import dto.ResetPasswordRequest;
import dto.StaffCreateRequest;
import model.Provider;
import model.Role;
import model.User;
import model.NotificationType;
import repository.UserRepository;
import security.JwtUtils;
import security.UserDetailsImpl;
import util.RoleEmailValidator;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@Service
public class AuthService {

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, String> forgotPasswordCodes = new ConcurrentHashMap<>();

    private final AuthenticationManager authenticationManager;

    private final UserRepository userRepository;

    private final PasswordEncoder encoder;

    private final JwtUtils jwtUtils;
    
    private final NotificationService notificationService;
    private final EmailService emailService;

    public AuthService(AuthenticationManager authenticationManager,
                       UserRepository userRepository,
                       PasswordEncoder encoder,
                       JwtUtils jwtUtils,
                       NotificationService notificationService,
                       EmailService emailService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.encoder = encoder;
        this.jwtUtils = jwtUtils;
        this.notificationService = notificationService;
        this.emailService = emailService;
    }

    public JwtResponse authenticateUser(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getEmail(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = jwtUtils.getRoleNames(userDetails.getAuthorities());

        return new JwtResponse(jwt,
                userDetails.getId(),
                userDetails.getName(),
                userDetails.getEmail(),
                roles);
    }

    public void registerUser(RegisterRequest signUpRequest) {
        if (Boolean.TRUE.equals(userRepository.existsByEmail(signUpRequest.getEmail()))) {
            throw new DuplicateEmailException("Error: Email is already in use!");
        }

        String requestedRole = signUpRequest.getRole() == null
                ? "USER"
                : signUpRequest.getRole().trim().toUpperCase();

        Role role;
        try {
            role = Role.valueOf(requestedRole);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid role. Allowed roles: USER, ADMIN, TECHNICIAN, LECTURER.");
        }

        if (role != Role.USER) {
            throw new IllegalArgumentException("Self-registration is only allowed for students.");
        }

        RoleEmailValidator.validateRoleEmail(role, signUpRequest.getEmail());

        User user = new User();
        user.setName(signUpRequest.getName());
        user.setEmail(signUpRequest.getEmail());
        user.setPassword(encoder.encode(signUpRequest.getPassword()));
        user.setProvider(Provider.LOCAL);
        user.setRoles(List.of(role));
        user.setCreatedAt(new Date());

        userRepository.save(user);
        
        String notificationMessage = user.getName() + " has joined UniSphere - Smart University management System as a Student.";
        notificationService.createForRole(Role.ADMIN, "New Student Registered", notificationMessage, NotificationType.USER_REGISTERED, "USER", user.getId(), Set.of());
    }

    public void createStaffAccount(StaffCreateRequest request) {
        if (Boolean.TRUE.equals(userRepository.existsByEmail(request.getEmail()))) {
            throw new DuplicateEmailException("Error: System email is already in use!");
        }

        Role role;
        try {
            role = Role.valueOf(request.getRole().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid role. Allowed roles: TECHNICIAN, LECTURER.");
        }

        if (role != Role.LECTURER && role != Role.TECHNICIAN) {
            throw new IllegalArgumentException("Only Lecturer and Technician accounts can be created here.");
        }

        // Domain validation
        String email = request.getEmail().toLowerCase();
        if (role == Role.LECTURER && !email.startsWith("lec") || !email.endsWith("@unisphere.com")) {
            if (role == Role.LECTURER && !email.matches("^lec.*@unisphere\\.com$")) {
                throw new IllegalArgumentException("Lecturer email must follow pattern: lec****@unisphere.com");
            }
        }
        if (role == Role.TECHNICIAN && !email.matches("^tech.*@unisphere\\.com$")) {
            throw new IllegalArgumentException("Technician email must follow pattern: tech****@unisphere.com");
        }

        User user = new User();
        user.setName(request.getName());
        user.setHonorific(request.getHonorific());
        user.setEmail(request.getEmail());
        user.setNotificationEmail(request.getNotificationEmail());
        user.setPassword(encoder.encode(request.getTemporaryPassword()));
        user.setProvider(Provider.LOCAL);
        user.setRoles(List.of(role));
        user.setStatus("ACTIVE");
        user.setCreatedAt(new Date());
        user.setEnabled(true);

        userRepository.save(user);

        // Generate notifications for staff creation
        if (role == Role.LECTURER) {
            String adminMsg = user.getName() + " has been added UniSphere - Smart University management System as a Lecturer.";
            notificationService.createForRole(Role.ADMIN, "New Lecturer Added", adminMsg, NotificationType.USER_REGISTERED, "USER", user.getId(), Set.of());
        } else if (role == Role.TECHNICIAN) {
            String adminMsg = user.getName() + " has been added UniSphere - Smart University management System as a Technician.";
            notificationService.createForRole(Role.ADMIN, "New Technician Added", adminMsg, NotificationType.USER_REGISTERED, "USER", user.getId(), Set.of());
        }

        // Welcome notification for the staff member
        notificationService.createForUser(
            user.getId(),
            role,
            "Welcome to UniSphere",
            "Your account has been created successfully. Please log in using the credentials sent to your email.",
            NotificationType.USER_REGISTERED,
            "USER",
            user.getId()
        );

        // Send email notification
        emailService.sendStaffAccountCreatedEmail(
            request.getNotificationEmail(),
            request.getName(),
            request.getEmail(),
            request.getTemporaryPassword(),
            request.getRole()
        );
    }

    public String generateForgotPasswordCode(String email) {
        String normalizedEmail = normalizeEmail(email);

        Optional<User> userOptional = userRepository.findByEmailIgnoreCase(normalizedEmail);
        if (userOptional.isEmpty()) {
            throw new IllegalArgumentException("No account found for this email.");
        }

        String verificationCode = String.format("%06d", secureRandom.nextInt(1_000_000));
        forgotPasswordCodes.put(normalizedEmail, verificationCode);

        return verificationCode;
    }

    public void resetPassword(ResetPasswordRequest request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account found for this email."));

        if (request.getVerificationCode() != null && !request.getVerificationCode().trim().isEmpty()) {
            String expectedCode = forgotPasswordCodes.get(normalizedEmail);
            if (expectedCode == null || !expectedCode.equals(request.getVerificationCode().trim())) {
                throw new IllegalArgumentException("Invalid or expired verification code.");
            }
        } else {
            if (request.getCurrentPassword() == null || request.getCurrentPassword().trim().isEmpty()) {
                throw new IllegalArgumentException("Current password is required.");
            }
            if (!encoder.matches(request.getCurrentPassword(), user.getPassword())) {
                throw new IllegalArgumentException("Current password is incorrect.");
            }
        }

        user.setPassword(encoder.encode(request.getNewPassword()));
        userRepository.save(user);
        forgotPasswordCodes.remove(normalizedEmail);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private Role resolvePrimaryRole(List<Role> roles) {
        if (roles == null || roles.isEmpty()) {
            return Role.USER;
        }

        return roles.get(0);
    }
}


