package com.memocat.couple;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Every 10 minutes, sends the reminders for tomorrow's dates once it is evening. */
@Component
public class EventReminderJob {

    private static final Logger log = LoggerFactory.getLogger(EventReminderJob.class);

    private final CoupleEventService events;

    public EventReminderJob(CoupleEventService events) {
        this.events = events;
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 600_000)
    public void run() {
        try {
            int sent = events.remindTomorrow();
            if (sent > 0) {
                log.info("Sent {} reminder(s) for tomorrow's dates", sent);
            }
        } catch (Exception e) {
            log.warn("Date reminders failed: {}", e.getMessage());
        }
    }
}
