package service;

import dto.ResourceRequest;
import model.Resource;
import model.ResourceStatus;
import repository.ResourceRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class ResourceService {

    private final ResourceRepository resourceRepository;
    private final MongoTemplate mongoTemplate;
    private final FileService fileService;

    public ResourceService(ResourceRepository resourceRepository, MongoTemplate mongoTemplate, FileService fileService) {
        this.resourceRepository = resourceRepository;
        this.mongoTemplate = mongoTemplate;
        this.fileService = fileService;
    }

    public Resource createResource(ResourceRequest request) {
        Resource resource = new Resource();
        apply(resource, request);
        return resourceRepository.save(resource);
    }

    public Resource updateResource(String id, ResourceRequest request) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found."));

        apply(resource, request);
        return resourceRepository.save(resource);
    }

    public void deleteResource(String id) {
        if (!resourceRepository.existsById(id)) {
            throw new IllegalArgumentException("Resource not found.");
        }
        resourceRepository.deleteById(id);
    }

    public Page<Resource> getResources(String search,
                                       String type,
                                       Integer minCapacity,
                                       String location,
                                       ResourceStatus status,
                                       Pageable pageable) {
        Query query = new Query();
        List<Criteria> criteria = new ArrayList<>();

        if (search != null && !search.isBlank()) {
            String safeRegex = Pattern.quote(search.trim());
            criteria.add(new Criteria().orOperator(
                    Criteria.where("name").regex(safeRegex, "i"),
                    Criteria.where("type").regex(safeRegex, "i"),
                    Criteria.where("location").regex(safeRegex, "i")
            ));
        }

        if (type != null && !type.isBlank()) {
            criteria.add(Criteria.where("type").regex("^" + Pattern.quote(type.trim()) + "$", "i"));
        }

        if (minCapacity != null) {
            criteria.add(Criteria.where("capacity").gte(minCapacity));
        }

        if (location != null && !location.isBlank()) {
            criteria.add(Criteria.where("location").regex(Pattern.quote(location.trim()), "i"));
        }

        if (status != null) {
            criteria.add(Criteria.where("status").is(status));
        }

        if (!criteria.isEmpty()) {
            query.addCriteria(new Criteria().andOperator(criteria.toArray(new Criteria[0])));
        }

        long total = mongoTemplate.count(query, Resource.class);
        query.with(pageable);
        List<Resource> content = mongoTemplate.find(query, Resource.class);

        return new PageImpl<>(content, pageable, total);
    }

    public Resource getResourceById(String id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Resource not found."));
    }

    public Map<String, Object> getSummary() {
        List<Resource> all = resourceRepository.findAll();
        Map<String, Object> summary = new HashMap<>();

        summary.put("total", all.size());

        // Type counts
        Map<String, Long> typeCounts = all.stream()
                .collect(Collectors.groupingBy(Resource::getType, Collectors.counting()));
        summary.put("typeCounts", typeCounts);

        // Location counts
        Map<String, Long> locationCounts = all.stream()
                .collect(Collectors.groupingBy(Resource::getLocation, Collectors.counting()));
        summary.put("locationCounts", locationCounts);

        // Capacity counts
        Map<String, Long> capacityCounts = new HashMap<>();
        capacityCounts.put("10", all.stream().filter(r -> r.getCapacity() >= 10).count());
        capacityCounts.put("50", all.stream().filter(r -> r.getCapacity() >= 50).count());
        capacityCounts.put("100", all.stream().filter(r -> r.getCapacity() >= 100).count());
        capacityCounts.put("200", all.stream().filter(r -> r.getCapacity() >= 200).count());
        summary.put("capacityCounts", capacityCounts);

        return summary;
    }

    private void apply(Resource resource, ResourceRequest request) {
        resource.setName(request.getName().trim());
        resource.setType(request.getType().trim());
        resource.setCapacity(request.getCapacity());
        resource.setLocation(request.getLocation().trim());
        resource.setAvailability(request.getAvailability());
        resource.setStatus(request.getStatus());

        if (request.getImage() != null && !request.getImage().isBlank()) {
            String imageUrl = fileService.saveBase64Image(request.getImage(), "resources");
            if (imageUrl != null) {
                resource.setImage(imageUrl);
            }
        }
    }
}


