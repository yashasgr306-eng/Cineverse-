package com.cineverse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CineverseApplication {
    public static void main(String[] args) {
        SpringApplication.run(CineverseApplication.class, args);
    }
}
