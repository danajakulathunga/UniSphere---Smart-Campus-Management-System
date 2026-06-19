package repository;

import model.User;
import model.Role;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmail(String email);
    List<User> findAllByRolesContaining(Role role);
    long countByRolesContaining(Role role);

    Page<User> findByRolesIn(List<Role> roles, Pageable pageable);
    
    @Query("{ '$and': [ { 'roles': { '$in': ?2 } }, { '$or': [ { 'name': { '$regex': ?0, '$options': 'i' } }, { 'email': { '$regex': ?1, '$options': 'i' } } ] } ] }")
    Page<User> findByNameAndEmailAndRoles(String name, String email, List<Role> roles, Pageable pageable);

    List<User> findByYearAndSemester(String year, String semester);
}
