package com.cineverse.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "seats", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"screen_id", "seat_code"})
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Seat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "screen_id", nullable = false)
    private Screen screen;

    @Column(name = "seat_code", nullable = false, length = 12)
    private String seatCode;

    @Column(name = "row_label", nullable = false, length = 6)
    private String rowLabel;

    @Column(name = "row_index", nullable = false)
    private Integer rowIndex;

    @Column(name = "col_number", nullable = false)
    private Integer colNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private SeatCategory category;

    @Column(name = "pair_group", length = 20)
    private String pairGroup;
}
