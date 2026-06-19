package security;

import model.Provider;
import model.Role;
import model.User;
import repository.UserRepository;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;
import java.util.Optional;

@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    public CustomOAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);

        try {
            return processOAuth2User(oAuth2User);
        } catch (Exception ex) {
            throw new OAuth2AuthenticationException(ex.getMessage());
        }
    }

    private OAuth2User processOAuth2User(OAuth2User oAuth2User) {
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        Optional<User> userOptional = userRepository.findByEmail(email);
        User user;

        if (userOptional.isPresent()) {
            user = userOptional.get();
            boolean hasNonUserRole = user.getRoles() != null && user.getRoles().stream()
                    .anyMatch(role -> role != Role.USER);

            if (hasNonUserRole) {
                throw new IllegalStateException(
                        "Google sign-in is only allowed for USER accounts.");
            }

            if (user.getProvider() != Provider.GOOGLE) {
                user.setProvider(Provider.GOOGLE);
                user.setRoles(List.of(Role.USER));
                user = userRepository.save(user);
            }
        } else {
            user = new User();
            user.setEmail(email);
            user.setName(name);
            user.setProvider(Provider.GOOGLE);
            user.setRoles(List.of(Role.USER));
            user.setCreatedAt(new Date());
            user = userRepository.save(user);
        }

        UserDetailsImpl userDetails = UserDetailsImpl.build(user);
        userDetails.setAttributes(oAuth2User.getAttributes());
        return userDetails;
    }
}


