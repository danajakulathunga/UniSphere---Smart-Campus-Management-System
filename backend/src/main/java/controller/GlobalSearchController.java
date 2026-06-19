package controller;

import dto.GlobalSearchResult;
import service.GlobalSearchService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/search")
public class GlobalSearchController {

    private final GlobalSearchService globalSearchService;

    public GlobalSearchController(GlobalSearchService globalSearchService) {
        this.globalSearchService = globalSearchService;
    }

    @GetMapping
    public ResponseEntity<GlobalSearchResult> search(@RequestParam("q") String query) {
        return ResponseEntity.ok(globalSearchService.search(query));
    }
}
