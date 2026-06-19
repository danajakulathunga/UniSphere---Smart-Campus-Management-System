package repository;

import model.Announcement;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface AnnouncementRepository extends MongoRepository<Announcement, String> {
    List<Announcement> findAllByTargetAudienceInOrderByCreatedAtDesc(Collection<String> targetAudiences);
    List<Announcement> findAllByOrderByCreatedAtDesc();
}
