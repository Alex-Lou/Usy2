package com.memocat.search;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/search")
public class SearchController {

    private final SearchService search;

    public SearchController(SearchService search) {
        this.search = search;
    }

    /** A word or a date; results grouped by kind in the app. */
    @GetMapping
    public List<SearchHit> search(@RequestParam(defaultValue = "") String q) {
        return search.search(q.length() > 200 ? q.substring(0, 200) : q);
    }
}
