package service;

import model.Role;
import model.User;
import repository.UserRepository;
import security.UserDetailsImpl;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserRepository userRepository;

    public CurrentUserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User getCurrentUser() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (!(principal instanceof UserDetailsImpl userDetails)) {
            throw new IllegalStateException("Invalid authentication context.");
        }

        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Current user not found."));
    }

    public void requireRole(User user, Role role) {
        if (user.getRoles() == null || !user.getRoles().contains(role)) {
            throw new IllegalArgumentException("You do not have permission for this action.");
        }
    }
}


