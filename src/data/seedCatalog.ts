import type { BookingRecord, Movie, Seat, Show, Snack, Theatre } from '../types/cinema';
import { calculateSeatPrice } from '../utils/cinemaPricing';
import { getScreenSeatProfile } from '../utils/screenLayout';

export const CITIES = [
  'Chennai',
  'Bengaluru',
  'Mumbai',
  'Hyderabad',
  'Delhi NCR',
  'Pune',
  'Kochi',
  'Kolkata',
] as const;

export const SEED_MOVIES: Movie[] = [
  {
    id: 1,
    title: 'Ramayana: Part One',
    tagline: 'Rise of a Legend · Dharma written across eternity.',
    language: 'Hindi',
    languagesAvailable: ['Hindi', 'Tamil', 'Telugu', 'Kannada', 'Malayalam'],
    genre: 'Epic · Mythology · Adventure',
    durationMinutes: 185,
    rating: 9.4,
    votesCount: '540K',
    certificate: 'U',
    releaseDate: '2026-11-05',
    director: 'Nitesh Tiwari',
    cast: ['Ranbir Kapoor', 'Sai Pallavi', 'Yash', 'Sunny Deol'],
    description:
      'A monumental theatrical retelling of the timeless epic crafted for IMAX 3D, following duty, exile, and the battle across the southern seas.',
    posterUrl: '/src/assets/images/poster_ramayana_1794751352628.jpg',
    backdropUrl: '/src/assets/images/poster_ramayana_1794751352628.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_ramayana',
    featured: true,
    nowShowing: true,
    formats: ['2D', '3D', 'IMAX', '4DX'],
    accentColor: '#F5C518',
  },
  {
    id: 2,
    title: 'Jailer 2',
    tagline: 'Old scores never stay buried.',
    language: 'Tamil',
    languagesAvailable: ['Tamil', 'Hindi', 'Telugu', 'Kannada', 'Malayalam'],
    genre: 'Action · Crime Thriller',
    durationMinutes: 164,
    rating: 9.1,
    votesCount: '295K',
    certificate: 'UA',
    releaseDate: '2026-10-15',
    director: 'Nelson Dilipkumar',
    cast: ['Rajinikanth', 'Mohanlal', 'Shiva Rajkumar', 'S.J. Suryah'],
    description:
      'Retired prison warden Muthuvel Pandian is drawn back into an international syndicate conflict spanning Chennai, Dubai, and Kyoto when a ghost from his past resurfaces.',
    posterUrl: '/src/assets/images/poster_jailer_two_1794751349463.jpg',
    backdropUrl: '/src/assets/images/poster_jailer_two_1794751349463.jpg',
    trailerUrl: 'https://www.youtube.com/embed/xenOE1Tma0A',
    featured: true,
    nowShowing: true,
    formats: ['2D', 'IMAX', '4DX'],
    accentColor: '#F5C518',
  },
  {
    id: 3,
    title: 'Scene',
    tagline: 'One coastal night changes the script.',
    language: 'Tamil',
    languagesAvailable: ['Tamil', 'Malayalam', 'Telugu', 'Hindi'],
    genre: 'Action · Comedy · Crime Mystery',
    durationMinutes: 149,
    rating: 8.8,
    votesCount: '136K',
    certificate: 'UA',
    releaseDate: '2026-11-06',
    director: 'Jithu Madhavan',
    cast: ['Suriya', 'Nazriya Nazim', 'Naslen', 'Anandraj'],
    description:
      'A sharp-witted film fixer and a chaotic wedding crew stumble onto an underworld syndicate ledger in a neon-soaked coastal town.',
    posterUrl: '/src/assets/images/poster_scene_2026_1794756609009.jpg',
    backdropUrl: '/src/assets/images/poster_scene_2026_1794756609009.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_scene',
    featured: true,
    nowShowing: true,
    formats: ['2D', 'IMAX'],
    accentColor: '#38BDF8',
  },
  {
    id: 4,
    title: 'Mookuthi Amman 2',
    tagline: 'Faith shines brighter than illusion.',
    language: 'Tamil',
    languagesAvailable: ['Tamil', 'Telugu', 'Kannada'],
    genre: 'Fantasy · Spiritual Comedy Drama',
    durationMinutes: 152,
    rating: 8.6,
    votesCount: '112K',
    certificate: 'U',
    releaseDate: '2026-11-06',
    director: 'Sundar C',
    cast: ['Nayanthara', 'Regina Cassandra', 'Urvashi', 'Yogi Babu'],
    description:
      'When a historic coastal temple town faces greedy real-estate deception, divine intervention returns in an unexpected, uproarious avatar.',
    posterUrl: '/src/assets/images/poster_mookuthi_2026_1794756626504.jpg',
    backdropUrl: '/src/assets/images/poster_mookuthi_2026_1794756626504.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_mookuthi2',
    featured: true,
    nowShowing: true,
    formats: ['2D', '3D'],
    accentColor: '#F59E0B',
  },
  {
    id: 5,
    title: 'Disco',
    tagline: 'Under the mirrorball, every shadow has a price.',
    language: 'Malayalam',
    languagesAvailable: ['Malayalam', 'Tamil', 'Kannada'],
    genre: 'Action · Retro Crime Thriller',
    durationMinutes: 158,
    rating: 8.9,
    votesCount: '88K',
    certificate: 'UA',
    releaseDate: '2026-11-06',
    director: 'Ullas Chemban',
    cast: ['Antony Varghese', 'Arjun Ashokan', 'Lukman Avaran', 'Chemban Vinod Jose'],
    description:
      'Inside a neon-lit harbor club ruled by smuggling syndicates, a fiercely loyal enforcer turns the night upside down for survival.',
    posterUrl: '/src/assets/images/poster_disco_2026_1794756644159.jpg',
    backdropUrl: '/src/assets/images/poster_disco_2026_1794756644159.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_disco',
    featured: true,
    nowShowing: true,
    formats: ['2D', '4DX'],
    accentColor: '#C084FC',
  },
  {
    id: 6,
    title: 'Drishyam 3: The Conclusion',
    tagline: 'Truth leaves one final witness.',
    language: 'Hindi',
    languagesAvailable: ['Hindi', 'Tamil', 'Telugu'],
    genre: 'Crime · Mystery Thriller',
    durationMinutes: 150,
    rating: 8.7,
    votesCount: '245K',
    certificate: 'UA',
    releaseDate: '2026-10-02',
    director: 'Abhishek Pathak',
    cast: ['Ajay Devgn', 'Tabu', 'Shriya Saran', 'Jaideep Ahlawat'],
    description:
      'Years after the case shook Goa, a relentless new investigation forces Vijay Salgaonkar into his highest-stakes battle of wits yet.',
    posterUrl: '/src/assets/images/poster_drishyam3_2026_1794756668247.jpg',
    backdropUrl: '/src/assets/images/poster_drishyam3_2026_1794756668247.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_drishyam3',
    featured: true,
    nowShowing: true,
    formats: ['2D', 'IMAX'],
    accentColor: '#60A5FA',
  },
  {
    id: 7,
    title: 'Itllu Arjuna',
    tagline: 'Every wave carries an unspoken letter.',
    language: 'Telugu',
    languagesAvailable: ['Telugu', 'Tamil'],
    genre: 'Romantic Drama',
    durationMinutes: 142,
    rating: 8.4,
    votesCount: '64K',
    certificate: 'UA',
    releaseDate: '2026-11-07',
    director: 'Mahesh Uppala',
    cast: ['Aniesh', 'Anaswara Rajan', 'Vennela Kishore', 'Brahmaji'],
    description:
      'Set across sunlit coastal towns and railway bridges, an aspiring musician and a quiet archivist find love tested by distance and timing.',
    posterUrl: '/src/assets/images/poster_itllu_arjuna_2026_1794756683301.jpg',
    backdropUrl: '/src/assets/images/poster_itllu_arjuna_2026_1794756683301.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_itlluarjuna',
    featured: true,
    nowShowing: true,
    formats: ['2D'],
    accentColor: '#FBBF24',
  },
  {
    id: 8,
    title: 'I Play Rocky',
    tagline: 'The fight nobody believed he could win.',
    language: 'English',
    languagesAvailable: ['English', 'Hindi'],
    genre: 'Sports · Biographical Drama',
    durationMinutes: 138,
    rating: 8.6,
    votesCount: '79K',
    certificate: 'UA',
    releaseDate: '2026-11-06',
    director: 'Peter Farrelly',
    cast: ['Anthony Ippolito', 'AnnaSophia Robb', 'Matt Dillon', 'Stephan James'],
    description:
      'The true story of an unknown struggling actor with a battered script who risked everything to star in the underdog sports classic.',
    posterUrl: '/src/assets/images/poster_i_play_rocky_2026_1794756708108.jpg',
    backdropUrl: '/src/assets/images/poster_i_play_rocky_2026_1794756708108.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_rocky',
    featured: false,
    nowShowing: true,
    formats: ['2D', 'IMAX'],
    accentColor: '#EF4444',
  },
  {
    id: 9,
    title: 'Gondhal',
    tagline: 'Some rituals awaken secrets best left in the dark.',
    language: 'Kannada',
    languagesAvailable: ['Kannada', 'Hindi'],
    genre: 'Folk · Psychological Thriller',
    durationMinutes: 134,
    rating: 8.5,
    votesCount: '52K',
    certificate: 'UA',
    releaseDate: '2026-11-01',
    director: 'Santosh Davakhar',
    cast: ['Ishitaa Deshmukh', 'Kishore Kadam', 'Yogesh Sohoni', 'Nishad Bhoir'],
    description:
      'During an all-night village ritual, simmering family rivalries and hidden guilt erupt into a haunting psychological reckoning.',
    posterUrl: '/src/assets/images/poster_gondhal_2026_1794756722802.jpg',
    backdropUrl: '/src/assets/images/poster_gondhal_2026_1794756722802.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_gondhal',
    featured: false,
    nowShowing: true,
    formats: ['2D'],
    accentColor: '#F87171',
  },
  {
    id: 10,
    title: 'Udta Teer',
    tagline: 'Aim carefully—chaos always boomerangs.',
    language: 'Hindi',
    languagesAvailable: ['Hindi'],
    genre: 'Satirical Comedy Thriller',
    durationMinutes: 141,
    rating: 8.2,
    votesCount: '71K',
    certificate: 'UA',
    releaseDate: '2026-10-23',
    director: 'Aakash Kaushik',
    cast: ['Ayushmann Khurrana', 'Sara Ali Khan', 'Rahul Bose', 'Ram Kapoor'],
    description:
      'A small-time Delhi prankster accidentally intercepts a high-level scandal dossier, kicking off a frantic rooftop chase across the capital.',
    posterUrl: '/src/assets/images/poster_udta_teer_2026_1794756737155.jpg',
    backdropUrl: '/src/assets/images/poster_udta_teer_2026_1794756737155.jpg',
    trailerUrl: 'https://www.youtube.com/embed/sample_udtateer',
    featured: false,
    nowShowing: true,
    formats: ['2D'],
    accentColor: '#EC4899',
  },
];

export const SEED_THEATRES: Theatre[] = [
  {
    id: 1,
    name: 'CINEVERSE Grand IMAX · Phoenix',
    city: 'Chennai',
    address: 'Velachery Main Road, Chennai 600042',
    amenities: ['Dolby Atmos', 'Laser IMAX', 'Royal Recliners', '4K Projection'],
  },
  {
    id: 2,
    name: 'Sathyam Luxe Cinema',
    city: 'Chennai',
    address: 'Royapettah, Chennai 600014',
    amenities: ['Dolby Atmos', 'Gourmet Lounge', '4K RGB Laser'],
  },
  {
    id: 3,
    name: 'CINEVERSE Marina Gold · ECR',
    city: 'Chennai',
    address: 'East Coast Road, Thiruvanmiyur, Chennai 600041',
    amenities: ['4DX Motion', 'Dolby Atmos', 'Drive-In Valet', 'Royal Recliners'],
  },
  {
    id: 4,
    name: 'CINEVERSE Orion 4DX & IMAX',
    city: 'Bengaluru',
    address: 'Rajajinagar, Bengaluru 560055',
    amenities: ['4DX Motion', 'IMAX Laser', 'Royal Recliners'],
  },
  {
    id: 5,
    name: 'REX Director’s Cut · Indiranagar',
    city: 'Bengaluru',
    address: '100 Feet Road, Indiranagar, Bengaluru 560038',
    amenities: ['Dolby Atmos', 'Balcony Lounge', 'In-Seat Service'],
  },
  {
    id: 6,
    name: 'CINEVERSE Lumiere · Whitefield',
    city: 'Bengaluru',
    address: 'ITPL Main Road, Whitefield, Bengaluru 560066',
    amenities: ['IMAX with Laser', 'ScreenX 270°', 'Royal Recliners'],
  },
  {
    id: 7,
    name: 'CINEVERSE Maison BKC',
    city: 'Mumbai',
    address: 'Bandra Kurla Complex, Mumbai 400051',
    amenities: ['IMAX with Laser', 'Dolby Vision', 'Valet Parking'],
  },
  {
    id: 8,
    name: 'Liberty Heritage 4K · Marine Lines',
    city: 'Mumbai',
    address: 'Sir Vithaldas Thackersey Marg, Marine Lines, Mumbai 400020',
    amenities: ['Art Deco Heritage', 'Dolby Atmos', 'Balcony Suite'],
  },
  {
    id: 9,
    name: 'CINEVERSE Phoenix Palladium IMAX',
    city: 'Mumbai',
    address: 'High Street Phoenix, Lower Parel, Mumbai 400013',
    amenities: ['Laser IMAX', '4DX', 'Chef Lounge', 'Royal Recliners'],
  },
  {
    id: 10,
    name: 'AMB Gold Screen · Gachibowli',
    city: 'Hyderabad',
    address: 'Kondapur Junction, Hyderabad 500084',
    amenities: ['Dolby Atmos', '4K Dual Laser', 'Royal Recliners'],
  },
  {
    id: 11,
    name: 'Prasads Large Screen · Necklace Road',
    city: 'Hyderabad',
    address: 'NTR Gardens Road, Khairtabad, Hyderabad 500004',
    amenities: ['Giant 72ft Screen', 'Dolby Atmos', 'Food Court'],
  },
  {
    id: 12,
    name: 'CINEVERSE Jubilee Hills Luxe',
    city: 'Hyderabad',
    address: 'Road No. 36, Jubilee Hills, Hyderabad 500033',
    amenities: ['4K Laser', 'Butler Service', 'Royal Recliners'],
  },
  {
    id: 13,
    name: 'CINEVERSE Select Citywalk',
    city: 'Delhi NCR',
    address: 'Saket District Centre, New Delhi 110017',
    amenities: ['IMAX 3D', '4DX', 'Gold Class Lounge'],
  },
  {
    id: 14,
    name: 'CINEVERSE Ambience · CyberHub',
    city: 'Delhi NCR',
    address: 'NH-8, DLF Phase III, Gurugram 122002',
    amenities: ['IMAX Laser', 'Dolby Vision', 'Valet Parking'],
  },
  {
    id: 15,
    name: 'CINEVERSE Pavilion · Koregaon Park',
    city: 'Pune',
    address: 'Senapati Bapat Road, Shivajinagar, Pune 411016',
    amenities: ['IMAX Laser', 'Dolby Atmos', 'Royal Recliners'],
  },
  {
    id: 16,
    name: 'CINEVERSE Grand Forum · Edappally',
    city: 'Kochi',
    address: 'NH Bypass, Edappally, Kochi 682024',
    amenities: ['IMAX 3D', '4DX Motion', 'Dolby Atmos'],
  },
  {
    id: 17,
    name: 'CINEVERSE Marine Drive Luxe',
    city: 'Kochi',
    address: 'Shanmugham Road, Ernakulam, Kochi 682031',
    amenities: ['4K RGB Laser', 'Waterfront Lounge', 'Royal Recliners'],
  },
  {
    id: 18,
    name: 'CINEVERSE South City IMAX',
    city: 'Kolkata',
    address: 'Prince Anwar Shah Road, Kolkata 700068',
    amenities: ['Laser IMAX', 'Dolby Atmos', 'Gourmet Bistro'],
  },
];

function getTodayOffsetDate(daysOffset: number): string {
  const date = new Date(2026, 10, 15 + daysOffset);
  return date.toISOString().slice(0, 10);
}

export const SHOW_DATES = [
  { label: 'Today · Sun 15', value: getTodayOffsetDate(0) },
  { label: 'Mon 16 Nov', value: getTodayOffsetDate(1) },
  { label: 'Tue 17 Nov', value: getTodayOffsetDate(2) },
  { label: 'Wed 18 Nov', value: getTodayOffsetDate(3) },
];

export function generateSeedShows(): Show[] {
  const shows: Show[] = [];
  let idCounter = 101;
  const times = ['10:15 AM', '01:45 PM', '05:30 PM', '09:15 PM'];

  for (const movie of SEED_MOVIES) {
    for (const theatre of SEED_THEATRES) {
      for (let d = 0; d < 3; d++) {
        const dateStr = getTodayOffsetDate(d);
        // Create 2-3 showtimes per theatre per date
        const selectedTimes = d === 0 ? times : times.slice(1, 4);
        selectedTimes.forEach((time, idx) => {
          const format = movie.formats[idx % movie.formats.length] ?? '2D';
          const lang = movie.languagesAvailable[idx % Math.min(2, movie.languagesAvailable.length)] ?? movie.language;
          const isLuxeTheatre =
            theatre.name.toLowerCase().includes('luxe') ||
            theatre.name.toLowerCase().includes('director') ||
            theatre.name.toLowerCase().includes('gold') ||
            theatre.name.toLowerCase().includes('heritage');
          const screenName =
            format === 'IMAX'
              ? 'IMAX Laser Audi 1'
              : format === '4DX'
                ? '4DX Motion Audi 2'
                : isLuxeTheatre
                  ? 'Luxe Lounge Audi 1'
                  : `Grand Atmos Audi ${(idx % 3) + 1}`;
          const profile = getScreenSeatProfile({
            format,
            screenName,
            theatreName: theatre.name,
          });
          shows.push({
            id: idCounter++,
            movieId: movie.id,
            theatreId: theatre.id,
            theatreName: theatre.name,
            theatreAddress: theatre.address,
            city: theatre.city,
            screenId: (theatre.id % 3) + 1,
            screenName,
            showDate: dateStr,
            showTime: time,
            language: lang,
            format,
            priceMultiplier: format === 'IMAX' ? 1.15 : format === '4DX' ? 1.2 : 1.0,
            totalSeats: profile.totalSeats,
            auditoriumProfile: profile.label,
          });
        });
      }
    }
  }
  return shows;
}

export const SEED_SNACKS: Snack[] = [
  {
    id: 1,
    name: 'Gold Tub Caramel & Butter Popcorn',
    description: 'Freshly popped gourmet kernels glazed with salted French butter & caramel swirl.',
    category: 'POPCORN',
    price: 340,
    imageUrl: '/src/assets/images/snack_popcorn_cola_1794751353584.jpg',
    calories: '480 kcal',
    isCombo: false,
    veg: true,
  },
  {
    id: 2,
    name: 'Classic Salted Cinema Popcorn (Large)',
    description: 'Crispy theatre-style golden corn with warm clarified butter drizzle.',
    category: 'POPCORN',
    price: 260,
    imageUrl: '/src/assets/images/snack_popcorn_cola_1794751353584.jpg',
    calories: '390 kcal',
    isCombo: false,
    veg: true,
  },
  {
    id: 3,
    name: 'Coca-Cola Zero / Classic (Chilled 500ml)',
    description: 'Ice-cold artisanal fountain pour or glass bottle served with lime.',
    category: 'BEVERAGES',
    price: 160,
    imageUrl: '/src/assets/images/snack_popcorn_cola_1794751353584.jpg',
    calories: '180 kcal',
    isCombo: false,
    veg: true,
  },
  {
    id: 4,
    name: 'Pepsi Black Reserve (Chilled 500ml)',
    description: 'Crisp carbonated cola served over crushed ice.',
    category: 'BEVERAGES',
    price: 150,
    imageUrl: '/src/assets/images/snack_popcorn_cola_1794751353584.jpg',
    calories: '0 kcal',
    isCombo: false,
    veg: true,
  },
  {
    id: 5,
    name: 'Loaded Jalapeño Cheddar Nachos',
    description: 'Crisp stone-ground tortilla chips layered with warm aged cheddar, salsa & sour cream.',
    category: 'NACHOS',
    price: 290,
    imageUrl: '/src/assets/images/snack_nachos_burger_1794751352552.jpg',
    calories: '510 kcal',
    isCombo: false,
    veg: true,
  },
  {
    id: 6,
    name: 'Smoked Brioche Cinema Burger',
    description: 'Char-grilled patty, melted sharp cheddar, caramelized onions on toasted brioche.',
    category: 'BURGERS',
    price: 360,
    imageUrl: '/src/assets/images/snack_nachos_burger_1794751352552.jpg',
    calories: '640 kcal',
    isCombo: false,
    veg: false,
  },
  {
    id: 7,
    name: 'Truffle Mushroom Club Sandwich',
    description: 'Sourdough toasted triple-decker with roasted mushrooms, herbed aioli & arugula.',
    category: 'SANDWICHES',
    price: 280,
    imageUrl: '/src/assets/images/snack_nachos_burger_1794751352552.jpg',
    calories: '430 kcal',
    isCombo: false,
    veg: true,
  },
  {
    id: 8,
    name: 'Director’s Blockbuster Couple Combo',
    description: '1 Large Caramel/Butter Popcorn + 2 Chilled Coca-Cola + 1 Loaded Nachos.',
    category: 'COMBOS',
    price: 690,
    imageUrl: '/src/assets/images/snack_popcorn_cola_1794751353584.jpg',
    calories: '1120 kcal',
    isCombo: true,
    veg: true,
  },
  {
    id: 9,
    name: 'IMAX Solo Feast Combo',
    description: '1 Smoked Brioche Burger + 1 Classic Popcorn + 1 Pepsi Black.',
    category: 'COMBOS',
    price: 580,
    imageUrl: '/src/assets/images/snack_nachos_burger_1794751352552.jpg',
    calories: '980 kcal',
    isCombo: true,
    veg: false,
  },
];

/**
 * Generates an auditorium layout matching the exact screen profile (IMAX 114 seats, 4DX 62 seats,
 * Luxe 64 seats, or Grand Dolby Atmos 88 seats) while preserving paired Royal Recliner integrity.
 */
export function buildShowSeatLayout(
  showId: number,
  multiplier = 1,
  screenContext?: {
    screenId?: number;
    screenName?: string;
    format?: string;
    theatreName?: string;
  }
): Seat[] {
  const profile = getScreenSeatProfile(screenContext);
  const seats: Seat[] = [];
  let seatId = showId * 1000 + 1;

  profile.rows.forEach((row, rowIndex) => {
    for (let col = 1; col <= row.cols; col++) {
      // Deterministic occupancy varying by showId so each showtime reflects realistic seat availability
      const hash = (showId * 31 + rowIndex * 17 + col * 13) % 19;
      let status: Seat['status'] = 'AVAILABLE';
      if (hash === 2 || hash === 7 || hash === 14) {
        status = 'BOOKED';
      } else if (hash === 11) {
        status = 'LOCKED';
      }

      let pairGroup: string | null = null;
      if (row.paired) {
        const pairStart = col % 2 === 1 ? col : col - 1;
        pairGroup = `R-${pairStart}-${pairStart + 1}`;
        // Ensure paired recliner units are never split between booked and available
        const pairHash = (showId * 31 + rowIndex * 17 + pairStart * 13) % 19;
        if (pairStart === 1) {
          status = 'AVAILABLE';
        } else if (pairHash === 2 || pairHash === 14) {
          status = 'BOOKED';
        } else {
          status = 'AVAILABLE';
        }
      }

      seats.push({
        id: seatId++,
        screenId: screenContext?.screenId ?? (showId % 3) + 1,
        seatCode: `${row.label}${col}`,
        rowLabel: row.label,
        rowIndex,
        colNumber: col,
        category: row.category,
        price: calculateSeatPrice(row.category, multiplier),
        status,
        pairGroup,
        lockedByUserId: status === 'LOCKED' ? 999 : null,
        lockExpiresAt: status === 'LOCKED' ? Date.now() + 1000 * 60 * 60 : null,
      });
    }
  });

  return seats;
}

export const SEED_INITIAL_BOOKINGS: BookingRecord[] = [
  {
    id: 9001,
    bookingReference: 'CV-2026-84192',
    userId: 1,
    userName: 'Aarav Menon',
    userEmail: 'user@cineverse.in',
    showId: 101,
    movieId: 1,
    movieTitle: 'Ramayana: Part One',
    moviePosterUrl: '/src/assets/images/poster_ramayana_1794751352628.jpg',
    theatreName: 'CINEVERSE Grand IMAX · Phoenix',
    screenName: 'IMAX Laser Audi 1',
    city: 'Chennai',
    showDate: getTodayOffsetDate(-4),
    showTime: '09:15 PM',
    language: 'Hindi',
    format: 'IMAX',
    seatCodes: ['E5', 'E6'],
    seatCategories: ['PRIME', 'PRIME'],
    snacks: [{ name: 'Director’s Blockbuster Couple Combo', quantity: 1, unitPrice: 690 }],
    breakdown: {
      ticketSubtotal: 552,
      snacksSubtotal: 690,
      convenienceFee: 60,
      gstAmount: 46,
      grandTotal: 1348,
    },
    paymentMode: 'DEMO',
    paymentId: 'DEMO_PAY_84192',
    status: 'CONFIRMED',
    qrPayload: JSON.stringify({
      ref: 'CV-2026-84192',
      movie: 'Ramayana: Part One',
      seats: ['E5', 'E6'],
      theatre: 'CINEVERSE Grand IMAX · Phoenix',
      date: getTodayOffsetDate(-4),
      time: '09:15 PM',
    }),
    createdAt: new Date(2026, 10, 11, 18, 30).toISOString(),
  },
];
