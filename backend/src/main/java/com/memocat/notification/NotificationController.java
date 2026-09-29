package com.memocat.notification;

import com.memocat.notification.dto.NotificationsDto;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** The bell of whoever is logged in (only ever their own entries). */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) {
        this.service = service;
    }

    @GetMapping
    public NotificationsDto list(Principal principal) {
        return service.list(principal.getName());
    }

    @PostMapping("/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(Principal principal) {
        service.markAllRead(principal.getName());
    }

    @PostMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(Principal principal, @PathVariable Long id) {
        service.markRead(principal.getName(), id);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(Principal principal) {
        service.clear(principal.getName());
    }
}
