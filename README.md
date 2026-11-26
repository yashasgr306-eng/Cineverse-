# CINEVERSE — Premium 3D Movie Ticket Booking Platform

**Your Universe of Cinema.**

CINEVERSE combines an interactive **Three.js 3D curved movie panorama** and **3D auditorium seat-selection experience** with a **Java 21 + Spring Boot 3 + Spring Data JPA + Spring Security (JWT) + MySQL 8** backend.

---

## Project Structure

```text
CINEVERSE/
├── src/                        # React 19 + TypeScript + Tailwind CSS + Three.js Frontend
│   ├── api/cineverseApi.ts     # REST API client targeting Spring Boot (:8080/api)
│   ├── components/
│   │   ├── three/
│   │   │   ├── HeroPanorama3D.tsx    # 3D curved movie screen carousel with reflections
│   │   │   └── CinemaHall3D.tsx      # 3D cinema hall, composite seats & camera presets
│   │   ├── Navbar.tsx
│   │   ├── HomeSections.tsx
│   │   ├── NowShowingView.tsx
│   │   ├── MovieDetailsView.tsx
│   │   ├── SeatSelectionView.tsx
│   │   ├── SnacksView.tsx
│   │   ├── CheckoutView.tsx
│   │   ├── MyTicketsView.tsx
│   │   ├── ProfileView.tsx
│   │   ├── AuthModal.tsx
│   │   └── AdminDashboardView.tsx
│   └── utils/
│       ├── cinemaPricing.ts    # Seat tier prices, convenience fee & GST math
│       ├── seatAlgorithm.ts    # Best 2 Seats algorithm & paired recliner integrity
│       └── cinemaLogic.test.ts # Node test suite
├── backend/                    # Java 21 + Spring Boot 3.3.5 + Maven Backend
│   ├── pom.xml
│   └── src/main/
│       ├── resources/application.yml
│       └── java/com/cineverse/
│           ├── config/         # SecurityConfig, DataInitializer
│           ├── controller/     # Auth, Profile, Movie, TheatreShow, Booking, Admin REST APIs
│           ├── dto/            # Request/Response Java records
│           ├── entity/         # 12 JPA Entities (User, Movie, Theatre, Screen, Seat, Show, SeatLock, Booking, BookingSeat, Snack, BookingSnack, Payment)
│           ├── exception/      # GlobalExceptionHandler & custom exceptions
│           ├── repository/     # Spring Data JPA repositories
│           ├── security/       # JwtService, JwtAuthenticationFilter, CustomUserDetailsService
│           └── service/        # AuthService, ProfileService, CatalogService, SeatService, BookingService, AdminService
└── database/
    ├── schema.sql              # MySQL 8 DDL for cineverse_db
    └── seed.sql                # Sample movies, theatres, and snacks
```

---

## Frontend-to-Java Backend Communication

1. The React frontend communicates with the Spring Boot backend via REST calls in `src/api/cineverseApi.ts` targeting `VITE_API_URL` (default `http://localhost:8080/api`).
2. Authenticated requests attach `Authorization: Bearer <JWT>` obtained from `POST /api/auth/login` or `POST /api/auth/register`.
3. Seat locking (`POST /api/shows/{showId}/seats/lock`) creates time-bounded `seat_locks` rows in MySQL (`ttl-seconds: 300`).
4. Final booking (`POST /api/bookings`) executes inside a `@Transactional` boundary in `BookingService.java`, re-verifying seat availability, persisting `bookings`, `booking_seats` (protected by `UNIQUE(show_id, seat_id)`), `booking_snacks`, `payments`, and generating a ZXing QR ticket.
5. In cloud preview environments where Java/MySQL cannot run locally, `cineverseApi.ts` gracefully falls back to a local browser-persisted mirror so every UI workflow remains testable, while switching automatically to the live Spring Boot REST API as soon as `localhost:8080` is running.

---

## 1. MySQL Database Setup

```sql
CREATE DATABASE cineverse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Run the schema and seed scripts (or let Hibernate `ddl-auto: update` + `DataInitializer` initialize automatically):

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

---

## 2. Running the Java Spring Boot Backend

Requirements: **Java 21 (JDK 21)**, **Maven 3.9+**, **MySQL 8+**.

```bash
cd backend
export MYSQL_USER=root
export MYSQL_PASSWORD=your_mysql_password
mvn spring-boot:run
```

The Spring Boot API starts on `http://localhost:8080`.
Seeded accounts created on startup:
- **Guest User**: `user@cineverse.in` / `cinema123` (`ROLE_USER`)
- **Admin User**: `admin@cineverse.in` / `admin123` (`ROLE_ADMIN`)

---

## 3. Running the React + Three.js Frontend

Requirements: **Node.js 20+**.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To point to a custom backend URL, create `.env.local`:

```env
VITE_API_URL=http://localhost:8080/api
```

---

## 4. REST API Documentation & Testing (`curl`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register a new `USER` and receive JWT |
| `POST` | `/api/auth/login` | Public | Authenticate user/admin and receive JWT |
| `GET` | `/api/movies?q=&language=` | Public | List/search movies with language filter |
| `GET` | `/api/movies/{id}` | Public | Fetch single movie details |
| `GET` | `/api/theatres?city=` | Public | Fetch theatres filtered by city |
| `GET` | `/api/shows?movieId=` | Public | Fetch showtimes for a movie |
| `GET` | `/api/shows/{showId}/seats` | Public | Fetch auditorium seats with live `BOOKED`/`LOCKED` status |
| `POST` | `/api/shows/{showId}/seats/lock` | Auth | Temporarily lock seats for 5 minutes |
| `GET` | `/api/shows/{showId}/seats/recommend?count=2` | Public | Best 2 Seats center recommendation (keeps recliners paired) |
| `GET` | `/api/snacks` | Public | List concession snacks & combos |
| `POST` | `/api/bookings` | Auth | Transactional booking + payment + QR generation |
| `GET` | `/api/bookings/my` | Auth | Logged-in user's booking history |
| `GET` | `/api/profile` | Auth | Authenticated user profile, preferences & booking summary |
| `PUT` | `/api/profile` | Auth | Update personal details & cinema preferences |
| `PUT` | `/api/profile/password` | Auth | Verify current password & update BCrypt password |
| `GET` | `/api/admin/stats` | `ADMIN` | Revenue, tickets sold, recent bookings |
| `POST/PUT/DELETE` | `/api/admin/movies` | `ADMIN` | Manage movies |
| `POST` | `/api/admin/theatres` & `/api/admin/shows` | `ADMIN` | Add theatres and create showtimes |

### Example `curl` Flow

```bash
# 1. Login and capture JWT
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@cineverse.in","password":"cinema123"}' | jq -r '.token')

# 2. Fetch movies
curl -s http://localhost:8080/api/movies?language=Tamil | jq .

# 3. Get seat layout for Show #1
curl -s http://localhost:8080/api/shows/1/seats | jq '.[0:5]'

# 4. Get Best 2 Seats recommendation
curl -s "http://localhost:8080/api/shows/1/seats/recommend?count=2" | jq .

# 5. Lock seats 45 and 46
curl -s -X POST http://localhost:8080/api/shows/1/seats/lock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"seatIds":[45,46]}'

# 6. Confirm booking with demo payment
curl -s -X POST http://localhost:8080/api/bookings \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"showId":1,"seatIds":[45,46],"snacks":[{"snackId":1,"quantity":1}],"paymentMode":"DEMO"}'
```
