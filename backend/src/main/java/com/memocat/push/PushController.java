package com.memocat.push;

import com.memocat.push.dto.PublicKeyDto;
import com.memocat.push.dto.PushSubscribeRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

@RestController
@RequestMapping("/api/push")
public class PushController {

    private final VapidKeys vapidKeys;
    private final PushSubscriptionService subscriptionService;

    public PushController(VapidKeys vapidKeys, PushSubscriptionService subscriptionService) {
        this.vapidKeys = vapidKeys;
        this.subscriptionService = subscriptionService;
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
}
