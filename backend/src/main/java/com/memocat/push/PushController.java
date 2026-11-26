package com.memocat.push;

import com.memocat.domain.User;
import com.memocat.push.dto.PublicKeyDto;
import com.memocat.push.dto.PushSubscribeRequest;
import com.memocat.repository.UserRepository;
import com.memocat.web.ResourceNotFoundException;
import com.memocat.web.TooSoonException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/push")
public class PushController {

    /** One test at a time per person. */
    static final Duration TEST_QUIET = Duration.ofSeconds(15);

    private final VapidKeys vapidKeys;
    private final PushSubscriptionService subscriptionService;
    private final PushNotifier notifier;
    private final UserRepository users;
    private final Map<Long, Instant> lastTest = new ConcurrentHashMap<>();

    public PushController(VapidKeys vapidKeys, PushSubscriptionService subscriptionService, PushNotifier notifier,
                          UserRepository users) {
        this.vapidKeys = vapidKeys;
        this.subscriptionService = subscriptionService;
        this.notifier = notifier;
        this.users = users;
    }

    @GetMapping("/public-key")
    public PublicKeyDto publicKey() {
        return new PublicKeyDto(vapidKeys.publicKey());
    }

    @PostMapping("/subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void subscribe(Principal principal, @Valid @RequestBody PushSubscribeRequest request) {
        subscriptionService.subscribe(principal.getName(), request);
    }

    public record TestDto(int devices, long inSeconds) {
    }

    /** 🔔 A test notification to my own devices in a few seconds (see PushNotifier#test). */
    @PostMapping("/test")
    public TestDto test(Principal principal) {
        User me = users.findByUsername(principal.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Instant now = Instant.now();
        boolean[] tooSoon = {false};
        lastTest.compute(me.getId(), (id, last) -> {
            tooSoon[0] = last != null && now.isBefore(last.plus(TEST_QUIET));
            return tooSoon[0] ? last : now;
        });
        if (tooSoon[0]) {
            throw new TooSoonException("Un test est déjà en route, attends quelques secondes.");
        }
        return new TestDto(notifier.test(me), PushNotifier.TEST_AFTER.toSeconds());
    }
}
