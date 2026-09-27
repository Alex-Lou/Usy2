package com.memocat;

import com.memocat.config.AccountsProperties;
import com.memocat.config.CorsProperties;
import com.memocat.config.JwtProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({JwtProperties.class, AccountsProperties.class, CorsProperties.class})
public class MemoCatApplication {

    public static void main(String[] args) {
        SpringApplication.run(MemoCatApplication.class, args);
    }
}
