package com.cineverse.config;

import com.cineverse.entity.*;
import com.cineverse.repository.*;
import com.cineverse.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final MovieRepository movieRepository;
    private final TheatreRepository theatreRepository;
    private final ScreenRepository screenRepository;
    private final ShowRepository showRepository;
    private final SnackRepository snackRepository;
    private final AdminService adminService;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (userRepository.count() == 0) {
            userRepository.save(User.builder()
                    .name("Aarav Menon")
                    .email("user@cineverse.in")
                    .phone("+91 98401 11223")
                    .passwordHash(passwordEncoder.encode("cinema123"))
                    .role(Role.USER)
                    .build());

            userRepository.save(User.builder()
                    .name("Vikramaditya Rao")
                    .email("admin@cineverse.in")
                    .phone("+91 99000 77889")
                    .passwordHash(passwordEncoder.encode("admin123"))
                    .role(Role.ADMIN)
                    .build());
        }

        if (movieRepository.count() == 0) {
            List<Movie> movies = movieRepository.saveAll(List.of(
                    Movie.builder()
                            .title("Ramayana: Part One")
                            .tagline("Rise of a Legend · Dharma written across eternity.")
                            .language("Hindi")
                            .languagesAvailable("Hindi, Tamil, Telugu, Kannada, Malayalam")
                            .genre("Epic · Mythology · Adventure")
                            .durationMinutes(185)
                            .rating(9.4)
                            .votesCount("540K")
                            .certificate("U")
                            .releaseDate("2026-11-05")
                            .director("Nitesh Tiwari")
                            .castList("Ranbir Kapoor, Sai Pallavi, Yash, Sunny Deol")
                            .description("Monumental IMAX 3D theatrical retelling of the timeless epic.")
                            .posterUrl("/src/assets/images/poster_ramayana_1794751352628.jpg")
                            .backdropUrl("/src/assets/images/poster_ramayana_1794751352628.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_ramayana")
                            .featured(true)
                            .nowShowing(true)
                            .formats("2D, 3D, IMAX, 4DX")
                            .accentColor("#F5C518")
                            .build(),
                    Movie.builder()
                            .title("Jailer 2")
                            .tagline("Old scores never stay buried.")
                            .language("Tamil")
                            .languagesAvailable("Tamil, Hindi, Telugu, Kannada, Malayalam")
                            .genre("Action · Crime Thriller")
                            .durationMinutes(164)
                            .rating(9.1)
                            .votesCount("295K")
                            .certificate("UA")
                            .releaseDate("2026-10-15")
                            .director("Nelson Dilipkumar")
                            .castList("Rajinikanth, Mohanlal, Shiva Rajkumar, S.J. Suryah")
                            .description("Retired prison warden Muthuvel Pandian returns to confront an international syndicate.")
                            .posterUrl("/src/assets/images/poster_jailer_two_1794751349463.jpg")
                            .backdropUrl("/src/assets/images/poster_jailer_two_1794751349463.jpg")
                            .trailerUrl("https://www.youtube.com/embed/xenOE1Tma0A")
                            .featured(true)
                            .nowShowing(true)
                            .formats("2D, IMAX, 4DX")
                            .accentColor("#F5C518")
                            .build(),
                    Movie.builder()
                            .title("Scene")
                            .tagline("One coastal night changes the script.")
                            .language("Tamil")
                            .languagesAvailable("Tamil, Malayalam, Telugu, Hindi")
                            .genre("Action · Comedy · Crime Mystery")
                            .durationMinutes(149)
                            .rating(8.8)
                            .votesCount("136K")
                            .certificate("UA")
                            .releaseDate("2026-11-06")
                            .director("Jithu Madhavan")
                            .castList("Suriya, Nazriya Nazim, Naslen, Anandraj")
                            .description("A sharp-witted film fixer and a chaotic wedding crew stumble onto an underworld syndicate ledger.")
                            .posterUrl("/src/assets/images/poster_scene_2026_1794756609009.jpg")
                            .backdropUrl("/src/assets/images/poster_scene_2026_1794756609009.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_scene")
                            .featured(true)
                            .nowShowing(true)
                            .formats("2D, IMAX")
                            .accentColor("#38BDF8")
                            .build(),
                    Movie.builder()
                            .title("Mookuthi Amman 2")
                            .tagline("Faith shines brighter than illusion.")
                            .language("Tamil")
                            .languagesAvailable("Tamil, Telugu, Kannada")
                            .genre("Fantasy · Spiritual Comedy Drama")
                            .durationMinutes(152)
                            .rating(8.6)
                            .votesCount("112K")
                            .certificate("U")
                            .releaseDate("2026-11-06")
                            .director("Sundar C")
                            .castList("Nayanthara, Regina Cassandra, Urvashi, Yogi Babu")
                            .description("Divine intervention returns to protect a historic coastal temple town from greedy deception.")
                            .posterUrl("/src/assets/images/poster_mookuthi_2026_1794756626504.jpg")
                            .backdropUrl("/src/assets/images/poster_mookuthi_2026_1794756626504.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_mookuthi2")
                            .featured(true)
                            .nowShowing(true)
                            .formats("2D, 3D")
                            .accentColor("#F59E0B")
                            .build(),
                    Movie.builder()
                            .title("Disco")
                            .tagline("Under the mirrorball, every shadow has a price.")
                            .language("Malayalam")
                            .languagesAvailable("Malayalam, Tamil, Kannada")
                            .genre("Action · Retro Crime Thriller")
                            .durationMinutes(158)
                            .rating(8.9)
                            .votesCount("88K")
                            .certificate("UA")
                            .releaseDate("2026-11-06")
                            .director("Ullas Chemban")
                            .castList("Antony Varghese, Arjun Ashokan, Lukman Avaran, Chemban Vinod Jose")
                            .description("Inside a neon-lit harbor club ruled by smugglers, a loyal enforcer turns the night upside down.")
                            .posterUrl("/src/assets/images/poster_disco_2026_1794756644159.jpg")
                            .backdropUrl("/src/assets/images/poster_disco_2026_1794756644159.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_disco")
                            .featured(true)
                            .nowShowing(true)
                            .formats("2D, 4DX")
                            .accentColor("#C084FC")
                            .build(),
                    Movie.builder()
                            .title("Drishyam 3: The Conclusion")
                            .tagline("Truth leaves one final witness.")
                            .language("Hindi")
                            .languagesAvailable("Hindi, Tamil, Telugu")
                            .genre("Crime · Mystery Thriller")
                            .durationMinutes(150)
                            .rating(8.7)
                            .votesCount("245K")
                            .certificate("UA")
                            .releaseDate("2026-10-02")
                            .director("Abhishek Pathak")
                            .castList("Ajay Devgn, Tabu, Shriya Saran, Jaideep Ahlawat")
                            .description("A relentless new investigation forces Vijay Salgaonkar into his highest-stakes battle of wits.")
                            .posterUrl("/src/assets/images/poster_drishyam3_2026_1794756668247.jpg")
                            .backdropUrl("/src/assets/images/poster_drishyam3_2026_1794756668247.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_drishyam3")
                            .featured(true)
                            .nowShowing(true)
                            .formats("2D, IMAX")
                            .accentColor("#60A5FA")
                            .build(),
                    Movie.builder()
                            .title("Itllu Arjuna")
                            .tagline("Every wave carries an unspoken letter.")
                            .language("Telugu")
                            .languagesAvailable("Telugu, Tamil")
                            .genre("Romantic Drama")
                            .durationMinutes(142)
                            .rating(8.4)
                            .votesCount("64K")
                            .certificate("UA")
                            .releaseDate("2026-11-07")
                            .director("Mahesh Uppala")
                            .castList("Aniesh, Anaswara Rajan, Vennela Kishore, Brahmaji")
                            .description("Set across coastal railway bridges, an aspiring musician and an archivist navigate love and timing.")
                            .posterUrl("/src/assets/images/poster_itllu_arjuna_2026_1794756683301.jpg")
                            .backdropUrl("/src/assets/images/poster_itllu_arjuna_2026_1794756683301.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_itlluarjuna")
                            .featured(true)
                            .nowShowing(true)
                            .formats("2D")
                            .accentColor("#FBBF24")
                            .build(),
                    Movie.builder()
                            .title("I Play Rocky")
                            .tagline("The fight nobody believed he could win.")
                            .language("English")
                            .languagesAvailable("English, Hindi")
                            .genre("Sports · Biographical Drama")
                            .durationMinutes(138)
                            .rating(8.6)
                            .votesCount("79K")
                            .certificate("UA")
                            .releaseDate("2026-11-06")
                            .director("Peter Farrelly")
                            .castList("Anthony Ippolito, AnnaSophia Robb, Matt Dillon, Stephan James")
                            .description("The true story of an unknown struggling actor risking everything to star in an underdog classic.")
                            .posterUrl("/src/assets/images/poster_i_play_rocky_2026_1794756708108.jpg")
                            .backdropUrl("/src/assets/images/poster_i_play_rocky_2026_1794756708108.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_rocky")
                            .featured(false)
                            .nowShowing(true)
                            .formats("2D, IMAX")
                            .accentColor("#EF4444")
                            .build(),
                    Movie.builder()
                            .title("Gondhal")
                            .tagline("Some rituals awaken secrets best left in the dark.")
                            .language("Kannada")
                            .languagesAvailable("Kannada, Hindi")
                            .genre("Folk · Psychological Thriller")
                            .durationMinutes(134)
                            .rating(8.5)
                            .votesCount("52K")
                            .certificate("UA")
                            .releaseDate("2026-11-01")
                            .director("Santosh Davakhar")
                            .castList("Ishitaa Deshmukh, Kishore Kadam, Yogesh Sohoni, Nishad Bhoir")
                            .description("During an all-night village ritual, simmering rivalries and hidden guilt erupt.")
                            .posterUrl("/src/assets/images/poster_gondhal_2026_1794756722802.jpg")
                            .backdropUrl("/src/assets/images/poster_gondhal_2026_1794756722802.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_gondhal")
                            .featured(false)
                            .nowShowing(true)
                            .formats("2D")
                            .accentColor("#F87171")
                            .build(),
                    Movie.builder()
                            .title("Udta Teer")
                            .tagline("Aim carefully—chaos always boomerangs.")
                            .language("Hindi")
                            .languagesAvailable("Hindi")
                            .genre("Satirical Comedy Thriller")
                            .durationMinutes(141)
                            .rating(8.2)
                            .votesCount("71K")
                            .certificate("UA")
                            .releaseDate("2026-10-23")
                            .director("Aakash Kaushik")
                            .castList("Ayushmann Khurrana, Sara Ali Khan, Rahul Bose, Ram Kapoor")
                            .description("A small-time prankster intercepts a scandal dossier, kicking off a rooftop chase across Delhi.")
                            .posterUrl("/src/assets/images/poster_udta_teer_2026_1794756737155.jpg")
                            .backdropUrl("/src/assets/images/poster_udta_teer_2026_1794756737155.jpg")
                            .trailerUrl("https://www.youtube.com/embed/sample_udtateer")
                            .featured(false)
                            .nowShowing(true)
                            .formats("2D")
                            .accentColor("#EC4899")
                            .build()
            ));

            if (theatreRepository.count() == 0) {
                List<Theatre> theatres = theatreRepository.saveAll(List.of(
                        Theatre.builder().name("CINEVERSE Grand IMAX · Phoenix").city("Chennai").address("Velachery Main Road, Chennai 600042").amenities("Dolby Atmos, Laser IMAX, Royal Recliners, 4K Projection").build(),
                        Theatre.builder().name("Sathyam Luxe Cinema").city("Chennai").address("Royapettah, Chennai 600014").amenities("Dolby Atmos, Gourmet Lounge, 4K RGB Laser").build(),
                        Theatre.builder().name("CINEVERSE Marina Gold · ECR").city("Chennai").address("East Coast Road, Thiruvanmiyur, Chennai 600041").amenities("4DX Motion, Dolby Atmos, Drive-In Valet, Royal Recliners").build(),
                        Theatre.builder().name("CINEVERSE Orion 4DX & IMAX").city("Bengaluru").address("Rajajinagar, Bengaluru 560055").amenities("4DX Motion, IMAX Laser, Royal Recliners").build(),
                        Theatre.builder().name("REX Director’s Cut · Indiranagar").city("Bengaluru").address("100 Feet Road, Indiranagar, Bengaluru 560038").amenities("Dolby Atmos, Balcony Lounge, In-Seat Service").build(),
                        Theatre.builder().name("CINEVERSE Lumiere · Whitefield").city("Bengaluru").address("ITPL Main Road, Whitefield, Bengaluru 560066").amenities("IMAX with Laser, ScreenX 270°, Royal Recliners").build(),
                        Theatre.builder().name("CINEVERSE Maison BKC").city("Mumbai").address("Bandra Kurla Complex, Mumbai 400051").amenities("IMAX with Laser, Dolby Vision, Valet Parking").build(),
                        Theatre.builder().name("Liberty Heritage 4K · Marine Lines").city("Mumbai").address("Sir Vithaldas Thackersey Marg, Marine Lines, Mumbai 400020").amenities("Art Deco Heritage, Dolby Atmos, Balcony Suite").build(),
                        Theatre.builder().name("CINEVERSE Phoenix Palladium IMAX").city("Mumbai").address("High Street Phoenix, Lower Parel, Mumbai 400013").amenities("Laser IMAX, 4DX, Chef Lounge, Royal Recliners").build(),
                        Theatre.builder().name("AMB Gold Screen · Gachibowli").city("Hyderabad").address("Kondapur Junction, Hyderabad 500084").amenities("Dolby Atmos, 4K Dual Laser, Royal Recliners").build(),
                        Theatre.builder().name("Prasads Large Screen · Necklace Road").city("Hyderabad").address("NTR Gardens Road, Khairtabad, Hyderabad 500004").amenities("Giant 72ft Screen, Dolby Atmos, Food Court").build(),
                        Theatre.builder().name("CINEVERSE Jubilee Hills Luxe").city("Hyderabad").address("Road No. 36, Jubilee Hills, Hyderabad 500033").amenities("4K Laser, Butler Service, Royal Recliners").build(),
                        Theatre.builder().name("CINEVERSE Select Citywalk").city("Delhi NCR").address("Saket District Centre, New Delhi 110017").amenities("IMAX 3D, 4DX, Gold Class Lounge").build(),
                        Theatre.builder().name("CINEVERSE Ambience · CyberHub").city("Delhi NCR").address("NH-8, DLF Phase III, Gurugram 122002").amenities("IMAX Laser, Dolby Vision, Valet Parking").build(),
                        Theatre.builder().name("CINEVERSE Pavilion · Koregaon Park").city("Pune").address("Senapati Bapat Road, Shivajinagar, Pune 411016").amenities("IMAX Laser, Dolby Atmos, Royal Recliners").build(),
                        Theatre.builder().name("CINEVERSE Grand Forum · Edappally").city("Kochi").address("NH Bypass, Edappally, Kochi 682024").amenities("IMAX 3D, 4DX Motion, Dolby Atmos").build(),
                        Theatre.builder().name("CINEVERSE Marine Drive Luxe").city("Kochi").address("Shanmugham Road, Ernakulam, Kochi 682031").amenities("4K RGB Laser, Waterfront Lounge, Royal Recliners").build(),
                        Theatre.builder().name("CINEVERSE South City IMAX").city("Kolkata").address("Prince Anwar Shah Road, Kolkata 700068").amenities("Laser IMAX, Dolby Atmos, Gourmet Bistro").build()
                ));

                List<Screen> screens = new java.util.ArrayList<>();
                for (int i = 0; i < theatres.size(); i++) {
                    Theatre t = theatres.get(i);
                    String lower = t.getName().toLowerCase();
                    String screenName = (lower.contains("imax") || lower.contains("prasads"))
                            ? "IMAX Laser Audi 1"
                            : (lower.contains("4dx") || i % 4 == 1)
                                ? "4DX Motion Audi 2"
                                : (lower.contains("luxe") || lower.contains("gold") || lower.contains("director") || lower.contains("heritage"))
                                    ? "Luxe Lounge Audi 1"
                                    : "Grand Atmos Audi 1";
                    int total = adminService.resolveTotalSeatsForScreen(screenName);
                    Screen sc = screenRepository.save(Screen.builder().theatre(t).name(screenName).totalSeats(total).build());
                    adminService.seedScreenSeats(sc);
                    screens.add(sc);
                }

                for (Movie m : movies) {
                    for (int i = 0; i < screens.size(); i++) {
                        Screen sc = screens.get(i);
                        String fmt = (i % 3 == 0) ? "IMAX" : (i % 3 == 1) ? "4DX" : "2D";
                        double mult = fmt.equals("IMAX") ? 1.15 : fmt.equals("4DX") ? 1.2 : 1.0;
                        String time = switch (i % 4) {
                            case 0 -> "01:45 PM";
                            case 1 -> "05:30 PM";
                            case 2 -> "08:00 PM";
                            default -> "09:15 PM";
                        };
                        showRepository.save(Show.builder().movie(m).screen(sc).showDate("2026-11-15").showTime(time).language(m.getLanguage()).format(fmt).priceMultiplier(mult).build());
                    }
                }
            }
        }

        if (snackRepository.count() == 0) {
            snackRepository.saveAll(List.of(
                    Snack.builder().name("Gold Tub Caramel & Butter Popcorn").description("Gourmet butter & caramel popcorn.").category("POPCORN").price(340).imageUrl("/src/assets/images/snack_popcorn_cola_1794751353584.jpg").calories("480 kcal").isCombo(false).veg(true).build(),
                    Snack.builder().name("Coca-Cola Classic (500ml)").description("Chilled glass bottle pour.").category("BEVERAGES").price(160).imageUrl("/src/assets/images/snack_popcorn_cola_1794751353584.jpg").calories("180 kcal").isCombo(false).veg(true).build(),
                    Snack.builder().name("Pepsi Black Reserve (500ml)").description("Zero sugar crisp cola.").category("BEVERAGES").price(150).imageUrl("/src/assets/images/snack_popcorn_cola_1794751353584.jpg").calories("0 kcal").isCombo(false).veg(true).build(),
                    Snack.builder().name("Loaded Jalapeno Cheddar Nachos").description("Crispy tortilla chips with melted cheddar.").category("NACHOS").price(290).imageUrl("/src/assets/images/snack_nachos_burger_1794751352552.jpg").calories("510 kcal").isCombo(false).veg(true).build(),
                    Snack.builder().name("Smoked Brioche Cinema Burger").description("Char-grilled burger on brioche.").category("BURGERS").price(360).imageUrl("/src/assets/images/snack_nachos_burger_1794751352552.jpg").calories("640 kcal").isCombo(false).veg(false).build(),
                    Snack.builder().name("Truffle Mushroom Club Sandwich").description("Toasted sourdough club sandwich.").category("SANDWICHES").price(280).imageUrl("/src/assets/images/snack_nachos_burger_1794751352552.jpg").calories("430 kcal").isCombo(false).veg(true).build(),
                    Snack.builder().name("Director's Blockbuster Couple Combo").description("Large Popcorn + 2 Coca-Cola + Nachos.").category("COMBOS").price(690).imageUrl("/src/assets/images/snack_popcorn_cola_1794751353584.jpg").calories("1120 kcal").isCombo(true).veg(true).build()
            ));
        }
    }
}
