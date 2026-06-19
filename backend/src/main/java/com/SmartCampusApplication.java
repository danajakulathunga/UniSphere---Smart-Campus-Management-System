package com;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.r2dbc.R2dbcAutoConfiguration;

import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication(exclude = {
    DataSourceAutoConfiguration.class,
    R2dbcAutoConfiguration.class
})
@EnableAsync
@ComponentScan(basePackages = {
    "config",
    "controller",
    "model",
    "repository",
    "security",
    "service",
    "util"
})
@EnableMongoRepositories(basePackages = "repository")
public class SmartCampusApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartCampusApplication.class, args);
    }

}
