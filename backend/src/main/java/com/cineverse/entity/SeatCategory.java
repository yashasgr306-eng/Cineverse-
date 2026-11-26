package com.cineverse.entity;

public enum SeatCategory {
    ROYAL_RECLINER(550),
    BALCONY(320),
    PRIME(240),
    CLASSIC(160);

    private final int basePrice;

    SeatCategory(int basePrice) {
        this.basePrice = basePrice;
    }

    public int getBasePrice() {
        return basePrice;
    }
}
