package com.memocat.config;

import com.memocat.domain.User;
import com.memocat.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Seeds the two fixed accounts at startup from configuration (env-provided).
 * Idempotent: existing usernames are left untouched, blank entries are skipped.
 * Passwords are hashed with bcrypt here; plaintext never reaches the database.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final AccountsProperties accountsProperties;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(AccountsProperties accountsProperties,
                      UserRepository userRepository,
                      PasswordEncoder passwordEncoder) {
        this.accountsProperties = accountsProperties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        for (AccountsProperties.Account account : accountsProperties.getAccounts()) {
            if (!StringUtils.hasText(account.getUsername())
                    || !StringUtils.hasText(account.getPassword())) {
                log.warn("Skipping seed account with missing username or password "
                        + "(check MEMOCAT_USER*_USERNAME / MEMOCAT_USER*_PASSWORD env vars).");
                continue;
            }
            if (userRepository.existsByUsername(account.getUsername())) {
                continue;
            }
            String displayName = StringUtils.hasText(account.getDisplayName())
                    ? account.getDisplayName()
                    : account.getUsername();
            User user = new User(
                    account.getUsername(),
                    passwordEncoder.encode(account.getPassword()),
                    displayName);
            userRepository.save(user);
            log.info("Seeded account '{}'.", account.getUsername());
        }
    }
}
