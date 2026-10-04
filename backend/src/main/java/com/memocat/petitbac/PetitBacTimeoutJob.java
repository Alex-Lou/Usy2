package com.memocat.petitbac;

import com.memocat.petitbac.PetitBacDtos.PingDto;
import com.memocat.petitbac.PetitBacService.RoundKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Every 20 seconds, hands in the Petit Bac sheets whose time ran out with the app closed: the other
 * gets « à toi de valider » instead of waiting for nothing. Open screens reload on the ping.
 */
@Component
public class PetitBacTimeoutJob {

    private static final Logger log = LoggerFactory.getLogger(PetitBacTimeoutJob.class);

    private final PetitBacService petitBac;
    private final SimpMessagingTemplate messaging;

    public PetitBacTimeoutJob(PetitBacService petitBac, SimpMessagingTemplate messaging) {
        this.petitBac = petitBac;
        this.messaging = messaging;
    }

    @Scheduled(initialDelay = 30_000, fixedDelay = 20_000)
    public void run() {
        for (RoundKey key : petitBac.expiredRounds()) {
            try {
                if (petitBac.closeExpired(key.gameId(), key.number())) {
                    messaging.convertAndSend(PetitBacController.TOPIC, new PingDto(key.gameId(), null));
                }
            } catch (Exception e) {
                log.warn("Petit Bac {} round {}: closing failed: {}", key.gameId(), key.number(), e.getMessage());
            }
        }
    }
}
