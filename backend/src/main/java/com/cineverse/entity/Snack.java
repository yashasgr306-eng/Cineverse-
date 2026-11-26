package com.cineverse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "snacks")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Snack {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 140)
    private String name;

    @Column(length = 400)
    private String description;

    @Column(nullable = false, length = 40)
    private String category;

    @Column(nullable = false)
    private Integer price;

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(length = 40)
    private String calories;

    @Column(name = "is_combo", nullable = false)
    private Boolean isCombo = false;

    @Column(nullable = false)
    private Boolean veg = true;
}
